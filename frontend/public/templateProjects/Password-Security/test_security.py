"""
Test Suite for Password Security
=================================

Run these tests to verify your implementations:
    python test_security.py

Each test prints PASS/FAIL. Work through the functions in order: later
tests depend on earlier ones.
"""

import os
import sys
import unittest

from main import (
    check_password_strength,
    dictionary_attack,
    generate_salt,
    hash_password,
    hash_with_salt,
    verify_password,
)


class TestHashPassword(unittest.TestCase):
    def test_returns_string(self):
        self.assertIsInstance(hash_password("hello"), str)

    def test_hash_is_64_chars(self):
        self.assertEqual(len(hash_password("hello")), 64)

    def test_known_sha256_value(self):
        expected = "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824"
        self.assertEqual(hash_password("hello"), expected)

    def test_deterministic(self):
        self.assertEqual(hash_password("password123"), hash_password("password123"))

    def test_different_inputs_different_hashes(self):
        self.assertNotEqual(hash_password("password"), hash_password("PASSWORD"))


class TestVerifyPassword(unittest.TestCase):
    def setUp(self):
        self.stored = hash_password("correct_horse_battery")

    def test_correct_password_returns_true(self):
        self.assertIs(verify_password("correct_horse_battery", self.stored), True)

    def test_wrong_password_returns_false(self):
        self.assertIs(verify_password("wrong_password", self.stored), False)

    def test_empty_string_returns_false(self):
        self.assertIs(verify_password("", self.stored), False)

    def test_case_sensitive(self):
        self.assertIs(verify_password("Correct_Horse_Battery", self.stored), False)


class TestGenerateSalt(unittest.TestCase):
    def test_returns_string(self):
        self.assertIsInstance(generate_salt(), str)

    def test_salt_is_16_chars(self):
        self.assertEqual(len(generate_salt()), 16)

    def test_only_hex_characters(self):
        salt = generate_salt()
        self.assertTrue(all(c in "0123456789abcdef" for c in salt),
                        f"Salt has non-hex characters: {salt!r}")

    def test_two_calls_produce_different_values(self):
        self.assertNotEqual(generate_salt(), generate_salt())


class TestHashWithSalt(unittest.TestCase):
    def test_same_inputs_same_output(self):
        self.assertEqual(
            hash_with_salt("password", "abc123"),
            hash_with_salt("password", "abc123"),
        )

    def test_different_salts_different_hashes(self):
        self.assertNotEqual(
            hash_with_salt("password123", "salt_aaa"),
            hash_with_salt("password123", "salt_bbb"),
        )

    def test_differs_from_unsalted(self):
        self.assertNotEqual(hash_with_salt("hello", "xyz"), hash_password("hello"))

    def test_returns_64_char_hex(self):
        result = hash_with_salt("test", "testsalt")
        self.assertIsInstance(result, str)
        self.assertEqual(len(result), 64)

    def test_salt_is_prepended(self):
        # hash_with_salt(password, salt) should hash (salt + password)
        self.assertEqual(
            hash_with_salt("pass", "abc123"),
            hash_password("abc123pass"),
        )


class TestDictionaryAttack(unittest.TestCase):
    def setUp(self):
        self.wordlist = ["apple", "password", "hello", "sunshine", "dragon"]

    def test_finds_password_in_wordlist(self):
        target = hash_password("password")
        self.assertEqual(dictionary_attack(target, self.wordlist), "password")

    def test_returns_none_when_not_in_wordlist(self):
        target = hash_password("xkcd-correct-horse")
        self.assertIsNone(dictionary_attack(target, self.wordlist))

    def test_returns_none_for_empty_wordlist(self):
        target = hash_password("hello")
        self.assertIsNone(dictionary_attack(target, []))

    def test_finds_dragon(self):
        target = hash_password("dragon")
        self.assertEqual(dictionary_attack(target, self.wordlist), "dragon")

    def test_salted_hash_not_cracked(self):
        salt = generate_salt()
        salted_hash = hash_with_salt("password", salt)
        self.assertIsNone(dictionary_attack(salted_hash, self.wordlist))


class TestCheckPasswordStrength(unittest.TestCase):
    def test_weak_password_low_score(self):
        result = check_password_strength("hi")
        self.assertIsInstance(result, dict)
        self.assertLessEqual(result.get("score", 99), 1,
                             f"'hi' should score 0-1, got {result.get('score')}")

    def test_strong_password_high_score(self):
        result = check_password_strength("C0rrect!Horse#9")
        self.assertIsInstance(result, dict)
        self.assertGreaterEqual(result.get("score", 0), 4,
                                f"strong password should score 4-5, got {result.get('score')}")

    def test_length_check_threshold(self):
        short = check_password_strength("Ab1!xyz")    # 7 chars
        long = check_password_strength("Ab1!xyzw")    # 8 chars
        self.assertIs(short.get("length"), False, "7 chars should fail length check")
        self.assertIs(long.get("length"), True, "8 chars should pass length check")

    def test_uppercase_detection(self):
        result = check_password_strength("hello123!")
        self.assertIs(result.get("has_uppercase"), False)

    def test_special_character_detection(self):
        result = check_password_strength("HelloWorld1")
        self.assertIs(result.get("has_special"), False)

    def test_score_equals_sum_of_criteria(self):
        result = check_password_strength("Hello1!")
        expected_score = sum([
            result.get("length", False),
            result.get("has_uppercase", False),
            result.get("has_lowercase", False),
            result.get("has_digit", False),
            result.get("has_special", False),
        ])
        self.assertEqual(result.get("score"), expected_score)


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
            print("All tests passed. Run 'python main.py' to see the demo.")
        else:
            print(f"{n_failed} test(s) failed. Implement the functions in order.")
            print("Tip: each function builds on the ones before it.")
        print("=" * 40)

    sys.exit(0 if result.wasSuccessful() else 1)
