# 3Compute Go Backend

This is the Go/Gin conversion of the original Python Flask backend for 3Compute. The backend provides identical functionality to the Python version while being organized in a more structured Go architecture.

## Features

- **Authentication**: OAuth2 Google authentication with session management
- **Terminal**: WebSocket-based terminal sessions with Docker container management
- **File Management**: Upload, download, and manage files within user containers
- **Docker Integration**: Secure container spawning and management with resource limits
- **Webhook Support**: GitHub webhook handling for deployment automation

## Structure

```
go-backend/
├── main.go                 # Application entry point
├── go.mod                  # Go module definition
├── internal/
│   ├── app/               # Application setup and routing
│   ├── auth/              # Authentication and user management
│   ├── config/            # Configuration and logging
│   ├── docker/            # Docker container management
│   ├── files/             # File operations
│   ├── terminal/          # Terminal WebSocket handling
│   └── webhook/           # GitHub webhook handling
├── integration_test.go    # Integration tests
└── README.md             # This file
```

## Environment Variables

The application requires the following environment variables:

- `FLASK_SECRET`: Secret key for session management
- `GOOGLE_CLIENT_ID`: Google OAuth client ID
- `GOOGLE_CLIENT_SECRET`: Google OAuth client secret
- `FRONTEND_ORIGIN_DEV`: Frontend origin for development
- `FRONTEND_ORIGIN_PROD`: Frontend origin for production
- `REDIRECT_URI_DEV`: OAuth redirect URI for development
- `REDIRECT_URI_PROD`: OAuth redirect URI for production
- `GITHUB_WEBHOOK_SECRET`: Secret for GitHub webhook validation
- `HOST_IP`: Host IP to bind to (optional)
- `PORT_BASE`: Base port for user containers (default: 8000)

## Running the Application

### Development
```bash
go run . --debug --host localhost --port 5555
```

### Production
```bash
go build .
./3compute-backend --host 0.0.0.0 --port 5555
```

## Docker Requirements

The application requires Docker to be installed and running. It creates and manages Docker containers for user sessions.

### Container Image
The application expects a Docker image named `3compute` to exist. This should be the same image used by the Python backend.

## API Endpoints

### Authentication
- `GET /auth/login` - Initiate Google OAuth login
- `GET /auth/callback` - OAuth callback handler
- `GET /auth/logout` - Logout user
- `GET /auth/me` - Get current user info
- `GET /auth/users` - Get all users (admin)
- `GET /auth/tabs` - Get user's terminal tabs
- `POST /auth/tabs` - Save user's terminal tabs

### File Management
- `POST /upload` - Upload files
- `POST /upload-folder` - Upload folder
- `GET /list-files` - List user files
- `POST /move` - Move/rename files
- `GET|PUT|DELETE|POST /file/*` - File operations

### Terminal
- `GET /terminal/ws` - WebSocket terminal connection
- `POST /terminal/close-tab` - Close terminal tab

### Webhook
- `POST /github-webhook` - GitHub deployment webhook

## Testing

Run all tests:
```bash
go test ./...
```

Run tests with verbose output:
```bash
go test ./... -v
```

Run only unit tests (skip integration tests):
```bash
go test ./... -short
```

## Key Differences from Python Backend

1. **Architecture**: More structured with clear separation of concerns
2. **Concurrency**: Better handling of concurrent operations using Go's goroutines
3. **Type Safety**: Compile-time type checking prevents many runtime errors
4. **Performance**: Generally faster execution and lower memory usage
5. **WebSocket Handling**: More efficient WebSocket management for terminal sessions

## Migration from Python Backend

This Go backend is designed to be a drop-in replacement for the Python backend. The API endpoints, request/response formats, and functionality remain identical. Simply:

1. Stop the Python backend
2. Start the Go backend with the same environment variables
3. The frontend will continue to work without modifications

## Development

### Adding New Features

1. Create new modules in the `internal/` directory
2. Register routes in `internal/app/app.go`
3. Add tests for new functionality
4. Update this README

### Code Organization

- **internal/app**: Application setup, middleware, and routing
- **internal/auth**: User authentication and session management
- **internal/config**: Configuration loading and logging setup
- **internal/docker**: Docker container lifecycle management
- **internal/files**: File upload/download and management
- **internal/terminal**: WebSocket terminal sessions and PTY handling
- **internal/webhook**: GitHub webhook processing

## Security Features

- OAuth2 authentication with Google
- Container isolation using Docker networks
- Resource limits per user container
- Path traversal protection for file operations
- HMAC signature verification for webhooks
- Session-based authentication

## Performance Optimizations

- Connection pooling for database operations
- Efficient WebSocket message handling
- Container reuse and lifecycle management
- Background cleanup of idle containers
- Optimized file operations with proper permissions
