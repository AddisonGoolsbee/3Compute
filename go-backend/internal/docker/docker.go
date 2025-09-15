package docker

import (
	"fmt"
	"os"
	"os/exec"
	"runtime"
	"strings"

	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/mem"
	"github.com/sirupsen/logrus"
)

const (
	MaxUsers          = 20
	ContainerUserUID  = 999
	ContainerUserGID  = 995
	NetworkName       = "isolated_net"
)

var (
	cpuPerUser    float64
	memoryPerUser float64
)

// function indirection for testability
var (
	containerIsRunningFn = ContainerIsRunning
)

func init() {
	// Calculate resource limits per user
	numCPUs, err := cpu.Counts(true)
	if err != nil || numCPUs == 0 {
		numCPUs = 1
	}

	vmStat, err := mem.VirtualMemory()
	if err != nil {
		logrus.WithError(err).Warn("Failed to get memory info, using default")
		memoryPerUser = 512 // Default 512MB
	} else {
		memoryMB := vmStat.Total / (1024 * 1024)
		memoryPerUser = float64(memoryMB) / MaxUsers
	}

	cpuPerUser = 1.0
	logrus.Debugf("Resource limits: CPU per user: %.1f, Memory per user: %.1f MB", cpuPerUser, memoryPerUser)
}

// SetupUploadsDirectory creates /tmp/uploads directory with proper ownership
func SetupUploadsDirectory() error {
	uploadsDir := "/tmp/uploads"
	if err := os.MkdirAll(uploadsDir, 0755); err != nil {
		return fmt.Errorf("failed to create uploads directory: %w", err)
	}

	// Set ownership to match container user (UID 10000)
	if err := os.Chown(uploadsDir, ContainerUserUID, ContainerUserGID); err != nil {
		// This might fail in development environments, which is OK
		logrus.WithError(err).Warnf("Failed to set ownership for %s", uploadsDir)
	} else {
		logrus.Debugf("Set ownership of /tmp/uploads to UID %d", ContainerUserUID)
	}

	return nil
}

// PrepareUserDirectory ensures user directory exists with correct ownership before container creation
func PrepareUserDirectory(userID string) error {
	userDir := fmt.Sprintf("/tmp/uploads/%s", userID)

	// Create the directory if it doesn't exist
	if err := os.MkdirAll(userDir, 0755); err != nil {
		return fmt.Errorf("failed to create user directory: %w", err)
	}

	// Set ownership to match container user
	if err := os.Chown(userDir, ContainerUserUID, ContainerUserGID); err != nil {
		logrus.WithError(err).Warnf("Failed to set ownership for %s", userDir)
	} else {
		logrus.Debugf("Set ownership of %s to UID %d", userDir, ContainerUserUID)
	}

	return nil
}

// SetupIsolatedNetwork creates the isolated Docker network if it doesn't exist
func SetupIsolatedNetwork() error {
	// Check if the network exists
	cmd := exec.Command("docker", "network", "inspect", NetworkName)
	if err := cmd.Run(); err != nil {
		// Network doesn't exist, so create it
		cmd = exec.Command("docker", "network", "create",
			"--driver", "bridge",
			"--opt", "com.docker.network.bridge.enable_icc=false", // Disable inter-container communication
			NetworkName)
		
		if err := cmd.Run(); err != nil {
			return fmt.Errorf("failed to create network %s: %w", NetworkName, err)
		}
		logrus.Infof("Network %s created successfully", NetworkName)
	}

	// Skip iptables configuration on non-Linux systems or in CI
	if runtime.GOOS != "linux" || os.Getenv("CI") == "true" {
		if os.Getenv("CI") == "true" {
			logrus.Warn("Skipping iptables config in CI")
		}
		return nil
	}

	// Get the bridge name for the Docker network
	cmd = exec.Command("docker", "network", "inspect", "-f", "{{.Id}}", NetworkName)
	output, err := cmd.Output()
	if err != nil {
		logrus.WithError(err).Warn("Failed to get network ID")
		return nil
	}

	networkID := strings.TrimSpace(string(output))
	if len(networkID) > 12 {
		networkID = networkID[:12]
	}

	// Add iptables rule to block communication with the host
	cmd = exec.Command("iptables", "-I", "DOCKER-USER", "-i", fmt.Sprintf("br-%s", networkID), "-o", "docker0", "-j", "DROP")
	if err := cmd.Run(); err != nil {
		logrus.WithError(err).Warnf("Failed to block host communication for network %s", NetworkName)
	} else {
		logrus.Infof("Blocked host communication for network %s", NetworkName)
	}

	return nil
}

