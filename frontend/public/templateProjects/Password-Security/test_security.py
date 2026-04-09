"""
Test Suite for Password Security
=================================

Run these tests to verify your implementations:
    python test_security.py

Each test will show a checkmark if passing or an X if failing.
Work through the functions in order: later tests depend on earlier ones!
"""

from main import (
    hash_password,
    verify_password,
    generate_salt,
    hash_with_salt,
    dictionary_attack,
    check_password_strength,
)


def test_hash_password():
    """Test the hash_password function."""
    print("\n" + "=" * 50)
    print("TESTING: hash_password()")
    print("=" * 50)

    tests_passed = 0
    total_tests = 0

    # Test 1: Returns a string
    total_tests += 1
    result = hash_password("hello")
    if isinstance(result, str):
        print("OK  Test 1: Returns a string")
        tests_passed += 1
    else:
        print(f"FAIL Test 1: Should return a string, got {type(result)}")

    # Test 2: Returns exactly 64 hex characters (SHA-256 digest length)
    total_tests += 1
    result = hash_password("hello")
    if result is not None and len(result) == 64:
        print("OK  Test 2: Hash is 64 characters long")
        tests_passed += 1
    else:
        print(f"FAIL Test 2: Hash should be 64 characters, got {len(result) if result is not None else 'None'}")

    # Test 3: Known SHA-256 value for "hello"
    total_tests += 1
    expected = "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824"
    result = hash_password("hello")
    if result == expected:
        print("OK  Test 3: Correct SHA-256 value for 'hello'")
        tests_passed += 1
    else:
        print(f"FAIL Test 3: Expected {expected}, got {result}")

    # Test 4: Same input always produces same output (deterministic)
    total_tests += 1
    h1 = hash_password("password123")
    h2 = hash_password("password123")
    if h1 == h2:
        print("OK  Test 4: Hashing is deterministic (same input, same output)")
        tests_passed += 1
    else:
        print("FAIL Test 4: Same input should always produce the same hash")

    # Test 5: Different inputs produce different hashes
    total_tests += 1
    h1 = hash_password("password")
    h2 = hash_password("PASSWORD")
    if h1 != h2:
        print("OK  Test 5: Different inputs produce different hashes")
        tests_passed += 1
    else:
        print("FAIL Test 5: 'password' and 'PASSWORD' should have different hashes")

    print(f"\nhash_password: {tests_passed}/{total_tests} tests passed")
    return tests_passed == total_tests


def test_verify_password():
    """Test the verify_password function."""
    print("\n" + "=" * 50)
    print("TESTING: verify_password()")
    print("=" * 50)

    tests_passed = 0
    total_tests = 0

    stored = hash_password("correct_horse_battery")

    # Test 1: Correct password returns True
    total_tests += 1
    result = verify_password("correct_horse_battery", stored)
    if result is True:
        print("OK  Test 1: Correct password returns True")
        tests_passed += 1
    else:
        print(f"FAIL Test 1: Correct password should return True, got {result}")

    # Test 2: Wrong password returns False
    total_tests += 1
    result = verify_password("wrong_password", stored)
    if result is False:
        print("OK  Test 2: Wrong password returns False")
        tests_passed += 1
    else:
        print(f"FAIL Test 2: Wrong password should return False, got {result}")

    # Test 3: Empty string does not match a non-empty password hash
    total_tests += 1
    result = verify_password("", stored)
    if result is False:
        print("OK  Test 3: Empty string does not match the stored hash")
        tests_passed += 1
    else:
        print(f"FAIL Test 3: Empty string should not verify, got {result}")

    # Test 4: Case sensitivity
    total_tests += 1
    result = verify_password("Correct_Horse_Battery", stored)
    if result is False:
        print("OK  Test 4: Verification is case-sensitive")
        tests_passed += 1
    else:
        print(f"FAIL Test 4: Verification should be case-sensitive, got {result}")

    print(f"\nverify_password: {tests_passed}/{total_tests} tests passed")
    return tests_passed == total_tests


def test_generate_salt():
    """Test the generate_salt function."""
    print("\n" + "=" * 50)
    print("TESTING: generate_salt()")
    print("=" * 50)

    tests_passed = 0
    total_tests = 0

    # Test 1: Returns a string
    total_tests += 1
    result = generate_salt()
    if isinstance(result, str):
        print("OK  Test 1: Returns a string")
        tests_passed += 1
    else:
        print(f"FAIL Test 1: Should return a string, got {type(result)}")

    # Test 2: Returns exactly 16 characters
    total_tests += 1
    result = generate_salt()
    if result is not None and len(result) == 16:
        print("OK  Test 2: Salt is 16 characters long")
        tests_passed += 1
    else:
        print(f"FAIL Test 2: Salt should be 16 characters, got {len(result) if result is not None else 'None'}")

    # Test 3: Only contains hex characters
    total_tests += 1
    result = generate_salt()
    valid_chars = set("0123456789abcdef")
    if result is not None and all(c in valid_chars for c in result):
        print("OK  Test 3: Salt contains only hex characters")
        tests_passed += 1
    else:
        print(f"FAIL Test 3: Salt should only contain hex chars, got '{result}'")

    # Test 4: Two calls produce different values (randomness check)
    total_tests += 1
    salt1 = generate_salt()
    salt2 = generate_salt()
    if salt1 is not None and salt2 is not None and salt1 != salt2:
        print("OK  Test 4: generate_salt() produces different values each call")
        tests_passed += 1
    else:
        print("FAIL Test 4: Two calls should produce different salts (check randomness)")

    print(f"\ngenerate_salt: {tests_passed}/{total_tests} tests passed")
    return tests_passed == total_tests


