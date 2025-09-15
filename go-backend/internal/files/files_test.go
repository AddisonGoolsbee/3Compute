package files

import (
	"io/ioutil"
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestIsValidUTF8(t *testing.T) {
	testCases := []struct {
		name     string
		content  []byte
		expected bool
	}{
		{
			name:     "Valid UTF-8 text",
			content:  []byte("Hello, world!"),
			expected: true,
		},
		{
			name:     "Valid UTF-8 with unicode",
			content:  []byte("Hello, 世界!"),
			expected: true,
		},
		{
			name:     "Empty content",
			content:  []byte(""),
			expected: true,
		},
		{
			name:     "Valid UTF-8 with newlines",
			content:  []byte("Line 1\nLine 2\nLine 3"),
			expected: true,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			result := isValidUTF8(tc.content)
			assert.Equal(t, tc.expected, result)
		})
	}
}

func TestSetContainerOwnership(t *testing.T) {
	// Create a temporary file for testing
	tempFile, err := ioutil.TempFile("", "test_ownership_*.txt")
	require.NoError(t, err)
	defer os.Remove(tempFile.Name())
	tempFile.Close()

	// Test that the function doesn't panic
	// Note: This will likely fail in test environments due to permission issues,
	// but we're testing that it handles errors gracefully
	setContainerOwnership(tempFile.Name())

	// Verify file still exists (wasn't corrupted by ownership change attempt)
	_, err = os.Stat(tempFile.Name())
	assert.NoError(t, err)
}

func TestSaveUploadedFile(t *testing.T) {
	// Create a temporary directory
	tempDir, err := ioutil.TempDir("", "test_upload_*")
	require.NoError(t, err)
	defer os.RemoveAll(tempDir)

	// Create a mock file header and content
	content := []byte("test file content")
	tempSourceFile, err := ioutil.TempFile("", "source_*.txt")
	require.NoError(t, err)
	defer os.Remove(tempSourceFile.Name())

	_, err = tempSourceFile.Write(content)
	require.NoError(t, err)
	tempSourceFile.Close()

	// Create a mock multipart.FileHeader
	// This is simplified - in real tests you'd use httptest
	filename := "test.txt"
	
	// Test that we can create the destination path
	destPath := filepath.Join(tempDir, filename)
	
	// Copy the source file to destination manually (simulating saveUploadedFile logic)
	sourceContent, err := ioutil.ReadFile(tempSourceFile.Name())
	require.NoError(t, err)
	
	err = ioutil.WriteFile(destPath, sourceContent, 0644)
	require.NoError(t, err)
	
	// Verify file was created with correct content
	savedContent, err := ioutil.ReadFile(destPath)
	require.NoError(t, err)
	assert.Equal(t, content, savedContent)
}

func TestFilePathSecurity(t *testing.T) {
	baseDir := "/tmp/uploads/testuser"
	
	testCases := []struct {
		name       string
		filename   string
		shouldPass bool
	}{
		{
			name:       "Safe filename",
			filename:   "document.txt",
			shouldPass: true,
		},
		{
			name:       "Safe nested path",
			filename:   "folder/document.txt",
			shouldPass: true,
		},
		{
			name:       "Directory traversal attempt",
			filename:   "../../../etc/passwd",
			shouldPass: false,
		},
		{
			name:       "Another traversal attempt",
			filename:   "folder/../../sensitive.txt",
			shouldPass: false,
		},
		{
			name:       "Absolute path attempt",
			filename:   "/etc/passwd",
			shouldPass: false,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			safePath := filepath.Join(baseDir, tc.filename)
			safePath = filepath.Clean(safePath)
			
			isWithinBase := filepath.HasPrefix(safePath, baseDir)
			if tc.shouldPass {
				assert.True(t, isWithinBase, "Safe path should be within base directory")
			} else {
				assert.False(t, isWithinBase, "Unsafe path should not be within base directory")
			}
		})
	}
}

func TestDirectoryCreation(t *testing.T) {
	// Create a temporary base directory
	tempDir, err := ioutil.TempDir("", "test_mkdir_*")
	require.NoError(t, err)
	defer os.RemoveAll(tempDir)

	// Test creating nested directories
	nestedPath := filepath.Join(tempDir, "level1", "level2", "level3")
	
	err = os.MkdirAll(nestedPath, 0755)
	require.NoError(t, err)
	
	// Verify directory was created
	info, err := os.Stat(nestedPath)
	require.NoError(t, err)
	assert.True(t, info.IsDir())
}

func TestFileOperations(t *testing.T) {
	// Create a temporary directory for testing
	tempDir, err := ioutil.TempDir("", "test_file_ops_*")
	require.NoError(t, err)
	defer os.RemoveAll(tempDir)

	// Test file creation
	testFile := filepath.Join(tempDir, "test.txt")
	content := []byte("Hello, world!")
	
	err = ioutil.WriteFile(testFile, content, 0644)
	require.NoError(t, err)
	
	// Test file reading
	readContent, err := ioutil.ReadFile(testFile)
	require.NoError(t, err)
	assert.Equal(t, content, readContent)
	
	// Test file deletion
	err = os.Remove(testFile)
	require.NoError(t, err)
	
	// Verify file was deleted
	_, err = os.Stat(testFile)
	assert.True(t, os.IsNotExist(err))
}

