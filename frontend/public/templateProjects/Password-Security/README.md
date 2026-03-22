# Password Security: Hashing, Salting, and Attacks

Learn how real-world systems protect passwords, why weak passwords fail even when hashed, and what trade-offs engineers make when choosing a security approach.

## What You'll Learn

By completing this project, you'll understand:

- **Why plaintext storage is dangerous** and what happens in a database breach
- **What a hash function does** and why it's a one-way operation
- **How salting defeats rainbow table attacks** by making each hash unique
- **How dictionary attacks work** and why common passwords are the first to fall
- **How to measure password strength** using concrete, objective criteria

## Quick Start

1. **Open `main.py`** and read through the code structure
2. **Complete the TODOs** in order (1 through 6)
3. **Test your work:** `python test_security.py`
4. **Run the demo:** `python main.py`

---

## Background: Why Password Storage Matters

When you create an account on a website, the site needs to verify your password on future logins. The naive approach is to store the password as typed. This is called **plaintext storage**, and it is a serious security failure.

### The Database Breach Problem

Every database can potentially be stolen: through SQL injection, a misconfigured server, a disgruntled employee, or a compromised backup. When a database is leaked, an attacker has a list of usernames paired with whatever the site stored for each password.

If passwords are stored as plaintext:
- Every user's password is immediately exposed
- Attackers can try those passwords on other sites (password reuse is common)
- Users who reused the password on their bank, email, or other accounts are now at risk

**This is not hypothetical.** Plaintext storage has caused real breaches affecting millions of people.

---

## Hash Functions

A **hash function** takes an input of any length and produces a fixed-length output called a **digest** or **hash**. For SHA-256, that output is always 256 bits, written as a 64-character hex string.

### Three key properties

**One-way:** Given a hash, you cannot compute the original input. There is no "unhash" operation. This is what makes hashing useful for passwords: the database stores the hash, and even someone reading the database cannot directly recover passwords.

**Deterministic:** The same input always produces the same hash. This is what makes verification possible: when a user logs in, you hash what they typed and compare it to the stored hash.

**Avalanche effect:** A tiny change in the input produces a completely different hash. The hash of "password" and the hash of "Password" share no visible similarity.

```
SHA-256("password")  -> 5e884898da28047151d0e56f8dc6292773603d0d...
SHA-256("Password")  -> e7cf3ef04be9d6983e7a5d7e7d7c6b0e3b1e1b9...
```

### Why SHA-256 specifically?

SHA-256 is part of the SHA-2 family, published by NIST. It is:
- **Collision-resistant:** No two known inputs produce the same output
- **Widely reviewed:** Cryptographers have scrutinized it for decades
- **Standard:** Used in TLS, code signing, Bitcoin, and many other systems

For general-purpose hashing and learning, SHA-256 is the right starting point. (See the extension challenges for why password storage has additional requirements beyond basic SHA-256.)

---

## Dictionary Attacks and Why They Work

Hashing protects passwords from direct reading, but it does not make weak passwords safe.

An attacker who steals a database of SHA-256 hashes can run a **dictionary attack**:

1. Collect a list of common passwords (millions are freely available online)
2. Hash each one using the same algorithm the site used
3. Compare each computed hash to the hashes in the database
4. Any match reveals a password

A modern GPU can compute billions of SHA-256 hashes per second. A list of one million common passwords can be fully checked in milliseconds.

The lesson: **hashing a weak password does not make it secure.** An attacker does not need to reverse the hash. They only need to find a collision with something they already know.

---

## Salting

A **salt** is a random string generated uniquely for each user and stored alongside the hash. Before hashing, the salt is combined with the password:

```
stored_hash = SHA-256(salt + password)
```

Why this works:

- Two users with the same password get different hashes (because their salts differ)
- An attacker cannot pre-compute a dictionary of hashes, because they would need a separate dictionary for every salt value
- Even if one password is cracked, the attacker cannot reuse that work for other accounts in the same database

This defeats **rainbow tables**, which are pre-computed lookup tables mapping common hashes back to their inputs. A rainbow table is useless once every hash has a unique salt.

### What the database stores

| Column | Example value |
|--------|---------------|
| username | alice |
| salt | `a3f2c1d9e4b07856` |
| hash | `SHA-256("a3f2c1d9e4b07856" + password)` |

When Alice logs in, the server looks up her salt, computes SHA-256(salt + what_she_typed), and compares it to the stored hash.

---

## Security Measures: A Comparison

| Approach | Breach consequence | Dictionary attack | Rainbow table | Notes |
|----------|-------------------|-------------------|---------------|-------|
| Plaintext | All passwords exposed immediately | N/A | N/A | Never acceptable |
| SHA-256 (no salt) | Weak passwords cracked in seconds | Vulnerable | Vulnerable | Better than plaintext; not sufficient alone |
| SHA-256 + salt | Attacker must attack each hash separately | Slower, still feasible for weak passwords | Defeated | Good baseline |
| bcrypt / Argon2 | Very slow to crack even with dedicated hardware | Significantly slower | Defeated | Industry standard for passwords |

### The usability/security trade-off

Every additional security measure has a cost:

- **Salting** adds storage and a slightly more complex login flow, but is invisible to users
- **bcrypt** intentionally runs slowly (configurable), which adds a few hundred milliseconds to login, but makes large-scale cracking impractical
- **Two-factor authentication (2FA)** requires users to have a second device and complete an extra step on every login. It is far more secure than passwords alone, but some users find it inconvenient and opt out when given the choice

