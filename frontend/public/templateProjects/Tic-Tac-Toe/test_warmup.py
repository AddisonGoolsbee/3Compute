"""
Tests for the recursion warm-up.
Run with: python test_warmup.py
"""

import os
import sys
import unittest

from warmup_factorial import factorial


class TestFactorial(unittest.TestCase):
    def test_zero(self):
        self.assertEqual(factorial(0), 1)

    def test_one(self):
        self.assertEqual(factorial(1), 1)

    def test_small(self):
        self.assertEqual(factorial(2), 2)
        self.assertEqual(factorial(3), 6)
        self.assertEqual(factorial(4), 24)

    def test_five(self):
        self.assertEqual(factorial(5), 120)

    def test_ten(self):
        self.assertEqual(factorial(10), 3628800)


if __name__ == "__main__":
    runner = unittest.TextTestRunner(verbosity=2, stream=sys.stdout)
    result = runner.run(
        unittest.TestLoader().loadTestsFromModule(sys.modules[__name__])
    )
    n_failed = len(result.failures) + len(result.errors)
    n_skipped = len(result.skipped)
    n_passed = result.testsRun - n_failed - n_skipped

    if os.environ.get("TCOMPUTE_SCORE"):
        print(f"{n_passed}/{result.testsRun}")
    else:
        print()
        print("=" * 40)
        print(f"Results: {n_passed}/{result.testsRun} tests passed")
        if result.wasSuccessful():
            print("Warm-up complete. Now open main.py and start TODO #1.")
        else:
            print("Keep working on factorial(). Hint: base case + recursive case.")
        print("=" * 40)

    sys.exit(0 if result.wasSuccessful() else 1)
