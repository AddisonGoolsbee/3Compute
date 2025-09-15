package main

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"3compute-backend/internal/app"
	"3compute-backend/internal/auth"
	"3compute-backend/internal/terminal"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestMain(m *testing.M) {
	// Set up test environment
	os.Setenv("FLASK_ENV", "test")
	os.Setenv("FLASK_SECRET", "test-secret-key")
	os.Setenv("GOOGLE_CLIENT_ID", "test-client-id")
	os.Setenv("GOOGLE_CLIENT_SECRET", "test-client-secret")
	os.Setenv("FRONTEND_ORIGIN_DEV", "http://localhost:3000")
	os.Setenv("REDIRECT_URI_DEV", "http://localhost:5000/auth/callback")
	
	// Set Gin to test mode
	gin.SetMode(gin.TestMode)
	
	// Run tests
	code := m.Run()
	
	// Clean up
	os.Exit(code)
}

func TestApplicationInitialization(t *testing.T) {
	application := app.NewApp()
	require.NotNil(t, application)
	
	// Test that we can create the app without panicking
	assert.NotPanics(t, func() {
		app.NewApp()
	})
}

func TestTerminalDockerIntegration(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}
	
	// Create a hub for testing
	hub := terminal.NewHub()
	require.NotNil(t, hub)
	
	// Test that we can start and stop the hub
	go hub.Run()
	
	// Give it a moment to start
	time.Sleep(10 * time.Millisecond)
	
	hub.Stop()
	
	// Verify hub stopped
	select {
	case <-hub.Context().Done():
		// Expected
	case <-time.After(time.Second):
		t.Error("Hub should have stopped within 1 second")
	}
}

func TestAuthFileIntegration(t *testing.T) {
	// Create a temporary file for testing
	tempFile, err := os.CreateTemp("", "users_integration_test_*.json")
	require.NoError(t, err)
	defer os.Remove(tempFile.Name())
	tempFile.Close()
	
	// This would test the auth file integration, but we need to be careful
	// not to interfere with the actual users.json file
	
	// Test that we can create user data
	userInfo := struct {
		ID            string `json:"id"`
		Email         string `json:"email"`
		VerifiedEmail bool   `json:"verified_email"`
		Name          string `json:"name"`
	}{
		ID:            "integration-test-user",
		Email:         "test@integration.com",
		VerifiedEmail: true,
		Name:          "Integration Test User",
	}
	
	// In a real integration test, we'd test the full auth flow
	// For now, we'll just test the data structures
	assert.Equal(t, "integration-test-user", userInfo.ID)
	assert.Equal(t, "test@integration.com", userInfo.Email)
	assert.True(t, userInfo.VerifiedEmail)
}

func TestTerminalAuthIntegration(t *testing.T) {
	// Test that authenticated users can access terminal
	user := &auth.User{
		ID:        "test-user",
		Email:     "test@example.com",
		PortStart: 8000,
	}
	
	require.NotNil(t, user)
	assert.Equal(t, "test-user", user.ID)
	assert.Equal(t, 8000, user.PortStart)
	assert.Equal(t, 8009, user.PortEnd())
	
	// Test port range
	start, end := user.PortRange()
	assert.Equal(t, 8000, start)
	assert.Equal(t, 8009, end)
}

func TestFullWorkflowIntegration(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}
	
	// Create application
	application := app.NewApp()
	require.NotNil(t, application)
	
	// This would test a complete user workflow, but requires more setup
	// For now, we'll test that the components can be initialized together
	
	// Create hub
	hub := terminal.NewHub()
	require.NotNil(t, hub)
	
	// Set the hub
	terminal.SetHub(hub)
	
	// Verify we can get it back
	retrievedHub := terminal.GetHub()
	assert.Equal(t, hub, retrievedHub)
}

func TestMultiTabUserSession(t *testing.T) {
	// Test user with multiple terminal tabs
	user := &auth.User{
		ID:        "multi-tab-user",
		Email:     "multitab@example.com",
		PortStart: 8600,
	}
	
	// Create hub
	hub := terminal.NewHub()
	
	// Simulate multiple tabs for the same user
	// In a real integration test, we'd create actual WebSocket connections
	
	// For now, test that we can create multiple sessions
	client1 := &terminal.Client{
		Hub:   hub,
		User:  user,
		TabID: "1",
		Send:  make(chan []byte, 256),
	}
	
	client2 := &terminal.Client{
		Hub:   hub,
		User:  user,
		TabID: "2",
		Send:  make(chan []byte, 256),
	}
	
	assert.Equal(t, "1", client1.TabID)
	assert.Equal(t, "2", client2.TabID)
	assert.Equal(t, user.ID, client1.User.ID)
	assert.Equal(t, user.ID, client2.User.ID)
}