def test_hash_with_salt():
    """Test the hash_with_salt function."""
    print("\n" + "=" * 50)
    print("TESTING: hash_with_salt()")
    print("=" * 50)

    tests_passed = 0
    total_tests = 0

    # Test 1: Same inputs produce same output
    total_tests += 1
    h1 = hash_with_salt("password", "abc123")
    h2 = hash_with_salt("password", "abc123")
    if h1 == h2:
        print("OK  Test 1: Same password and salt always produce the same hash")
        tests_passed += 1
    else:
        print("FAIL Test 1: Same inputs should always produce the same hash")

    # Test 2: Different salts produce different hashes for the same password
    total_tests += 1
    h1 = hash_with_salt("password123", "salt_aaa")
    h2 = hash_with_salt("password123", "salt_bbb")
    if h1 != h2:
        print("OK  Test 2: Different salts produce different hashes")
        tests_passed += 1
    else:
        print("FAIL Test 2: Different salts should produce different hashes")

    # Test 3: Different from unsalted hash of same password
    total_tests += 1
    salted = hash_with_salt("hello", "xyz")
    unsalted = hash_password("hello")
    if salted != unsalted:
        print("OK  Test 3: Salted hash differs from unsalted hash")
        tests_passed += 1
    else:
        print("FAIL Test 3: Salted hash should differ from unsalted hash")

    # Test 4: Returns a 64-character hex string
    total_tests += 1
    result = hash_with_salt("test", "testsalt")
    if isinstance(result, str) and len(result) == 64:
        print("OK  Test 4: Returns a 64-character hex string")
        tests_passed += 1
    else:
        print(f"FAIL Test 4: Should return 64-char string, got '{result}'")

    # Test 5: Salt is prepended (hash of salt+password, not password+salt)
    total_tests += 1
    result = hash_with_salt("pass", "abc123")
    expected = hash_password("abc123pass")
    if result == expected:
        print("OK  Test 5: Salt is correctly prepended to the password")
        tests_passed += 1
    else:
        print("FAIL Test 5: Should hash (salt + password), i.e. 'abc123pass'")

    print(f"\nhash_with_salt: {tests_passed}/{total_tests} tests passed")
    return tests_passed == total_tests


def test_dictionary_attack():
    """Test the dictionary_attack function."""
    print("\n" + "=" * 50)
    print("TESTING: dictionary_attack()")
    print("=" * 50)

    tests_passed = 0
    total_tests = 0

    wordlist = ["apple", "password", "hello", "sunshine", "dragon"]

    # Test 1: Finds a password that is in the wordlist
    total_tests += 1
    target = hash_password("password")
    result = dictionary_attack(target, wordlist)
    if result == "password":
        print("OK  Test 1: Finds 'password' in the wordlist")
        tests_passed += 1
    else:
        print(f"FAIL Test 1: Should find 'password', got {result}")

    # Test 2: Returns None for a password not in the wordlist
    total_tests += 1
    target = hash_password("xkcd-correct-horse")
    result = dictionary_attack(target, wordlist)
    if result is None:
        print("OK  Test 2: Returns None when password is not in wordlist")
        tests_passed += 1
    else:
        print(f"FAIL Test 2: Should return None for unknown password, got {result}")

    # Test 3: Returns None for empty wordlist
    total_tests += 1
    target = hash_password("hello")
    result = dictionary_attack(target, [])
    if result is None:
        print("OK  Test 3: Returns None for empty wordlist")
        tests_passed += 1
    else:
        print(f"FAIL Test 3: Empty wordlist should return None, got {result}")

    # Test 4: Finds first match even when multiple words are present
    total_tests += 1
    target = hash_password("dragon")
    result = dictionary_attack(target, wordlist)
    if result == "dragon":
        print("OK  Test 4: Finds 'dragon' in the wordlist")
        tests_passed += 1
    else:
        print(f"FAIL Test 4: Should find 'dragon', got {result}")

    # Test 5: A salted hash cannot be cracked with the same wordlist
    total_tests += 1
    salt = generate_salt()
    salted_hash = hash_with_salt("password", salt)
    result = dictionary_attack(salted_hash, wordlist)
    if result is None:
        print("OK  Test 5: Salted hash is not cracked by the wordlist")
        tests_passed += 1
    else:
        print(f"FAIL Test 5: Salted hash should not be crackable, got {result}")

    print(f"\ndictionary_attack: {tests_passed}/{total_tests} tests passed")
    return tests_passed == total_tests


