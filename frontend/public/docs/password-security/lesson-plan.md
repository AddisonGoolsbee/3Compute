# Password Security: Instructor Lesson Plan

## Overview

This project guides students through implementing password hashing, salting, and a simulated dictionary attack in Python. Students build a working security system, then attack a weak version of it to understand why implementation details matter.

**Estimated Duration:** 5 class periods (45-50 minutes each)

**Prerequisites:**
- Basic Python (variables, functions, loops, conditionals, dictionaries)
- Familiarity with strings and string methods
- No prior security knowledge required

---

## CSTA Standards Addressed

This project is designed to address the following CSTA K-12 Computer Science Standards for Grades 9-10 (Level 3A) and Grades 11-12 (Level 3B):

> **Note:** This content has not been submitted for official CSTA alignment review. The crosswalk below shows which standards this project is designed to address.

### Primary Standards (Direct Instruction)

| Standard | Description | How This Project Addresses It |
|----------|-------------|-------------------------------|
| **3A-NI-05** | Give examples to illustrate how sensitive data can be affected by malware and other attacks. | The dictionary attack simulation shows concretely how a leaked password database can be exploited. The LinkedIn case study provides a real-world example. |
| **3A-NI-06** | Recommend security measures to address various scenarios based on factors such as efficiency, feasibility, and ethical impacts. | Students compare plaintext, hashing, salted hashing, and bcrypt. Day 5 asks them to recommend appropriate measures for different scenarios (banking vs. school portal). |
| **3A-NI-07** | Compare various security measures, considering tradeoffs between the usability and security of a computing system. | The README comparison table and Day 5 discussion explicitly address the usability/security trade-off, including 2FA as an example. |
| **3A-NI-08** | Explain tradeoffs when selecting and implementing cybersecurity recommendations. | Students implement both hashing and salted hashing, observe the difference in resilience, and discuss the cost of each additional layer. |
| **3B-NI-04** | Compare ways software developers protect devices and information from unauthorized access. | Students implement and compare SHA-256 hashing, salting, and learn about bcrypt as part of the extension. |
| **3B-AP-18** | Explain security issues that might lead to compromised computer programs. | Students see how storing unsalted hashes creates vulnerability to dictionary attacks, and discuss how implementation decisions (salt storage, hash algorithm choice) affect real-world security. |

---

## Learning Objectives

By the end of this project, students should be able to:

1. **Explain** why plaintext password storage is dangerous, using a concrete breach scenario
2. **Describe** what a hash function does and list its three key properties (one-way, deterministic, avalanche)
3. **Implement** SHA-256 password hashing and verification in Python
4. **Explain** how a dictionary attack works and why it succeeds against unsalted hashes
5. **Implement** salting and explain why it defeats dictionary attacks
6. **Compare** security measures using a cost-benefit framework
7. **Apply** ethical reasoning to the use of attack-simulation techniques

---

## Ethical Framework Note

This lesson teaches defense through understanding attacks. The `dictionary_attack` function students implement is a simulation: it takes a hash and a wordlist and returns the matching word. This is how security researchers and penetration testers (with authorization) verify that systems are vulnerable.

Explicitly discuss with students:
- The distinction between understanding an attack and deploying one
- Why these techniques are legal only with authorization (computer fraud laws)
- The professional context in which security researchers legitimately use these skills
- The difference between this classroom simulation and real-world attack tooling

---

## Lesson Sequence

### Day 1: Case Study and Motivation (45 min)

**Objectives:**
- Understand real-world consequences of poor password storage
- Develop intuition for what "secure storage" should mean

**Activities:**

1. **Opening discussion (10 min):** "What does a website actually store when you create a password?"
   - Most students assume passwords are stored as-is
   - Ask: "If the database is stolen, what happens?"

