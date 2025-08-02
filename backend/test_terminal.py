"""
Unit tests for terminal.py module
"""
import pytest
from unittest.mock import Mock, patch, MagicMock
import os
import threading

class TestTerminalModule:
    """Test cases for terminal module functions"""
    
    def test_set_winsize(self):
        """Test terminal window size setting"""
        from backend.terminal import set_winsize
        
        # Mock file descriptor and fcntl
        with patch('fcntl.ioctl') as mock_ioctl, \
             patch('struct.pack') as mock_pack:
            
            mock_pack.return_value = b'test_winsize'
            fd = 5
            rows, cols = 24, 80
            
            set_winsize(fd, rows, cols)
            
            mock_pack.assert_called_once_with("HHHH", rows, cols, 0, 0)
            mock_ioctl.assert_called_once()
    
    def test_session_map_operations(self):
        """Test session mapping operations"""
        import backend.terminal as terminal
        
        # Clear session map
        terminal.session_map.clear()
        
        # Test adding session
        sid = 'test-session-456'
        session_data = {
            "fd": None,
            "user_id": 1,
            "container_attached": False,
            "container_name": "user-container-1",
            "tab_id": "2"
        }
        
        terminal.session_map[sid] = session_data
        
        # Verify session was added
        assert sid in terminal.session_map
        assert terminal.session_map[sid]["user_id"] == 1
        assert terminal.session_map[sid]["tab_id"] == "2"
        
        # Test removing session
        del terminal.session_map[sid]
        assert sid not in terminal.session_map
    
    def test_user_containers_operations(self):
        """Test user containers mapping operations"""
        import backend.terminal as terminal
        
        # Clear user containers
        terminal.user_containers.clear()
        
        user_id = 1
        container_data = {
            "container_name": "user-container-1",
            "port_range": (8000, 8100)
        }
        
        terminal.user_containers[user_id] = container_data
        
        # Verify container was added
        assert user_id in terminal.user_containers
        assert terminal.user_containers[user_id]["container_name"] == "user-container-1"
        assert terminal.user_containers[user_id]["port_range"] == (8000, 8100)
    
    @patch('backend.terminal.attach_to_container')
    @patch('backend.terminal.socketio')
    def test_handle_connect_new_user(self, mock_socketio, mock_attach, mock_flask_dependencies):
        """Test terminal connection for new user"""
        import backend.terminal as terminal
        from backend.terminal import handle_connect
        
        # Clear state
        terminal.session_map.clear()
        terminal.user_containers.clear()
        
        # Mock container operations
        mock_attach.return_value = (Mock(), 5)  # proc, fd
        
        with patch('backend.terminal.spawn_container') as mock_spawn, \
             patch('backend.docker.container_exists', return_value=False):
            
            mock_spawn.return_value = None
            
            # Call handle_connect
            handle_connect()
            
            # Verify session was created
            sid = mock_flask_dependencies['request'].sid
            assert sid in terminal.session_map
            assert terminal.session_map[sid]["user_id"] == 1
            assert terminal.session_map[sid]["tab_id"] == "1"
            
            # Verify container was spawned
            mock_spawn.assert_called_once()
            # Note: attach_to_container is now called during handle_resize, not handle_connect
            mock_attach.assert_not_called()
    
    @patch('backend.terminal.os.write')
    def test_handle_pty_input(self, mock_write, mock_flask_dependencies):
        """Test PTY input handling"""
        import backend.terminal as terminal
        from backend.terminal import handle_pty_input
        
        # Set up session
        sid = mock_flask_dependencies['request'].sid
        terminal.session_map[sid] = {
            "fd": 5,
            "user_id": 1,
            "container_attached": True,
            "container_name": "user-container-1",
            "tab_id": "1"
        }
        
        # Test input
        data = {"input": "ls -la\n"}
        handle_pty_input(data)
        
        # Verify write was called
        mock_write.assert_called_once_with(5, b"ls -la\n")
    
    def test_handle_pty_input_unauthorized(self, mock_flask_dependencies):
        """Test PTY input handling with unauthorized user"""
        from backend.terminal import handle_pty_input
        
        # Mock unauthorized user
        mock_flask_dependencies['user'].is_authenticated = False
        
        data = {"input": "test"}
        result = handle_pty_input(data)
        
        # Should return unauthorized
        assert result == ("Unauthorized", 401)
    
    @patch('backend.terminal.set_winsize')
    @patch('backend.terminal.attach_to_container')
    def test_handle_resize(self, mock_attach, mock_set_winsize, mock_flask_dependencies):
        """Test terminal resize handling"""
        import backend.terminal as terminal
        from backend.terminal import handle_resize
        
        # Set up session
        sid = mock_flask_dependencies['request'].sid
        terminal.session_map[sid] = {
            "fd": 5,
            "user_id": 1,
            "container_attached": True,
            "container_name": "user-container-1",
            "tab_id": "1"
        }
        
        # Mock attach for lazy loading
        mock_attach.return_value = (Mock(), 5)
        
        # Test resize
        data = {"rows": 30, "cols": 120}
        handle_resize(data)
        
        # Verify resize was called
        mock_set_winsize.assert_called_once_with(5, 30, 120)
    
    def test_cleanup_timers(self):
        """Test cleanup timer management"""
        import backend.terminal as terminal
        
        # Clear timers
        terminal._cleanup_timers.clear()
        
        user_id = 1
        timer_event = threading.Event()
        terminal._cleanup_timers[user_id] = timer_event
        
        # Verify timer was added
        assert user_id in terminal._cleanup_timers
        assert isinstance(terminal._cleanup_timers[user_id], threading.Event)
        
        # Test canceling timer
        from backend.terminal import _cancel_idle_poller
        _cancel_idle_poller(user_id)
        
        # Timer should be set (cancelled)
        assert timer_event.is_set()


