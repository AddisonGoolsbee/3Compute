package terminal

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"os/exec"
	"strings"
	"sync"
	"time"

	"3compute-backend/internal/auth"
	"3compute-backend/internal/docker"

	"github.com/creack/pty"
	"github.com/gorilla/websocket"
	"github.com/sirupsen/logrus"
)

const (
	PollInterval = 4 * time.Second
)

// Hub maintains the set of active clients and broadcasts messages to the clients
type Hub struct {
	// Registered clients
	clients map[*Client]bool

	// Inbound messages from the clients
	broadcast chan []byte

	// Register requests from the clients
	register chan *Client

	// Unregister requests from clients
	unregister chan *Client

	// User containers mapping: user_id -> container info
	userContainers map[string]*ContainerInfo

	// Session mapping: client -> session info
	sessions map[*Client]*SessionInfo

	// Cleanup timers per user
	cleanupTimers map[string]*time.Timer

	// Mutex for thread safety
	mutex sync.RWMutex

	// Context for shutdown
	ctx    context.Context
	cancel context.CancelFunc
}

// ContainerInfo holds information about a user's container
type ContainerInfo struct {
	ContainerName string
	PortRange     *docker.PortRange
}

// SessionInfo holds information about a client session
type SessionInfo struct {
	UserID            string
	TabID             string
	ContainerName     string
	ContainerAttached bool
	PTY               *os.File
	Cmd               *exec.Cmd
}

// Client is a middleman between the websocket connection and the hub
type Client struct {
	Hub *Hub

	// The websocket connection
	Conn *websocket.Conn

	// Buffered channel of outbound messages
	Send chan []byte

	// User associated with this client
	User *auth.User

	// Tab ID for this client
	TabID string
}

// Message represents a WebSocket message
type Message struct {
	Type string      `json:"type"`
	Data interface{} `json:"data,omitempty"`
}

// PTYInputData represents PTY input message data
type PTYInputData struct {
	Input string `json:"input"`
}

// ResizeData represents terminal resize message data
type ResizeData struct {
	Rows int `json:"rows"`
	Cols int `json:"cols"`
}

var globalHub *Hub

// NewHub creates a new Hub
func NewHub() *Hub {
	ctx, cancel := context.WithCancel(context.Background())
	return &Hub{
		broadcast:      make(chan []byte, 256),
		register:       make(chan *Client, 256),
		unregister:     make(chan *Client, 256),
		clients:        make(map[*Client]bool),
		userContainers: make(map[string]*ContainerInfo),
		sessions:       make(map[*Client]*SessionInfo),
		cleanupTimers:  make(map[string]*time.Timer),
		ctx:            ctx,
		cancel:         cancel,
	}
}

// SetHub sets the global hub instance
func SetHub(h *Hub) {
	globalHub = h
}

// GetHub returns the global hub instance
func GetHub() *Hub {
	return globalHub
}

// Context returns the hub's context for testing
func (h *Hub) Context() context.Context {
	return h.ctx
}

// Run starts the hub
func (h *Hub) Run() {
	// Discover existing containers on startup
	h.discoverExistingContainers()
	h.startPollersForOrphanedContainers()

	for {
		select {
		case client := <-h.register:
			h.registerClient(client)

		case client := <-h.unregister:
			h.unregisterClient(client)

		case message := <-h.broadcast:
			h.broadcastMessage(message)

		case <-h.ctx.Done():
			return
		}
	}
}

// Stop stops the hub
func (h *Hub) Stop() {
	h.cancel()
	
	h.mutex.Lock()
	defer h.mutex.Unlock()

	// Close all client connections
	for client := range h.clients {
		h.closeClient(client)
	}

	// Stop all cleanup timers
	for _, timer := range h.cleanupTimers {
		timer.Stop()
	}
}