There is no single right answer. A banking application warrants different trade-offs than a school library portal. Part of security engineering is choosing measures appropriate to the value of what you are protecting and the realistic threat landscape.

---

## Real-World Case Studies

### LinkedIn, 2012

In 2012, attackers stole approximately 117 million password hashes from LinkedIn. The passwords were hashed with SHA-1 but **not salted**. Because many users had common passwords, a large fraction were cracked within days using dictionary attacks. The breach was not fully disclosed to users until 2016. The credentials were sold on underground markets and used in credential-stuffing attacks against other sites for years.

**What went wrong:** No salting. SHA-1 (even weaker than SHA-256). No detection of the breach for years.

**What should have happened:** Unique salts per user. A slow hashing algorithm like bcrypt. Breach detection and prompt user notification.

### General pattern

Most large password breaches share common factors:
- Weak or missing hashing
- No salting
- Passwords never rotated after a discovered breach
- Password reuse by users across multiple sites

The techniques in this project directly address the first two.

---

## Your Tasks

Open `main.py` and complete these functions in order:

### TODO #1: `hash_password(password)`

Hash a password string using SHA-256 and return the hex digest.

**Hints:**
- Use `hashlib.sha256()`
- Strings must be encoded to bytes: `password.encode()`
- Call `.hexdigest()` on the result

### TODO #2: `verify_password(password, stored_hash)`

Return `True` if hashing the password matches the stored hash.

**Hints:**
- Call `hash_password()` and compare
- Do not re-implement the hashing logic here

### TODO #3: `generate_salt()`

Return a random 16-character hex string.

**Hints:**
- `os.urandom(8)` produces 8 cryptographically random bytes
- Call `.hex()` to convert to a 16-character hex string

### TODO #4: `hash_with_salt(password, salt)`

Hash the combination of `salt + password`.

**Hints:**
- Concatenate the strings, then pass to `hash_password()`
- Order matters: salt first, then password

### TODO #5: `dictionary_attack(target_hash, wordlist)`

Try each word in the wordlist and return the one whose hash matches.

**Hints:**
- Loop through `wordlist`
- Hash each word and compare to `target_hash`
- Return `None` if no match is found

### TODO #6: `check_password_strength(password)`

Return a dict scoring the password on five criteria.

**Hints:**
- `any(c.isupper() for c in password)` checks for uppercase
- `string.punctuation` contains all common special characters
- `score` is the count of `True` values among the five criteria

---

## Testing Your Implementation

```bash
python test_security.py
```

Implement functions in order. `verify_password` depends on `hash_password`; `dictionary_attack` depends on both; `hash_with_salt` and `dictionary_attack` together demonstrate the value of salting.

---

## Extension Challenges

### 🟢 Easy: Expand the Wordlist

Add 80 more common passwords to `common_passwords.txt` to bring it to 100 entries. Run the dictionary attack against a list of hashed common passwords and measure what percentage can now be cracked. How does wordlist size affect the attack's effectiveness?

### 🟡 Medium: Implement a Pepper

A **pepper** is a server-side secret added to every password before hashing, stored in the application code or an environment variable (not in the database). Unlike a salt, it is the same for all users, but attackers who steal only the database do not have it.

Implement a `hash_with_pepper(password, salt, pepper)` function and a corresponding `verify_with_pepper()`. Test what happens when the pepper is unknown to the attacker.

### 🔴 Hard: Research bcrypt

Read about bcrypt (or Argon2, the current winner of the Password Hashing Competition). Write a short explanation answering:
- What is a "work factor" and why does bcrypt have one?
- Why is bcrypt better than SHA-256 for passwords, even with a salt?
- How do you upgrade a system from SHA-256+salt to bcrypt without requiring all users to reset their passwords?

---

## Reflection Questions

1. **Why can a dictionary attack work even without reversing the hash?**

2. **Two users both choose "password123". With salting, their stored hashes are different. How does the server still verify each of them correctly on login?**

3. **If bcrypt is better, why is SHA-256 still widely used?** (Think about what other things SHA-256 is used for beyond passwords.)

4. **What makes a password resistant to a dictionary attack?** Is length or complexity more important?

5. **Is it ever acceptable to store passwords in plaintext?** Can you think of any scenario where the trade-off might be justified?

---

## Code Review Checklist

Before submitting, verify:

- [ ] All tests pass (`python test_security.py`)
- [ ] The demo runs without errors (`python main.py`)
- [ ] `hash_with_salt` hashes `salt + password`, not `password + salt`
- [ ] `dictionary_attack` returns `None` (not `False`) when no match is found
- [ ] `check_password_strength` returns a `dict` with all six required keys
- [ ] You can explain in your own words why salting defeats dictionary attacks

---

## Troubleshooting

### `AttributeError: 'NoneType' has no attribute...`
A function is returning `None` instead of a value. Check that you removed the `pass` line and that your `return` statement is not inside an `if` block that never runs.

### Hash is 32 characters instead of 64
You may be calling `.digest()` instead of `.hexdigest()`. The digest is raw bytes; hexdigest is the hex-encoded string.

### `dictionary_attack` always returns `None`
Confirm that `hash_password` is working correctly first. Then check that you are comparing the computed hash to `target_hash`, not to the word itself.

### `check_password_strength` returns wrong score
Make sure `score` is computed as `sum([length, has_uppercase, has_lowercase, has_digit, has_special])`. Python treats `True` as `1` and `False` as `0` in arithmetic, so `sum()` of a list of booleans gives the count of `True` values.
