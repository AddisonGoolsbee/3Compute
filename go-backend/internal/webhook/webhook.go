package webhook

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
)

var webhookSecret []byte

func init() {
	secret := os.Getenv("GITHUB_WEBHOOK_SECRET")
	webhookSecret = []byte(secret)
}

// RegisterRoutes registers webhook-related routes
func RegisterRoutes(r *gin.Engine) {
	r.POST("/github-webhook", handleGitHubWebhook)
}

// GitHubWebhookPayload represents the GitHub webhook payload structure
type GitHubWebhookPayload struct {
	Action      string `json:"action"`
	WorkflowRun struct {
		Conclusion string `json:"conclusion"`
		HeadBranch string `json:"head_branch"`
	} `json:"workflow_run"`
}

func handleGitHubWebhook(c *gin.Context) {
	signature := c.GetHeader("X-Hub-Signature-256")
	if signature == "" {
		logrus.Debug("Missing signature in request headers")
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing signature"})
		return
	}

	// Parse signature
	parts := strings.SplitN(signature, "=", 2)
	if len(parts) != 2 || parts[0] != "sha256" {
		logrus.Debug("Invalid signature format")
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid signature format"})
		return
	}
	sigHash := parts[1]

	// Read request body
	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		logrus.WithError(err).Error("Failed to read request body")
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to read request body"})
		return
	}

	// Verify signature
	mac := hmac.New(sha256.New, webhookSecret)
	mac.Write(body)
	expectedHash := hex.EncodeToString(mac.Sum(nil))

	if !hmac.Equal([]byte(expectedHash), []byte(sigHash)) {
		logrus.Debugf("Invalid signature. X-Hub-Signature-256: %s Computed HMAC: %s", signature, expectedHash)
		c.JSON(http.StatusForbidden, gin.H{"error": "Invalid signature"})
		return
	}

	// Parse JSON payload
	var payload GitHubWebhookPayload
	if err := json.Unmarshal(body, &payload); err != nil {
		logrus.WithError(err).Debug("Invalid payload: Failed to parse JSON")
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid payload"})
		return
	}

	// Check if this is a completed workflow run
	if payload.Action != "completed" {
		logrus.Debugf("Skipped non-complete action: %s", payload.Action)
		c.JSON(http.StatusNoContent, gin.H{"message": "Skipped non-complete action"})
		return
	}

	// Check if the workflow run was successful
	if payload.WorkflowRun.Conclusion != "success" {
		logrus.Debugf("Skipped unsuccessful run: %s", payload.WorkflowRun.Conclusion)
		c.JSON(http.StatusNoContent, gin.H{"message": "Skipped unsuccessful run"})
		return
	}

	// Check if this is from the main branch
	if payload.WorkflowRun.HeadBranch != "main" {
		logrus.Debugf("Skipped non-main branch: %s", payload.WorkflowRun.HeadBranch)
		c.JSON(http.StatusNoContent, gin.H{"message": "Skipped non-main branch"})
		return
	}

	// Run deployment script asynchronously
	go func() {
		if err := runDeploymentScript(); err != nil {
			logrus.WithError(err).Error("Deployment script failed")
		} else {
			logrus.Info("Deployment script completed successfully")
		}
	}()

	logrus.Info("Deployment script triggered")
	c.JSON(http.StatusOK, gin.H{"message": "Deployment triggered"})
}

// runDeploymentScript executes the deployment script
func runDeploymentScript() error {
	deployScript := "/opt/deploy.sh"
	
	// Check if deploy script exists
	if _, err := os.Stat(deployScript); os.IsNotExist(err) {
		return fmt.Errorf("deployment script not found: %s", deployScript)
	}

	// Execute the deployment script
	cmd := exec.Command(deployScript)
	
	// Set up logging for the deployment script
	cmd.Stdout = &deploymentLogger{prefix: "[DEPLOY-OUT]"}
	cmd.Stderr = &deploymentLogger{prefix: "[DEPLOY-ERR]"}
	
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("deployment script execution failed: %w", err)
	}

	return nil
}

// deploymentLogger wraps logrus for deployment script output
type deploymentLogger struct {
	prefix string
}

func (dl *deploymentLogger) Write(p []byte) (n int, err error) {
	lines := strings.Split(strings.TrimSpace(string(p)), "\n")
	for _, line := range lines {
		if line != "" {
			logrus.Infof("%s %s", dl.prefix, line)
		}
	}
	return len(p), nil
}
