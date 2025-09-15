package app

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"time"

	"3compute-backend/internal/auth"
	"3compute-backend/internal/files"
	"3compute-backend/internal/terminal"
	"3compute-backend/internal/webhook"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
)

// App represents the main application
type App struct {
	router *gin.Engine
	server *http.Server
	hub    *terminal.Hub
}

// NewApp creates a new application instance
func NewApp() *App {
	app := &App{}
	app.setupRouter()
	app.setupHub()
	return app
}

func (a *App) setupRouter() {
	// Set Gin mode based on environment
	if os.Getenv("FLASK_ENV") == "production" {
		gin.SetMode(gin.ReleaseMode)
	} else {
		gin.SetMode(gin.DebugMode)
	}

	r := gin.New()

	// Add middleware
	r.Use(gin.Logger())
	r.Use(gin.Recovery())

	// Setup CORS
	var frontendOrigin string
	if os.Getenv("FLASK_ENV") == "production" {
		logrus.Debug("Running in production mode")
		frontendOrigin = os.Getenv("FRONTEND_ORIGIN_PROD")
	} else {
		frontendOrigin = os.Getenv("FRONTEND_ORIGIN_DEV")
		if frontendOrigin == "" {
			logrus.Fatal("FRONTEND_ORIGIN_DEV environment variable is not set")
		}
	}

	config := cors.Config{
		AllowOrigins:     []string{frontendOrigin},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization", "X-Requested-With"},
		AllowCredentials: true,
	}
	r.Use(cors.New(config))

	// Setup session store
	auth.SetupSessionStore(r)

	// Register routes
	auth.RegisterRoutes(r)
	files.RegisterRoutes(r)
	webhook.RegisterRoutes(r)
	terminal.RegisterRoutes(r)

	a.router = r
}

func (a *App) setupHub() {
	a.hub = terminal.NewHub()
	go a.hub.Run()
}

// Run starts the application server
func (a *App) Run(host string, port int, debug bool) error {
	addr := fmt.Sprintf("%s:%d", host, port)
	
	a.server = &http.Server{
		Addr:    addr,
		Handler: a.router,
	}

	// Setup WebSocket hub for terminal
	terminal.SetHub(a.hub)

	logrus.Infof("Starting server on %s", addr)
	return a.server.ListenAndServe()
}

// GetRouter returns the Gin router for testing
func (a *App) GetRouter() *gin.Engine {
	return a.router
}

// Shutdown gracefully shuts down the application
func (a *App) Shutdown() error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if a.hub != nil {
		a.hub.Stop()
	}

	if a.server != nil {
		return a.server.Shutdown(ctx)
	}

	return nil
}
