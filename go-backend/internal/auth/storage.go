package auth

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"os"
	"time"

	"github.com/sirupsen/logrus"
)

// loadUsersFromJSON loads users data from JSON file
func loadUsersFromJSON() (map[string]*UserData, error) {
	if _, err := os.Stat(usersJSONFile); os.IsNotExist(err) {
		return make(map[string]*UserData), nil
	}

	data, err := ioutil.ReadFile(usersJSONFile)
	if err != nil {
		logrus.WithError(err).Error("Error loading users from JSON")
		return make(map[string]*UserData), err
	}

	var users map[string]*UserData
	if err := json.Unmarshal(data, &users); err != nil {
		logrus.WithError(err).Error("Error unmarshaling users JSON")
		return make(map[string]*UserData), err
	}

	return users, nil
}

// saveUsersToJSON saves users data to JSON file
func saveUsersToJSON(users map[string]*UserData) error {
	data, err := json.MarshalIndent(users, "", "  ")
	if err != nil {
		logrus.WithError(err).Error("Error marshaling users to JSON")
		return err
	}

	if err := ioutil.WriteFile(usersJSONFile, data, 0644); err != nil {
		logrus.WithError(err).Error("Error saving users to JSON")
		return err
	}

	return nil
}

// updateUserData updates user data in JSON file with new IP address and port assignment
func updateUserData(userID string, userInfo interface{}, ipAddress string, portStart int) error {
	users, err := loadUsersFromJSON()
	if err != nil {
		return err
	}

	now := time.Now().Format(time.RFC3339)

	// Extract email from userInfo using type assertion or reflection
	var email string
	switch ui := userInfo.(type) {
	case struct {
		ID            string `json:"id"`
		Email         string `json:"email"`
		VerifiedEmail bool   `json:"verified_email"`
		Name          string `json:"name"`
	}:
		email = ui.Email
	case map[string]interface{}:
		if e, ok := ui["email"]; ok {
			if emailStr, ok := e.(string); ok {
				email = emailStr
			}
		}
	}

	if existingUser, exists := users[userID]; exists {
		// Existing user
		if email != "" {
			existingUser.Email = email
		}
		existingUser.LastLogin = now
		existingUser.LoginCount++

		// Add new IP address if not already present
		if !contains(existingUser.IPAddresses, ipAddress) {
			existingUser.IPAddresses = append(existingUser.IPAddresses, ipAddress)
		}

		// Ensure all required fields exist for existing users
		if existingUser.TerminalTabs == nil {
			existingUser.TerminalTabs = &TerminalTabsData{
				Tabs:      []string{"1"},
				ActiveTab: "1",
			}
		}

		// Ensure port information exists (for backward compatibility)
		if existingUser.PortStart == 0 && portStart != 0 {
			existingUser.PortStart = portStart
			existingUser.PortEnd = portStart + 9
		}

		// Ensure volume path exists
		if existingUser.VolumePath == "" {
			existingUser.VolumePath = fmt.Sprintf("/tmp/uploads/%s", userID)
		}
	} else {
		// New user
		users[userID] = &UserData{
			Email:       email,
			FirstLogin:  now,
			LastLogin:   now,
			IPAddresses: []string{ipAddress},
			LoginCount:  1,
			PortStart:   portStart,
			PortEnd:     portStart + 9,
			VolumePath:  fmt.Sprintf("/tmp/uploads/%s", userID),
			TerminalTabs: &TerminalTabsData{
				Tabs:      []string{"1"},
				ActiveTab: "1",
			},
		}
	}

	return saveUsersToJSON(users)
}

// getUserData gets user data by user ID
func getUserData(userID string) (*UserData, error) {
	users, err := loadUsersFromJSON()
	if err != nil {
		return nil, err
	}

	userData, exists := users[userID]
	if !exists {
		return nil, fmt.Errorf("user not found")
	}

	return userData, nil
}

// updateUserTerminalTabs updates user's terminal tabs configuration
func updateUserTerminalTabs(userID string, tabs []string, activeTab string) error {
	users, err := loadUsersFromJSON()
	if err != nil {
		return err
	}

	userData, exists := users[userID]
	if !exists {
		return fmt.Errorf("user not found")
	}

	userData.TerminalTabs = &TerminalTabsData{
		Tabs:      tabs,
		ActiveTab: activeTab,
	}

	return saveUsersToJSON(users)
}
