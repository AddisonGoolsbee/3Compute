"""
Integration tests for 3Compute backend
Tests component interactions and workflows
"""
import pytest
from unittest.mock import Mock, patch
import os


class TestTerminalDockerIntegration:
    """Integration tests between terminal and docker modules"""
    
    @patch('backend.docker.container_is_running')
    @patch('backend.docker.pty.openpty')
    @patch('subprocess.Popen')
    def test_full_terminal_connection_flow(self, mock_popen, mock_pty, mock_running, mock_flask_dependencies):
        """Test complete terminal connection workflow"""
        import backend.blueprints.terminal as terminal
        from backend.blueprints.terminal import handle_connect
        
        # Configure docker mocks
        mock_running.return_value = True
        mock_pty.return_value = (5, 6)
        mock_proc = Mock()
        mock_popen.return_value = mock_proc
        
        # Clear state
        terminal.session_map.clear()
        terminal.user_containers.clear()
        
        with patch('backend.docker.container_exists', return_value=True), \
             patch('backend.blueprints.terminal.attach_to_container') as mock_attach:
            
            # Configure mocks
            mock_flask_dependencies['user'].id = 1
            mock_flask_dependencies['user'].port_range = (8000, 8100)
            mock_flask_dependencies['request'].sid = 'test-session'
            mock_flask_dependencies['request'].args.get.return_value = '3'  # tab ID
            mock_attach.return_value = (mock_proc, 5)
            
            # Test connection
            handle_connect()
            
            # Verify session created
            assert 'test-session' in terminal.session_map
            session = terminal.session_map['test-session']
            assert session['user_id'] == 1
            assert session['tab_id'] == '3'
            # Container attachment happens later in resize handler
            assert session['container_attached'] is False
            
            # Docker attachment happens on resize, not on connect
            mock_attach.assert_not_called()

    def test_container_spawning_integration(self, mock_flask_dependencies):
        """Test container spawning when not exists"""
        import backend.blueprints.terminal as terminal
        from backend.blueprints.terminal import handle_connect
        
        terminal.session_map.clear()
        terminal.user_containers.clear()
        
        with patch('backend.docker.container_exists', return_value=False), \
             patch('backend.docker.container_is_running', return_value=False), \
             patch('backend.docker.spawn_container') as mock_spawn, \
             patch('backend.blueprints.terminal.attach_to_container') as mock_attach, \
             patch('subprocess.run') as mock_subprocess, \
             patch('backend.docker.prepare_user_directory') as mock_prepare:
            
            # Configure mocks
            mock_spawn.return_value = None
            mock_attach.return_value = (Mock(), 7)
            mock_subprocess.return_value = Mock(returncode=0)
            mock_prepare.return_value = None
            
            mock_flask_dependencies['user'].id = 999
            mock_flask_dependencies['user'].port_range = (9100, 9200)
            mock_flask_dependencies['request'].sid = 'test-session-999'
            mock_flask_dependencies['request'].args.get.return_value = '1'
            
            handle_connect()
            
            # Verify session was created successfully
            assert 'test-session-999' in terminal.session_map
            session = terminal.session_map['test-session-999']
            assert session['user_id'] == 999
            assert session['tab_id'] == '1'
            assert session['container_name'] == 'user-container-999'
            
            # Verify that the container would be tracked for this user
            assert 999 in terminal.user_containers
            assert terminal.user_containers[999]['container_name'] == 'user-container-999'
            assert terminal.user_containers[999]['port_range'] == (9100, 9200)


