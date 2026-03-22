"""
Data Encoding: Reference Solution
===================================
INSTRUCTOR USE ONLY. Do not distribute to students.

This file contains complete, correct implementations of every function
in main.py. The code intentionally avoids Python's built-in conversion
functions (bin(), hex(), int(..., base)) so that the implementations
model the manual algorithms students are expected to learn.
"""

# =============================================================================
# PIXEL DATA (mirrors main.py)
# =============================================================================

PIXEL_COLORS = [
    (0,   0,   0),   (0,   0,   0),   (0,   0,   0),   (0,   0,   0),
    (0,   0,   0),   (255, 255,  0),  (255, 255,  0),  (0,   0,   0),
    (255, 255,  0),  (0,   0,   0),   (0,   0,   0),   (255, 255,  0),
    (0,   0,   0),   (255, 255,  0),  (255, 255,  0),  (0,   0,   0),
]

IMAGE_WIDTH = 4


# =============================================================================
# PROVIDED FUNCTIONS (mirrors main.py)
# =============================================================================

def display_image(pixels, width):
    for i, (r, g, b) in enumerate(pixels):
        print(f"\033[48;2;{r};{g};{b}m  \033[0m", end="")
        if (i + 1) % width == 0:
            print()
    print()


def explore_pixel(r, g, b):
    print(f"  RGB values   : ({r}, {g}, {b})")
    print(f"  Red channel  : {r}  ->  binary {decimal_to_binary(r)}  ->  hex {decimal_to_hex(r)}")
    print(f"  Green channel: {g}  ->  binary {decimal_to_binary(g)}  ->  hex {decimal_to_hex(g)}")
    print(f"  Blue channel : {b}  ->  binary {decimal_to_binary(b)}  ->  hex {decimal_to_hex(b)}")
    print(f"  Hex color    : {rgb_to_hex(r, g, b)}")


# =============================================================================
# SOLUTION: decimal_to_binary
# =============================================================================

def decimal_to_binary(n):
    """
    Algorithm: repeated division by 2.
    Collect remainders (each is 0 or 1), then reverse.
    """
    if n == 0:
        return "0"

    digits = []
    while n > 0:
        digits.append(str(n % 2))
        n = n // 2

    return "".join(reversed(digits))


# =============================================================================
# SOLUTION: binary_to_decimal
# =============================================================================

def binary_to_decimal(b):
    """
    Algorithm: positional value expansion.
    Process left-to-right, shifting the accumulated total left one bit at each step.
    This avoids needing to know the total length in advance.
    """
    result = 0
    for char in b:
        result = result * 2 + int(char)
    return result


# =============================================================================
# SOLUTION: decimal_to_hex
# =============================================================================

def decimal_to_hex(n):
    """
    Algorithm: repeated division by 16.
    Identical structure to decimal_to_binary but base 16.
    """
    HEX_DIGITS = "0123456789ABCDEF"

    if n == 0:
        return "0"

    digits = []
    while n > 0:
        digits.append(HEX_DIGITS[n % 16])
        n = n // 16

    return "".join(reversed(digits))


# =============================================================================
# SOLUTION: hex_to_decimal
# =============================================================================

def hex_to_decimal(h):
    """
    Algorithm: positional value expansion in base 16.
    Same pattern as binary_to_decimal but each digit contributes its value
    times the appropriate power of 16.
    """
    HEX_VALUES = {c: i for i, c in enumerate("0123456789ABCDEF")}

    result = 0
    for char in h.upper():
        result = result * 16 + HEX_VALUES[char]
    return result


# =============================================================================
# SOLUTION: text_to_ascii
# =============================================================================

def text_to_ascii(text):
    """ord() returns the Unicode code point (ASCII for standard characters)."""
    return [ord(c) for c in text]


# =============================================================================
# SOLUTION: ascii_to_text
# =============================================================================

def ascii_to_text(codes):
    """chr() is the inverse of ord()."""
    return "".join(chr(code) for code in codes)


# =============================================================================
# SOLUTION: rgb_to_hex
# =============================================================================

