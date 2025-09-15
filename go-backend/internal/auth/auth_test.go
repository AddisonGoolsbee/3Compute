package auth

import (
	"encoding/json"
	"io/ioutil"
	"os"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestUserProperties(t *testing.T) {
	user := &User{
		ID:        "123",
		Email:     "test@example.com",
		PortStart: 8000,
	}

	assert.Equal(t, "123", user.ID)
	assert.Equal(t, "test@example.com", user.Email)
	assert.Equal(t, 8000, user.PortStart)
	assert.Equal(t, 8009, user.PortEnd())
	portStart, portEnd := user.PortRange()
	assert.Equal(t, 8000, portStart)
	assert.Equal(t, 8009, portEnd)
}

func TestUpdateUserDataNewUser(t *testing.T) {
	// Create temp file
	tempFile, err := ioutil.TempFile("", "users_test_*.json")
	require.NoError(t, err)
	defer os.Remove(tempFile.Name())
	tempFile.Close()

	// Backup and replace usersJSONFile
	originalFile := usersJSONFile
	usersJSONFile = tempFile.Name()
	defer func() { usersJSONFile = originalFile }()

	userInfo := struct {
		ID            string `json:"id"`
		Email         string `json:"email"`
		VerifiedEmail bool   `json:"verified_email"`
		Name          string `json:"name"`
	}{
		ID:            "123",
		Email:         "test@example.com",
		VerifiedEmail: true,
		Name:          "Test User",
	}

	err = updateUserData("123", userInfo, "192.168.1.1", 8000)
	require.NoError(t, err)

	// Verify user was created
	userData, err := getUserData("123")
	require.NoError(t, err)
	assert.Equal(t, "test@example.com", userData.Email)
	assert.Equal(t, 1, userData.LoginCount)
	assert.Equal(t, 8000, userData.PortStart)
	assert.Equal(t, 8009, userData.PortEnd)
	assert.Contains(t, userData.IPAddresses, "192.168.1.1")
}

func TestUpdateUserDataExistingUser(t *testing.T) {
	// Create temp file
	tempFile, err := ioutil.TempFile("", "users_test_*.json")
	require.NoError(t, err)
	defer os.Remove(tempFile.Name())

	// Backup and replace usersJSONFile
	originalFile := usersJSONFile
	usersJSONFile = tempFile.Name()
	defer func() { usersJSONFile = originalFile }()

	// Create initial user data
	initialData := map[string]*UserData{
		"123": {
			Email:       "old@example.com",
			FirstLogin:  time.Now().Format(time.RFC3339),
			LastLogin:   time.Now().Format(time.RFC3339),
			IPAddresses: []string{"192.168.1.1"},
			LoginCount:  1,
			PortStart:   8000,
			PortEnd:     8009,
			VolumePath:  "/tmp/uploads/123",
			TerminalTabs: &TerminalTabsData{
				Tabs:      []string{"1"},
				ActiveTab: "1",
			},
		},
	}

	data, err := json.Marshal(initialData)
	require.NoError(t, err)
	err = ioutil.WriteFile(tempFile.Name(), data, 0644)
	require.NoError(t, err)

	userInfo := struct {
		ID            string `json:"id"`
		Email         string `json:"email"`
		VerifiedEmail bool   `json:"verified_email"`
		Name          string `json:"name"`
	}{
		ID:            "123",
		Email:         "updated@example.com",
		VerifiedEmail: true,
		Name:          "Updated User",
	}

	err = updateUserData("123", userInfo, "192.168.1.2", 0) // portStart 0 means don't update
	require.NoError(t, err)

	// Verify user was updated
	userData, err := getUserData("123")
	require.NoError(t, err)
	assert.Equal(t, "updated@example.com", userData.Email)
	assert.Equal(t, 2, userData.LoginCount)
	assert.Equal(t, 8000, userData.PortStart) // Should remain unchanged
	assert.Contains(t, userData.IPAddresses, "192.168.1.1")
	assert.Contains(t, userData.IPAddresses, "192.168.1.2")
}

func TestGetUserDataNonExistent(t *testing.T) {
	// Create temp file
	tempFile, err := ioutil.TempFile("", "users_test_*.json")
	require.NoError(t, err)
	defer os.Remove(tempFile.Name())
	tempFile.Close()

	// Backup and replace usersJSONFile
	originalFile := usersJSONFile
	usersJSONFile = tempFile.Name()
	defer func() { usersJSONFile = originalFile }()

	userData, err := getUserData("999")
	assert.Error(t, err)
	assert.Nil(t, userData)
}

func TestPortRangeCalculation(t *testing.T) {
	testCases := []struct {
		name      string
		user      *User
		portStart int
		portEnd   int
	}{
		{
			name:      "User 1",
			user:      &User{ID: "1", Email: "user1@example.com", PortStart: 8000},
			portStart: 8000,
			portEnd:   8009,
		},
		{
			name:      "User 2",
			user:      &User{ID: "2", Email: "user2@example.com", PortStart: 8010},
			portStart: 8010,
			portEnd:   8019,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			assert.Equal(t, tc.portStart, tc.user.PortStart)
			assert.Equal(t, tc.portEnd, tc.user.PortEnd())

			portStart, portEnd := tc.user.PortRange()
			assert.Equal(t, tc.portStart, portStart)
			assert.Equal(t, tc.portEnd, portEnd)

			// Ports should be in valid range
			assert.GreaterOrEqual(t, portStart, 1024)
			assert.LessOrEqual(t, portEnd, 65535)
			assert.Less(t, portStart, portEnd)
		})
	}
}