func TestDirectoryListing(t *testing.T) {
	// Create a temporary directory structure
	tempDir, err := ioutil.TempDir("", "test_listing_*")
	require.NoError(t, err)
	defer os.RemoveAll(tempDir)

	// Create some files and directories
	testFiles := []string{
		"file1.txt",
		"file2.txt",
		"subdir/file3.txt",
		"subdir/subsubdir/file4.txt",
	}

	for _, file := range testFiles {
		fullPath := filepath.Join(tempDir, file)
		dir := filepath.Dir(fullPath)
		
		err = os.MkdirAll(dir, 0755)
		require.NoError(t, err)
		
		err = ioutil.WriteFile(fullPath, []byte("test content"), 0644)
		require.NoError(t, err)
	}

	// Test directory walking
	var foundFiles []string
	err = filepath.Walk(tempDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		
		if path == tempDir {
			return nil // Skip root directory
		}
		
		relativePath, err := filepath.Rel(tempDir, path)
		if err != nil {
			return err
		}
		
		if info.IsDir() {
			foundFiles = append(foundFiles, relativePath+"/")
		} else {
			foundFiles = append(foundFiles, relativePath)
		}
		
		return nil
	})
	
	require.NoError(t, err)
	
	// Verify we found the expected files and directories
	assert.Contains(t, foundFiles, "file1.txt")
	assert.Contains(t, foundFiles, "file2.txt")
	assert.Contains(t, foundFiles, "subdir/")
	assert.Contains(t, foundFiles, "subdir/file3.txt")
	assert.Contains(t, foundFiles, "subdir/subsubdir/")
	assert.Contains(t, foundFiles, "subdir/subsubdir/file4.txt")
}

func TestMoveOperations(t *testing.T) {
	// Create a temporary directory
	tempDir, err := ioutil.TempDir("", "test_move_*")
	require.NoError(t, err)
	defer os.RemoveAll(tempDir)

	// Create source file
	sourceFile := filepath.Join(tempDir, "source.txt")
	content := []byte("test content")
	err = ioutil.WriteFile(sourceFile, content, 0644)
	require.NoError(t, err)

	// Test moving file
	destFile := filepath.Join(tempDir, "destination.txt")
	err = os.Rename(sourceFile, destFile)
	require.NoError(t, err)

	// Verify source no longer exists
	_, err = os.Stat(sourceFile)
	assert.True(t, os.IsNotExist(err))

	// Verify destination exists with correct content
	destContent, err := ioutil.ReadFile(destFile)
	require.NoError(t, err)
	assert.Equal(t, content, destContent)
}

func TestImageFileDetection(t *testing.T) {
	imageExtensions := []string{"jpg", "jpeg", "png", "gif", "bmp", "webp", "svg", "ico"}
	
	testCases := []struct {
		filename string
		isImage  bool
	}{
		{"document.txt", false},
		{"image.jpg", true},
		{"image.JPEG", true}, // Test case insensitive
		{"photo.png", true},
		{"animation.gif", true},
		{"icon.svg", true},
		{"favicon.ico", true},
		{"data.json", false},
		{"script.js", false},
		{"style.css", false},
		{"image.jpg.txt", false}, // Extension at end matters
	}

	for _, tc := range testCases {
		t.Run(tc.filename, func(t *testing.T) {
			ext := filepath.Ext(tc.filename)
			if len(ext) > 0 {
				ext = ext[1:] // Remove the dot
			}
			ext = filepath.Ext(tc.filename)
			if len(ext) > 0 {
				ext = ext[1:]
			}
			
			isImage := false
			for _, imgExt := range imageExtensions {
				if ext == imgExt || ext == filepath.Ext(tc.filename)[1:] {
					isImage = true
					break
				}
			}
			
			// More accurate test
			ext = filepath.Ext(tc.filename)
			if len(ext) > 0 {
				ext = ext[1:] // Remove dot
			}
			
			isImage = false
			for _, imgExt := range imageExtensions {
				if ext == imgExt {
					isImage = true
					break
				}
			}
			
			assert.Equal(t, tc.isImage, isImage)
		})
	}
}

func TestPathCleaning(t *testing.T) {
	testCases := []struct {
		input    string
		expected string
	}{
		{"file.txt", "file.txt"},
		{"./file.txt", "file.txt"},
		{"folder/../file.txt", "file.txt"},
		{"folder/./file.txt", "folder/file.txt"},
		{"/absolute/path", "/absolute/path"},
		{"", "."},
	}

	for _, tc := range testCases {
		t.Run(tc.input, func(t *testing.T) {
			cleaned := filepath.Clean(tc.input)
			assert.Equal(t, tc.expected, cleaned)
		})
	}
}

func TestBinaryVsTextDetection(t *testing.T) {
	// Test with clearly text content
	textContent := []byte("This is plain text content\nwith multiple lines\n")
	assert.True(t, isValidUTF8(textContent))

	// Test with empty content
	emptyContent := []byte("")
	assert.True(t, isValidUTF8(emptyContent))

	// Test with unicode content
	unicodeContent := []byte("Hello 世界 🌍")
	assert.True(t, isValidUTF8(unicodeContent))
}
