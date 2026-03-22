"""
Password Security - REFERENCE IMPLEMENTATION
=============================================

This is the complete solution for instructor reference.
DO NOT share this file with students.

This implementation includes:
- All TODO functions completed
- Comments explaining the reasoning behind each implementation
- Working demo matching the student-facing main.py
"""

import hashlib
import os
import string


# =============================================================================
# SETUP
# =============================================================================

def load_wordlist(filename):
    """Load passwords from a text file, one per line."""
    try:
        with open(filename, "r") as f:
            return [line.strip() for line in f if line.strip()]
    except FileNotFoundError:
        print(f"Warning: {filename} not found. Using empty wordlist.")
        return []


COMMON_PASSWORDS = load_wordlist("common_passwords.txt")


# =============================================================================
# SOLUTION #1: hash_password
# =============================================================================

def hash_password(password: str) -> str:
    """
    Hash a password string using SHA-256.

    SOLUTION NOTES:
    - hashlib.sha256() expects bytes, not a str, so we encode first
    - hexdigest() returns the 64-character lowercase hex string
    - This is deterministic: same input always produces same output
    """
    return hashlib.sha256(password.encode()).hexdigest()


# =============================================================================
# SOLUTION #2: verify_password
# =============================================================================

def verify_password(password: str, stored_hash: str) -> bool:
    """
    Check whether a plaintext password matches a stored hash.

    SOLUTION NOTES:
    - Rehash what the user typed and compare to the stored hash
    - We never need the original password; we only need to reproduce its hash
    - This is the core of how every login system works
    """
    return hash_password(password) == stored_hash


# =============================================================================
# SOLUTION #3: generate_salt
# =============================================================================

def generate_salt() -> str:
    """
    Generate a random 16-character hex salt.

    SOLUTION NOTES:
    - os.urandom() draws from the OS's cryptographically secure random source
    - 8 bytes -> 16 hex characters (each byte = 2 hex chars)
    - Each call produces a different value (that's the point)
    """
    return os.urandom(8).hex()


# =============================================================================
# SOLUTION #4: hash_with_salt
# =============================================================================

def hash_with_salt(password: str, salt: str) -> str:
    """
    Hash salt + password using SHA-256.

    SOLUTION NOTES:
    - Convention: salt is prepended, so the combined input is salt + password
    - This is passed to hash_password(), which handles the encoding and hashing
    - The order (salt first) must be consistent between storage and verification
    """
    return hash_password(salt + password)


# =============================================================================
# SOLUTION #5: dictionary_attack
# =============================================================================

def dictionary_attack(target_hash: str, wordlist: list) -> str | None:
    """
    Simulate a dictionary attack by trying each word in the wordlist.

    SOLUTION NOTES:
    - The attacker knows the hash algorithm (it's not a secret)
    - They compute the hash of each candidate and compare to the target
    - This is O(n) in the size of the wordlist
    - Against unsalted hashes, this can be pre-computed once and reused
      against every account in a database (that's what rainbow tables are)
    """
    for word in wordlist:
        if hash_password(word) == target_hash:
            return word
    return None


# =============================================================================
# SOLUTION #6: check_password_strength
# =============================================================================

def check_password_strength(password: str) -> dict:
    """
    Evaluate a password against five security criteria.

    SOLUTION NOTES:
    - any() with a generator is idiomatic Python for "does at least one char satisfy X"
    - string.punctuation = !"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~
    - sum() on a list of booleans works because True == 1 and False == 0
    - Returning a dict (not separate values) makes the function easy to test
      and easy to extend with additional criteria later
    """
    length = len(password) >= 8
    has_uppercase = any(c.isupper() for c in password)
    has_lowercase = any(c.islower() for c in password)
    has_digit = any(c.isdigit() for c in password)
    has_special = any(c in string.punctuation for c in password)
    score = sum([length, has_uppercase, has_lowercase, has_digit, has_special])

    return {
        "length": length,
        "has_uppercase": has_uppercase,
        "has_lowercase": has_lowercase,
        "has_digit": has_digit,
        "has_special": has_special,
        "score": score,
    }


# =============================================================================
# DEMO
# =============================================================================

def main():
    print("=" * 60)
    print("  PASSWORD SECURITY DEMO - REFERENCE IMPLEMENTATION")
    print("=" * 60)

    # --- Part 1: Basic hashing ---
    print("\n--- Part 1: Hashing is deterministic ---")
    h1 = hash_password("password123")
    h2 = hash_password("password123")
    print(f"Hash of 'password123':   {h1}")
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
    main()
