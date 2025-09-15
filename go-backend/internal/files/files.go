package files

import (
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"3compute-backend/internal/auth"
	"3compute-backend/internal/docker"

	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
)

// RegisterRoutes registers file-related routes
func RegisterRoutes(r *gin.Engine) {
	r.POST("/upload", auth.RequireAuth(), handleUpload)
	r.POST("/upload-folder", auth.RequireAuth(), handleUploadFolder)
	r.GET("/list-files", auth.RequireAuth(), handleListFiles)
	r.POST("/move", auth.RequireAuth(), handleMoveFileOrFolder)
	r.Match([]string{"GET", "PUT", "DELETE", "POST"}, "/file/*filepath", auth.RequireAuth(), handleFile)
}

// setContainerOwnership sets ownership of a file/directory to match the container user
func setContainerOwnership(path string) {
	if err := os.Chown(path, docker.ContainerUserUID, docker.ContainerUserGID); err != nil {
		logrus.WithError(err).Warnf("Failed to set ownership for %s", path)
		return
	}

	// Also ensure proper permissions
	info, err := os.Stat(path)
	if err != nil {
		logrus.WithError(err).Warnf("Failed to stat %s", path)
		return
	}

	if info.IsDir() {
		os.Chmod(path, 0755) // drwxr-xr-x for directories
	} else {
		os.Chmod(path, 0644) // -rw-r--r-- for files
	}
}

func handleUpload(c *gin.Context) {
	user := c.MustGet("user").(*auth.User)
	uploadDir := fmt.Sprintf("/tmp/uploads/%s", user.ID)

	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create upload directory"})
		return
	}
	setContainerOwnership(uploadDir)

	form, err := c.MultipartForm()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to parse multipart form"})
		return
	}

	files := form.File["files"]
	if len(files) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No files provided"})
		return
	}

	for _, fileHeader := range files {
		if err := saveUploadedFile(fileHeader, uploadDir); err != nil {
			logrus.WithError(err).Errorf("Failed to save file %s", fileHeader.Filename)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save file"})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{"message": "File uploaded successfully"})
}

func handleUploadFolder(c *gin.Context) {
	user := c.MustGet("user").(*auth.User)
	uploadDir := fmt.Sprintf("/tmp/uploads/%s", user.ID)

	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create upload directory"})
		return
	}
	setContainerOwnership(uploadDir)

	form, err := c.MultipartForm()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to parse multipart form"})
		return
	}

	files := form.File["files"]
	if len(files) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No files provided"})
		return
	}

	for _, fileHeader := range files {
		safePath := filepath.Join(uploadDir, fileHeader.Filename)
		safePath = filepath.Clean(safePath)
		
		// Prevent directory traversal
		if !strings.HasPrefix(safePath, uploadDir) {
			continue
		}

		dirPath := filepath.Dir(safePath)
		if err := os.MkdirAll(dirPath, 0755); err != nil {
			logrus.WithError(err).Errorf("Failed to create directory %s", dirPath)
			continue
		}
		setContainerOwnership(dirPath)

		if err := saveUploadedFile(fileHeader, filepath.Dir(safePath)); err != nil {
			logrus.WithError(err).Errorf("Failed to save file %s", fileHeader.Filename)
			continue
		}
	}

	// Check if move-into parameter is provided
	moveInto := c.PostForm("move-into")
	if moveInto != "" {
		containerName := fmt.Sprintf("user-container-%s", user.ID)
		
		// Send Enter key first
		if err := docker.SendTmuxKeys(containerName, "3compute", "Enter"); err != nil {
			logrus.WithError(err).Warn("Failed to send Enter key to tmux")
		}
		
		// Then send cd command
		cdCommand := fmt.Sprintf("cd /app/%s", moveInto)
		if err := docker.SendTmuxKeys(containerName, "3compute", cdCommand, "Enter"); err != nil {
			logrus.WithError(err).Warn("Failed to send cd command to tmux")
		}
	}

	c.JSON(http.StatusOK, gin.H{"message": "Folder uploaded successfully"})
}

