"""
Tic-Tac-Toe with AI (Minimax Algorithm)
=======================================

In this project, you'll implement an unbeatable Tic-Tac-Toe AI using the
minimax algorithm. The AI will look ahead at all possible future game states
to make the optimal move every time.

STANDARDS COVERED:
- 3B-AP-08: Describe how AI drives software systems
- 3B-AP-09: Implement an AI algorithm to play a game
- 3B-AP-10: Use classic algorithms (minimax)
- 3B-AP-11: Evaluate algorithm efficiency
- 3B-AP-13: Recursive algorithm flow
- 3B-AP-14: Modular program design
- 3B-AP-21: Test cases to verify functionality

YOUR TASKS:
1. Implement check_winner() - Detect if X or O has won
2. Implement is_board_full() - Detect if the game is a draw
3. Implement minimax() - The recursive AI decision algorithm
4. Implement get_best_move() - Find the optimal move for AI

Run the tests to check your work: python test_game.py
"""

# =============================================================================
# GAME CONSTANTS
# =============================================================================

EMPTY = " "
PLAYER_X = "X"  # Human player
PLAYER_O = "O"  # AI player


# =============================================================================
# DISPLAY FUNCTIONS (PROVIDED)
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
# HELPER FUNCTIONS (PROVIDED)
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
# TODO #1: IMPLEMENT WIN DETECTION
# =============================================================================

def check_winner(board):
    """
    Check if there's a winner on the board.
    
    Args:
        board: A list of 9 elements representing the game board
               Positions: 0|1|2
                          3|4|5
                          6|7|8
    
    Returns:
        "X" if X wins, "O" if O wins, None if no winner yet
    
    HINT: There are 8 ways to win in Tic-Tac-Toe:
        - 3 rows: (0,1,2), (3,4,5), (6,7,8)
        - 3 columns: (0,3,6), (1,4,7), (2,5,8)
        - 2 diagonals: (0,4,8), (2,4,6)
    
    HINT: You could define a list of winning combinations and loop through them,
          or check each one individually.
    """
    # TODO: Define the winning combinations
    # winning_combinations = [
    #     (0, 1, 2),  # Top row
    #     ...
    # ]
    
    # TODO: Check each winning combination
    # For each combination, if all three positions have the same non-empty value,
    # that player wins!
    
    pass  # Remove this line when you implement the function


# =============================================================================
# TODO #2: IMPLEMENT DRAW DETECTION
# =============================================================================

def is_board_full(board):
    """
    Check if the board is completely full (no empty spaces).
    
    Args:
        board: A list of 9 elements representing the game board
    
    Returns:
        True if no empty spaces remain, False otherwise
    
    HINT: Check if EMPTY (" ") exists anywhere in the board.
          You can use 'in' operator or check the length of get_valid_moves()
    """
    # TODO: Implement this function
    
    pass  # Remove this line when you implement the function


def is_game_over(board):
    """Check if the game has ended (win or draw)."""
    return check_winner(board) is not None or is_board_full(board)


# =============================================================================
# TODO #3: IMPLEMENT THE MINIMAX ALGORITHM
# =============================================================================

def minimax(board, is_maximizing):
    """
    The minimax algorithm - a recursive algorithm that evaluates all possible
    future game states to determine the best move.
    
    HOW MINIMAX WORKS:
    ==================
    Imagine you're playing chess and thinking ahead:
    "If I move here, they'll probably move there, then I could move here..."
    
    Minimax does this EXHAUSTIVELY - it considers EVERY possible future move,
    all the way to the end of the game. It assumes both players play optimally.
    
    The algorithm alternates between:
    - MAXIMIZING: AI's turn - wants the HIGHEST score
    - MINIMIZING: Human's turn - wants the LOWEST score (bad for AI)
    
    SCORING:
    - AI wins: +10 (good for AI)
    - Human wins: -10 (bad for AI)  
    - Draw: 0 (neutral)
    
    Args:
        board: Current game state
        is_maximizing: True if it's AI's turn (maximizing), False if human's turn
    
    Returns:
        The score of the board position (-10, 0, or +10)
    
    PSEUDOCODE:
    ===========
    1. BASE CASE - Check if game is over:
       - If AI (O) wins, return +10
       - If Human (X) wins, return -10
       - If draw (board full, no winner), return 0
    
    2. RECURSIVE CASE - If game continues:
       If maximizing (AI's turn):
           - Start with worst possible score: -infinity
           - For each valid move:
               - Make the move for AI (O)
               - Recursively call minimax with is_maximizing=False
               - Keep track of the MAXIMUM score found
           - Return the maximum score
       
       If minimizing (Human's turn):
           - Start with worst possible score: +infinity
           - For each valid move:
               - Make the move for Human (X)
               - Recursively call minimax with is_maximizing=True
               - Keep track of the MINIMUM score found
           - Return the minimum score
    """
    # TODO: Implement the base case
    # Check for terminal states (game over)
    # winner = check_winner(board)
    # if winner == PLAYER_O:  # AI wins
    #     return 10
    # elif winner == PLAYER_X:  # Human wins
    #     return -10
    # elif is_board_full(board):  # Draw
    #     return 0
    
    # TODO: Implement the recursive case
    # if is_maximizing:
    #     best_score = float('-inf')  # Start with worst possible
    #     for move in get_valid_moves(board):
    #         # Try this move
    #         new_board = make_move(board, move, PLAYER_O)
    #         # Recursively evaluate (now it's minimizing player's turn)
    #         score = minimax(new_board, False)
    #         # Keep the best score
    #         best_score = max(best_score, score)
    #     return best_score
    # else:
    #     # TODO: Implement minimizing case (similar but opposite)
    #     pass
    
    pass  # Remove this line when you implement the function


# =============================================================================
# TODO #4: IMPLEMENT BEST MOVE SELECTION
# =============================================================================

def get_best_move(board):
    """
    Find the best move for the AI using the minimax algorithm.
    
    Args:
        board: Current game state
    
    Returns:
        The position (0-8) of the best move for the AI
    
    HINT: 
    - Try each valid move
    - Use minimax to evaluate each move (with is_maximizing=False since 
      after AI moves, it's the human's turn)
    - Return the move with the highest score
    """
    best_score = float('-inf')
    best_move = None
    
    # TODO: Loop through all valid moves
    # for move in get_valid_moves(board):
    #     # Make the move
    #     new_board = make_move(board, move, PLAYER_O)
    #     # Evaluate this move using minimax
    #     score = minimax(new_board, False)  # False because next turn is human (minimizing)
    #     # If this is the best move so far, remember it
    #     if score > best_score:
    #         best_score = score
    #         best_move = move
    
    # return best_move
    
    pass  # Remove this line when you implement the function


# =============================================================================
# GAME LOOP (PROVIDED)
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
            # Human's turn
            print("Your turn!")
            move = get_human_move(board)
            board = make_move(board, move, PLAYER_X)
            current_player = PLAYER_O
        else:
            # AI's turn
            print("AI is thinking...")
            move = get_best_move(board)
            if move is None:
                print("ERROR: AI couldn't find a move. Did you implement get_best_move()?")
                break
            print(f"AI plays position {move}")
            board = make_move(board, move, PLAYER_O)
            current_player = PLAYER_X
    
    # Game over - show results
    print_board(board)
    winner = check_winner(board)
    
    if winner == PLAYER_X:
        print("🎉 Congratulations! You beat the AI!")
        print("(Wait... that shouldn't be possible with a perfect minimax!)")
        print("Double-check your implementation.")
    elif winner == PLAYER_O:
        print("🤖 The AI wins! Don't feel bad - it's unbeatable!")
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
