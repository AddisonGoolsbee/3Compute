package terminal

import (
	"os"
	"testing"
	"time"

	"3compute-backend/internal/auth"
	"3compute-backend/internal/docker"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewHub(t *testing.T) {
	hub := NewHub()
	require.NotNil(t, hub)
	assert.NotNil(t, hub.clients)
	assert.NotNil(t, hub.userContainers)
	assert.NotNil(t, hub.sessions)
	assert.NotNil(t, hub.cleanupTimers)
	assert.NotNil(t, hub.broadcast)
	assert.NotNil(t, hub.register)
	assert.NotNil(t, hub.unregister)
}

func TestHubSetAndGet(t *testing.T) {
	hub := NewHub()
	SetHub(hub)
	
	retrievedHub := GetHub()
	assert.Equal(t, hub, retrievedHub)
}

func TestSessionInfo(t *testing.T) {
	session := &SessionInfo{
		UserID:            "test-user",
		TabID:             "1",
		ContainerName:     "user-container-test-user",
		ContainerAttached: false,
	}
	
	assert.Equal(t, "test-user", session.UserID)
	assert.Equal(t, "1", session.TabID)
	assert.Equal(t, "user-container-test-user", session.ContainerName)
	assert.False(t, session.ContainerAttached)
}

func TestContainerInfo(t *testing.T) {
	containerInfo := &ContainerInfo{
		ContainerName: "user-container-123",
		PortRange: &docker.PortRange{Start: 8000, End: 8009},
	}
	
	assert.Equal(t, "user-container-123", containerInfo.ContainerName)
	assert.NotNil(t, containerInfo.PortRange)
}

func TestMessage(t *testing.T) {
	message := Message{
		Type: "pty-input",
		Data: map[string]string{"input": "ls -la\n"},
	}
	
	assert.Equal(t, "pty-input", message.Type)
	assert.NotNil(t, message.Data)
}

func TestPTYInputData(t *testing.T) {
	inputData := PTYInputData{
		Input: "echo hello\n",
	}
	
	assert.Equal(t, "echo hello\n", inputData.Input)
}

func TestResizeData(t *testing.T) {
	resizeData := ResizeData{
		Rows: 24,
		Cols: 80,
	}
	
	assert.Equal(t, 24, resizeData.Rows)
	assert.Equal(t, 80, resizeData.Cols)
}

func TestHubUserContainerOperations(t *testing.T) {
	hub := NewHub()
	
	userID := "test-user"
	containerInfo := &ContainerInfo{
		ContainerName: "user-container-test-user",
		PortRange: &docker.PortRange{Start: 8000, End: 8009},
	}
	
	// Add container info
	hub.mutex.Lock()
	hub.userContainers[userID] = containerInfo
	hub.mutex.Unlock()
	
	// Verify it was added
	hub.mutex.RLock()
	stored, exists := hub.userContainers[userID]
	hub.mutex.RUnlock()
	
	assert.True(t, exists)
	assert.Equal(t, containerInfo.ContainerName, stored.ContainerName)
}

func TestHubSessionOperations(t *testing.T) {
	hub := NewHub()
	
	// Create a mock client
	client := &Client{
		Hub:   hub,
		User:  &auth.User{ID: "test-user", Email: "test@example.com", PortStart: 8000},
		TabID: "1",
	}
	
	sessionInfo := &SessionInfo{
		UserID:            "test-user",
		TabID:             "1",
		ContainerName:     "user-container-test-user",
		ContainerAttached: false,
	}
	
	// Add session
	hub.mutex.Lock()
	hub.sessions[client] = sessionInfo
	hub.mutex.Unlock()
	
	// Verify session was added
	hub.mutex.RLock()
	stored, exists := hub.sessions[client]
	hub.mutex.RUnlock()
	
	assert.True(t, exists)
	assert.Equal(t, sessionInfo.UserID, stored.UserID)
	assert.Equal(t, sessionInfo.TabID, stored.TabID)
}

func TestHasActiveSessionsForUser(t *testing.T) {
	hub := NewHub()
	
	// Create mock clients
	client1 := &Client{
		Hub:   hub,
		User:  &auth.User{ID: "user1", Email: "user1@example.com", PortStart: 8000},
		TabID: "1",
	}
	
	client2 := &Client{
		Hub:   hub,
		User:  &auth.User{ID: "user2", Email: "user2@example.com", PortStart: 8010},
		TabID: "1",
	}
	
	// Add sessions
	hub.mutex.Lock()
	hub.sessions[client1] = &SessionInfo{UserID: "user1", TabID: "1"}
	hub.sessions[client2] = &SessionInfo{UserID: "user2", TabID: "1"}
	hub.mutex.Unlock()
	
	// Test has active sessions
	assert.True(t, hub.hasActiveSessionsForUser("user1"))
	assert.True(t, hub.hasActiveSessionsForUser("user2"))
	assert.False(t, hub.hasActiveSessionsForUser("user3"))
}

func TestCleanupTimerOperations(t *testing.T) {
	hub := NewHub()
	
	userID := "test-user"
	
	// Test starting idle poller
	hub.startIdlePoller(userID)
	
	// Verify timer was created
	hub.mutex.RLock()
	timer, exists := hub.cleanupTimers[userID]
	hub.mutex.RUnlock()
	
	assert.True(t, exists)
	assert.NotNil(t, timer)
	
	// Test canceling idle poller
	hub.cancelIdlePoller(userID)
	
	// Verify timer was removed
	hub.mutex.RLock()
	_, exists = hub.cleanupTimers[userID]
	hub.mutex.RUnlock()
	
	assert.False(t, exists)
}

func TestHubStop(t *testing.T) {
	hub := NewHub()
	
	// Add some cleanup timers
	hub.cleanupTimers["user1"] = time.NewTimer(time.Hour)
	hub.cleanupTimers["user2"] = time.NewTimer(time.Hour)
	
	// Stop the hub
	hub.Stop()
	
	// Verify context was cancelled
	select {
	case <-hub.ctx.Done():
		// Expected
	default:
		t.Error("Hub context should be cancelled after Stop()")
	}
}

func TestClientOperations(t *testing.T) {
	hub := NewHub()
	
	user := &auth.User{
		ID:        "test-user",
		Email:     "test@example.com",
		PortStart: 8000,
	}
	
	client := &Client{
		Hub:   hub,
		User:  user,
		TabID: "1",
		Send:  make(chan []byte, 256),
	}
	
	assert.Equal(t, hub, client.Hub)
	assert.Equal(t, user, client.User)
	assert.Equal(t, "1", client.TabID)
	assert.NotNil(t, client.Send)
}

func TestMultipleTabSessions(t *testing.T) {
	hub := NewHub()
	
	user := &auth.User{
		ID:        "test-user",
		Email:     "test@example.com",
		PortStart: 8000,
	}
	
	// Create clients for different tabs
	client1 := &Client{Hub: hub, User: user, TabID: "1"}
	client2 := &Client{Hub: hub, User: user, TabID: "2"}
	
	// Add sessions
	hub.mutex.Lock()
	hub.sessions[client1] = &SessionInfo{UserID: "test-user", TabID: "1", ContainerName: "user-container-test-user"}
	hub.sessions[client2] = &SessionInfo{UserID: "test-user", TabID: "2", ContainerName: "user-container-test-user"}
	hub.mutex.Unlock()
	
	// Verify both sessions exist with different tab IDs
	hub.mutex.RLock()
	session1 := hub.sessions[client1]
	session2 := hub.sessions[client2]
	hub.mutex.RUnlock()
	
	assert.Equal(t, "1", session1.TabID)
	assert.Equal(t, "2", session2.TabID)
	assert.Equal(t, session1.ContainerName, session2.ContainerName) // Same container
	assert.Equal(t, session1.UserID, session2.UserID)              // Same user
}

func TestConstants(t *testing.T) {
	assert.Equal(t, 4*time.Second, PollInterval)
}

// Mock tests for functions that require actual Docker/system interaction
func TestMockContainerOperations(t *testing.T) {
	// These would be more comprehensive with proper mocking
	// For now, we test that the structures and basic logic work
	
	hub := NewHub()
	assert.NotNil(t, hub)
	
	// Test that we can create container info
	containerInfo := &ContainerInfo{
		ContainerName: "test-container",
		PortRange: &docker.PortRange{Start: 8000, End: 8009},
	}
	
	assert.Equal(t, "test-container", containerInfo.ContainerName)
	assert.Equal(t, 8000, containerInfo.PortRange.Start)
	assert.Equal(t, 8009, containerInfo.PortRange.End)
}

func TestSetWinSizeNoPanic(t *testing.T) {
	// Create a dummy file using os.Pipe to simulate a pty file-like object
	r, w, err := os.Pipe()
	require.NoError(t, err)
	defer r.Close()
	defer w.Close()

	// Ensure function returns an error (since it's not a real pty), but does not panic
	err = setWinSize(r, 24, 80)
	// We can't assert specific error, just that the call returns (not panic)
	_ = err
}
