# Data Encoding: Binary, Hex, and Color

Every file on your computer, every photo, every message, every web page is stored as sequences of 0s and 1s. In this project you implement the conversion functions that connect those raw bits to the numbers, text, and colors humans actually work with.

This README covers background knowledge that may be necessary or helpful for this lesson. Read through it once before you start coding.

## What You Will Learn

- How binary works and why computers use it
- Why hexadecimal exists and how it relates to binary
- How text is stored using ASCII codes
- How images are stored as grids of RGB color values
- How hex color codes in CSS map to actual colors

## Setup

Right-click the `Data-Encoding` folder in the file explorer on the left and select **Open in Terminal**. This executes `cd` (change directory) in your terminal to the project folder so the commands below will work.

From there:

1. Open `main.py` and read through the structure.
2. Complete the TODOs in order (1 through 8).
3. Test your work: `python test_encoding.py`.
4. Run the demo: `python main.py`.

## What This README Covers

- Background on binary, hexadecimal, ASCII text, and RGB color
- How hex color codes in CSS map to RGB channels
- The eight conversion functions you will implement
- How to test your code and run the demo
- Extension challenges, reflection questions, a code review checklist, and troubleshooting

## Background: Why Binary?

Computer hardware is built from circuits that are either on or off. That physical reality means every piece of information must ultimately be represented using only two states: 0 and 1. A single such digit is called a **bit**. Eight bits together form a **byte**, which can represent 256 different values (2^8 = 256).

### Counting in Binary

In decimal, each position is worth ten times the position to its right (ones, tens, hundreds, and so on). In binary, each position is worth **two times** the position to its right:

```
Decimal 42:
  4  *  10  =  40
  2  *   1  =   2
             ----
             42

Binary 101010:
  1  *  32  =  32
  0  *  16  =   0
  1  *   8  =   8
  0  *   4  =   0
  1  *   2  =   2
  0  *   1  =   0
             ----
             42
```

## Background: Hexadecimal

Binary is exact but tedious to read. The number 255 in binary is `11111111`, eight digits. Hexadecimal (base 16) is a convenient shorthand: every group of four binary digits maps to exactly one hex digit.

```
Binary:  1111 1111
Hex:       F    F
Decimal:       255
```

Hex uses the digits 0-9 and the letters A-F:

| Decimal | Binary | Hex |
|---------|--------|-----|
| 0       | 0000   | 0   |
| 9       | 1001   | 9   |
| 10      | 1010   | A   |
| 15      | 1111   | F   |
| 16      | 0001 0000 | 10 |
| 255     | 1111 1111 | FF |

## Background: Text and ASCII

Computers store text by mapping each character to a number. The most common mapping for standard English characters is ASCII (American Standard Code for Information Interchange), which assigns a value from 0 to 127 to each letter, digit, and punctuation mark.

```
Character   Decimal   Binary      Hex
    A          65      01000001    41
    B          66      01000010    42
    a          97      01100001    61
    0          48      00110000    30
    space      32      00100000    20
```

When your program saves the word `"Hello"`, it actually saves the five numbers `[72, 101, 108, 108, 111]`. Fonts, layout, and rendering are handled by other layers of software on top of that.

## Background: Images and RGB Color

A digital image is a rectangular grid of **pixels**. Each pixel stores one color, and each color is represented as three numbers: the intensity of red, green, and blue light, each on a scale from 0 to 255.

```
(255, 0,   0)   -> pure red
(0,   255, 0)   -> pure green
(0,   0,   255) -> pure blue
(255, 255, 0)   -> yellow (red + green)
(0,   0,   0)   -> black
(255, 255, 255) -> white
```

### How Much Space Does an Image Take?

A 1920x1080 (Full HD) photo with no compression:

```
1920 pixels wide
x 1080 pixels tall
= 2,073,600 pixels

x 3 bytes per pixel (R, G, B)
= 6,220,800 bytes
= about 6 MB
```

That is why image formats such as JPEG and PNG use compression algorithms to reduce file size.

### Hex Color Codes

Web designers write colors as hex strings rather than three separate numbers. You have almost certainly seen these in CSS:

```css
color: #FF0000;    /* red */
background: #FFA500;  /* orange */
border: #800080;   /* purple */
```

The format is `#RRGGBB`, where RR, GG, and BB are each one byte (0-255) written as two hex digits. Your `rgb_to_hex()` and `hex_to_rgb()` functions implement this conversion.

## Your Tasks

Open `main.py` and complete these functions in order.

### TODO #1: `decimal_to_binary(n)`

Convert a non-negative integer to a binary string.

**Hints:**

- Repeatedly divide by 2 and collect the remainders.
- Remainders read in reverse order give the binary digits.
- Handle `n == 0` separately (the loop never runs, but the answer is `"0"`).

### TODO #2: `binary_to_decimal(b)`

Convert a binary string to an integer.

**Hints:**

