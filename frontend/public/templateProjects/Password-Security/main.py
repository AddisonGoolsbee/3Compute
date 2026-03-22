"""
Password Security: Hashing, Salting, and Attacks
=================================================

In this project, you'll implement the core techniques used to protect
passwords in real-world systems. You'll also simulate a dictionary attack
to understand why weak passwords fail even when hashed.

YOUR TASKS:
1. hash_password(password)      - Hash a password using SHA-256
2. verify_password(password, stored_hash) - Check a password against a hash
3. generate_salt()              - Create a random salt value
4. hash_with_salt(password, salt) - Hash a password combined with a salt
5. dictionary_attack(target_hash, wordlist) - Simulate a brute-force lookup
6. check_password_strength(password) - Score a password on five criteria

Run the tests to check your work: python test_security.py
"""

import hashlib
import os
import string


# =============================================================================
# SETUP (PROVIDED)
# =============================================================================

def load_wordlist(filename):
    """Load passwords from a text file, one per line."""
    try:
        with open(filename, "r") as f:
            return [line.strip() for line in f if line.strip()]
    except FileNotFoundError:
        print(f"Warning: {filename} not found. Using empty wordlist.")
        return []


# Load 20 common passwords from file
COMMON_PASSWORDS = load_wordlist("common_passwords.txt")


# =============================================================================
# TODO #1: IMPLEMENT hash_password
# =============================================================================

def hash_password(password: str) -> str:
    """
    Hash a password string using SHA-256.

    Args:
        password: The plaintext password to hash

    Returns:
        A 64-character lowercase hex string (the SHA-256 digest)

    Example:
        hash_password("hello") -> "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824"

    HINT:
        - Use hashlib.sha256()
        - Strings must be encoded to bytes first: password.encode()
        - Call .hexdigest() to get the hex string result
    """
    # TODO: Implement this function
    # result = hashlib.sha256(password.encode()).hexdigest()
    # return result

    pass  # Remove this line when you implement the function


# =============================================================================
# TODO #2: IMPLEMENT verify_password
# =============================================================================

def verify_password(password: str, stored_hash: str) -> bool:
    """
    Check whether a plaintext password matches a stored hash.

    This is how login systems work: the database stores only the hash,
    never the original password. When a user logs in, you hash what they
    typed and compare it to the stored hash.

    Args:
        password: The plaintext password the user typed
        stored_hash: The hash value stored in the database

    Returns:
        True if the password matches the hash, False otherwise

    HINT:
        - Hash the password using hash_password()
        - Compare the result to stored_hash
    """
    # TODO: Implement this function

    pass  # Remove this line when you implement the function


# =============================================================================
# TODO #3: IMPLEMENT generate_salt
# =============================================================================

def generate_salt() -> str:
    """
    Generate a random 16-character hex string to use as a salt.

    A salt is a random value added to each password before hashing.
    It ensures that two users with the same password end up with
    different stored hashes.

    Returns:
        A 16-character hex string (e.g., "a3f2c1d9e4b07856")

    HINT:
        - os.urandom(8) produces 8 random bytes
        - Call .hex() on the bytes to convert to a hex string
        - 8 bytes -> 16 hex characters
    """
    # TODO: Implement this function
    # return os.urandom(8).hex()

    pass  # Remove this line when you implement the function


# =============================================================================
# TODO #4: IMPLEMENT hash_with_salt
# =============================================================================

def hash_with_salt(password: str, salt: str) -> str:
    """
    Hash a password combined with a salt value.

    The salt is prepended to the password before hashing. This means
    even if two users share the same password, they will have different
    hashes in the database.

    Args:
        password: The plaintext password
        salt: The salt string to prepend

    Returns:
        The SHA-256 hex digest of (salt + password)

    Example:
        hash_with_salt("pass", "abc123") -> hash of "abc123pass"

    HINT:
        - Concatenate: salt + password
        - Pass the combined string to hash_password()
    """
    # TODO: Implement this function
    # return hash_password(salt + password)

    pass  # Remove this line when you implement the function


# =============================================================================
# TODO #5: IMPLEMENT dictionary_attack
# =============================================================================

def dictionary_attack(target_hash: str, wordlist: list) -> str | None:
    """
    Simulate a dictionary attack by hashing each word in a wordlist
    and comparing it to the target hash.

    This demonstrates WHY weak passwords are dangerous: if an attacker
    gets hold of a password database, they can simply pre-hash thousands
    of common passwords and look for matches.

    NOTE: This function is a simulation for educational purposes only.
    Understanding how attacks work is the first step in defending against them.

    Args:
        target_hash: The hash we are trying to reverse
        wordlist: A list of candidate plaintext passwords to try

    Returns:
        The matching plaintext password if found, None if not found

    HINT:
        - Loop through each word in wordlist
        - Hash each word using hash_password()
        - If it matches target_hash, return that word
        - If you exhaust the list without a match, return None
    """
    # TODO: Implement this function
    # for word in wordlist:
    #     if hash_password(word) == target_hash:
    #         return word
    # return None

    pass  # Remove this line when you implement the function


