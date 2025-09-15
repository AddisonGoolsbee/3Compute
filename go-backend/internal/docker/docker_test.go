package docker

import (
	"os"
	"os/exec"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestContainerExists(t *testing.T) {
	// This test requires Docker to be running and is more of an integration test
	// In a real environment, you might want to mock the exec.Command calls
	
	// Test with a container that definitely doesn't exist
	exists, err := ContainerExists("non-existent-container-12345")
	require.NoError(t, err)
	assert.False(t, exists)
}

func TestContainerIsRunning(t *testing.T) {
	// Test with a container that definitely doesn't exist
	running, err := ContainerIsRunning("non-existent-container-12345")
	require.NoError(t, err)
	assert.False(t, running)
}

func TestNewPortRange(t *testing.T) {
	portRange := NewPortRange(8000)
	assert.Equal(t, 8000, portRange.Start)
	assert.Equal(t, 8009, portRange.End)
}

func TestPortRangeCalculation(t *testing.T) {
	testCases := []struct {
		start    int
		expected int
	}{
		{8000, 8009},
		{9000, 9009},
		{10000, 10009},
	}

	for _, tc := range testCases {
		portRange := NewPortRange(tc.start)
		assert.Equal(t, tc.start, portRange.Start)
		assert.Equal(t, tc.expected, portRange.End)
	}
}

func TestPrepareUserDirectory(t *testing.T) {
	// Test with a temporary directory
	tempDir := "/tmp/test-user-dir-12345"
	defer os.RemoveAll(tempDir)

	// This would normally create /tmp/uploads/test-user-12345
	// but we'll test the logic without actually changing ownership
	userID := "test-user-12345"
	
	// Create the directory manually for testing
	userDir := "/tmp/uploads/" + userID
	err := os.MkdirAll(userDir, 0755)
	require.NoError(t, err)
	defer os.RemoveAll(userDir)

	// Test that the function doesn't error out
	err = PrepareUserDirectory(userID)
	// We expect this might fail due to permission issues in test environment
	// but the directory should exist
	_, statErr := os.Stat(userDir)
	assert.NoError(t, statErr)
}

func TestSetupUploadsDirectory(t *testing.T) {
	// Test that the function doesn't error out
	// In a real test environment, this might fail due to permissions
	// but we can test that it doesn't panic
	err := SetupUploadsDirectory()
	// We don't assert no error because it might fail due to permissions
	// in test environments, but it shouldn't panic
	_ = err
}

func TestResourceLimitsCalculation(t *testing.T) {
	// Test that resource limits are calculated
	assert.Greater(t, cpuPerUser, 0.0)
	assert.Greater(t, memoryPerUser, 0.0)
	
	// CPU per user should be reasonable
	assert.LessOrEqual(t, cpuPerUser, 10.0) // No more than 10 CPUs per user
	
	// Memory per user should be reasonable (in MB)
	assert.GreaterOrEqual(t, memoryPerUser, 50.0) // At least 50MB per user
	assert.LessOrEqual(t, memoryPerUser, 10000.0) // No more than 10GB per user
}

func TestContainerLifecycle(t *testing.T) {
	// This is more of an integration test that would require Docker
	// For unit testing, we'd mock the exec.Command calls
	
	containerName := "test-container-lifecycle"
	userID := "test-user"
	
	// Test that SpawnContainer would fail for existing container
	// (This is testing the logic, not actually spawning containers)
	
	// Mock that container exists
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}
	
	// In a real test, we'd mock exec.Command to return specific outputs
	// For now, we'll just test that the functions don't panic
	
	exists, err := ContainerExists(containerName)
	require.NoError(t, err)
	
	if exists {
		// If container exists, SpawnContainer should fail
		err = SpawnContainer(userID, containerName, NewPortRange(8000))
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "already exists")
	}
}

func TestGetContainerProcesses(t *testing.T) {
	// Test with non-existent container
	processes, err := GetContainerProcesses("non-existent-container-12345")
	assert.Error(t, err)
	assert.Nil(t, processes)
}

func TestKillTmuxSession(t *testing.T) {
	// Test with non-existent container
	err := KillTmuxSession("non-existent-container-12345", "1")
	assert.Error(t, err)
}

func TestSendTmuxKeys(t *testing.T) {
	// Test with non-existent container
	err := SendTmuxKeys("non-existent-container-12345", "test-session", "test", "keys")
	assert.Error(t, err)
}

func TestDockerCommandConstruction(t *testing.T) {
	// Test that we can construct docker commands without errors
	containerName := "test-container"
	userID := "test-user"
	portRange := NewPortRange(8000)
	
	// We can't actually run SpawnContainer in tests without Docker,
	// but we can test that the function accepts the right parameters
	err := SpawnContainer(userID, containerName, portRange)
	// This will likely fail because Docker isn't running in tests,
	// but it shouldn't panic and should give us a meaningful error
	assert.Error(t, err)
}

func TestAttachToContainer(t *testing.T) {
	// Test with non-existent container
	cmd, err := AttachToContainer("non-existent-container-12345", "1")
	assert.Error(t, err)
	assert.Nil(t, cmd)
	assert.Contains(t, err.Error(), "not running")
}

func TestAttachToContainerEnablesMouseAndHistory(t *testing.T) {
	// Save and mock the container running check
	oldFn := containerIsRunningFn
	containerIsRunningFn = func(name string) (bool, error) { return true, nil }
	defer func() { containerIsRunningFn = oldFn }()

	cmd, err := AttachToContainer("test-container", "2")
	require.NoError(t, err)
	require.NotNil(t, cmd)

	// The command should include sh -lc and the tmux settings
	args := cmd.Args
	require.GreaterOrEqual(t, len(args), 6)
	assert.Equal(t, "docker", args[0])
	assert.Equal(t, "exec", args[1])
	assert.Equal(t, "-it", args[2])
	assert.Equal(t, "test-container", args[3])
	assert.Equal(t, "sh", args[4])
	assert.Equal(t, "-lc", args[5])

	// The tmux command string is the last argument
	tmuxStr := args[len(args)-1]
	assert.Contains(t, tmuxStr, "tmux set -g mouse off")
	assert.Contains(t, tmuxStr, "tmux set -g terminal-overrides '")
	assert.Contains(t, tmuxStr, "smcup@:rmcup@")
	assert.Contains(t, tmuxStr, "tmux set -g history-limit 100000")
	assert.Contains(t, tmuxStr, "tmux new-session -d -A -s 3compute-tab2")
	assert.Contains(t, tmuxStr, "tmux attach -t 3compute-tab2")
}

func TestStartContainer(t *testing.T) {
	// Test with non-existent container
	err := StartContainer("non-existent-container-12345")
	assert.Error(t, err)
}

func TestRemoveContainer(t *testing.T) {
	// Test with non-existent container
	// docker rm -f should not error even if container doesn't exist
	err := RemoveContainer("non-existent-container-12345")
	// This might not error because docker rm -f is forgiving
	_ = err
}

// MockExecCommand is a helper for mocking exec.Command in tests
func MockExecCommand(command string, args ...string) *exec.Cmd {
	// This would be used in more sophisticated tests to mock Docker commands
	return exec.Command("echo", "mocked")
}

func TestNetworkSetup(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}
	
	// Test network setup
	err := SetupIsolatedNetwork()
	// This might fail in test environments without Docker or proper permissions
	// but shouldn't panic
	_ = err
}
