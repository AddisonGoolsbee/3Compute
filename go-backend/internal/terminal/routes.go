package terminal

import (
	"net/http"
	"strconv"

	"3compute-backend/internal/auth"
	"3compute-backend/internal/docker"

	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
)

// RegisterRoutes registers terminal-related routes
func RegisterRoutes(r *gin.Engine) {
	terminalGroup := r.Group("/terminal")
	terminalGroup.Use(auth.RequireAuth())
	{
		terminalGroup.POST("/close-tab", handleCloseTab)
		terminalGroup.GET("/ws", handleWebSocket)
	}
}

// handleCloseTab handles HTTP endpoint to kill all processes for a given terminal tab
func handleCloseTab(c *gin.Context) {
	user := c.MustGet("user").(*auth.User)

	var data struct {
		TabID string `json:"tabId"`
	}

	if err := c.ShouldBindJSON(&data); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request data"})
		return
	}

	tabID := data.TabID
	if tabID == "" {
		tabID = "1"
	}

	hub := GetHub()
	if hub == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Terminal hub not initialized"})
		return
	}

	hub.mutex.RLock()
	containerInfo, exists := hub.userContainers[user.ID]
	hub.mutex.RUnlock()

	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "No container for user"})
		return
	}

	if err := docker.KillTmuxSession(containerInfo.ContainerName, tabID); err != nil {
		logrus.WithError(err).Warnf("Failed to kill tmux session for tab %s", tabID)
		// Return 200 to avoid blocking UI even if session is already gone
		c.JSON(http.StatusOK, gin.H{"message": "No session or already terminated"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Terminated"})
}

// handleWebSocket handles WebSocket connections for terminal
func handleWebSocket(c *gin.Context) {
	user := c.MustGet("user").(*auth.User)

	hub := GetHub()
	if hub == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Terminal hub not initialized"})
		return
	}

	ServeWS(hub, c.Writer, c.Request, user)
}

// handleTmuxNewWindow handles creating new tmux windows (placeholder for future implementation)
func handleTmuxNewWindow(c *gin.Context) {
	user := c.MustGet("user").(*auth.User)

	var data struct {
		WindowIndex int `json:"windowIndex"`
	}

	if err := c.ShouldBindJSON(&data); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request data"})
		return
	}

	hub := GetHub()
	if hub == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Terminal hub not initialized"})
		return
	}

	hub.mutex.RLock()
	containerInfo, exists := hub.userContainers[user.ID]
	hub.mutex.RUnlock()

	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "No container for user"})
		return
	}

	// Create new tmux window
	windowName := strconv.Itoa(data.WindowIndex)
	sessionName := "3compute"
	if err := docker.SendTmuxKeys(containerInfo.ContainerName, sessionName, 
		"tmux", "new-window", "-t", sessionName+":"+windowName, "-n", windowName); err != nil {
		logrus.WithError(err).Error("Failed to create new tmux window")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create new window"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Window created"})
}

// handleTmuxSelectWindow handles selecting tmux windows (placeholder for future implementation)
func handleTmuxSelectWindow(c *gin.Context) {
	user := c.MustGet("user").(*auth.User)

	var data struct {
		WindowIndex int `json:"windowIndex"`
	}

	if err := c.ShouldBindJSON(&data); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request data"})
		return
	}

	hub := GetHub()
	if hub == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Terminal hub not initialized"})
		return
	}

	hub.mutex.RLock()
	containerInfo, exists := hub.userContainers[user.ID]
	hub.mutex.RUnlock()

	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "No container for user"})
		return
	}

	// Select tmux window
	windowName := strconv.Itoa(data.WindowIndex)
	sessionName := "3compute"
	if err := docker.SendTmuxKeys(containerInfo.ContainerName, sessionName,
		"tmux", "select-window", "-t", sessionName+":"+windowName); err != nil {
		logrus.WithError(err).Error("Failed to select tmux window")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to select window"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Window selected"})
}