// ContainerExists checks if a container exists (running or stopped)
func ContainerExists(containerName string) (bool, error) {
	cmd := exec.Command("docker", "ps", "-a", "--filter", fmt.Sprintf("name=%s", containerName), "--format", "{{.Names}}")
	output, err := cmd.Output()
	if err != nil {
		return false, err
	}

	return strings.Contains(string(output), containerName), nil
}

// ContainerIsRunning checks if a container is currently running
func ContainerIsRunning(containerName string) (bool, error) {
	cmd := exec.Command("docker", "ps", "--filter", fmt.Sprintf("name=%s", containerName), "--format", "{{.Names}}")
	output, err := cmd.Output()
	if err != nil {
		return false, err
	}

	return strings.Contains(string(output), containerName), nil
}

// SpawnContainer creates and starts a new Docker container
func SpawnContainer(userID, containerName string, portRange *PortRange) error {
	// Only create a new container if one doesn't already exist
	exists, err := ContainerExists(containerName)
	if err != nil {
		return fmt.Errorf("failed to check if container exists: %w", err)
	}
	if exists {
		logrus.Warnf("Container %s already exists, not creating a new one", containerName)
		return fmt.Errorf("container %s already exists", containerName)
	}

	// Prepare user directory with correct ownership before mounting
	if err := PrepareUserDirectory(userID); err != nil {
		return fmt.Errorf("failed to prepare user directory: %w", err)
	}

	// Build docker run command
	args := []string{
		"run",
		"-d",
		"--rm",
		"--name", containerName,
		"--hostname", "3compute",
		"--network=" + NetworkName, // prevent containers from accessing other containers or host, but allows internet
		"--cap-drop=ALL",           // prevent a bunch of admin linux stuff
		"--user=999:995",           // login as dedicated 3compute-container user to avoid any host conflicts
		// Security profiles
		"--security-opt", "no-new-privileges", // prevent container from gaining privilege
		// Resource limits
		"--cpus", fmt.Sprintf("%.1f", cpuPerUser),
		"--memory", fmt.Sprintf("%.0fm", memoryPerUser),
		// Volume mount
		"-v", fmt.Sprintf("/tmp/uploads/%s:/app", userID),
	}

	// Add port mapping if provided
	if portRange != nil {
		args = append(args, "-p", fmt.Sprintf("%d-%d:%d-%d", portRange.Start, portRange.End, portRange.Start, portRange.End))
	}

	args = append(args, "3compute")

	logrus.Infof("[%s] Attempting to spawn container '%s' with cmd: docker %s", userID, containerName, strings.Join(args, " "))

	cmd := exec.Command("docker", args...)
	if err := cmd.Run(); err != nil {
		logrus.WithError(err).Errorf("[%s] Failed to start container '%s'", userID, containerName)
		return fmt.Errorf("failed to start container: %w", err)
	}

	logrus.Infof("[%s] Successfully started container '%s'", userID, containerName)
	return nil
}