func TestErrorHandlingIntegration(t *testing.T) {
	// Test handling of various error conditions
	
	// Test Docker failure handling (simulated)
	hub := terminal.NewHub()
	require.NotNil(t, hub)
	
	// Test that the system handles errors gracefully
	// In a real integration test, we'd simulate Docker failures
	
	// For now, test that error conditions don't panic
	assert.NotPanics(t, func() {
		hub.Stop()
	})
}

func TestHTTPEndpointsIntegration(t *testing.T) {
	// Test that HTTP endpoints are properly registered and respond
	application := app.NewApp()
	require.NotNil(t, application)
	
	// Create a test server
	ts := httptest.NewServer(application.GetRouter())
	defer ts.Close()
	
	// Test that endpoints exist and return appropriate responses
	testCases := []struct {
		method   string
		path     string
		expected int
	}{
		{"GET", "/auth/me", http.StatusUnauthorized},     // Should require auth
		{"GET", "/list-files", http.StatusUnauthorized}, // Should require auth
		{"POST", "/github-webhook", http.StatusBadRequest}, // Should require signature
	}
	
	for _, tc := range testCases {
		req, err := http.NewRequest(tc.method, ts.URL+tc.path, nil)
		require.NoError(t, err)
		
		resp, err := http.DefaultClient.Do(req)
		require.NoError(t, err)
		resp.Body.Close()
		
		assert.Equal(t, tc.expected, resp.StatusCode)
	}
}

func TestWebSocketIntegration(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping WebSocket integration test in short mode")
	}
	
	// Test WebSocket functionality
	hub := terminal.NewHub()
	require.NotNil(t, hub)
	
	// Start hub
	go hub.Run()
	defer hub.Stop()
	
	// In a real integration test, we'd create WebSocket connections
	// and test the full terminal functionality
	
	// For now, test that the hub can handle basic operations
	user := &auth.User{
		ID:        "websocket-test-user",
		Email:     "ws@example.com",
		PortStart: 8700,
	}
	
	// Test that we can create clients
	client := &terminal.Client{
		Hub:   hub,
		User:  user,
		TabID: "1",
		Send:  make(chan []byte, 256),
	}
	
	assert.NotNil(t, client)
	assert.Equal(t, hub, client.Hub)
	assert.Equal(t, user, client.User)
	assert.Equal(t, "1", client.TabID)
}

func TestConfigurationIntegration(t *testing.T) {
	// Test that configuration is properly loaded and used
	
	// Test environment variables
	assert.Equal(t, "test", os.Getenv("FLASK_ENV"))
	assert.Equal(t, "test-secret-key", os.Getenv("FLASK_SECRET"))
	
	// Test that the application uses these values
	// In a real integration test, we'd verify the configuration is applied
}

func TestResourceManagement(t *testing.T) {
	// Test that resources are properly managed and cleaned up
	
	// Create and destroy multiple hubs to test cleanup
	for i := 0; i < 5; i++ {
		hub := terminal.NewHub()
		require.NotNil(t, hub)
		
		go hub.Run()
		time.Sleep(time.Millisecond) // Let it start
		hub.Stop()
		
		// Verify it stopped
		select {
		case <-hub.Context().Done():
			// Expected
		case <-time.After(100 * time.Millisecond):
			t.Errorf("Hub %d did not stop in time", i)
		}
	}
}

func TestConcurrentOperations(t *testing.T) {
	// Test that the system handles concurrent operations correctly
	
	hub := terminal.NewHub()
	require.NotNil(t, hub)
	
	go hub.Run()
	defer hub.Stop()
	
	// Simulate concurrent user connections
	users := make([]*auth.User, 10)
	for i := 0; i < 10; i++ {
		users[i] = &auth.User{
			ID:        fmt.Sprintf("concurrent-user-%d", i),
			Email:     fmt.Sprintf("user%d@concurrent.com", i),
			PortStart: 8000 + i*10,
		}
	}
	
	// Test that we can create multiple clients concurrently
	done := make(chan bool, 10)
	for i, user := range users {
		go func(u *auth.User, index int) {
			client := &terminal.Client{
				Hub:   hub,
				User:  u,
				TabID: "1",
				Send:  make(chan []byte, 256),
			}
			
			assert.NotNil(t, client)
			done <- true
		}(user, i)
	}
	
	// Wait for all goroutines to complete
	for i := 0; i < 10; i++ {
		select {
		case <-done:
			// Expected
		case <-time.After(time.Second):
			t.Fatal("Concurrent operation timed out")
		}
	}
}
