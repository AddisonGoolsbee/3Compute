# Data Encoding: Instructor Lesson Plan

## Overview

This project guides students through implementing conversion functions that move data between binary, decimal, hexadecimal, and text representations, then applies those skills to understand how images are stored as grids of RGB pixels. Students work entirely in Python's standard library with no external dependencies.

**Estimated Duration:** 3-4 class periods (45-50 minutes each)

**Grade Level:** 9-10

**Prerequisites:**
- Basic Python (variables, functions, loops, conditionals)
- Integer arithmetic (division, modulo)
- Helpful but not required: prior exposure to number bases

---

## CSTA Standards Addressed

> **Note:** This content has not been submitted for official CSTA alignment review. The crosswalk below shows which standards this project is designed to address.

### Primary Standards (Direct Instruction)

| Standard | Description | How This Project Addresses It |
|----------|-------------|-------------------------------|
| **3A-DA-09** | Translate between different bit representations of real-world phenomena, such as characters, numbers, and images. | Students implement all conversion functions from scratch: binary/decimal/hex arithmetic, ASCII encoding, and RGB-to-hex color mapping. |

### Supporting Standards (Context and Discussion)

| Standard | Description | How This Project Supports It |
|----------|-------------|------------------------------|
| **2-DA-07** | Represent data using multiple encoding schemes. | Students see the same value (e.g., decimal 255) represented as binary `11111111`, hex `FF`, and as a color channel in `#FFFFFF`. |
| **3A-AP-14** | Construct solutions using student-created components such as procedures and modules. | Each function is modular and composable: `rgb_to_hex` calls `decimal_to_hex`, `explore_pixel` calls both. |
| **3A-AP-17** | Develop and use a series of test cases to verify that a program performs according to its design specifications. | The provided test suite covers individual cases, edge cases, and round-trip correctness for every function. |

---

## Learning Objectives

By the end of this project, students should be able to:

1. **Explain** why computers represent data in binary
2. **Convert** integers between binary, decimal, and hexadecimal by hand and in code
3. **Describe** how ASCII maps characters to numbers
4. **Interpret** a CSS hex color code as three one-byte values
5. **Explain** how a digital image is stored as a grid of RGB pixels
6. **Test** their implementations systematically using a provided test suite

---

## Lesson Sequence

### Day 1: Unplugged Activity: Counting in Binary (45 min)

**Objectives:**
- Develop intuition for binary through a physical activity
- Convert small numbers between binary and decimal by hand

**Activities:**

1. **Finger binary warm-up (15 min):**
   - Explain that each finger represents one bit
   - Right hand = bits 0-4 (values 1, 2, 4, 8, 16)
   - Count from 0 to 31 using only right-hand fingers
   - Call out numbers; students show them with their fingers

2. **Paper conversion practice (15 min):**
   - Students convert these numbers to binary by hand: 0, 5, 13, 42, 100, 255
   - Then convert these binary strings back to decimal: `101`, `1111`, `10101010`
   - Check answers as a class

3. **Introduce hexadecimal (10 min):**
   - Show the mapping: binary groups of four -> one hex digit
   - Convert `11111111` to hex as a class (answer: `FF`)
   - Discuss: "Why would a programmer prefer `FF` over `11111111`?"

4. **Preview the project (5 min):**
   - Show students the 4x4 smiley image the project displays
   - Ask: "What do you think this image looks like as data?"

**Materials:**
- Printed or projected binary conversion chart
- Paper worksheets (optional)

**Instructor Notes:**
- The finger binary activity works well for kinesthetic learners and gives everyone a shared reference for the rest of the unit
- Students who already know binary can focus on the hex section

---

### Day 2: Binary, Decimal, and Hex Conversions (45 min)

**Objectives:**
- Implement `decimal_to_binary`, `binary_to_decimal`, `decimal_to_hex`, `hex_to_decimal`
- Run the partial test suite and pass the first four groups of tests

**Activities:**

1. **Setup and orientation (5 min):**
   - Students open the project template
   - Walk through the file structure: `main.py`, `test_encoding.py`
   - Point out the `PIXEL_COLORS` data and `display_image` function; students will use these on Day 3

