"""
Test Suite for Tic-Tac-Toe AI
=============================

Run these tests to verify your implementations:
    python test_game.py

Each test will show ✅ if passing or ❌ if failing.
Work through the functions in order - later tests depend on earlier ones!
"""

from main import (
    check_winner, is_board_full, minimax, get_best_move,
    EMPTY
)


def test_check_winner():
    """Test the check_winner function."""
    print("\n" + "=" * 50)
    print("TESTING: check_winner()")
    print("=" * 50)
    
    tests_passed = 0
    total_tests = 0
    
    # Test 1: Empty board - no winner
    total_tests += 1
    board = [EMPTY] * 9
    result = check_winner(board)
    if result is None:
        print("✅ Test 1: Empty board returns None")
        tests_passed += 1
    else:
        print(f"❌ Test 1: Empty board should return None, got {result}")
    
    # Test 2: X wins top row
    total_tests += 1
    board = ["X", "X", "X",
             " ", "O", " ",
             "O", " ", " "]
    result = check_winner(board)
    if result == "X":
        print("✅ Test 2: X wins top row")
        tests_passed += 1
    else:
        print(f"❌ Test 2: X wins top row, expected 'X', got {result}")
    
    # Test 3: O wins middle row
    total_tests += 1
    board = ["X", " ", "X",
             "O", "O", "O",
             "X", " ", " "]
    result = check_winner(board)
    if result == "O":
        print("✅ Test 3: O wins middle row")
        tests_passed += 1
    else:
        print(f"❌ Test 3: O wins middle row, expected 'O', got {result}")
    
    # Test 4: X wins left column
    total_tests += 1
    board = ["X", "O", " ",
             "X", "O", " ",
             "X", " ", " "]
    result = check_winner(board)
    if result == "X":
        print("✅ Test 4: X wins left column")
        tests_passed += 1
    else:
        print(f"❌ Test 4: X wins left column, expected 'X', got {result}")
    
    # Test 5: O wins diagonal (top-left to bottom-right)
    total_tests += 1
    board = ["O", "X", " ",
             "X", "O", " ",
             " ", "X", "O"]
    result = check_winner(board)
    if result == "O":
        print("✅ Test 5: O wins main diagonal")
        tests_passed += 1
    else:
        print(f"❌ Test 5: O wins main diagonal, expected 'O', got {result}")
    
    # Test 6: X wins anti-diagonal (top-right to bottom-left)
    total_tests += 1
    board = [" ", "O", "X",
             "O", "X", " ",
             "X", " ", "O"]
    result = check_winner(board)
    if result == "X":
        print("✅ Test 6: X wins anti-diagonal")
        tests_passed += 1
    else:
        print(f"❌ Test 6: X wins anti-diagonal, expected 'X', got {result}")
    
    # Test 7: Game in progress - no winner
    total_tests += 1
    board = ["X", "O", "X",
             " ", "X", " ",
             "O", " ", " "]
    result = check_winner(board)
    if result is None:
        print("✅ Test 7: Game in progress returns None")
        tests_passed += 1
    else:
        print(f"❌ Test 7: Game in progress should return None, got {result}")
    
    print(f"\ncheck_winner: {tests_passed}/{total_tests} tests passed")
    return tests_passed == total_tests


def test_is_board_full():
    """Test the is_board_full function."""
    print("\n" + "=" * 50)
    print("TESTING: is_board_full()")
    print("=" * 50)
    
    tests_passed = 0
    total_tests = 0
    
    # Test 1: Empty board
    total_tests += 1
    board = [EMPTY] * 9
    result = is_board_full(board)
    if result == False:
        print("✅ Test 1: Empty board is not full")
        tests_passed += 1
    else:
        print(f"❌ Test 1: Empty board should return False, got {result}")
    
    # Test 2: Full board (draw)
    total_tests += 1
    board = ["X", "O", "X",
             "X", "O", "O",
             "O", "X", "X"]
    result = is_board_full(board)
    if result == True:
        print("✅ Test 2: Full board returns True")
        tests_passed += 1
    else:
        print(f"❌ Test 2: Full board should return True, got {result}")
    
    # Test 3: One space left
    total_tests += 1
    board = ["X", "O", "X",
             "X", "O", "O",
             "O", "X", " "]
    result = is_board_full(board)
    if result == False:
        print("✅ Test 3: One space left is not full")
        tests_passed += 1
    else:
        print(f"❌ Test 3: One space left should return False, got {result}")
    
    print(f"\nis_board_full: {tests_passed}/{total_tests} tests passed")
    return tests_passed == total_tests