class TestAuthFileIntegration:
    """Integration tests between auth and file operations"""
    
    def test_user_data_persistence(self, temp_file):
        """Test user data storage and retrieval"""
        from backend.blueprints.auth import update_user_data, get_user_data
        
        # Test data
        user_info = {
            'email': 'test@example.com'
        }
        
        with patch('backend.blueprints.auth.USERS_JSON_FILE', temp_file):
            # Store user data
            update_user_data('test-user-123', user_info, '127.0.0.1', 8000)
            
            # Retrieve and verify
            retrieved_data = get_user_data('test-user-123')
            assert retrieved_data is not None
            assert retrieved_data['email'] == 'test@example.com'
            assert 'first_login' in retrieved_data
            assert 'last_login' in retrieved_data
            assert retrieved_data['ip_addresses'] == ['127.0.0.1']
    
    def test_multiple_users_data_persistence(self, temp_file):
        """Test multiple users data storage"""
        from backend.blueprints.auth import update_user_data, get_user_data
        
        users = [
            {'id': '1', 'email': 'user1@test.com'},
            {'id': '2', 'email': 'user2@test.com'},
            {'id': '3', 'email': 'user3@test.com'}
        ]
        
        with patch('backend.blueprints.auth.USERS_JSON_FILE', temp_file):
            # Store multiple users
            for i, user in enumerate(users):
                update_user_data(user['id'], {'email': user['email']}, '192.168.1.1', 8000 + i * 10)
            
            # Verify all users exist
            for user in users:
                retrieved = get_user_data(user['id'])
                assert retrieved is not None
                assert retrieved['email'] == user['email']
                assert 'first_login' in retrieved
                assert 'last_login' in retrieved


class TestTerminalAuthIntegration:
    """Integration tests between terminal and auth modules"""
    
    def test_authenticated_user_terminal_access(self, mock_flask_dependencies):
        """Test terminal access for authenticated users"""
        import backend.blueprints.terminal as terminal
        from backend.blueprints.terminal import handle_pty_input
        
        terminal.session_map.clear()
        
        with patch('os.write') as mock_write:
            
            # Setup authenticated user session
            mock_flask_dependencies['user'].is_authenticated = True
            mock_flask_dependencies['user'].id = 1
            mock_flask_dependencies['request'].sid = 'auth-session'
            
            session_data = {
                'fd': 8,
                'user_id': 1,
                'container_attached': True,
                'container_name': 'user-container-1',
                'tab_id': '1'
            }
            terminal.session_map['auth-session'] = session_data
            
            # Test input handling
            data = {'input': 'echo hello\n'}
            handle_pty_input(data)
            
            # Verify write was called with correct data
            mock_write.assert_called_once_with(8, b'echo hello\n')
    
    def test_unauthenticated_user_terminal_denial(self, mock_flask_dependencies):
        """Test terminal access denial for unauthenticated users"""
        from backend.blueprints.terminal import handle_pty_input
        
        # Setup unauthenticated user
        mock_flask_dependencies['user'].is_authenticated = False
        
        data = {'input': 'malicious command'}
        result = handle_pty_input(data)
        
        # Should be denied
        assert result == ("Unauthorized", 401)