- Each position represents a power of 2.
- The rightmost digit is 2^0, the next is 2^1, and so on.

### TODO #3: `decimal_to_hex(n)`

Convert a non-negative integer to an uppercase hex string.

**Hints:**

- Same approach as binary, but divide by 16.
- Remainders 10-15 map to letters A-F.

### TODO #4: `hex_to_decimal(h)`

Convert a hex string to an integer.

**Hints:**

- Same approach as binary-to-decimal, but each position is a power of 16.
- Convert to uppercase first so the lookup table only needs one case.

### TODO #5: `text_to_ascii(text)`

Convert a string to a list of ASCII code integers.

**Hints:**

- Python's built-in `ord()` returns the code for a single character.

### TODO #6: `ascii_to_text(codes)`

Convert a list of ASCII codes back to a string.

**Hints:**

- Python's built-in `chr()` is the inverse of `ord()`.
- Build the characters and then join them.

### TODO #7: `rgb_to_hex(r, g, b)`

Convert RGB values to a hex color string such as `"#FFA500"`.

**Hints:**

- Use your `decimal_to_hex()` on each channel.
- Each channel needs exactly 2 hex digits, so zero-pad single-digit values.

### TODO #8: `hex_to_rgb(hex_color)`

Convert a hex color string to an `(r, g, b)` tuple.

**Hints:**

- Strip the leading `#` if it is present.
- Split the 6-character string into three 2-character chunks.
- Use your `hex_to_decimal()` on each chunk.

## Testing Your Implementation

```bash
python test_encoding.py
```

The test suite checks each function against several inputs, including edge cases (zero, single characters, all-black and all-white pixels) and round-trips (convert to binary and back, convert to hex and back). Aim for all tests to pass before running the full demo.

## Running the Demo

Once all tests pass:

```bash
pip install -r requirements.txt
python main.py
```

You will see:

- Binary and decimal conversions for several numbers
- Hexadecimal conversions
- A message encoded as ASCII codes and binary
- Color swatches printed in the terminal using ANSI escape codes
- A 4x4 pixel "image" displayed in the terminal
- A breakdown of the pixel data

## Extension Challenges

### Easy: Secret Message Encoder

Write a function that takes a string and returns a space-separated string of ASCII codes, plus a decoder that reverses it.

```python
encode("Hi") -> "72 105"
decode("72 105") -> "Hi"
```

Try encoding a message, swapping with a classmate, and decoding theirs.

### Medium: Run-Length Encoding

Run-length encoding (RLE) is one of the simplest compression schemes. Consecutive repeated characters are stored as a count followed by the character:

```
"AAABBBCC" -> "3A3B2C"
"ABCD"     -> "1A1B1C1D"  (no savings here)
```

Implement `rle_encode(s)` and `rle_decode(s)`. Test it on strings with long runs of repeated characters, such as binary strings with many zeros.

### Hard: Image from a Text File

Create a small "image file" format. Write a text file in which each line contains comma-separated RGB values:

```
0,0,0,255,255,0,0,0
255,255,0,0,0,255,255,0
```

Write a function that reads this file, parses the pixel data, and passes it to `display_image()`. Experiment with different patterns and resolutions.

## Reflection Questions

1. Why do computers use binary instead of decimal internally?
2. A single byte can store values from 0 to 255. Why exactly 255, and not 256 or 260?
3. Each pixel stores 3 bytes (R, G, B). How many different colors can a single pixel represent?
4. If a classmate sends you the hex color `#1A2B3C`, can you decode the R, G, and B values by hand without a computer?
5. Why does a JPEG photo of your bedroom take far less than 6 MB, even though the sensor captures 1920x1080 pixels?

## Code Review Checklist

Before submitting:

- [ ] All tests pass (`python test_encoding.py`)
- [ ] The demo runs without errors (`python main.py`)
- [ ] No built-in conversion functions used (`bin()`, `hex()`, `int(..., base)`)
- [ ] All functions handle the zero or empty-input edge cases
- [ ] Code is readable, with clear variable names
- [ ] You can explain each algorithm in plain English

## Troubleshooting

### `decimal_to_binary` Returns Wrong Digits

- Check that you are collecting remainders from the division, not the quotient.
- Make sure you reverse the collected digits before joining them.

### `decimal_to_hex` Returns Lowercase Letters

- Verify that `HEX_DIGITS` contains uppercase letters and that you index into it using the remainder.

### `rgb_to_hex` Produces Strings Like `"#F0F"` Instead of `"#0F00FF"`

- Each channel must be exactly 2 digits. Zero-pad with `zfill(2)` or check the length manually.

### The Image Does Not Display Colors

- ANSI color codes require a terminal that supports them. The Linux containers in 3Compute support this. On Windows, results may vary.

### Round-Trip Tests Fail Even Though Individual Tests Pass

- Make sure both directions of the conversion use the same format conventions (uppercase hex, no prefixes).