def rgb_to_hex(r, g, b):
    """
    Convert each channel with decimal_to_hex, then zero-pad to 2 digits.
    The zfill(2) call ensures values like 1 become "01" rather than "1".
    """
    rr = decimal_to_hex(r).zfill(2)
    gg = decimal_to_hex(g).zfill(2)
    bb = decimal_to_hex(b).zfill(2)
    return f"#{rr}{gg}{bb}"


# =============================================================================
# SOLUTION: hex_to_rgb
# =============================================================================

def hex_to_rgb(hex_color):
    """
    Strip the leading '#' if present, then decode three 2-character hex chunks.
    """
    # Remove optional '#' prefix
    h = hex_color.lstrip("#")

    r = hex_to_decimal(h[0:2])
    g = hex_to_decimal(h[2:4])
    b = hex_to_decimal(h[4:6])

    return (r, g, b)


# =============================================================================
# QUICK SELF-TEST
# Run this file directly to confirm the solution is correct.
# =============================================================================

if __name__ == "__main__":
    errors = []

    def assert_eq(label, got, expected):
        if got != expected:
            errors.append(f"FAIL {label}: got {got!r}, expected {expected!r}")

    # decimal_to_binary
    assert_eq("d2b(0)",   decimal_to_binary(0),   "0")
    assert_eq("d2b(10)",  decimal_to_binary(10),  "1010")
    assert_eq("d2b(255)", decimal_to_binary(255), "11111111")

    # binary_to_decimal
    assert_eq("b2d('0')",        binary_to_decimal("0"),        0)
    assert_eq("b2d('1010')",     binary_to_decimal("1010"),     10)
    assert_eq("b2d('11111111')", binary_to_decimal("11111111"), 255)

    # decimal_to_hex
    assert_eq("d2h(0)",   decimal_to_hex(0),   "0")
    assert_eq("d2h(255)", decimal_to_hex(255), "FF")
    assert_eq("d2h(16)",  decimal_to_hex(16),  "10")

    # hex_to_decimal
    assert_eq("h2d('FF')", hex_to_decimal("FF"), 255)
    assert_eq("h2d('ff')", hex_to_decimal("ff"), 255)
    assert_eq("h2d('10')", hex_to_decimal("10"), 16)

    # text_to_ascii / ascii_to_text
    assert_eq("t2a('Hi')",    text_to_ascii("Hi"),    [72, 105])
    assert_eq("a2t([72,105])", ascii_to_text([72, 105]), "Hi")
    assert_eq("round-trip text", ascii_to_text(text_to_ascii("Hello")), "Hello")

    # rgb_to_hex
    assert_eq("r2h(255,165,0)", rgb_to_hex(255, 165, 0), "#FFA500")
    assert_eq("r2h(0,0,0)",     rgb_to_hex(0, 0, 0),     "#000000")
    assert_eq("r2h(1,2,3)",     rgb_to_hex(1, 2, 3),     "#010203")

    # hex_to_rgb
    assert_eq("h2r('#FFA500')", hex_to_rgb("#FFA500"), (255, 165, 0))
    assert_eq("h2r('FFA500')",  hex_to_rgb("FFA500"),  (255, 165, 0))
    assert_eq("h2r('#ffa500')", hex_to_rgb("#ffa500"), (255, 165, 0))
    assert_eq("h2r('#010203')", hex_to_rgb("#010203"), (1, 2, 3))

    # round-trips
    for n in [0, 1, 42, 255]:
        assert_eq(f"rt_bin({n})", binary_to_decimal(decimal_to_binary(n)), n)
        assert_eq(f"rt_hex({n})", hex_to_decimal(decimal_to_hex(n)), n)
    for color in [(0,0,0), (255,255,255), (255,165,0)]:
        assert_eq(f"rt_rgb{color}", hex_to_rgb(rgb_to_hex(*color)), color)

    if errors:
        print("Solution self-test FAILED:")
        for e in errors:
            print(" ", e)
    else:
        print("All solution self-tests passed.")
        print()
        print("--- Demo output ---")
        display_image(PIXEL_COLORS, IMAGE_WIDTH)
        explore_pixel(255, 255, 0)