class TestFullWorkflowIntegration:
    """End-to-end workflow integration tests"""
    
    @patch('subprocess.run')
    @patch('backend.docker.pty.openpty')
    @patch('subprocess.Popen')
    def test_complete_user_workflow(self, mock_popen, mock_pty, mock_run, mock_flask_dependencies):
        """Test complete user workflow from auth to terminal"""
        import backend.blueprints.terminal as terminal
        from backend.blueprints.terminal import handle_connect, handle_pty_input, handle_disconnect
        
        # Configure Docker mocks
        mock_run.return_value = Mock(returncode=0, stdout='running\n')
        mock_pty.return_value = (9, 10)
        mock_proc = Mock()
        mock_popen.return_value = mock_proc
        
        terminal.session_map.clear()
        terminal.user_containers.clear()
        
        with patch('backend.docker.container_exists', return_value=True), \
             patch('backend.blueprints.terminal.attach_to_container') as mock_attach, \
             patch('os.write') as mock_write, \
             patch('os.close') as mock_close:
            
            # Setup user and session
            mock_flask_dependencies['user'].id = 5
            mock_flask_dependencies['user'].is_authenticated = True
            mock_flask_dependencies['user'].port_range = (8500, 8600)
            mock_flask_dependencies['request'].sid = 'workflow-session'
            mock_flask_dependencies['request'].args.get.return_value = '1'
            mock_attach.return_value = (mock_proc, 9)
            
            # Step 1: User connects
            handle_connect()
            assert 'workflow-session' in terminal.session_map
            
            # Step 1.5: Simulate terminal resize which triggers attachment
            from backend.blueprints.terminal import handle_resize
            resize_data = {'rows': 24, 'cols': 80}
            handle_resize(resize_data)
            
            # Step 2: User sends terminal input
            data = {'input': 'ls -la\n'}
            handle_pty_input(data)
            mock_write.assert_called_with(9, b'ls -la\n')
            
            # Step 3: User disconnects
            handle_disconnect()
            assert 'workflow-session' not in terminal.session_map
            mock_close.assert_called_with(9)
    
    def test_multi_tab_user_session(self, mock_flask_dependencies):
        """Test user with multiple terminal tabs"""
        import backend.blueprints.terminal as terminal
        from backend.blueprints.terminal import handle_connect
        
        terminal.session_map.clear()
        
        with patch('backend.docker.container_exists', return_value=True), \
             patch('backend.docker.container_is_running', return_value=True), \
             patch('subprocess.run') as mock_subprocess, \
             patch('backend.blueprints.terminal.attach_to_container') as mock_attach:
            
            mock_subprocess.return_value = Mock(returncode=0)
            mock_flask_dependencies['user'].id = 6
            mock_flask_dependencies['user'].is_authenticated = True
            mock_flask_dependencies['user'].port_range = (8600, 8700)
            mock_attach.return_value = (Mock(), 11)
            
            # Tab 1
            mock_flask_dependencies['request'].sid = 'tab1-session'
            mock_flask_dependencies['request'].args.get.return_value = '1'
            handle_connect()
            
            # Tab 2
            mock_flask_dependencies['request'].sid = 'tab2-session'
            mock_flask_dependencies['request'].args.get.return_value = '2'
            mock_attach.return_value = (Mock(), 12)
            handle_connect()
            
            # Verify both sessions exist
            assert 'tab1-session' in terminal.session_map
            assert 'tab2-session' in terminal.session_map
            assert terminal.session_map['tab1-session']['tab_id'] == '1'
            assert terminal.session_map['tab2-session']['tab_id'] == '2'
            # Sessions start unattached, so both have None fd initially
            assert terminal.session_map['tab1-session']['fd'] is None
            assert terminal.session_map['tab2-session']['fd'] is None
            # But they have different container names and tab IDs
            assert terminal.session_map['tab1-session']['container_name'] == terminal.session_map['tab2-session']['container_name']  # Same user, same container
            assert terminal.session_map['tab1-session']['tab_id'] != terminal.session_map['tab2-session']['tab_id']


class TestErrorHandlingIntegration:
    """Integration tests for error handling across modules"""
    
    def test_docker_failure_handling(self, mock_flask_dependencies):
        """Test handling of Docker operation failures"""
        import backend.blueprints.terminal as terminal
        from backend.blueprints.terminal import handle_connect
        
        terminal.session_map.clear()
        terminal.user_containers.clear()
        
        with patch('backend.docker.container_exists', return_value=False), \
             patch('backend.docker.container_is_running', return_value=False), \
             patch('subprocess.run') as mock_subprocess, \
             patch('backend.blueprints.terminal.spawn_container', side_effect=Exception("Docker error")), \
             patch('backend.docker.prepare_user_directory') as mock_prepare, \
             patch('backend.blueprints.terminal.socketio'):
            
            mock_subprocess.return_value = Mock(returncode=0)
            mock_prepare.return_value = None
            mock_flask_dependencies['user'].id = 888
            mock_flask_dependencies['user'].is_authenticated = True
            mock_flask_dependencies['user'].port_range = (8880, 8890)
            mock_flask_dependencies['request'].sid = 'error-session'
            mock_flask_dependencies['request'].args.get.return_value = '1'
            
            # Call handle_connect which should fail during spawn_container
            handle_connect()
            
            # The test should verify that the system handles errors gracefully
            # The error is logged (we can see it in the test output) which means
            # the exception was caught and handled properly
            
            # Verify that the system didn't crash and maintains reasonable state
            assert len(terminal.session_map) <= 1  # Session may or may not be created depending on failure timing
            
            # The key test is that handle_connect() completed without raising an exception
            # which demonstrates proper error handling
    
    def test_file_operation_error_handling(self, temp_file):
        """Test handling of file operation errors"""
        from backend.blueprints.auth import get_user_data
        
        # Remove the temp file to simulate error
        os.unlink(temp_file)
        
        with patch('backend.blueprints.auth.USERS_JSON_FILE', temp_file):
            # Should handle missing file gracefully
            result = get_user_data('nonexistent-user')
            assert result is None


if __name__ == '__main__':
    pytest.main([__file__])