2. **Case study: LinkedIn 2012 (20 min)**
   - 117 million accounts
   - Passwords hashed with SHA-1, no salt
   - Cracked passwords used for credential stuffing on other sites
   - Breach hidden for 4 years
   - Discussion questions:
     - What should LinkedIn have done differently?
     - Who is responsible: LinkedIn, users, attackers, or all three?
     - If you reused a password on LinkedIn and your bank, what is the risk?

3. **Brief look at Equifax (10 min)**
   - Different attack (SQL injection), similar consequences
   - Reinforces that breaches are not rare edge cases

4. **Preview the project (5 min)**
   - Students will implement the defense side: hashing and salting
   - They will also simulate an attack to see why defense matters
   - Ethical framing: "Understanding attacks is part of building defenses"

**Materials:**
- Whiteboard for discussion notes
- Optional: printed timeline of major breaches

---

### Day 2: Implementing Hash Functions (45 min)

**Objectives:**
- Understand the three key properties of a hash function
- Implement `hash_password()` and `verify_password()`

**Activities:**

1. **Conceptual introduction (15 min): What is a hash?**

   Draw this on the board:
   ```
   "hello"          -> 2cf24dba5fb0a30e26e83b2ac5b9e29e...
   "hello!"         -> 334d016f755cd6dc58c53a86e183882f...
   "Hello"          -> 185f8db32921bd46d35c197b0e8a4e97...
   ```
   Point out: tiny change, completely different output. This is the avalanche effect.

   Discuss the three properties:
   - **One-way:** You can hash "hello", but you cannot un-hash the result
   - **Deterministic:** The same input always gives the same output (otherwise login would be impossible)
   - **Avalanche effect:** Small input change, large output change

2. **Why SHA-256? (5 min)**
   - Industry standard, NIST-approved
   - 256-bit output: 2^256 possible values (more than atoms in the observable universe)
   - Collision-resistant: no two known inputs produce the same output

3. **Implement `hash_password()` and `verify_password()` (20 min)**
   - Walk through `hashlib` usage if students are unfamiliar
   - Common error: forgetting `.encode()` on the string before hashing
   - Run `python test_security.py` after each function

4. **Discussion (5 min): Does hashing alone solve the problem?**
   - Tease the answer: "What if the attacker already knows the hash of 'password123'?"

**Common student errors:**

```python
# Wrong: string cannot be passed directly to hashlib
hashlib.sha256(password).hexdigest()

# Right: must encode to bytes first
hashlib.sha256(password.encode()).hexdigest()
```

---

### Day 3: Dictionary Attack Simulation (45 min)

**Objectives:**
- Understand how dictionary attacks work
- Implement `dictionary_attack()`
- Recognize why common passwords remain vulnerable even when hashed

**Activities:**

1. **Ethical framing first (5 min)**
   - Remind students: this is a simulation for understanding, not a real attack tool
   - Real use of these techniques requires authorization
   - The goal is to understand the attack so we can build better defenses

2. **How a dictionary attack works (10 min)**
   - Attacker steals a database with username + hash pairs
   - They already know the hash algorithm (SHA-256 is not a secret)
   - They compute `SHA-256("password")`, `SHA-256("123456")`, etc.
   - If any computed hash matches a stored hash, the password is cracked
   - GPU can compute billions of hashes per second

   Ask students: "What does this tell us about the real danger of 'password123'?"

3. **Implement `dictionary_attack()` (20 min)**
   - Straightforward loop, but the conceptual point is important
   - Have students test it against the provided `COMMON_PASSWORDS` list
   - Confirm that `hash_password("password123")` is cracked immediately

4. **Analysis discussion (10 min)**
   - "What makes a password resistant to this attack?"
   - Length and randomness matter; complexity (special characters) helps but matters less than length
   - "Would making the wordlist larger always crack more passwords?" (Yes, up to a limit)
   - "What if we added a random string to each password before hashing?" (Preview of salting)

---

### Day 4: Salting (45 min)

**Objectives:**
- Understand what a salt is and why it works
- Implement `generate_salt()` and `hash_with_salt()`
- Observe that the dictionary attack fails against salted hashes

**Activities:**