def test_check_password_strength():
    """Test the check_password_strength function."""
    print("\n" + "=" * 50)
    print("TESTING: check_password_strength()")
    print("=" * 50)

    tests_passed = 0
    total_tests = 0

    # Test 1: Very weak password scores 0 or 1
    total_tests += 1
    result = check_password_strength("hi")
    if isinstance(result, dict) and result.get("score", 99) <= 1:
        print(f"OK  Test 1: Weak password 'hi' scores {result['score']}/5")
        tests_passed += 1
    else:
        score = result.get("score") if isinstance(result, dict) else result
        print(f"FAIL Test 1: 'hi' should score 0-1, got {score}")

    # Test 2: Strong password scores 4 or 5
    total_tests += 1
    result = check_password_strength("C0rrect!Horse#9")
    if isinstance(result, dict) and result.get("score", 0) >= 4:
        print(f"OK  Test 2: Strong password scores {result['score']}/5")
        tests_passed += 1
    else:
        score = result.get("score") if isinstance(result, dict) else result
        print(f"FAIL Test 2: 'C0rrect!Horse#9' should score 4-5, got {score}")

    # Test 3: Length check works correctly
    total_tests += 1
    short_result = check_password_strength("Ab1!xyz")   # 7 chars
    long_result = check_password_strength("Ab1!xyzw")   # 8 chars
    if (isinstance(short_result, dict) and isinstance(long_result, dict)
            and short_result.get("length") is False
            and long_result.get("length") is True):
        print("OK  Test 3: Length check correctly identifies >= 8 characters")
        tests_passed += 1
    else:
        print("FAIL Test 3: 7-char password should fail length check, 8-char should pass")

    # Test 4: Uppercase detection
    total_tests += 1
    result = check_password_strength("hello123!")
    if isinstance(result, dict) and result.get("has_uppercase") is False:
        print("OK  Test 4: No uppercase detected correctly")
        tests_passed += 1
    else:
        print(f"FAIL Test 4: 'hello123!' has no uppercase, has_uppercase should be False")

    # Test 5: Special character detection
    total_tests += 1
    result = check_password_strength("HelloWorld1")
    if isinstance(result, dict) and result.get("has_special") is False:
        print("OK  Test 5: No special character detected correctly")
        tests_passed += 1
    else:
        print(f"FAIL Test 5: 'HelloWorld1' has no special char, has_special should be False")

    # Test 6: Score equals sum of the five criteria
    total_tests += 1
    result = check_password_strength("Hello1!")
    if isinstance(result, dict):
        expected_score = sum([
            result.get("length", False),
            result.get("has_uppercase", False),
            result.get("has_lowercase", False),
            result.get("has_digit", False),
            result.get("has_special", False),
        ])
        if result.get("score") == expected_score:
            print(f"OK  Test 6: Score equals sum of criteria ({expected_score})")
            tests_passed += 1
        else:
            print(f"FAIL Test 6: Score should be {expected_score}, got {result.get('score')}")
    else:
        print(f"FAIL Test 6: check_password_strength should return a dict, got {type(result)}")

    print(f"\ncheck_password_strength: {tests_passed}/{total_tests} tests passed")
    return tests_passed == total_tests


def run_all_tests():
    """Run the complete test suite."""
    print("\n" + "=" * 30)
    print("  PASSWORD SECURITY TEST SUITE")
    print("=" * 30)

    results = []

    results.append(("hash_password", test_hash_password()))
    results.append(("verify_password", test_verify_password()))
    results.append(("generate_salt", test_generate_salt()))
    results.append(("hash_with_salt", test_hash_with_salt()))
    results.append(("dictionary_attack", test_dictionary_attack()))
    results.append(("check_password_strength", test_check_password_strength()))

    print("\n" + "=" * 50)
    print("SUMMARY")
    print("=" * 50)

    all_passed = True
    for name, passed in results:
        status = "PASS" if passed else "FAIL"
        print(f"  {name}: {status}")
        if not passed:
            all_passed = False

    print()
    if all_passed:
        print("All tests passed. Run 'python main.py' to see the demo.")
    else:
        print("Some tests failed. Implement the functions in order and re-run.")
        print("Tip: each function builds on the ones before it.")
    print()

    func_passed = sum(1 for _, p in results if p)
    print(f"###3COMPUTE_RESULTS:{func_passed}/{len(results)}###")


if __name__ == "__main__":
    run_all_tests()