func handleListFiles(c *gin.Context) {
	user := c.MustGet("user").(*auth.User)
	uploadDir := fmt.Sprintf("/tmp/uploads/%s", user.ID)

	if _, err := os.Stat(uploadDir); os.IsNotExist(err) {
		c.JSON(http.StatusOK, gin.H{"files": []string{}})
		return
	}

	var fileTree []string

	err := filepath.Walk(uploadDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		// Skip the root directory itself
		if path == uploadDir {
			return nil
		}

		relativePath, err := filepath.Rel(uploadDir, path)
		if err != nil {
			return err
		}

		if info.IsDir() {
			// Include directories with trailing slash
			fileTree = append(fileTree, relativePath+"/")
		} else {
			// Include files
			fileTree = append(fileTree, relativePath)
		}

		return nil
	})

	if err != nil {
		logrus.WithError(err).Error("Failed to walk directory")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list files"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"files": fileTree})
}

func handleMoveFileOrFolder(c *gin.Context) {
	user := c.MustGet("user").(*auth.User)

	var data struct {
		Source      string `json:"source"`
		Destination string `json:"destination"`
		Overwrite   bool   `json:"overwrite"`
	}

	if err := c.ShouldBindJSON(&data); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request data"})
		return
	}

	source := strings.TrimPrefix(data.Source, "/")
	destination := strings.TrimPrefix(data.Destination, "/")

	if source == "" || destination == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid path"})
		return
	}

	uploadDir := fmt.Sprintf("/tmp/uploads/%s", user.ID)
	srcPath := filepath.Join(uploadDir, source)
	dstPath := filepath.Join(uploadDir, destination)

	// Security: ensure resulting paths stay within the user's directory
	srcPath = filepath.Clean(srcPath)
	dstPath = filepath.Clean(dstPath)
	if !strings.HasPrefix(srcPath, uploadDir) || !strings.HasPrefix(dstPath, uploadDir) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid path"})
		return
	}

	if _, err := os.Stat(srcPath); os.IsNotExist(err) {
		c.JSON(http.StatusNotFound, gin.H{"error": "Source not found"})
		return
	}

	// Disallow moving a folder into itself or its descendants
	srcRel, _ := filepath.Rel(uploadDir, srcPath)
	dstRel, _ := filepath.Rel(uploadDir, dstPath)
	if dstRel == srcRel || strings.HasPrefix(dstRel, srcRel+string(filepath.Separator)) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot move a folder into itself or its subdirectory"})
		return
	}

	// Ensure destination parent exists
	dstParent := filepath.Dir(dstPath)
	if dstParent != uploadDir {
		if err := os.MkdirAll(dstParent, 0755); err != nil {
			c.JSON(http.StatusConflict, gin.H{"error": "A file exists in the destination path"})
			return
		}
		setContainerOwnership(dstParent)
	}

	// Prevent overwriting existing files/folders unless overwrite flag is set
	if _, err := os.Stat(dstPath); err == nil {
		if !data.Overwrite {
			c.JSON(http.StatusConflict, gin.H{"error": "Destination already exists"})
			return
		}
		// If overwriting, remove existing destination first
		if err := os.RemoveAll(dstPath); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to replace destination: %v", err)})
			return
		}
	}

	if err := os.Rename(srcPath, dstPath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to move: %v", err)})
		return
	}

	// Set ownership on the moved item
	setContainerOwnership(dstPath)

	c.JSON(http.StatusOK, gin.H{"message": "Moved successfully"})
}

func handleFile(c *gin.Context) {
	user := c.MustGet("user").(*auth.User)
	filename := strings.TrimPrefix(c.Param("filepath"), "/")
	
	if filename == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No filename provided"})
		return
	}

	uploadDir := fmt.Sprintf("/tmp/uploads/%s", user.ID)
	filePath := filepath.Join(uploadDir, filename)
	filePath = filepath.Clean(filePath)

	// Security check
	if !strings.HasPrefix(filePath, uploadDir) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid path"})
		return
	}

	switch c.Request.Method {
	case "POST":
		handleCreateFileOrDir(c, filePath, filename)
	case "GET":
		handleGetFile(c, filePath, filename)
	case "PUT":
		handleUpdateFile(c, filePath)
	case "DELETE":
		handleDeleteFile(c, filePath)
	}
}