1. **Review (5 min)**
   - Dictionary attack works because the attacker can pre-compute hashes
   - "If we add a random value before hashing, can the attacker still pre-compute?"

2. **Introduce salting (10 min)**
   - A salt is a random string generated per-user and stored alongside the hash
   - `stored_hash = SHA-256(salt + password)`
   - Two users with the same password now have different hashes
   - Attacker cannot pre-compute: they would need a dictionary per salt value

   On the board, show what the database now looks like:
   ```
   alice | salt: a3f2c1d9 | hash: SHA-256("a3f2c1d9" + alice's password)
   bob   | salt: 7b4e5c2f | hash: SHA-256("7b4e5c2f" + bob's password)
   ```

3. **Implement `generate_salt()` and `hash_with_salt()` (20 min)**
   - Discuss `os.urandom()`: cryptographically secure random bytes from the OS
   - Students implement both functions and run tests
   - Have them manually confirm: same password, different salt = different hash

4. **Run the attack against a salted hash (5 min)**
   - `dictionary_attack(hash_with_salt("password123", some_salt), COMMON_PASSWORDS)`
   - The attack returns `None`: the dictionary attack fails
   - Discussion: "Why? 'password123' is still in the wordlist."
   - Answer: the dictionary words are hashed without the salt, so they never match

5. **Wrap-up (5 min)**
   - Salting defeats pre-computation and rainbow tables
   - It does not make a weak password uncrackable indefinitely, only much harder
   - Preview: bcrypt adds another layer (deliberate slowness)

---

### Day 5: Security Trade-offs and Strength Checking (45 min)

**Objectives:**
- Implement `check_password_strength()`
- Analyze the usability vs. security trade-off
- Apply security recommendations to different scenarios

**Activities:**

1. **Implement `check_password_strength()` (15 min)**
   - Walk through the five criteria
   - Students implement and run tests

2. **The security comparison table (10 min)**
   - Present the table from the README: plaintext, SHA-256, SHA-256+salt, bcrypt
   - For each row: "What does an attacker need to do to crack a password?"
   - Key insight: bcrypt's "work factor" means cracking takes seconds per password instead of microseconds, making large-scale attacks impractical

3. **Scenario discussion: apply 3A-NI-06 (15 min)**

   Give students these scenarios and ask them to recommend a security approach and justify it:
   - A banking app managing financial transactions
   - A school library system where students borrow books
   - A gaming leaderboard with usernames and high scores
   - A medical records system

   Discussion points:
   - Does the value of the data justify the cost of stronger security?
   - What is the realistic threat? A script kiddie? A nation-state?
   - What happens to users if their account is compromised?

4. **2FA as a trade-off example (5 min)**
   - Two-factor authentication is more secure than any password scheme alone
   - But: requires a second device, adds friction, some users opt out
   - This is the core of 3A-NI-07: security and usability are often in tension
   - There is no free lunch: every security measure has a cost

**Instructor notes:**
- Students often assume "more security is always better." Push back: if the friction causes users to write passwords on sticky notes or reuse trivially simple passwords, an over-engineered system can be less secure in practice.

---

## Assessment Ideas

### Formative Assessment

- **Test suite:** Built-in tests give immediate, per-function feedback
- **Exit tickets:** "Explain in two sentences why salting defeats a dictionary attack"
- **Observation:** Monitor during implementation; misconceptions about one-way hashing are common

### Summative Assessment Options

**Option A: Code Submission**
- Submit completed `main.py`
- Rubric:
  - All tests pass (40%)
  - Code correctness and approach (30%)
  - Inline comments showing understanding (30%)

**Option B: Written Analysis**
- Given a breach scenario (fictional database leaked), analyze what went wrong
- Recommend what should have been done and justify the recommendation
- Explain one trade-off the organization would face if they implemented your recommendation

**Option C: Extension Project**
- Implement the pepper extension
- Write an explanation of bcrypt and when to use it
- Compare the dictionary attack success rate across different wordlist sizes

---

## Differentiation

