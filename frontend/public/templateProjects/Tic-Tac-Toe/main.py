"""
Tic-Tac-Toe with AI (Minimax Algorithm)
=======================================

In this project, you'll implement an unbeatable Tic-Tac-Toe AI using the
minimax algorithm. The AI looks ahead at every possible future game state
and picks the optimal move every time.

START IN warmup_factorial.py — a small recursion warm-up. Get that one
function passing first; it builds the muscle you'll need for minimax.

YOUR TASKS IN THIS FILE (do them in order):
    1. check_winner(board)          - detect if X or O has won
    2. is_board_full(board)         - detect if the game is a draw
    3. minimax(board, is_ai_turn)   - the recursive AI decision algorithm
    4. get_best_move(board)         - find the optimal move for the AI

HOW TO RUN:
    pip install -r requirements.txt
    python test_warmup.py   # warm-up tests (factorial)
    python test_game.py     # main tests — check your work as you go
    python main.py          # play against your AI once tests pass

The README has the full conceptual walkthrough. Read it once before coding,
then keep it open as a reference while you work.
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
    Make a move on the board. Returns a NEW board (does not modify the original).
    Returning a new board lets minimax explore possibilities without disturbing
    the real game state.
    """
    new_board = board.copy()
    new_board[position] = player
    return new_board


# =============================================================================
# TODO #1: WIN DETECTION
# =============================================================================

def check_winner(board):
    """
    Detect whether X or O has won the game.

    Args:
        board: A list of 9 strings representing the board.
               Positions: 0|1|2
                          3|4|5
                          6|7|8

    Returns:
        "X" if X has three in a row,
        "O" if O has three in a row,
        None if neither player has won yet.

    HINT: There are 8 winning lines in Tic-Tac-Toe:
        - 3 rows:      (0,1,2), (3,4,5), (6,7,8)
        - 3 columns:   (0,3,6), (1,4,7), (2,5,8)
        - 2 diagonals: (0,4,8), (2,4,6)

    Watch out: three EMPTY squares in a row are NOT a win!
    """
    raise NotImplementedError("Implement check_winner() in main.py")


# =============================================================================
# TODO #2: DRAW DETECTION
# =============================================================================

def is_board_full(board):
    """
    Return True if the board has no empty squares left, False otherwise.

    HINT: Either check whether EMPTY (" ") still appears in the board,
    or check the length of get_valid_moves(board).
    """
    raise NotImplementedError("Implement is_board_full() in main.py")


def is_game_over(board):
    """Game ends when someone wins or the board is full."""
    return check_winner(board) is not None or is_board_full(board)


# =============================================================================
# TODO #3: THE MINIMAX ALGORITHM
# =============================================================================

def minimax(board, is_ai_turn):
    """
    Recursively score every possible future game state and return the score
    of the current position assuming both players play perfectly.

    SCORING:
        AI (O) wins  -> +10
        Human (X) wins -> -10
        Draw          ->   0

    PSEUDOCODE:

        # Base case: the game is already over
        if AI has won:    return +10
        if human has won: return -10
        if board is full: return 0

        # Recursive case: try every move and pick the best score
        if is_ai_turn:                        # AI wants the HIGHEST score
            best = -infinity
            for each valid move:
                new_board = AI plays that move
                score = minimax(new_board, False)   # next turn is human
                best = max(best, score)
            return best
        else:                                 # human wants the LOWEST score
            best = +infinity
            for each valid move:
                new_board = human plays that move
                score = minimax(new_board, True)    # next turn is AI
                best = min(best, score)
            return best

    Args:
        board:      the current game state
        is_ai_turn: True if it is the AI's turn to move (the maximizer),
                    False if it is the human's turn (the minimizer)

    Returns:
        The score of the position (-10, 0, or +10).
    """
    raise NotImplementedError("Implement minimax() in main.py")


# =============================================================================
# TODO #4: BEST MOVE SELECTION
# =============================================================================

def get_best_move(board):
    """
    Use minimax to find the AI's best move on the current board.

    Try every empty square. For each one, simulate AI playing there and ask
    minimax to score the resulting position. Return the square with the
    highest score.

    Args:
        board: the current game state

    Returns:
        The position (0-8) of the best move for the AI.

    HINT: After the AI plays a move it is the human's turn, so the
    recursive call should be minimax(new_board, False).
    """
    raise NotImplementedError("Implement get_best_move() in main.py")


# =============================================================================
# GAME LOOP (PROVIDED)
# =============================================================================

def get_human_move(board):
    """Read a valid move from the human player."""
    valid_moves = get_valid_moves(board)
    while True:
        try:
            print(f"Valid positions: {valid_moves}")
            move = int(input("Enter your move (0-8): "))
            if move in valid_moves:
                return move
            print("That position is not available. Try again.")
        except ValueError:
            print("Please enter a number between 0 and 8.")


def play_game():
    """One full game from empty board to win/draw."""
    print("=" * 50)
    print("   TIC-TAC-TOE vs AI (Minimax Algorithm)")
    print("=" * 50)
    print("\nYou are X, the AI is O.")
    print("Position numbers:")
    print_board_positions()

    choice = input("Who goes first? (you/ai) [you]: ").strip().lower()
    current_player = PLAYER_O if choice.startswith("a") else PLAYER_X

    board = [EMPTY] * 9
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

    print_board(board)
    winner = check_winner(board)
    if winner == PLAYER_X:
        print("You beat the AI! That should not be possible with a correct minimax.")
        print("Double-check your implementation.")
    elif winner == PLAYER_O:
        print("The AI wins. It's unbeatable!")
    else:
        print("It's a draw. That's the best you can do against a perfect AI.")


# =============================================================================
# MAIN ENTRY POINT
# =============================================================================

if __name__ == "__main__":
    while True:
        play_game()
        again = input("\nPlay again? (y/n): ").strip().lower()
        if not again.startswith("y"):
            print("Thanks for playing!")
            break