func handleCreateFileOrDir(c *gin.Context, filePath, filename string) {
	if strings.HasSuffix(filename, "/") {
		// It's a directory
		normalizedPath := strings.TrimSuffix(filePath, "/")
		
		// If a file exists with the same name, return conflict
		if info, err := os.Stat(normalizedPath); err == nil && !info.IsDir() {
			c.JSON(http.StatusConflict, gin.H{"error": "A file with the same name already exists"})
			return
		}
		
		if err := os.MkdirAll(filePath, 0755); err != nil {
			c.JSON(http.StatusConflict, gin.H{"error": "A file exists in the path; cannot create directory"})
			return
		}
		setContainerOwnership(filePath)
		c.JSON(http.StatusOK, gin.H{"message": "Directory created successfully"})
	} else {
		// It's a file
		dirPath := filepath.Dir(filePath)
		uploadDir := fmt.Sprintf("/tmp/uploads/%s", c.MustGet("user").(*auth.User).ID)
		
		if dirPath != uploadDir {
			if err := os.MkdirAll(dirPath, 0755); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create directory"})
				return
			}
			setContainerOwnership(dirPath)
		}

		// If a directory with the same name exists, return conflict
		if info, err := os.Stat(filePath); err == nil && info.IsDir() {
			c.JSON(http.StatusConflict, gin.H{"error": "A folder with the same name already exists"})
			return
		}

		if _, err := os.Stat(filePath); err == nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "File already exists"})
			return
		}

		file, err := os.Create(filePath)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create file"})
			return
		}
		file.Close()
		setContainerOwnership(filePath)
		c.JSON(http.StatusOK, gin.H{"message": "File created successfully"})
	}
}

func handleGetFile(c *gin.Context, filePath, filename string) {
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		c.JSON(http.StatusNotFound, gin.H{"error": "File not found"})
		return
	}

	// Check if it's an image file
	imageExtensions := []string{"jpg", "jpeg", "png", "gif", "bmp", "webp", "svg", "ico"}
	ext := strings.ToLower(filepath.Ext(filename))
	if len(ext) > 0 {
		ext = ext[1:] // Remove the dot
	}

	isImage := false
	for _, imgExt := range imageExtensions {
		if ext == imgExt {
			isImage = true
			break
		}
	}

	if isImage {
		c.File(filePath)
		return
	}

	// Try to read as text file
	content, err := os.ReadFile(filePath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read file"})
		return
	}

	// Check if content is valid UTF-8
	if !isValidUTF8(content) {
		// If not valid UTF-8, serve as binary file
		c.File(filePath)
		return
	}

	c.String(http.StatusOK, string(content))
}

func handleUpdateFile(c *gin.Context, filePath string) {
	content, err := io.ReadAll(c.Request.Body)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to read request body"})
		return
	}

	if err := os.WriteFile(filePath, content, 0644); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to write file"})
		return
	}

	setContainerOwnership(filePath)
	c.JSON(http.StatusOK, gin.H{"message": "File updated successfully"})
}

func handleDeleteFile(c *gin.Context, filePath string) {
	if err := os.RemoveAll(filePath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete file"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "File deleted successfully"})
}

// saveUploadedFile saves an uploaded file to the specified directory
func saveUploadedFile(fileHeader *multipart.FileHeader, dir string) error {
	src, err := fileHeader.Open()
	if err != nil {
		return err
	}
	defer src.Close()

	filePath := filepath.Join(dir, fileHeader.Filename)
	dst, err := os.Create(filePath)
	if err != nil {
		return err
	}
	defer dst.Close()

	if _, err := io.Copy(dst, src); err != nil {
		return err
	}

	setContainerOwnership(filePath)
	return nil
}

// isValidUTF8 checks if the content is valid UTF-8
func isValidUTF8(content []byte) bool {
	// Simple check - if we can convert to string without replacement characters
	str := string(content)
	return !strings.Contains(str, "\uFFFD")
}
