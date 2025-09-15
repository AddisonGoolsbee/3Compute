package auth

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strconv"
	"time"

	"github.com/gin-contrib/sessions"
	"github.com/gin-contrib/sessions/cookie"
	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
)

var (
	googleOauthConfig *oauth2.Config
	portBase          int
	frontendOrigin    string
	usersJSONFile     = "backend/users.json"
)

// User represents a user in the system
type User struct {
	ID        string `json:"id"`
	Email     string `json:"email"`
	PortStart int    `json:"port_start"`
}

// UserData represents the stored user data
type UserData struct {
	Email        string            `json:"email"`
	FirstLogin   string            `json:"first_login"`
	LastLogin    string            `json:"last_login"`
	IPAddresses  []string          `json:"ip_addresses"`
	LoginCount   int               `json:"login_count"`
	PortStart    int               `json:"port_start"`
	PortEnd      int               `json:"port_end"`
	VolumePath   string            `json:"volume_path"`
	TerminalTabs *TerminalTabsData `json:"terminal_tabs,omitempty"`
}

// TerminalTabsData represents terminal tab configuration
type TerminalTabsData struct {
	Tabs      []string `json:"tabs"`
	ActiveTab string   `json:"active_tab"`
}

// PortEnd returns the end port for the user
func (u *User) PortEnd() int {
	return u.PortStart + 9
}

// PortRange returns the port range tuple for the user
func (u *User) PortRange() (int, int) {
	return u.PortStart, u.PortEnd()
}

// SetupSessionStore configures the session store
func SetupSessionStore(r *gin.Engine) {
	secretKey := os.Getenv("FLASK_SECRET")
	if secretKey == "" {
		logrus.Fatal("FLASK_SECRET environment variable is not set")
	}

	store := cookie.NewStore([]byte(secretKey))
	store.Options(sessions.Options{
		Path:     "/",
		MaxAge:   86400 * 7, // 7 days
		HttpOnly: true,
		Secure:   os.Getenv("FLASK_ENV") == "production",
		SameSite: http.SameSiteDefaultMode,
	})
	r.Use(sessions.Sessions("session", store))

	// Initialize OAuth config
	initOAuth()
}

func initOAuth() {
	googleClientID := os.Getenv("GOOGLE_CLIENT_ID")
	googleClientSecret := os.Getenv("GOOGLE_CLIENT_SECRET")
	if googleClientID == "" {
		googleClientID = "test-client-id"
	}
	if googleClientSecret == "" {
		googleClientSecret = "test-client-secret"
	}

	portBaseStr := os.Getenv("PORT_BASE")
	if portBaseStr == "" {
		portBase = 8000
	} else {
		var err error
		portBase, err = strconv.Atoi(portBaseStr)
		if err != nil {
			portBase = 8000
		}
	}

	var redirectURI string
	if os.Getenv("FLASK_ENV") == "production" {
		logrus.Debug("Running in production mode")
		redirectURI = os.Getenv("REDIRECT_URI_PROD")
		frontendOrigin = os.Getenv("FRONTEND_ORIGIN_PROD")
	} else {
		frontendOrigin = os.Getenv("FRONTEND_ORIGIN_DEV")
		if frontendOrigin == "" {
			frontendOrigin = "http://localhost:3000"
		}
		redirectURI = os.Getenv("REDIRECT_URI_DEV")
		if redirectURI == "" {
			redirectURI = "http://localhost:5000/auth/callback"
		}
	}

	googleOauthConfig = &oauth2.Config{
		ClientID:     googleClientID,
		ClientSecret: googleClientSecret,
		RedirectURL:  redirectURI,
		Scopes:       []string{"openid", "email", "profile"},
		Endpoint:     google.Endpoint,
	}
}

