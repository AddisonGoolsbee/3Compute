"""
Data Encoding: Binary, Hex, and Color
======================================

Every piece of data a computer stores (a letter, a number, an image) is
ultimately represented as binary: sequences of 0s and 1s. In this project,
you'll implement the conversion functions that sit at that foundation.

YOUR TASKS:
1. decimal_to_binary(n)  - Convert an integer to a binary string
2. binary_to_decimal(b)  - Convert a binary string back to an integer
3. decimal_to_hex(n)     - Convert an integer to a hexadecimal string
4. hex_to_decimal(h)     - Convert a hex string to an integer
5. text_to_ascii(text)   - Convert a string to a list of ASCII codes
6. ascii_to_text(codes)  - Convert ASCII codes back to a string
7. rgb_to_hex(r, g, b)   - Convert an RGB color to a hex color code
8. hex_to_rgb(hex_color) - Convert a hex color code to an RGB tuple

Run the tests to check your work: python test_encoding.py
"""

# =============================================================================
# PIXEL DATA (PROVIDED)
# A 4x4 "image" stored as a list of (R, G, B) tuples.
# Reading left-to-right, top-to-bottom: it's a tiny smiley face.
# =============================================================================

PIXEL_COLORS = [
    (0,   0,   0),   (0,   0,   0),   (0,   0,   0),   (0,   0,   0),
    (0,   0,   0),   (255, 255,  0),  (255, 255,  0),  (0,   0,   0),
    (255, 255,  0),  (0,   0,   0),   (0,   0,   0),   (255, 255,  0),
    (0,   0,   0),   (255, 255,  0),  (255, 255,  0),  (0,   0,   0),
]

IMAGE_WIDTH = 4


# =============================================================================
# DISPLAY FUNCTIONS (PROVIDED)
# =============================================================================

def display_image(pixels, width):
    """
    Print a pixel image in the terminal using ANSI background color codes.
    Each pixel is rendered as two space characters with the pixel's background color.

    Args:
        pixels: A list of (R, G, B) tuples
        width:  Number of pixels per row
    """
    for i, (r, g, b) in enumerate(pixels):
        # Set background color using ANSI true-color escape code, print two spaces
        print(f"\033[48;2;{r};{g};{b}m  \033[0m", end="")
        if (i + 1) % width == 0:
            print()  # Newline at the end of each row
    print()


def explore_pixel(r, g, b):
    """
    Print all representations of a single RGB color.
    Calls your implemented functions. Implement them first!
    """
    print(f"  RGB values   : ({r}, {g}, {b})")
    print(f"  Red channel  : {r}  ->  binary {decimal_to_binary(r)}  ->  hex {decimal_to_hex(r)}")
    print(f"  Green channel: {g}  ->  binary {decimal_to_binary(g)}  ->  hex {decimal_to_hex(g)}")
    print(f"  Blue channel : {b}  ->  binary {decimal_to_binary(b)}  ->  hex {decimal_to_hex(b)}")
    print(f"  Hex color    : {rgb_to_hex(r, g, b)}")


# =============================================================================
# TODO #1: DECIMAL TO BINARY
# =============================================================================

def decimal_to_binary(n):
    """
    Convert a non-negative integer to its binary string representation.
    Do NOT use Python's built-in bin() function.

    Args:
        n: A non-negative integer

    Returns:
        A string of '0' and '1' characters, with no '0b' prefix.
        decimal_to_binary(10) -> "1010"
        decimal_to_binary(0)  -> "0"

    HINT: Repeatedly divide n by 2 and collect the remainders.
          The remainders, read in reverse order, give you the binary digits.
          Example: 10 // 2 = 5 remainder 0
                    5 // 2 = 2 remainder 1
                    2 // 2 = 1 remainder 0
                    1 // 2 = 0 remainder 1
          Remainders in reverse: 1 0 1 0 -> "1010"

    HINT: Handle n == 0 as a special case. The loop never runs, but the
          answer is still "0".
    """
    # TODO: Implement this function

    pass  # Remove this line when you implement the function


# =============================================================================
# TODO #2: BINARY TO DECIMAL
# =============================================================================

def binary_to_decimal(b):
    """
    Convert a binary string to an integer.
    Do NOT use Python's built-in int(b, 2).

    Args:
        b: A string containing only '0' and '1' characters

    Returns:
        The integer value represented by the binary string.
        binary_to_decimal("1010") -> 10
        binary_to_decimal("1111") -> 15

    HINT: Each digit position represents a power of 2.
          The rightmost digit is 2^0, the next is 2^1, etc.
          Example: "1010"
            position 3: 1 * 2^3 = 8
            position 2: 0 * 2^2 = 0
            position 1: 1 * 2^1 = 2
            position 0: 0 * 2^0 = 0
            total = 10

    HINT: You can iterate through b with enumerate(), or process the string
          right-to-left using a range.
    """
    # TODO: Implement this function

    pass  # Remove this line when you implement the function