### For Struggling Students

- Provide partially completed functions with the structure in place
- Focus on Days 1-4 and skip Day 5 extensions
- Pair with a stronger partner for the dictionary attack day
- Use the commented pseudocode in `main.py` as a more direct guide

### For Advanced Students

- Challenge: implement the dictionary attack to also try capitalization variants of each word (e.g., "Password", "PASSWORD")
- Challenge: implement a timed attack and report how many hashes per second Python can compute
- Research Argon2 (the Password Hashing Competition winner) and explain how memory-hardness differs from bcrypt's approach

---

## Discussion Prompts

Use throughout the unit to deepen thinking:

1. "SHA-256 is used in Bitcoin, TLS certificates, and code signing. Why is it fine for those use cases but not ideal for passwords alone?"

2. "If an attacker has a stolen database and unlimited time, can salting ever fully protect a weak password?"

3. "LinkedIn disclosed their 2012 breach in 2016. What are the ethical obligations of a company that discovers a breach? What about legally?"

4. "Why do some websites still send your password back to you in a 'forgot password' email? What does that tell you about how they're storing it?"

5. "A user asks why they have to use a long, complex password when the site says it's 'encrypted anyway.' How would you explain it?"

---

## Common Misconceptions

| Misconception | Reality |
|--------------|---------|
| "The hash can be reversed to get the password back" | Hash functions are designed to be one-way. Attackers do not reverse the hash; they find a collision by trying known inputs. |
| "A longer hash means more security" | SHA-256 always produces 256 bits. Longer output alone does not mean more secure; algorithm design matters more. |
| "Salting makes a weak password uncrackable" | Salting defeats pre-computation and rainbow tables. An attacker with the salt can still run a targeted dictionary attack on that one user, just not across all users at once. |
| "Two-factor authentication eliminates the need for strong passwords" | 2FA adds a second layer, but a compromised password can still be used in scenarios where 2FA is bypassed (e.g., SIM swapping, phishing). |
| "Hashing and encryption are the same thing" | Encryption is reversible with a key. Hashing is one-way. These are different tools for different purposes. |

---

## Troubleshooting Guide

| Symptom | Likely Cause | Solution |
|---------|--------------|----------|
| `encode()` AttributeError | Calling `hashlib.sha256(password)` without encoding | Add `.encode()`: `password.encode()` |
| Hash is 32 characters | Using `.digest()` instead of `.hexdigest()` | Change to `.hexdigest()` |
| `dictionary_attack` never finds a match | `hash_password` not implemented yet, returns `None` | Implement `hash_password` first and verify it passes tests |
| Salted attack still returns a match | Comparing wordlist words without the salt applied | The attack must try `hash_password(word)`, not `hash_with_salt(word, salt)` |
| `check_password_strength` score is wrong | `score` computed manually instead of with `sum()` | Use `sum([length, has_uppercase, ...])` |

---

## Files in This Package

| File | Purpose |
|------|---------|
| `solution.py` | Complete reference implementation (instructor only) |
| `lesson-plan.md` | This document |
| Password-Security student template | |
| `main.py` | Scaffolded code with TODOs |
| `test_security.py` | Test suite for verification |
| `README.md` | Student-facing instructions and background reading |
| `common_passwords.txt` | 20 common passwords for dictionary attack |
| `requirements.txt` | Empty (hashlib and os are standard library) |

---

## Additional Resources

### For Instructors

- [NIST Password Guidelines (SP 800-63B)](https://pages.nist.gov/800-63-3/sp800-63b.html) - Current federal recommendations on password storage
- [HaveIBeenPwned](https://haveibeenpwned.com/) - Students can check (with permission) whether their email has been in a breach
- [Password Hashing Competition](https://password-hashing.net/) - Background on why Argon2 was selected

### For Students (in README.md)

- SHA-256 explanation in the README
- Extension challenge pointing to bcrypt documentation
- Reflection questions connecting to real-world scenarios

---

*Last updated: March 2026*