# =============================================================================
# TODO #6: IMPLEMENT check_password_strength
# =============================================================================

def check_password_strength(password: str) -> dict:
    """
    Evaluate a password against five security criteria.

    Args:
        password: The password to evaluate

    Returns:
        A dictionary with these keys:
            length       (bool): True if password is at least 8 characters
            has_uppercase (bool): True if it contains at least one uppercase letter
            has_lowercase (bool): True if it contains at least one lowercase letter
            has_digit    (bool): True if it contains at least one digit
            has_special  (bool): True if it contains at least one special character
            score        (int):  Count of True values above (0 to 5)

    Example:
        check_password_strength("hello") ->
        {
            "length": False,
            "has_uppercase": False,
            "has_lowercase": True,
            "has_digit": False,
            "has_special": False,
            "score": 1
        }

    HINT:
        - Use len(password) >= 8 for the length check
        - Use any() with a generator: any(c.isupper() for c in password)
        - string.punctuation contains all common special characters
        - score = sum of the five boolean values
    """
    # TODO: Implement this function
    # length = len(password) >= 8
    # has_uppercase = any(c.isupper() for c in password)
    # has_lowercase = any(c.islower() for c in password)
    # has_digit = any(c.isdigit() for c in password)
    # has_special = any(c in string.punctuation for c in password)
    # score = sum([length, has_uppercase, has_lowercase, has_digit, has_special])
    # return {
    #     "length": length,
    #     "has_uppercase": has_uppercase,
    #     "has_lowercase": has_lowercase,
    #     "has_digit": has_digit,
    #     "has_special": has_special,
    #     "score": score
    # }

    pass  # Remove this line when you implement the function


# =============================================================================
# DEMO (PROVIDED)
# =============================================================================

def main():
    print("=" * 60)
    print("  PASSWORD SECURITY DEMO")
    print("=" * 60)

    # --- Part 1: Basic hashing ---
    print("\n--- Part 1: Hashing is deterministic ---")
    h1 = hash_password("password123")
    h2 = hash_password("password123")
    print(f"Hash of 'password123':  {h1}")
    print(f"Hash again (same input): {h2}")
    print(f"Both hashes match: {h1 == h2}")

    # --- Part 2: Verification ---
    print("\n--- Part 2: Verifying passwords without storing them ---")
    stored = hash_password("MySecretPass!")
    print(f"Stored hash: {stored}")
    print(f"Correct password verifies: {verify_password('MySecretPass!', stored)}")
    print(f"Wrong password verifies:   {verify_password('wrongpassword', stored)}")

    # --- Part 3: Dictionary attack ---
    print("\n--- Part 3: Dictionary attack on a weak password ---")
    weak_hash = hash_password("password123")
    print(f"Target hash: {weak_hash}")
    cracked = dictionary_attack(weak_hash, COMMON_PASSWORDS)
    if cracked:
        print(f"Password cracked! It was: '{cracked}'")
    else:
        print("Password not found in wordlist.")

    # --- Part 4: Salting defeats the attack ---
    print("\n--- Part 4: Salting defeats the dictionary attack ---")
    salt1 = generate_salt()
    salt2 = generate_salt()
    salted_hash1 = hash_with_salt("password123", salt1)
    salted_hash2 = hash_with_salt("password123", salt2)
    print(f"Same password, salt 1: {salted_hash1}")
    print(f"Same password, salt 2: {salted_hash2}")
    print(f"Different hashes: {salted_hash1 != salted_hash2}")

    cracked_salted = dictionary_attack(salted_hash1, COMMON_PASSWORDS)
    if cracked_salted:
        print(f"Salted hash cracked: '{cracked_salted}'")
    else:
        print("Dictionary attack failed against salted hash.")

    # --- Part 5: Password strength checker ---
    print("\n--- Part 5: Password strength analysis ---")
    test_passwords = ["hello", "Hello123", "C0rrect!Horse#Battery"]
    for pw in test_passwords:
        result = check_password_strength(pw)
        print(f"\n  Password: '{pw}'")
        print(f"  Score: {result['score']}/5")
        print(f"  Length >= 8:    {result['length']}")
        print(f"  Has uppercase:  {result['has_uppercase']}")
        print(f"  Has lowercase:  {result['has_lowercase']}")
        print(f"  Has digit:      {result['has_digit']}")
        print(f"  Has special:    {result['has_special']}")


if __name__ == "__main__":
    # Check whether functions have been implemented
    sentinel = hash_password("test")
    if sentinel is None:
        print("It looks like you have not implemented the required functions yet.")
        print("Open main.py and complete the TODO sections:")
        print("  1. hash_password()")
        print("  2. verify_password()")
        print("  3. generate_salt()")
        print("  4. hash_with_salt()")
        print("  5. dictionary_attack()")
        print("  6. check_password_strength()")
        print("\nRun 'python test_security.py' to test your implementations.")
    else:
        main()