2. **Implement `decimal_to_binary` (15 min):**
   - Review the repeated-division algorithm from Day 1
   - Walk through the pseudocode in the TODO comment as a class
   - Common pitfall: forgetting to handle `n == 0` (the while loop never runs)

3. **Implement `binary_to_decimal` (10 min):**
   - Discuss the positional value approach: each digit is multiplied by its power of 2
   - Students implement independently

4. **Implement `decimal_to_hex` and `hex_to_decimal` (10 min):**
   - Point out that the algorithm is identical to binary, just with base 16
   - The `HEX_DIGITS` and `HEX_VALUES` dictionaries in the TODO stubs handle the mapping

5. **Test and debug (5 min):**
   - Run `python test_encoding.py`
   - Students debug until the first four test groups pass

**Common Student Errors:**

```python
# Wrong: collecting quotients instead of remainders
digits.append(n // 2)

# Right: collect the remainder
digits.append(n % 2)
n = n // 2
```

```python
# Wrong: forgetting to reverse
return "".join(digits)

# Right: remainders are collected least-significant-first
return "".join(reversed(digits))
```

---

### Day 3: Text, Color, and the Image Display (45 min)

**Objectives:**
- Implement `text_to_ascii`, `ascii_to_text`, `rgb_to_hex`, `hex_to_rgb`
- Pass all tests
- Run the full demo and see the pixel image in the terminal

**Activities:**

1. **ASCII warm-up (5 min):**
   - Ask: "What number do you think 'A' maps to?"
   - Show the ASCII table; point out the patterns (uppercase A-Z starts at 65, lowercase a-z starts at 97, digits 0-9 start at 48)

2. **Implement `text_to_ascii` and `ascii_to_text` (10 min):**
   - Introduce `ord()` and `chr()`: these are the only built-ins they need
   - Students can implement both functions quickly; the logic is a single loop

3. **Discuss hex color codes (5 min):**
   - Show a CSS snippet with `#FFA500` (orange)
   - Ask students to decode it by hand: `FF` = 255, `A5` = ?, `00` = 0
   - Confirm that `hex_to_decimal("A5")` = 165

4. **Implement `rgb_to_hex` and `hex_to_rgb` (15 min):**
   - `rgb_to_hex`: calls `decimal_to_hex` on each channel and zero-pads
   - `hex_to_rgb`: strips the `#`, slices the string, calls `hex_to_decimal` on each slice
   - Zero-padding is the most common mistake. Give students a moment to consider why `rgb_to_hex(1, 2, 3)` should return `"#010203"` and not `"#123"`

5. **Run all tests and the demo (10 min):**
   - `python test_encoding.py`: all tests should be passing
   - `python main.py`: point out the color swatches and the smiley image
   - Ask students to read the output for the yellow pixel and trace it back to the `PIXEL_COLORS` list

**Instructor Notes:**
- The zero-padding requirement in `rgb_to_hex` often surprises students. A concrete example helps: `#0F0F0F` is a dark gray, but `#F0F0F` is only 5 characters and not valid CSS.
- If students have seen CSS before, connect to that: "You've probably seen these `#RRGGBB` strings. Now you know exactly what the digits mean."

---

### Day 4 (Optional): Compression, Extensions, and Abstraction Layers (45 min)

**Objectives:**
- Understand why compression exists
- Implement run-length encoding (medium extension)
- Connect data encoding to the broader concept of abstraction layers

**Activities:**

1. **Image size calculation (10 min):**
   - Walk through the math: 1920 x 1080 x 3 bytes = ~6 MB uncompressed
   - Ask: "Your phone photos are usually 2-4 MB. How is that possible?"
   - Introduce the idea of compression without going into algorithm details

2. **Run-length encoding activity (20 min):**
   - Describe the algorithm: `"AAABBBCC"` -> `"3A3B2C"`
   - Students implement `rle_encode` and `rle_decode`
   - Test on binary strings: `"00000000111100001111"` compresses well; `"01010101"` does not
   - Discuss: what kinds of data does RLE work well on?

3. **Abstraction layers discussion (10 min):**
   - Draw the stack on the board:
     ```
     Image viewer (pixels as colors)
     Image decoder (bytes -> RGB tuples)
     File system (bytes on disk)
     Hardware (electrical signals: 0s and 1s)
     ```
   - Ask: "Which layer did you work at in this project?"
   - Connect to future topics: operating systems, networking, databases