func TestPortRangeBounds(t *testing.T) {
	user := &User{ID: "999", Email: "user999@example.com", PortStart: 8000}
	
	// Test that port_end is calculated correctly (port_start + 9)
	assert.Equal(t, 8000, user.PortStart)
	assert.Equal(t, 8009, user.PortEnd())

	portStart, portEnd := user.PortRange()

	// Ports should be in valid range
	assert.GreaterOrEqual(t, portStart, 1024)
	assert.LessOrEqual(t, portEnd, 65535)
	assert.Less(t, portStart, portEnd)
}

func TestTerminalTabsData(t *testing.T) {
	// Create temp file
	tempFile, err := ioutil.TempFile("", "users_test_*.json")
	require.NoError(t, err)
	defer os.Remove(tempFile.Name())
	tempFile.Close()

	// Backup and replace usersJSONFile
	originalFile := usersJSONFile
	usersJSONFile = tempFile.Name()
	defer func() { usersJSONFile = originalFile }()

	// Create user first
	userInfo := struct {
		ID            string `json:"id"`
		Email         string `json:"email"`
		VerifiedEmail bool   `json:"verified_email"`
		Name          string `json:"name"`
	}{
		ID:            "123",
		Email:         "test@example.com",
		VerifiedEmail: true,
		Name:          "Test User",
	}

	err = updateUserData("123", userInfo, "192.168.1.1", 8000)
	require.NoError(t, err)

	// Update terminal tabs
	tabs := []string{"1", "2", "3"}
	activeTab := "2"
	err = updateUserTerminalTabs("123", tabs, activeTab)
	require.NoError(t, err)

	// Verify terminal tabs were updated
	userData, err := getUserData("123")
	require.NoError(t, err)
	assert.NotNil(t, userData.TerminalTabs)
	assert.Equal(t, tabs, userData.TerminalTabs.Tabs)
	assert.Equal(t, activeTab, userData.TerminalTabs.ActiveTab)
}

func TestLoadUsersFromJSON(t *testing.T) {
	// Create temp file with test data
	tempFile, err := ioutil.TempFile("", "users_test_*.json")
	require.NoError(t, err)
	defer os.Remove(tempFile.Name())

	testData := map[string]*UserData{
		"123": {
			Email:       "test@example.com",
			FirstLogin:  time.Now().Format(time.RFC3339),
			LastLogin:   time.Now().Format(time.RFC3339),
			IPAddresses: []string{"192.168.1.1"},
			LoginCount:  1,
			PortStart:   8000,
			PortEnd:     8009,
			VolumePath:  "/tmp/uploads/123",
		},
	}

	data, err := json.Marshal(testData)
	require.NoError(t, err)
	err = ioutil.WriteFile(tempFile.Name(), data, 0644)
	require.NoError(t, err)
	tempFile.Close()

	// Backup and replace usersJSONFile
	originalFile := usersJSONFile
	usersJSONFile = tempFile.Name()
	defer func() { usersJSONFile = originalFile }()

	users, err := loadUsersFromJSON()
	require.NoError(t, err)
	assert.Len(t, users, 1)
	assert.Contains(t, users, "123")
	assert.Equal(t, "test@example.com", users["123"].Email)
}

func TestSaveUsersToJSON(t *testing.T) {
	// Create temp file
	tempFile, err := ioutil.TempFile("", "users_test_*.json")
	require.NoError(t, err)
	defer os.Remove(tempFile.Name())
	tempFile.Close()

	// Backup and replace usersJSONFile
	originalFile := usersJSONFile
	usersJSONFile = tempFile.Name()
	defer func() { usersJSONFile = originalFile }()

	testData := map[string]*UserData{
		"456": {
			Email:       "save@example.com",
			FirstLogin:  time.Now().Format(time.RFC3339),
			LastLogin:   time.Now().Format(time.RFC3339),
			IPAddresses: []string{"10.0.0.1"},
			LoginCount:  5,
			PortStart:   8100,
			PortEnd:     8109,
			VolumePath:  "/tmp/uploads/456",
		},
	}

	err = saveUsersToJSON(testData)
	require.NoError(t, err)

	// Verify data was saved
	users, err := loadUsersFromJSON()
	require.NoError(t, err)
	assert.Len(t, users, 1)
	assert.Contains(t, users, "456")
	assert.Equal(t, "save@example.com", users["456"].Email)
	assert.Equal(t, 5, users["456"].LoginCount)
}