class TestTabSessionManagement:
    """Test cases for tab-specific session management"""
    
    def test_unique_tab_sessions(self):
        """Test that different tabs create separate sessions"""
        import backend.terminal as terminal
        
        terminal.session_map.clear()
        
        # Create sessions for different tabs
        tab1_sid = 'session-tab1'
        tab2_sid = 'session-tab2'
        
        # Tab 1 session
        terminal.session_map[tab1_sid] = {
            "fd": 5,
            "user_id": 1,
            "container_attached": True,
            "container_name": "user-container-1",
            "tab_id": "1"
        }
        
        # Tab 2 session
        terminal.session_map[tab2_sid] = {
            "fd": 6,
            "user_id": 1,
            "container_attached": True,
            "container_name": "user-container-1",
            "tab_id": "2"
        }
        
        # Verify both sessions exist with different tab IDs
        assert terminal.session_map[tab1_sid]["tab_id"] == "1"
        assert terminal.session_map[tab2_sid]["tab_id"] == "2"
        assert terminal.session_map[tab1_sid]["fd"] != terminal.session_map[tab2_sid]["fd"]
    
    def test_tab_id_extraction(self, mock_flask_dependencies):
        """Test tab ID extraction from request arguments"""
        # Test default tab ID
        mock_flask_dependencies['request'].args.get.return_value = None
        
        from backend.terminal import handle_connect
        
        with patch('backend.terminal.attach_to_container') as mock_attach, \
             patch('backend.terminal.spawn_container'), \
             patch('backend.docker.container_exists', return_value=False):
            
            mock_attach.return_value = (Mock(), 5)
            handle_connect()
            
            # Should use default tab ID '1'
            mock_flask_dependencies['request'].args.get.assert_called_with('tabId', '1')
    
    def test_session_disconnect_cleanup(self, mock_flask_dependencies):
        """Test session cleanup on disconnect"""
        import backend.terminal as terminal
        from backend.terminal import handle_disconnect
        
        # Set up session
        sid = mock_flask_dependencies['request'].sid
        terminal.session_map[sid] = {
            "fd": 5,
            "user_id": 1,
            "container_attached": True,
            "container_name": "user-container-1",
            "tab_id": "1"
        }
        
        with patch('os.close') as mock_close:
            handle_disconnect()
            
            # Verify session was removed and fd closed
            assert sid not in terminal.session_map
            mock_close.assert_called_once_with(5)


if __name__ == '__main__':
    pytest.main([__file__])