func (h *Hub) registerClient(client *Client) {
	h.mutex.Lock()
	defer h.mutex.Unlock()

	h.clients[client] = true
	logrus.Debugf("Client registered for user %s, tab %s", client.User.ID, client.TabID)

	// Cancel any existing idle poller for this user
	h.cancelIdlePoller(client.User.ID)

	// Setup container for user if needed
	h.setupUserContainer(client)

	// Create session info
	containerName := fmt.Sprintf("user-container-%s", client.User.ID)
	h.sessions[client] = &SessionInfo{
		UserID:            client.User.ID,
		TabID:             client.TabID,
		ContainerName:     containerName,
		ContainerAttached: false,
	}

	logrus.Infof("Client %p connected for tab %s", client, client.TabID)
}

func (h *Hub) unregisterClient(client *Client) {
	h.mutex.Lock()
	defer h.mutex.Unlock()

	if _, ok := h.clients[client]; ok {
		delete(h.clients, client)
		h.closeClient(client)

		// Clean up session
		if session, exists := h.sessions[client]; exists {
			if session.PTY != nil {
				session.PTY.Close()
			}
			delete(h.sessions, client)

			// If this was the last session for the user, start idle poller
			if !h.hasActiveSessionsForUser(session.UserID) {
				h.startIdlePoller(session.UserID)
			}
		}

		logrus.Debugf("Client unregistered")
	}
}

func (h *Hub) closeClient(client *Client) {
	close(client.Send)
	client.Conn.Close()
}

func (h *Hub) broadcastMessage(message []byte) {
	h.mutex.RLock()
	defer h.mutex.RUnlock()

	for client := range h.clients {
		select {
		case client.Send <- message:
		default:
			h.closeClient(client)
			delete(h.clients, client)
		}
	}
}

func (h *Hub) setupUserContainer(client *Client) {
	userID := client.User.ID
	containerName := fmt.Sprintf("user-container-%s", userID)

	// Check if we already have container info for this user
	if _, exists := h.userContainers[userID]; !exists {
		// Check if container already exists
		exists, err := docker.ContainerExists(containerName)
		if err != nil {
			logrus.WithError(err).Errorf("Failed to check if container exists for user %s", userID)
			return
		}

		portRange := docker.NewPortRange(client.User.PortStart)

		if exists {
			// Container exists, check if it's running
			running, err := docker.ContainerIsRunning(containerName)
			if err != nil {
				logrus.WithError(err).Errorf("Failed to check if container is running for user %s", userID)
				return
			}

			if running {
				logrus.Infof("Found existing running container %s, reusing it", containerName)
				h.userContainers[userID] = &ContainerInfo{
					ContainerName: containerName,
					PortRange:     portRange,
				}
			} else {
				logrus.Infof("Found existing stopped container %s, restarting it", containerName)
				if err := docker.StartContainer(containerName); err != nil {
					logrus.WithError(err).Warnf("Failed to restart container %s, creating new one", containerName)
					docker.RemoveContainer(containerName) // Remove failed container
					if err := docker.SpawnContainer(userID, containerName, portRange); err != nil {
						logrus.WithError(err).Errorf("Failed to spawn new container for user %s", userID)
						return
					}
				}
				h.userContainers[userID] = &ContainerInfo{
					ContainerName: containerName,
					PortRange:     portRange,
				}
			}
		} else {
			// No existing container, create a new one
			if err := docker.SpawnContainer(userID, containerName, portRange); err != nil {
				logrus.WithError(err).Errorf("Failed to spawn container for user %s", userID)
				return
			}
			h.userContainers[userID] = &ContainerInfo{
				ContainerName: containerName,
				PortRange:     portRange,
			}
			logrus.Infof("Spawned new container for user %s", userID)
		}
	} else {
		// Container info exists, check if it's still running
		running, err := docker.ContainerIsRunning(containerName)
		if err != nil {
			logrus.WithError(err).Errorf("Failed to check container status for user %s", userID)
			return
		}

		if !running {
			logrus.Infof("Container %s exists but is not running, restarting it", containerName)
			if err := docker.StartContainer(containerName); err != nil {
				logrus.WithError(err).Warnf("Failed to restart container %s, creating new one", containerName)
				delete(h.userContainers, userID)
				docker.RemoveContainer(containerName)
				portRange := docker.NewPortRange(client.User.PortStart)
				if err := docker.SpawnContainer(userID, containerName, portRange); err != nil {
					logrus.WithError(err).Errorf("Failed to spawn replacement container for user %s", userID)
					return
				}
				h.userContainers[userID] = &ContainerInfo{
					ContainerName: containerName,
					PortRange:     portRange,
				}
			}
		}
	}
}