// RegisterRoutes registers authentication routes
func RegisterRoutes(r *gin.Engine) {
	authGroup := r.Group("/auth")
	{
		authGroup.GET("/login", handleLogin)
		authGroup.GET("/callback", handleCallback)
		authGroup.GET("/logout", handleLogout)
		authGroup.GET("/me", handleMe)
		authGroup.GET("/users", handleGetUsers)
		authGroup.GET("/tabs", handleGetTabs)
		authGroup.POST("/tabs", handleSaveTabs)
	}
}

func handleLogin(c *gin.Context) {
	state := generateRandomState()
	session := sessions.Default(c)
	session.Set("oauth_state", state)
	session.Save()

	url := googleOauthConfig.AuthCodeURL(state, oauth2.AccessTypeOffline, oauth2.ApprovalForce)
	c.Redirect(http.StatusTemporaryRedirect, url)
}

func handleCallback(c *gin.Context) {
	session := sessions.Default(c)
	storedState := session.Get("oauth_state")
	if storedState == nil || c.Query("state") != storedState.(string) {
		logrus.Warn("Invalid OAuth state")
		c.Redirect(http.StatusTemporaryRedirect, frontendOrigin+"/login?error=invalid_state")
		return
	}

	code := c.Query("code")
	token, err := googleOauthConfig.Exchange(context.Background(), code)
	if err != nil {
		logrus.WithError(err).Error("Failed to exchange token")
		c.Redirect(http.StatusTemporaryRedirect, frontendOrigin+"/login?error=token_exchange_failed")
		return
	}

	// Get user info
	client := googleOauthConfig.Client(context.Background(), token)
	resp, err := client.Get("https://www.googleapis.com/oauth2/v2/userinfo")
	if err != nil {
		logrus.WithError(err).Error("Failed to get user info")
		c.Redirect(http.StatusTemporaryRedirect, frontendOrigin+"/login?error=user_info_failed")
		return
	}
	defer resp.Body.Close()

	var userInfo struct {
		ID            string `json:"id"`
		Email         string `json:"email"`
		VerifiedEmail bool   `json:"verified_email"`
		Name          string `json:"name"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&userInfo); err != nil {
		logrus.WithError(err).Error("Failed to decode user info")
		c.Redirect(http.StatusTemporaryRedirect, frontendOrigin+"/login?error=decode_failed")
		return
	}

	// Check if email is verified
	if !userInfo.VerifiedEmail {
		logrus.Infof("Rejected login attempt for unverified email: %s from IP %s", userInfo.Email, c.ClientIP())
		c.Redirect(http.StatusTemporaryRedirect, frontendOrigin+"/login?error=email_not_verified")
		return
	}

	// Get or create user data
	userData, err := getUserData(userInfo.ID)
	isNewUser := err != nil || userData == nil

	var portStart int
	if isNewUser {
		// Calculate port start for new user
		allUsers, err := loadUsersFromJSON()
		if err != nil {
			logrus.WithError(err).Error("Failed to load users")
		}
		portStart = portBase + len(allUsers)*10
	} else {
		portStart = userData.PortStart
	}

	// Update user data
	if err := updateUserData(userInfo.ID, userInfo, c.ClientIP(), portStart); err != nil {
		logrus.WithError(err).Error("Failed to update user data")
		c.Redirect(http.StatusTemporaryRedirect, frontendOrigin+"/login?error=user_update_failed")
		return
	}

	// Store user in session
	user := &User{
		ID:        userInfo.ID,
		Email:     userInfo.Email,
		PortStart: portStart,
	}

	session.Set("user_id", user.ID)
	session.Set("user_email", user.Email)
	session.Set("user_port_start", user.PortStart)
	session.Save()

	logrus.Infof("User %s logged in from IP %s", user.ID, c.ClientIP())
	c.Redirect(http.StatusTemporaryRedirect, frontendOrigin+"/")
}

func handleLogout(c *gin.Context) {
	session := sessions.Default(c)
	session.Clear()
	session.Save()
	c.JSON(http.StatusOK, gin.H{})
}

func handleMe(c *gin.Context) {
	user := getCurrentUser(c)
	if user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthenticated"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"email":      user.Email,
		"port_start": user.PortStart,
		"port_end":   user.PortEnd(),
	})
}

func handleGetUsers(c *gin.Context) {
	users, err := loadUsersFromJSON()
	if err != nil {
		logrus.WithError(err).Error("Error retrieving users data")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve users data"})
		return
	}

	c.JSON(http.StatusOK, users)
}

func handleGetTabs(c *gin.Context) {
	user := getCurrentUser(c)
	if user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	userData, err := getUserData(user.ID)
	if err == nil && userData != nil && userData.TerminalTabs != nil {
		tabs := userData.TerminalTabs
		
		// Validate the stored data
		if len(tabs.Tabs) > 0 && tabs.ActiveTab != "" {
			// Sanitize tab IDs
			var sanitizedTabs []string
			for _, tab := range tabs.Tabs {
				if isAlphanumeric(tab) {
					sanitizedTabs = append(sanitizedTabs, tab)
				}
			}
			
			if len(sanitizedTabs) > 0 && contains(sanitizedTabs, tabs.ActiveTab) {
				c.JSON(http.StatusOK, gin.H{
					"tabs":       sanitizedTabs,
					"active_tab": tabs.ActiveTab,
				})
				return
			}
		}
	}

	// Return default tabs
	c.JSON(http.StatusOK, gin.H{
		"tabs":       []string{"1"},
		"active_tab": "1",
	})
}

func handleSaveTabs(c *gin.Context) {
	user := getCurrentUser(c)
	if user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var data struct {
		Tabs      []string `json:"tabs"`
		ActiveTab string   `json:"active_tab"`
	}

	if err := c.ShouldBindJSON(&data); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid data format"})
		return
	}

	// Validate data
	if len(data.Tabs) == 0 || data.ActiveTab == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid data format. Expected 'tabs' array and 'active_tab' string."})
		return
	}

	if !contains(data.Tabs, data.ActiveTab) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Active tab must be in the tabs list."})
		return
	}

	// Sanitize tab IDs
	var sanitizedTabs []string
	for _, tab := range data.Tabs {
		if isAlphanumeric(tab) {
			sanitizedTabs = append(sanitizedTabs, tab)
		}
	}

	if len(sanitizedTabs) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No valid tab IDs found."})
		return
	}

	// Make sure active tab is still valid after sanitization
	if !contains(sanitizedTabs, data.ActiveTab) {
		data.ActiveTab = sanitizedTabs[0]
	}

	// Update user data
	if err := updateUserTerminalTabs(user.ID, sanitizedTabs, data.ActiveTab); err != nil {
		logrus.WithError(err).Errorf("Error saving terminal tabs for user %s", user.ID)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
		return
	}

	logrus.Infof("Saved terminal tabs for user %s: %v", user.ID, data)
	c.JSON(http.StatusOK, gin.H{"success": true})
}

// getCurrentUser gets the current user from session
func getCurrentUser(c *gin.Context) *User {
	session := sessions.Default(c)
	userID := session.Get("user_id")
	if userID == nil {
		return nil
	}

	email := session.Get("user_email")
	portStart := session.Get("user_port_start")

	if email == nil || portStart == nil {
		return nil
	}

	return &User{
		ID:        userID.(string),
		Email:     email.(string),
		PortStart: portStart.(int),
	}
}

// RequireAuth middleware to require authentication
func RequireAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		user := getCurrentUser(c)
		if user == nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
			c.Abort()
			return
		}
		c.Set("user", user)
		c.Next()
	}
}

// Helper functions
func generateRandomState() string {
	return fmt.Sprintf("%d", time.Now().UnixNano())
}

func isAlphanumeric(s string) bool {
	for _, r := range s {
		if !((r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9')) {
			return false
		}
	}
	return true
}

func contains(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}