// AttachToContainer attaches to a running container with tmux
func AttachToContainer(containerName, tabID string) (*exec.Cmd, error) {
	// Check if container is running
	running, err := containerIsRunningFn(containerName)
	if err != nil {
		return nil, fmt.Errorf("failed to check container status: %w", err)
	}
	if !running {
		logrus.Errorf("Cannot attach to container '%s' - it is not running", containerName)
		return nil, fmt.Errorf("container %s is not running", containerName)
	}

	// Create unique tmux session for each tab
	sessionName := fmt.Sprintf("3compute-tab%s", tabID)
	// Enable tmux mouse so wheel scroll enters copy-mode, and increase history
	tmuxCmd := fmt.Sprintf(
		"tmux set -g mouse on; tmux set -g status off; tmux set -g history-limit 100000; tmux new-session -d -A -s %s; tmux attach -t %s",
		sessionName, sessionName,
	)
	cmd := exec.Command("docker", "exec", "-it", containerName, "sh", "-lc", tmuxCmd)

	logrus.Infof("Attaching to container '%s' with tmux session '%s'", containerName, sessionName)
	return cmd, nil
}

// PortRange represents a port range
type PortRange struct {
	Start int
	End   int
}

// NewPortRange creates a new port range from start port
func NewPortRange(start int) *PortRange {
	return &PortRange{
		Start: start,
		End:   start + 9,
	}
}

// StartContainer starts a stopped container
func StartContainer(containerName string) error {
	cmd := exec.Command("docker", "start", containerName)
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("failed to start container %s: %w", containerName, err)
	}
	logrus.Infof("Started container %s", containerName)
	return nil
}

// RemoveContainer forcefully removes a container
func RemoveContainer(containerName string) error {
	cmd := exec.Command("docker", "rm", "-f", containerName)
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("failed to remove container %s: %w", containerName, err)
	}
	logrus.Infof("Removed container %s", containerName)
	return nil
}

// GetContainerProcesses gets the list of processes running in a container
func GetContainerProcesses(containerName string) ([]string, error) {
	cmd := exec.Command("docker", "top", containerName)
	output, err := cmd.Output()
	if err != nil {
		return nil, fmt.Errorf("failed to get container processes: %w", err)
	}

	lines := strings.Split(strings.TrimSpace(string(output)), "\n")
	if len(lines) < 2 {
		return []string{}, nil // No processes listed
	}

	// Parse header to find COMMAND column
	headerCols := strings.Fields(lines[0])
	cmdIdx := len(headerCols) - 1 // Default to last column
	for i, col := range headerCols {
		if col == "COMMAND" {
			cmdIdx = i
			break
		}
	}

	var processes []string
	for _, line := range lines[1:] {
		cols := strings.Fields(line)
		if len(cols) > cmdIdx {
			cmdStr := cols[cmdIdx]
			
			// Skip infrastructure processes
			if strings.HasPrefix(cmdStr, "/sbin/tini") ||
				strings.HasPrefix(cmdStr, "tmux ") ||
				strings.HasPrefix(cmdStr, "-sh") ||
				strings.HasPrefix(cmdStr, "sh") ||
				strings.HasPrefix(cmdStr, "-ash") ||
				cmdStr == "sleep infinity" ||
				cmdStr == "bash" {
				continue
			}
			processes = append(processes, cmdStr)
		}
	}

	return processes, nil
}

// KillTmuxSession kills a specific tmux session in a container
func KillTmuxSession(containerName, tabID string) error {
	sessionName := fmt.Sprintf("3compute-tab%s", tabID)
	cmd := exec.Command("docker", "exec", containerName, "tmux", "kill-session", "-t", sessionName)
	
	if err := cmd.Run(); err != nil {
		logrus.WithError(err).Warnf("Failed to kill tmux session %s in %s", sessionName, containerName)
		return err
	}
	
	logrus.Infof("Killed tmux session %s in container %s", sessionName, containerName)
	return nil
}

// SendTmuxKeys sends keys to a tmux session
func SendTmuxKeys(containerName, sessionName string, keys ...string) error {
	args := []string{"exec", containerName, "tmux", "send-keys", "-t", sessionName}
	args = append(args, keys...)
	
	cmd := exec.Command("docker", args...)
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("failed to send tmux keys: %w", err)
	}
	
	return nil
}