func (h *Hub) hasActiveSessionsForUser(userID string) bool {
	for _, session := range h.sessions {
		if session.UserID == userID {
			return true
		}
	}
	return false
}

func (h *Hub) discoverExistingContainers() {
	// Find all containers with the user-container- prefix
	cmd := exec.Command("docker", "ps", "-a", "--filter", "name=user-container-", "--format", "{{.Names}}")
	output, err := cmd.Output()
	if err != nil {
		logrus.WithError(err).Warn("Failed to discover existing containers")
		return
	}

	lines := strings.Split(strings.TrimSpace(string(output)), "\n")
	for _, containerName := range lines {
		if containerName == "" {
			continue
		}

		// Extract user ID from container name
		parts := strings.Split(containerName, "-")
		if len(parts) != 3 || parts[0] != "user" || parts[1] != "container" {
			continue
		}
		userID := parts[2]

		// Check if container is running
		running, err := docker.ContainerIsRunning(containerName)
		if err != nil {
			logrus.WithError(err).Warnf("Failed to check status of discovered container %s", containerName)
			continue
		}

		if running {
			logrus.Infof("Found running container %s for user %s", containerName, userID)
			h.userContainers[userID] = &ContainerInfo{
				ContainerName: containerName,
				PortRange:     nil, // Will be set when user connects
			}
		} else {
			logrus.Infof("Found stopped container %s for user %s", containerName, userID)
			h.userContainers[userID] = &ContainerInfo{
				ContainerName: containerName,
				PortRange:     nil,
			}
		}
	}
}

func (h *Hub) startPollersForOrphanedContainers() {
	for userID := range h.userContainers {
		if !h.hasActiveSessionsForUser(userID) {
			logrus.Infof("Starting idle poller for orphaned container user %s", userID)
			h.startIdlePoller(userID)
		}
	}
}

func (h *Hub) startIdlePoller(userID string) {
	h.cancelIdlePoller(userID)

	timer := time.AfterFunc(PollInterval, func() {
		h.pollContainerForIdle(userID)
	})

	h.cleanupTimers[userID] = timer
}

func (h *Hub) cancelIdlePoller(userID string) {
	if timer, exists := h.cleanupTimers[userID]; exists {
		timer.Stop()
		delete(h.cleanupTimers, userID)
	}
}

func (h *Hub) pollContainerForIdle(userID string) {
	h.mutex.Lock()
	containerInfo, exists := h.userContainers[userID]
	h.mutex.Unlock()

	if !exists {
		return
	}

	containerName := containerInfo.ContainerName

	// Get container processes
	processes, err := docker.GetContainerProcesses(containerName)
	if err != nil {
		logrus.WithError(err).Warnf("docker top failed for %s", containerName)
		// Schedule next poll
		h.startIdlePoller(userID)
		return
	}

	if len(processes) == 0 {
		logrus.Infof("No user processes left in %s, removing it", containerName)
		docker.RemoveContainer(containerName)
		
		h.mutex.Lock()
		delete(h.userContainers, userID)
		h.mutex.Unlock()
		return
	}

	// Schedule next poll
	h.startIdlePoller(userID)
}

// HandlePTYInput handles PTY input from WebSocket
func (h *Hub) HandlePTYInput(client *Client, data []byte) error {
	h.mutex.RLock()
	session, exists := h.sessions[client]
	h.mutex.RUnlock()

	if !exists || session.PTY == nil {
		return fmt.Errorf("no active PTY session")
	}

	var inputData PTYInputData
	if err := json.Unmarshal(data, &inputData); err != nil {
		return fmt.Errorf("failed to unmarshal PTY input: %w", err)
	}

	_, err := session.PTY.Write([]byte(inputData.Input))
	return err
}

