package webhook

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestHandleGitHubWebhook(t *testing.T) {
	// Set up test environment
	originalSecret := os.Getenv("GITHUB_WEBHOOK_SECRET")
	testSecret := "test-webhook-secret"
	os.Setenv("GITHUB_WEBHOOK_SECRET", testSecret)
	defer os.Setenv("GITHUB_WEBHOOK_SECRET", originalSecret)
	
	// Reinitialize webhook secret
	webhookSecret = []byte(testSecret)

	// Set Gin to test mode
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name           string
		payload        GitHubWebhookPayload
		signature      string
		expectedStatus int
		expectedBody   string
	}{
		{
			name: "Valid webhook - successful deployment",
			payload: GitHubWebhookPayload{
				Action: "completed",
				WorkflowRun: struct {
					Conclusion string `json:"conclusion"`
					HeadBranch string `json:"head_branch"`
				}{
					Conclusion: "success",
					HeadBranch: "main",
				},
			},
			expectedStatus: http.StatusOK,
		},
		{
			name: "Non-completed action",
			payload: GitHubWebhookPayload{
				Action: "requested",
				WorkflowRun: struct {
					Conclusion string `json:"conclusion"`
					HeadBranch string `json:"head_branch"`
				}{
					Conclusion: "success",
					HeadBranch: "main",
				},
			},
			expectedStatus: http.StatusNoContent,
		},
		{
			name: "Unsuccessful workflow run",
			payload: GitHubWebhookPayload{
				Action: "completed",
				WorkflowRun: struct {
					Conclusion string `json:"conclusion"`
					HeadBranch string `json:"head_branch"`
				}{
					Conclusion: "failure",
					HeadBranch: "main",
				},
			},
			expectedStatus: http.StatusNoContent,
		},
		{
			name: "Non-main branch",
			payload: GitHubWebhookPayload{
				Action: "completed",
				WorkflowRun: struct {
					Conclusion string `json:"conclusion"`
					HeadBranch string `json:"head_branch"`
				}{
					Conclusion: "success",
					HeadBranch: "develop",
				},
			},
			expectedStatus: http.StatusNoContent,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create request body
			body, err := json.Marshal(tt.payload)
			require.NoError(t, err)

			// Generate HMAC signature
			mac := hmac.New(sha256.New, webhookSecret)
			mac.Write(body)
			signature := "sha256=" + hex.EncodeToString(mac.Sum(nil))

			// Create request
			req, err := http.NewRequest("POST", "/github-webhook", bytes.NewBuffer(body))
			require.NoError(t, err)
			req.Header.Set("Content-Type", "application/json")
			req.Header.Set("X-Hub-Signature-256", signature)

			// Create response recorder
			w := httptest.NewRecorder()

			// Create Gin context
			gin.SetMode(gin.TestMode)
			router := gin.New()
			router.POST("/github-webhook", handleGitHubWebhook)

			// Perform request
			router.ServeHTTP(w, req)

			// Assert response
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestHandleGitHubWebhookMissingSignature(t *testing.T) {
	// Set up test environment
	gin.SetMode(gin.TestMode)

	payload := GitHubWebhookPayload{
		Action: "completed",
		WorkflowRun: struct {
			Conclusion string `json:"conclusion"`
			HeadBranch string `json:"head_branch"`
		}{
			Conclusion: "success",
			HeadBranch: "main",
		},
	}

	body, err := json.Marshal(payload)
	require.NoError(t, err)

	req, err := http.NewRequest("POST", "/github-webhook", bytes.NewBuffer(body))
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")
	// Intentionally not setting X-Hub-Signature-256

	w := httptest.NewRecorder()
	router := gin.New()
	router.POST("/github-webhook", handleGitHubWebhook)

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Contains(t, w.Body.String(), "Missing signature")
}

func TestHandleGitHubWebhookInvalidSignature(t *testing.T) {
	// Set up test environment
	originalSecret := os.Getenv("GITHUB_WEBHOOK_SECRET")
	testSecret := "test-webhook-secret"
	os.Setenv("GITHUB_WEBHOOK_SECRET", testSecret)
	defer os.Setenv("GITHUB_WEBHOOK_SECRET", originalSecret)
	
	webhookSecret = []byte(testSecret)
	gin.SetMode(gin.TestMode)

	payload := GitHubWebhookPayload{
		Action: "completed",
		WorkflowRun: struct {
			Conclusion string `json:"conclusion"`
			HeadBranch string `json:"head_branch"`
		}{
			Conclusion: "success",
			HeadBranch: "main",
		},
	}

	body, err := json.Marshal(payload)
	require.NoError(t, err)

	req, err := http.NewRequest("POST", "/github-webhook", bytes.NewBuffer(body))
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Hub-Signature-256", "sha256=invalid-signature")

	w := httptest.NewRecorder()
	router := gin.New()
	router.POST("/github-webhook", handleGitHubWebhook)

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusForbidden, w.Code)
	assert.Contains(t, w.Body.String(), "Invalid signature")
}

func TestHandleGitHubWebhookInvalidSignatureFormat(t *testing.T) {
	gin.SetMode(gin.TestMode)

	payload := GitHubWebhookPayload{
		Action: "completed",
	}

	body, err := json.Marshal(payload)
	require.NoError(t, err)

	req, err := http.NewRequest("POST", "/github-webhook", bytes.NewBuffer(body))
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Hub-Signature-256", "invalid-format")

	w := httptest.NewRecorder()
	router := gin.New()
	router.POST("/github-webhook", handleGitHubWebhook)

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Contains(t, w.Body.String(), "Invalid signature format")
}

func TestHandleGitHubWebhookInvalidJSON(t *testing.T) {
	// Set up test environment
	originalSecret := os.Getenv("GITHUB_WEBHOOK_SECRET")
	testSecret := "test-webhook-secret"
	os.Setenv("GITHUB_WEBHOOK_SECRET", testSecret)
	defer os.Setenv("GITHUB_WEBHOOK_SECRET", originalSecret)
	
	webhookSecret = []byte(testSecret)
	gin.SetMode(gin.TestMode)

	invalidJSON := []byte(`{"invalid": json}`)

	// Generate HMAC signature for invalid JSON
	mac := hmac.New(sha256.New, webhookSecret)
	mac.Write(invalidJSON)
	signature := "sha256=" + hex.EncodeToString(mac.Sum(nil))

	req, err := http.NewRequest("POST", "/github-webhook", bytes.NewBuffer(invalidJSON))
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Hub-Signature-256", signature)

	w := httptest.NewRecorder()
	router := gin.New()
	router.POST("/github-webhook", handleGitHubWebhook)

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Contains(t, w.Body.String(), "Invalid payload")
}

func TestGitHubWebhookPayloadStructure(t *testing.T) {
	payload := GitHubWebhookPayload{
		Action: "completed",
		WorkflowRun: struct {
			Conclusion string `json:"conclusion"`
			HeadBranch string `json:"head_branch"`
		}{
			Conclusion: "success",
			HeadBranch: "main",
		},
	}

	assert.Equal(t, "completed", payload.Action)
	assert.Equal(t, "success", payload.WorkflowRun.Conclusion)
	assert.Equal(t, "main", payload.WorkflowRun.HeadBranch)
}

func TestDeploymentLoggerWrite(t *testing.T) {
	logger := &deploymentLogger{prefix: "[TEST]"}
	
	testData := []byte("test log line\n")
	n, err := logger.Write(testData)
	
	assert.NoError(t, err)
	assert.Equal(t, len(testData), n)
}

func TestDeploymentLoggerMultipleLines(t *testing.T) {
	logger := &deploymentLogger{prefix: "[TEST]"}
	
	testData := []byte("line 1\nline 2\nline 3\n")
	n, err := logger.Write(testData)
	
	assert.NoError(t, err)
	assert.Equal(t, len(testData), n)
}

func TestDeploymentLoggerEmptyLines(t *testing.T) {
	logger := &deploymentLogger{prefix: "[TEST]"}
	
	testData := []byte("\n\n\n")
	n, err := logger.Write(testData)
	
	assert.NoError(t, err)
	assert.Equal(t, len(testData), n)
}

func TestRunDeploymentScriptNotFound(t *testing.T) {
	// Test with a script that doesn't exist
	err := runDeploymentScript()
	
	// Should return an error because /opt/deploy.sh likely doesn't exist in test env
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "deployment script not found")
}

func TestHMACSignatureGeneration(t *testing.T) {
	secret := []byte("test-secret")
	message := []byte("test message")
	
	mac := hmac.New(sha256.New, secret)
	mac.Write(message)
	signature1 := hex.EncodeToString(mac.Sum(nil))
	
	// Generate again to ensure consistency
	mac = hmac.New(sha256.New, secret)
	mac.Write(message)
	signature2 := hex.EncodeToString(mac.Sum(nil))
	
	assert.Equal(t, signature1, signature2)
	
	// Test with different message
	mac = hmac.New(sha256.New, secret)
	mac.Write([]byte("different message"))
	signature3 := hex.EncodeToString(mac.Sum(nil))
	
	assert.NotEqual(t, signature1, signature3)
}

func TestRegisterRoutes(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	
	RegisterRoutes(router)
	
	// Test that the route was registered by making a request
	req, err := http.NewRequest("POST", "/github-webhook", nil)
	require.NoError(t, err)
	
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	
	// Should get a 400 (bad request) rather than 404 (not found)
	// because the route exists but we didn't provide proper headers
	assert.Equal(t, http.StatusBadRequest, w.Code)
}