# =============================================================================
# TODO #3: DECIMAL TO HEXADECIMAL
# =============================================================================

def decimal_to_hex(n):
    """
    Convert a non-negative integer to its uppercase hexadecimal string.
    Do NOT use Python's built-in hex() function.

    Args:
        n: A non-negative integer

    Returns:
        An uppercase hex string with no '0x' prefix.
        decimal_to_hex(255) -> "FF"
        decimal_to_hex(16)  -> "10"
        decimal_to_hex(0)   -> "0"

    HINT: Hexadecimal works just like binary-to-decimal conversion, but you
          divide by 16 instead of 2. Remainders 0-9 map to '0'-'9', and
          remainders 10-15 map to 'A'-'F'.

    HINT: HEX_DIGITS below maps each remainder to its hex character.
    """
    HEX_DIGITS = "0123456789ABCDEF"

    # TODO: Implement this function

    pass  # Remove this line when you implement the function


# =============================================================================
# TODO #4: HEXADECIMAL TO DECIMAL
# =============================================================================

def hex_to_decimal(h):
    """
    Convert a hexadecimal string to an integer.
    Do NOT use Python's built-in int(h, 16).

    Args:
        h: A hex string (upper or lowercase), no '0x' prefix.

    Returns:
        The integer value.
        hex_to_decimal("FF")  -> 255
        hex_to_decimal("ff")  -> 255
        hex_to_decimal("10")  -> 16

    HINT: Convert h to uppercase first so you only need one lookup table.
          Then process the same way as binary_to_decimal, but each position
          is a power of 16, and digit values come from the lookup table.

    HINT: HEX_VALUES below maps each hex character to its integer value.
    """
    HEX_VALUES = {c: i for i, c in enumerate("0123456789ABCDEF")}

    # TODO: Implement this function

    pass  # Remove this line when you implement the function


# =============================================================================
# TODO #5: TEXT TO ASCII
# =============================================================================

def text_to_ascii(text):
    """
    Convert a string to a list of ASCII (Unicode code point) integers.

    Args:
        text: Any string

    Returns:
        A list of integers, one per character.
        text_to_ascii("Hi")  -> [72, 105]
        text_to_ascii("A")   -> [65]

    HINT: Python's built-in ord() returns the code point for a single character.
          ord('A') -> 65
    """
    # TODO: Implement this function

    pass  # Remove this line when you implement the function


# =============================================================================
# TODO #6: ASCII TO TEXT
# =============================================================================

def ascii_to_text(codes):
    """
    Convert a list of ASCII (Unicode code point) integers back to a string.

    Args:
        codes: A list of integers

    Returns:
        The string formed by joining the characters for each code.
        ascii_to_text([72, 105]) -> "Hi"
        ascii_to_text([65])      -> "A"

    HINT: Python's built-in chr() is the inverse of ord().
          chr(65) -> 'A'
    """
    # TODO: Implement this function

    pass  # Remove this line when you implement the function


# =============================================================================
# TODO #7: RGB TO HEX COLOR
# =============================================================================

def rgb_to_hex(r, g, b):
    """
    Convert red, green, and blue channel values to a CSS hex color string.

    Args:
        r, g, b: Integers in the range 0-255

    Returns:
        A string in the format "#RRGGBB" (uppercase).
        rgb_to_hex(255, 165, 0)   -> "#FFA500"
        rgb_to_hex(0, 0, 0)       -> "#000000"
        rgb_to_hex(255, 255, 255) -> "#FFFFFF"

    HINT: Use your decimal_to_hex() function on each channel.
          Each channel must be exactly 2 hex digits, so pad with a leading
          zero when necessary. "F" -> "0F", "FF" stays "FF".
    """
    # TODO: Implement this function

    pass  # Remove this line when you implement the function


# =============================================================================
# TODO #8: HEX COLOR TO RGB
# =============================================================================

def hex_to_rgb(hex_color):
    """
    Convert a CSS hex color string to an (R, G, B) tuple.

    Args:
        hex_color: A string in "#RRGGBB" or "RRGGBB" format (upper or lowercase)

    Returns:
        A tuple of three integers (r, g, b), each in the range 0-255.
        hex_to_rgb("#FFA500") -> (255, 165, 0)
        hex_to_rgb("000000")  -> (0, 0, 0)
        hex_to_rgb("#ffffff") -> (255, 255, 255)

    HINT: Strip the leading '#' if present, then split the 6-character string
          into three 2-character chunks: [0:2], [2:4], [4:6].
          Use your hex_to_decimal() function on each chunk.
    """
    # TODO: Implement this function

    pass  # Remove this line when you implement the function


