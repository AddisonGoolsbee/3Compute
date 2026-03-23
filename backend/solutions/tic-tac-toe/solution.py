"""
Tic-Tac-Toe with AI (Minimax Algorithm) - REFERENCE IMPLEMENTATION
===================================================================

This is the complete solution for instructor reference.
DO NOT share this file with students.

This implementation includes:
- All TODO functions completed
- Comments explaining the logic
- Working minimax algorithm
"""

# =============================================================================
# GAME CONSTANTS
# =============================================================================

EMPTY = " "
PLAYER_X = "X"  # Human player
PLAYER_O = "O"  # AI player


# =============================================================================
# DISPLAY FUNCTIONS
# =============================================================================

def print_board(board):
    """Display the current game board."""
    print()
    print(f" {board[0]} | {board[1]} | {board[2]} ")
    print("-----------")
    print(f" {board[3]} | {board[4]} | {board[5]} ")
    print("-----------")
    print(f" {board[6]} | {board[7]} | {board[8]} ")
    print()


def print_board_positions():
    """Show position numbers for player reference."""
    print()
    print(" 0 | 1 | 2 ")
    print("-----------")
    print(" 3 | 4 | 5 ")
    print("-----------")
    print(" 6 | 7 | 8 ")
    print()


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def get_valid_moves(board):
    """Return a list of available positions (0-8) on the board."""
    return [i for i in range(9) if board[i] == EMPTY]


def make_move(board, position, player):
    """
    Make a move on the board. Returns a NEW board (doesn't modify original).
    This is important for the minimax algorithm to explore possibilities.
    """
    new_board = board.copy()
    new_board[position] = player
    return new_board


# =============================================================================
# SOLUTION #1: WIN DETECTION
# =============================================================================

def check_winner(board):
    """
    Check if there's a winner on the board.
    
    SOLUTION NOTES:
    - Define all 8 winning combinations
    - Loop through and check if any have three matching non-empty values
    """
    # All possible winning combinations
    winning_combinations = [
        (0, 1, 2),  # Top row
        (3, 4, 5),  # Middle row
        (6, 7, 8),  # Bottom row
        (0, 3, 6),  # Left column
        (1, 4, 7),  # Middle column
        (2, 5, 8),  # Right column
        (0, 4, 8),  # Main diagonal
        (2, 4, 6),  # Anti-diagonal
    ]
    
    for combo in winning_combinations:
        a, b, c = combo
        if board[a] != EMPTY and board[a] == board[b] == board[c]:
            return board[a]
    
    return None


# =============================================================================
# SOLUTION #2: DRAW DETECTION
# =============================================================================

def is_board_full(board):
    """
    Check if the board is completely full (no empty spaces).
    
    SOLUTION NOTES:
    - Simple check for EMPTY in the board
    - Could also check len(get_valid_moves(board)) == 0
    """
    return EMPTY not in board


def is_game_over(board):
    """Check if the game has ended (win or draw)."""
    return check_winner(board) is not None or is_board_full(board)


# =============================================================================
# SOLUTION #3: MINIMAX ALGORITHM
# =============================================================================

def minimax(board, is_maximizing):
    """
    The minimax algorithm - recursively evaluates all possible game states.
    
    SOLUTION NOTES:
    - Base case: return score for terminal states
    - Recursive case: explore all moves, track best score
    - Maximizing player (AI) wants highest score
    - Minimizing player (Human) wants lowest score
    """
    # BASE CASE: Check for terminal states
    winner = check_winner(board)
    if winner == PLAYER_O:  # AI wins
        return 10
    elif winner == PLAYER_X:  # Human wins
        return -10
    elif is_board_full(board):  # Draw
        return 0
    
    # RECURSIVE CASE: Explore all possible moves
    if is_maximizing:
        # AI's turn - wants to MAXIMIZE score
        best_score = float('-inf')
        for move in get_valid_moves(board):
            new_board = make_move(board, move, PLAYER_O)
            score = minimax(new_board, False)  # Now it's minimizing player's turn
            best_score = max(best_score, score)
        return best_score
    else:
        # Human's turn - wants to MINIMIZE score (from AI's perspective)
        best_score = float('inf')
        for move in get_valid_moves(board):
            new_board = make_move(board, move, PLAYER_X)
            score = minimax(new_board, True)  # Now it's maximizing player's turn
            best_score = min(best_score, score)
        return best_score


# =============================================================================
# SOLUTION #4: BEST MOVE SELECTION
# =============================================================================

def get_best_move(board):
    """
    Find the best move for the AI using the minimax algorithm.
    
    SOLUTION NOTES:
    - Try each valid move
    - Use minimax to evaluate (with is_maximizing=False since after AI moves,
      it's the human's turn to minimize)
    - Return the move with highest score
    """
    best_score = float('-inf')
    best_move = None
    
    for move in get_valid_moves(board):
        new_board = make_move(board, move, PLAYER_O)
        score = minimax(new_board, False)  # False because next turn is human
        if score > best_score:
            best_score = score
            best_move = move
    
    return best_move


# =============================================================================
# GAME LOOP
# =============================================================================

def get_human_move(board):
    """Get a valid move from the human player."""
    valid_moves = get_valid_moves(board)
    
    while True:
        try:
            print(f"Valid positions: {valid_moves}")
            move = int(input("Enter your move (0-8): "))
            if move in valid_moves:
                return move
            else:
                print("That position is not available. Try again.")
        except ValueError:
            print("Please enter a number between 0 and 8.")


def play_game():
    """Main game loop."""
    print("=" * 50)
    print("   TIC-TAC-TOE vs AI (Minimax Algorithm)")
    print("   REFERENCE IMPLEMENTATION")
    print("=" * 50)
    print("\nYou are X, the AI is O.")
    print("Position numbers:")
    print_board_positions()
    
    # Initialize empty board
    board = [EMPTY] * 9
    current_player = PLAYER_X  # Human goes first
    
    while not is_game_over(board):
        print_board(board)
        
        if current_player == PLAYER_X:
            print("Your turn!")
            move = get_human_move(board)
            board = make_move(board, move, PLAYER_X)
            current_player = PLAYER_O
        else:
            print("AI is thinking...")
            move = get_best_move(board)
            print(f"AI plays position {move}")
            board = make_move(board, move, PLAYER_O)
            current_player = PLAYER_X
    
    # Game over - show results
    print_board(board)
    winner = check_winner(board)
    
    if winner == PLAYER_X:
        print("🎉 You won! (This shouldn't happen with perfect minimax)")
    elif winner == PLAYER_O:
        print("🤖 The AI wins!  Don't feel bad - it's unbeatable!")
    else:
        print("🤝 It's a draw! That's the best you can do against a perfect AI.")


# =============================================================================
# MAIN ENTRY POINT
# =============================================================================

if __name__ == "__main__":
    # Check if core functions are implemented
    test_board = [EMPTY] * 9

    if check_winner(test_board) is None and is_board_full(test_board) is None:
        print("⚠️  It looks like you haven't implemented the required functions yet!")
        print("Open main.py and complete the TODO sections:")
        print("  1. check_winner()")
        print("  2. is_board_full()")
        print("  3. minimax()")
        print("  4. get_best_move()")
        print("\nRun 'python test_game.py' to test your implementations.")
    else:
        play_game()
