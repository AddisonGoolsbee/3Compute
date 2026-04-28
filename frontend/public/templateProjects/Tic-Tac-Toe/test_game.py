"""
Test suite for Tic-Tac-Toe AI.
Run with: python test_game.py

Work through the functions in main.py in order — later tests depend on
earlier ones.
"""

import os
import random
import sys
import unittest

from main import (
    EMPTY,
    check_winner,
    get_best_move,
    is_board_full,
    make_move,
    minimax,
)


class TestCheckWinner(unittest.TestCase):
    def test_empty_board_has_no_winner(self):
        self.assertIsNone(check_winner([EMPTY] * 9))

    def test_x_wins_top_row(self):
        self.assertEqual(
            check_winner(["X", "X", "X",
                          " ", "O", " ",
                          "O", " ", " "]),
            "X",
        )

    def test_o_wins_middle_row(self):
        self.assertEqual(
            check_winner(["X", " ", "X",
                          "O", "O", "O",
                          "X", " ", " "]),
            "O",
        )

    def test_x_wins_left_column(self):
        self.assertEqual(
            check_winner(["X", "O", " ",
                          "X", "O", " ",
                          "X", " ", " "]),
            "X",
        )

    def test_o_wins_main_diagonal(self):
        self.assertEqual(
            check_winner(["O", "X", " ",
                          "X", "O", " ",
                          " ", "X", "O"]),
            "O",
        )

    def test_x_wins_anti_diagonal(self):
        self.assertEqual(
            check_winner([" ", "O", "X",
                          "O", "X", " ",
                          "X", " ", "O"]),
            "X",
        )

    def test_game_in_progress_has_no_winner(self):
        self.assertIsNone(
            check_winner(["X", "O", "X",
                          " ", "X", " ",
                          "O", " ", " "])
        )


class TestIsBoardFull(unittest.TestCase):
    def test_empty_board_is_not_full(self):
        self.assertFalse(is_board_full([EMPTY] * 9))

    def test_full_board(self):
        self.assertTrue(
            is_board_full(["X", "O", "X",
                           "X", "O", "O",
                           "O", "X", "X"])
        )

    def test_one_space_left_is_not_full(self):
        self.assertFalse(
            is_board_full(["X", "O", "X",
                           "X", "O", "O",
                           "O", "X", " "])
        )


class TestMinimax(unittest.TestCase):
    def test_ai_winning_position_returns_plus_10(self):
        self.assertEqual(
            minimax(["X", "X", "O",
                     "X", "O", " ",
                     "O", " ", " "], True),
            10,
        )

    def test_human_winning_position_returns_minus_10(self):
        self.assertEqual(
            minimax(["X", "X", "X",
                     "O", "O", " ",
                     " ", " ", " "], True),
            -10,
        )

    def test_draw_position_returns_zero(self):
        self.assertEqual(
            minimax(["X", "O", "X",
                     "X", "O", "O",
                     "O", "X", "X"], True),
            0,
        )

    def test_ai_sees_winning_move(self):
        self.assertEqual(
            minimax(["O", "O", " ",
                     "X", "X", " ",
                     " ", " ", " "], True),
            10,
        )

    def test_minimax_returns_a_number(self):
        result = minimax(["X", "X", " ",
                          "O", " ", " ",
                          " ", " ", " "], True)
        self.assertIsInstance(result, (int, float))

    def test_corner_vs_center_is_a_draw(self):
        # Medium-depth recursion: X took a corner, O took the center.
        # With perfect play from both sides this is a known draw.
        self.assertEqual(
            minimax(["X", " ", " ",
                     " ", "O", " ",
                     " ", " ", " "], False),
            0,
        )


class TestGetBestMove(unittest.TestCase):
    def test_ai_takes_winning_move(self):
        self.assertEqual(
            get_best_move(["O", "O", " ",
                           "X", "X", " ",
                           " ", " ", " "]),
            2,
        )

    def test_ai_blocks_human_win(self):
        self.assertEqual(
            get_best_move(["X", "X", " ",
                           "O", " ", " ",
                           " ", " ", " "]),
            2,
        )

    def test_ai_finds_winning_path(self):
        best = get_best_move(["X", "X", " ",
                              "O", "O", " ",
                              " ", " ", " "])
        self.assertIn(best, [2, 5])

    def test_ai_picks_valid_opening_move(self):
        best = get_best_move([EMPTY] * 9)
        self.assertIn(best, range(9))

    def test_ai_takes_only_available_move(self):
        self.assertEqual(
            get_best_move(["X", "O", "X",
                           "X", "O", "O",
                           "O", "X", " "]),
            8,
        )


class TestIntegration(unittest.TestCase):
    def test_ai_never_loses_to_random_play(self):
        """AI plays a perfect minimax — random opponent should never win."""
        random.seed(0)
        losses = 0
        for _ in range(5):
            # Pre-place a random human move so the AI's first call is shallower.
            board = [EMPTY] * 9
            board[random.randrange(9)] = "X"
            while check_winner(board) is None and not is_board_full(board):
                ai_move = get_best_move(board)
                board = make_move(board, ai_move, "O")
                if check_winner(board) is not None or is_board_full(board):
                    break
                valid = [i for i, v in enumerate(board) if v == EMPTY]
                board = make_move(board, random.choice(valid), "X")
            if check_winner(board) == "X":
                losses += 1
        self.assertEqual(losses, 0)


if __name__ == "__main__":
    runner = unittest.TextTestRunner(verbosity=2, stream=sys.stdout)
    result = runner.run(
        unittest.TestLoader().loadTestsFromModule(sys.modules[__name__])
    )
    n_failed = len(result.failures) + len(result.errors)
    n_skipped = len(result.skipped)
    n_passed = result.testsRun - n_failed - n_skipped

    if os.environ.get("TCOMPUTE_SCORE"):
        # Score line consumed by the gradebook. Must be the last non-empty
        # line on stdout.
        print(f"{n_passed}/{result.testsRun}")
    else:
        print()
        print("=" * 40)
        print(f"Results: {n_passed}/{result.testsRun} tests passed")
        if result.wasSuccessful():
            print("All tests passed. Run 'python main.py' to play your AI!")
        else:
            print(f"{n_failed} test(s) failed. Keep working on your code.")
            print("Tip: implement functions in order; later ones depend on earlier ones.")
        print("=" * 40)

    sys.exit(0 if result.wasSuccessful() else 1)