// HandleResize handles terminal resize from WebSocket
func (h *Hub) HandleResize(client *Client, data []byte) error {
	h.mutex.Lock()
	session, exists := h.sessions[client]
	h.mutex.Unlock()

	if !exists {
		return fmt.Errorf("no session found")
	}

	var resizeData ResizeData
	if err := json.Unmarshal(data, &resizeData); err != nil {
		return fmt.Errorf("failed to unmarshal resize data: %w", err)
	}

	// If not attached yet, do it now
	if !session.ContainerAttached {
		if err := h.attachToContainer(client, session); err != nil {
			return fmt.Errorf("failed to attach to container: %w", err)
		}
	}

	// Set terminal window size
	if session.PTY != nil {
		if err := setWinSize(session.PTY, resizeData.Rows, resizeData.Cols); err != nil {
			return fmt.Errorf("failed to set window size: %w", err)
		}
		logrus.Debugf("Successfully resized terminal to %dx%d", resizeData.Rows, resizeData.Cols)
	}

	return nil
}

func (h *Hub) attachToContainer(client *Client, session *SessionInfo) error {
	// Ensure container is running before attaching
	running, err := docker.ContainerIsRunning(session.ContainerName)
	if err != nil {
		return fmt.Errorf("failed to check container status: %w", err)
	}

	if !running {
		logrus.Infof("Container %s not running at attach time; attempting restart", session.ContainerName)
		if err := docker.StartContainer(session.ContainerName); err != nil {
			logrus.Warnf("Failed to restart %s; spawning new container", session.ContainerName)
			portRange := docker.NewPortRange(client.User.PortStart)
			if err := docker.SpawnContainer(client.User.ID, session.ContainerName, portRange); err != nil {
				return fmt.Errorf("failed to spawn replacement container: %w", err)
			}
			logrus.Infof("Spawned replacement container %s", session.ContainerName)
		}
	}

	// Create PTY and attach to container
	cmd, err := docker.AttachToContainer(session.ContainerName, session.TabID)
	if err != nil {
		return fmt.Errorf("failed to attach to container: %w", err)
	}

	// Start the command with PTY
	pty, err := startPTY(cmd)
	if err != nil {
		return fmt.Errorf("failed to start PTY: %w", err)
	}

	session.PTY = pty
	session.Cmd = cmd
	session.ContainerAttached = true

	// Start reading from PTY and forwarding to WebSocket
	go h.readAndForwardPTYOutput(client, session)

	logrus.Infof("Attached to container for user %s tab %s", session.UserID, session.TabID)
	return nil
}

func (h *Hub) readAndForwardPTYOutput(client *Client, session *SessionInfo) {
	defer func() {
		if session.PTY != nil {
			session.PTY.Close()
		}
		logrus.Infof("Stopping read thread for client %p", client)
	}()

	buffer := make([]byte, 1024*20)
	for {
		select {
		case <-h.ctx.Done():
			return
		default:
			n, err := session.PTY.Read(buffer)
			if err != nil {
				if err != io.EOF {
					logrus.WithError(err).Debug("PTY read error")
				}
				return
			}

			if n > 0 {
				output := string(buffer[:n])
				message := Message{
					Type: "pty-output",
					Data: map[string]string{"output": output},
				}

				msgBytes, err := json.Marshal(message)
				if err != nil {
					logrus.WithError(err).Error("Failed to marshal PTY output message")
					continue
				}

				select {
				case client.Send <- msgBytes:
				case <-time.After(time.Second):
					logrus.Warn("Client send channel blocked, dropping message")
					return
				}
			}
		}
	}
}

// setWinSize sets the terminal window size using syscalls
func setWinSize(ptyFile *os.File, rows, cols int) error {
	// Use pty.Setsize for reliability across platforms
	return pty.Setsize(ptyFile, &pty.Winsize{Rows: uint16(rows), Cols: uint16(cols)})
}

// startPTY starts a command with a proper PTY
func startPTY(cmd *exec.Cmd) (*os.File, error) {
	return pty.Start(cmd)
}