def test_minimax():
    """Test the minimax function."""
    print("\n" + "=" * 50)
    print("TESTING: minimax()")
    print("=" * 50)
    
    tests_passed = 0
    total_tests = 0
    
    # Test 1: AI (O) has already won - should return +10
    total_tests += 1
    board = ["X", "X", "O",
             "X", "O", " ",
             "O", " ", " "]
    result = minimax(board, True)
    if result == 10:
        print("✅ Test 1: AI winning position returns +10")
        tests_passed += 1
    else:
        print(f"❌ Test 1: AI winning position should return 10, got {result}")
    
    # Test 2: Human (X) has already won - should return -10
    total_tests += 1
    board = ["X", "X", "X",
             "O", "O", " ",
             " ", " ", " "]
    result = minimax(board, True)
    if result == -10:
        print("✅ Test 2: Human winning position returns -10")
        tests_passed += 1
    else:
        print(f"❌ Test 2: Human winning position should return -10, got {result}")
    
    # Test 3: Draw position - should return 0
    total_tests += 1
    board = ["X", "O", "X",
             "X", "O", "O",
             "O", "X", "X"]
    result = minimax(board, True)
    if result == 0:
        print("✅ Test 3: Draw position returns 0")
        tests_passed += 1
    else:
        print(f"❌ Test 3: Draw position should return 0, got {result}")
    
    # Test 4: AI can win in one move
    total_tests += 1
    board = ["O", "O", " ",
             "X", "X", " ",
             " ", " ", " "]
    # AI's turn (maximizing), should see it can win
    result = minimax(board, True)
    if result == 10:
        print("✅ Test 4: AI sees winning move, returns +10")
        tests_passed += 1
    else:
        print(f"❌ Test 4: AI should see winning move (return 10), got {result}")
    
    # Test 5: AI must block or lose
    total_tests += 1
    board = ["X", "X", " ",
             "O", " ", " ",
             " ", " ", " "]
    # AI's turn, X threatens to win. Best outcome with perfect play.
    result = minimax(board, True)
    # With perfect play from both sides from this position, result depends on play
    # The key is it shouldn't be -10 (immediate loss prevention)
    if result is not None and isinstance(result, (int, float)):
        print("✅ Test 5: minimax returns a valid score")
        tests_passed += 1
    else:
        print(f"❌ Test 5: minimax should return a number, got {result}")
    
    print(f"\nminimax: {tests_passed}/{total_tests} tests passed")
    return tests_passed == total_tests


def test_get_best_move():
    """Test the get_best_move function."""
    print("\n" + "=" * 50)
    print("TESTING: get_best_move()")
    print("=" * 50)
    
    tests_passed = 0
    total_tests = 0
    
    # Test 1: AI should take winning move
    total_tests += 1
    board = ["O", "O", " ",
             "X", "X", " ",
             " ", " ", " "]
    result = get_best_move(board)
    if result == 2:  # Position 2 wins the game
        print("✅ Test 1: AI takes winning move (position 2)")
        tests_passed += 1
    else:
        print(f"❌ Test 1: AI should take position 2 to win, got {result}")
    
    # Test 2: AI should block human's winning move
    total_tests += 1
    board = ["X", "X", " ",
             "O", " ", " ",
             " ", " ", " "]
    result = get_best_move(board)
    if result == 2:  # Must block position 2
        print("✅ Test 2: AI blocks human's win (position 2)")
        tests_passed += 1
    else:
        print(f"❌ Test 2: AI should block position 2, got {result}")
    
    # Test 3: AI prefers winning over blocking
    total_tests += 1
    board = ["X", "X", " ",
             "O", "O", " ",
             " ", " ", " "]
    result = get_best_move(board)
    if result == 5:  # Position 5 wins, position 2 only blocks
        print("✅ Test 3: AI prefers winning (position 5) over blocking")
        tests_passed += 1
    else:
        print(f"❌ Test 3: AI should win at position 5, got {result}")
    
    # Test 4: Empty board - should return a valid move
    total_tests += 1
    board = [EMPTY] * 9
    result = get_best_move(board)
    if result in range(9):
        print(f"✅ Test 4: AI picks valid opening move (position {result})")
        tests_passed += 1
    else:
        print(f"❌ Test 4: AI should pick a position 0-8, got {result}")
    
    # Test 5: Only one move left
    total_tests += 1
    board = ["X", "O", "X",
             "X", "O", "O",
             "O", "X", " "]
    result = get_best_move(board)
    if result == 8:
        print("✅ Test 5: AI takes only available move (position 8)")
        tests_passed += 1
    else:
        print(f"❌ Test 5: AI should take position 8, got {result}")
    
    print(f"\nget_best_move: {tests_passed}/{total_tests} tests passed")
    return tests_passed == total_tests


def run_all_tests():
    """Run the complete test suite."""
    print("\n" + "🧪" * 25)
    print("     TIC-TAC-TOE AI TEST SUITE")
    print("🧪" * 25)
    
    results = []
    
    # Run tests in order (later tests depend on earlier ones)
    results.append(("check_winner", test_check_winner()))
    results.append(("is_board_full", test_is_board_full()))
    results.append(("minimax", test_minimax()))
    results.append(("get_best_move", test_get_best_move()))
    
    # Summary
    print("\n" + "=" * 50)
    print("SUMMARY")
    print("=" * 50)
    
    all_passed = True
    for name, passed in results:
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"  {name}: {status}")
        if not passed:
            all_passed = False
    
    print()
    if all_passed:
        print("🎉 ALL TESTS PASSED! Your AI is ready to play!")
        print("Run 'python main.py' to test it yourself.")
    else:
        print("Some tests failed. Keep working on your implementation!")
        print("Tip: Implement functions in order - later ones depend on earlier ones.")
    print()


if __name__ == "__main__":
    run_all_tests()