# =============================================================================
# MAIN DEMO (PROVIDED)
# =============================================================================

def main():
    print("=" * 50)
    print("   DATA ENCODING EXPLORER")
    print("=" * 50)

    # --- Binary and decimal ---
    print("\n--- Binary and Decimal ---")
    for n in [0, 1, 10, 42, 255]:
        b = decimal_to_binary(n)
        back = binary_to_decimal(b)
        print(f"  {n:>3}  ->  binary {b:<8}  ->  back to decimal {back}")

    # --- Hexadecimal ---
    print("\n--- Hexadecimal ---")
    for n in [0, 15, 16, 255, 4096]:
        h = decimal_to_hex(n)
        back = hex_to_decimal(h)
        print(f"  {n:>4}  ->  hex {h:<5}  ->  back to decimal {back}")

    # --- Text and ASCII ---
    print("\n--- Text and ASCII ---")
    message = "Hello"
    codes = text_to_ascii(message)
    recovered = ascii_to_text(codes)
    print(f"  Text   : {message!r}")
    print(f"  Codes  : {codes}")
    print(f"  Binary : {[decimal_to_binary(c) for c in codes]}")
    print(f"  Recovered: {recovered!r}")

    # --- Colors ---
    print("\n--- RGB Color Encoding ---")
    sample_colors = [
        (255, 0,   0,   "Red"),
        (0,   255, 0,   "Green"),
        (0,   0,   255, "Blue"),
        (255, 165, 0,   "Orange"),
        (128, 0,   128, "Purple"),
    ]
    for r, g, b, name in sample_colors:
        hex_color = rgb_to_hex(r, g, b)
        back = hex_to_rgb(hex_color)
        swatch = f"\033[48;2;{r};{g};{b}m    \033[0m"
        print(f"  {swatch}  {name:<8}  rgb({r:>3},{g:>3},{b:>3})  ->  {hex_color}  ->  {back}")

    # --- Image display ---
    print("\n--- Pixel Image (4x4 smiley) ---")
    display_image(PIXEL_COLORS, IMAGE_WIDTH)

    print("--- Exploring the smiley's yellow pixel ---")
    yellow = PIXEL_COLORS[5]
    explore_pixel(*yellow)

    print("\n--- Exploring the smiley's black pixel ---")
    black = PIXEL_COLORS[0]
    explore_pixel(*black)

    # --- Fun: encode a secret message ---
    print("\n--- Secret Message ---")
    secret = "CS rocks"
    encoded = text_to_ascii(secret)
    as_hex = [decimal_to_hex(c) for c in encoded]
    print(f"  Original : {secret!r}")
    print(f"  As codes : {encoded}")
    print(f"  As hex   : {as_hex}")
    print(f"  Decoded  : {ascii_to_text(encoded)!r}")


if __name__ == "__main__":
    # Check whether any functions are still unimplemented
    unimplemented = []
    try:
        result = decimal_to_binary(1)
        if result is None:
            unimplemented.append("decimal_to_binary")
    except Exception:
        unimplemented.append("decimal_to_binary")

    try:
        result = binary_to_decimal("1")
        if result is None:
            unimplemented.append("binary_to_decimal")
    except Exception:
        unimplemented.append("binary_to_decimal")

    try:
        result = decimal_to_hex(1)
        if result is None:
            unimplemented.append("decimal_to_hex")
    except Exception:
        unimplemented.append("decimal_to_hex")

    try:
        result = hex_to_decimal("1")
        if result is None:
            unimplemented.append("hex_to_decimal")
    except Exception:
        unimplemented.append("hex_to_decimal")

    try:
        result = text_to_ascii("A")
        if result is None:
            unimplemented.append("text_to_ascii")
    except Exception:
        unimplemented.append("text_to_ascii")

    try:
        result = ascii_to_text([65])
        if result is None:
            unimplemented.append("ascii_to_text")
    except Exception:
        unimplemented.append("ascii_to_text")

    try:
        result = rgb_to_hex(0, 0, 0)
        if result is None:
            unimplemented.append("rgb_to_hex")
    except Exception:
        unimplemented.append("rgb_to_hex")

    try:
        result = hex_to_rgb("000000")
        if result is None:
            unimplemented.append("hex_to_rgb")
    except Exception:
        unimplemented.append("hex_to_rgb")

    if unimplemented:
        print("It looks like these functions are not yet implemented:")
        for name in unimplemented:
            print(f"  - {name}()")
        print("\nOpen main.py and complete the TODO sections.")
        print("Run 'python test_encoding.py' to test your work.")
    else:
        main()
