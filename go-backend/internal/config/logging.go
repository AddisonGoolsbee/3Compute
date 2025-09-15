package config

import (
	"fmt"
	"os"
	"time"

	"github.com/sirupsen/logrus"
)

// ConfigureLogging sets up logging configuration similar to Python backend
func ConfigureLogging() {
	// Create logs directory
	logsDir := "logs"
	if err := os.MkdirAll(logsDir, 0755); err != nil {
		logrus.WithError(err).Warn("Failed to create logs directory")
	}

	// Create log filename with current date
	logName := fmt.Sprintf("%s/%s.log", logsDir, time.Now().UTC().Format("2006-01-02"))

	// Set log level based on Flask environment
	flaskEnv := os.Getenv("FLASK_ENV")
	if flaskEnv == "production" {
		logrus.SetLevel(logrus.InfoLevel)
	} else {
		logrus.SetLevel(logrus.DebugLevel)
	}

	// Create custom formatter similar to Python's format
	formatter := &logrus.TextFormatter{
		FullTimestamp:   true,
		TimestampFormat: time.RFC3339,
		ForceColors:     false,
		DisableColors:   true,
	}

	// Set formatter
	logrus.SetFormatter(formatter)

	// Only set up file logging if we haven't already
	if len(logrus.StandardLogger().Hooks) == 0 {
		// Create file for logging
		logFile, err := os.OpenFile(logName, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0666)
		if err != nil {
			logrus.WithError(err).Warn("Failed to create log file, using stdout only")
			return
		}

		// Use both file and stdout
		logrus.SetOutput(logFile)

		// Also log to stdout in development
		if flaskEnv != "production" {
			// In development, also log to stdout
			logrus.AddHook(&stdoutHook{})
		}
	}
}

// stdoutHook is a custom hook to also log to stdout in development
type stdoutHook struct{}

func (hook *stdoutHook) Fire(entry *logrus.Entry) error {
	line, err := entry.String()
	if err != nil {
		return err
	}
	fmt.Print(line)
	return nil
}

func (hook *stdoutHook) Levels() []logrus.Level {
	return logrus.AllLevels
}
