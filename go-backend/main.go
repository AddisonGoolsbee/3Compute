package main

import (
	"flag"
	"log"
	"os"
	"os/signal"
	"syscall"

	"3compute-backend/internal/app"
	"3compute-backend/internal/config"
	"3compute-backend/internal/docker"

	"github.com/joho/godotenv"
	"github.com/sirupsen/logrus"
)

func main() {
	// Parse command line arguments
	port := flag.Int("p", 5555, "Port to run server on")
	host := flag.String("host", os.Getenv("HOST_IP"), "Host IP to bind to")
	debug := flag.Bool("debug", false, "Enable debug mode")
	flag.Parse()

	// Load environment variables
	if err := godotenv.Load(); err != nil {
		logrus.Debug("No .env file found")
	}

	// Configure logging
	config.ConfigureLogging()

	// Determine debug mode
	flaskEnv := os.Getenv("FLASK_ENV")
	debugMode := *debug && flaskEnv != "production"

	if debugMode {
		logrus.SetLevel(logrus.DebugLevel)
	}

	logrus.Infof("Serving on http://%s:%d", *host, *port)

	// Set up signal handling
	c := make(chan os.Signal, 1)
	signal.Notify(c, os.Interrupt, syscall.SIGTERM)

	// Setup Docker isolated network
	if err := docker.SetupIsolatedNetwork(); err != nil {
		logrus.WithError(err).Fatal("Failed to setup isolated network")
	}

	// Setup uploads directory
	if err := docker.SetupUploadsDirectory(); err != nil {
		logrus.WithError(err).Warn("Failed to setup uploads directory")
	}

	// Create and start the application
	application := app.NewApp()
	
	go func() {
		if err := application.Run(*host, *port, debugMode); err != nil {
			log.Fatalf("Failed to start server: %v", err)
		}
	}()

	// Wait for signal
	<-c
	logrus.Info("Shutting down server...")
	
	// Graceful shutdown
	if err := application.Shutdown(); err != nil {
		logrus.WithError(err).Error("Error during shutdown")
	}
}
