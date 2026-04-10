"""
Test suite for Tic-Tac-Toe AI.
Run with: python test_game.py

Work through the functions in order - later tests depend on earlier ones!
"""

import sys

from main import (
    check_winner, is_board_full, minimax, get_best_move,
    EMPTY
)

passed = 0
failed = 0


def check(description, got, expected):
    global passed, failed
    if got == expected:
        print(f"  PASS  {description}")
        passed += 1
    else:
        print(f"  FAIL  {description}")
        print(f"          expected: {expected!r}")
        print(f"          got:      {got!r}")
        failed += 1


# =============================================================================
# check_winner
# =============================================================================

print("\n--- check_winner ---")

check("empty board returns None",
      check_winner([EMPTY] * 9), None)

check("X wins top row",
      check_winner(["X", "X", "X",
                     " ", "O", " ",
                     "O", " ", " "]), "X")

check("O wins middle row",
      check_winner(["X", " ", "X",
                     "O", "O", "O",
                     "X", " ", " "]), "O")

check("X wins left column",
      check_winner(["X", "O", " ",
                     "X", "O", " ",
                     "X", " ", " "]), "X")

check("O wins main diagonal",
      check_winner(["O", "X", " ",
                     "X", "O", " ",
                     " ", "X", "O"]), "O")

check("X wins anti-diagonal",
      check_winner([" ", "O", "X",
                     "O", "X", " ",
                     "X", " ", "O"]), "X")

check("game in progress returns None",
      check_winner(["X", "O", "X",
                     " ", "X", " ",
                     "O", " ", " "]), None)

# =============================================================================
# is_board_full
# =============================================================================

print("\n--- is_board_full ---")

check("empty board is not full",
      is_board_full([EMPTY] * 9), False)

check("full board returns True",
      is_board_full(["X", "O", "X",
                      "X", "O", "O",
                      "O", "X", "X"]), True)

check("one space left is not full",
      is_board_full(["X", "O", "X",
                      "X", "O", "O",
                      "O", "X", " "]), False)

# =============================================================================
# minimax
# =============================================================================

print("\n--- minimax ---")

check("AI winning position returns +10",
      minimax(["X", "X", "O",
               "X", "O", " ",
               "O", " ", " "], True), 10)

check("human winning position returns -10",
      minimax(["X", "X", "X",
               "O", "O", " ",
               " ", " ", " "], True), -10)

check("draw position returns 0",
      minimax(["X", "O", "X",
               "X", "O", "O",
               "O", "X", "X"], True), 0)

check("AI sees winning move returns +10",
      minimax(["O", "O", " ",
               "X", "X", " ",
               " ", " ", " "], True), 10)

result = minimax(["X", "X", " ",
                   "O", " ", " ",
                   " ", " ", " "], True)
check("minimax returns a valid score",
      isinstance(result, (int, float)) and result is not None, True)

# =============================================================================
# get_best_move
# =============================================================================

print("\n--- get_best_move ---")

check("AI takes winning move (position 2)",
      get_best_move(["O", "O", " ",
                      "X", "X", " ",
                      " ", " ", " "]), 2)

check("AI blocks human win (position 2)",
      get_best_move(["X", "X", " ",
                      "O", " ", " ",
                      " ", " ", " "]), 2)

best = get_best_move(["X", "X", " ",
                       "O", "O", " ",
                       " ", " ", " "])
check("AI finds winning path (position 2 or 5)",
      best in [2, 5], True)

best = get_best_move([EMPTY] * 9)
check("AI picks valid opening move (0-8)",
      best in range(9), True)

check("AI takes only available move (position 8)",
      get_best_move(["X", "O", "X",
                      "X", "O", "O",
                      "O", "X", " "]), 8)

# =============================================================================
# Summary
# =============================================================================

total = passed + failed
print(f"\n{'=' * 40}")
print(f"Results: {passed}/{total} tests passed")
if failed == 0:
    print("All tests passed. Run 'python main.py' to test the AI yourself!")
else:
    print(f"{failed} test(s) failed. Keep working on your implementation!")
    print("Tip: implement functions in order - later ones depend on earlier ones.")
print("=" * 40)

print(f"\n###3COMPUTE_RESULTS:{passed}/{total}###")

sys.exit(0 if failed == 0 else 1)