4. **Wrap-up and reflection (5 min):**
   - Students answer one reflection question from the README in writing

---

## Assessment Ideas

### Formative Assessment

- **Test suite:** Built-in tests give immediate feedback on each function
- **Observation:** Check for understanding during Day 1 unplugged activity
- **Exit ticket (Day 2):** "Convert the binary string `10110` to decimal. Show your work."
- **Exit ticket (Day 3):** "What are the R, G, and B values for the CSS color `#3C78F0`?"

### Summative Assessment

**Option A: Code Submission**
- Submit completed `main.py`
- Rubric:
  - All tests pass (40%)
  - No forbidden built-ins used (`bin()`, `hex()`, `int(..., base)`) (20%)
  - Code readability and variable names (20%)
  - Correct algorithmic approach (20%)

**Option B: Written Reflection**
- Convert a given decimal number to binary and hex by hand, showing all work
- Explain in writing how a CSS hex color code is structured
- Describe how a 100x100 black-and-white image would be stored in binary

**Option C: Extension Project**
- Implement the run-length encoding extension
- Implement the image-from-text-file extension
- Research and present: how does PNG compression work?

---

## Differentiation

### For Struggling Students

- Allow use of a printed binary/hex reference chart during implementation
- Provide the modulo/division loop for `decimal_to_binary` as starter code
- Focus on TODOs 1-6; TODOs 7-8 can be optional for these students
- Pair with a partner for the hex color sections

### For Advanced Students

- Require implementing without any built-in conversion (already a constraint, but enforce strictly)
- Assign both medium and hard extension challenges
- Ask them to research and explain how UTF-8 extends ASCII for international characters
- Challenge: implement a function that converts an integer to binary using only bit-shifting operators (`>>`, `&`)

---

## Discussion Prompts

Use these throughout the unit to deepen understanding:

1. "Why do you think early programmers chose 8 bits (one byte) as the basic unit of storage?"

2. "ASCII only has 128 characters. What happens when someone types a character that isn't in ASCII, like an emoji or an accented letter?"

3. "A color monitor and a black-and-white monitor are storing the same 1920x1080 image. How does the storage size differ?"

4. "If you received a file that was just a long list of numbers, how would you know whether it represents text, an image, or something else?"

5. "JPEG compresses images by slightly changing pixel colors so nearby pixels look similar. Why might this be a problem for medical or legal documents?"

---

## Common Misconceptions

| Misconception | Reality |
|--------------|---------|
| "Binary is slower than decimal" | The CPU always works in binary. Decimal is a human convention layered on top. |
| "Hexadecimal is a different number system than binary" | Hex is a shorthand for binary. Every hex digit is exactly four binary digits. |
| "ASCII and Unicode are the same thing" | ASCII is a 128-character subset of Unicode. Unicode supports over 140,000 characters. |
| "More bytes always means better image quality" | Pixel count determines resolution. Color depth (bits per channel) determines range of color, not sharpness. |
| "Compression changes the image" | Lossless compression (PNG) is mathematically reversible. Lossy compression (JPEG) discards some data. |

---

## Files in This Package

| File | Purpose |
|------|---------|
| `solution.py` | Complete reference implementation (instructor only) |
| `lesson-plan.md` | This document |
| Data-Encoding student template: | |
| `main.py` | Scaffolded code with TODOs and provided helper functions |
| `test_encoding.py` | Test suite covering all functions |
| `README.md` | Student-facing background reading and instructions |
| `requirements.txt` | Empty: no external dependencies |

---

## Additional Resources

### For Instructors

- [CS Unplugged: Binary Numbers](https://www.csunplugged.org/en/topics/binary-numbers/) - Unplugged activities including the finger-binary game
- [Unicode Consortium](https://unicode.org/) - Background on how ASCII extends to global character sets
- [How JPEG Compression Works (YouTube)](https://www.youtube.com/watch?v=Q2aEzeMDHMA) - Good visual overview for the optional Day 4 discussion

### For Students (linked from README.md)

- ASCII table reference
- CSS color picker tools that show hex codes and RGB values side by side
- Binary and hex conversion practice problems

---

*Last updated: March 2026*
