"""
Test suite for Data Encoding project.
Run with: python test_encoding.py
"""

EXPECTED_TOTAL = 78  # total number of checks in this file

import atexit, os
passed = 0
failed = 0
if os.environ.get("TCOMPUTE_SCORE"):
    atexit.register(lambda: print(f"{passed}/{EXPECTED_TOTAL}"))

import sys

from main import (
    decimal_to_binary,
    binary_to_decimal,
    decimal_to_hex,
    hex_to_decimal,
    text_to_ascii,
    ascii_to_text,
    rgb_to_hex,
    hex_to_rgb,
)


def check(description, got, expected):
    global passed, failed
    if got == expected:
        print(f"  PASS  {description}")
        passed += 1
    else:
        print(f"  FAIL  {description}")
        print(f"          expected: {expected!r}")
        print(f"          got:      {got!r}")
        failed += 1


# =============================================================================
# decimal_to_binary
# =============================================================================

print("\n--- decimal_to_binary ---")
check("decimal_to_binary(0)   == '0'",     decimal_to_binary(0),   "0")
check("decimal_to_binary(1)   == '1'",     decimal_to_binary(1),   "1")
check("decimal_to_binary(2)   == '10'",    decimal_to_binary(2),   "10")
check("decimal_to_binary(10)  == '1010'",  decimal_to_binary(10),  "1010")
check("decimal_to_binary(42)  == '101010'",decimal_to_binary(42),  "101010")
check("decimal_to_binary(255) == '11111111'", decimal_to_binary(255), "11111111")
check("decimal_to_binary(256) == '100000000'", decimal_to_binary(256), "100000000")

# =============================================================================
# binary_to_decimal
# =============================================================================

print("\n--- binary_to_decimal ---")
check("binary_to_decimal('0')        == 0",   binary_to_decimal("0"),        0)
check("binary_to_decimal('1')        == 1",   binary_to_decimal("1"),        1)
check("binary_to_decimal('10')       == 2",   binary_to_decimal("10"),       2)
check("binary_to_decimal('1010')     == 10",  binary_to_decimal("1010"),     10)
check("binary_to_decimal('101010')   == 42",  binary_to_decimal("101010"),   42)
check("binary_to_decimal('11111111') == 255", binary_to_decimal("11111111"), 255)

# =============================================================================
# Round-trip: decimal -> binary -> decimal
# =============================================================================

print("\n--- Round-trip: decimal -> binary -> decimal ---")
for n in [0, 1, 7, 64, 128, 200, 255]:
    result = binary_to_decimal(decimal_to_binary(n))
    check(f"round-trip({n}) == {n}", result, n)

# =============================================================================
# decimal_to_hex
# =============================================================================

print("\n--- decimal_to_hex ---")
check("decimal_to_hex(0)    == '0'",  decimal_to_hex(0),    "0")
check("decimal_to_hex(10)   == 'A'",  decimal_to_hex(10),   "A")
check("decimal_to_hex(15)   == 'F'",  decimal_to_hex(15),   "F")
check("decimal_to_hex(16)   == '10'", decimal_to_hex(16),   "10")
check("decimal_to_hex(255)  == 'FF'", decimal_to_hex(255),  "FF")
check("decimal_to_hex(256)  == '100'",decimal_to_hex(256),  "100")
check("decimal_to_hex(4096) == '1000'", decimal_to_hex(4096), "1000")

# =============================================================================
# hex_to_decimal
# =============================================================================

print("\n--- hex_to_decimal ---")
check("hex_to_decimal('0')    == 0",   hex_to_decimal("0"),    0)
check("hex_to_decimal('A')    == 10",  hex_to_decimal("A"),    10)
check("hex_to_decimal('a')    == 10",  hex_to_decimal("a"),    10)
check("hex_to_decimal('F')    == 15",  hex_to_decimal("F"),    15)
check("hex_to_decimal('10')   == 16",  hex_to_decimal("10"),   16)
check("hex_to_decimal('FF')   == 255", hex_to_decimal("FF"),   255)
check("hex_to_decimal('ff')   == 255", hex_to_decimal("ff"),   255)
check("hex_to_decimal('1000') == 4096",hex_to_decimal("1000"), 4096)

# =============================================================================
# Round-trip: decimal -> hex -> decimal
# =============================================================================

print("\n--- Round-trip: decimal -> hex -> decimal ---")
for n in [0, 1, 10, 15, 16, 100, 255, 4095]:
    result = hex_to_decimal(decimal_to_hex(n))
    check(f"round-trip({n}) == {n}", result, n)

# =============================================================================
# text_to_ascii
# =============================================================================

print("\n--- text_to_ascii ---")
check("text_to_ascii('A')    == [65]",         text_to_ascii("A"),    [65])
check("text_to_ascii('a')    == [97]",         text_to_ascii("a"),    [97])
check("text_to_ascii(' ')    == [32]",         text_to_ascii(" "),    [32])
check("text_to_ascii('Hi')   == [72, 105]",    text_to_ascii("Hi"),   [72, 105])
check("text_to_ascii('ABC')  == [65, 66, 67]", text_to_ascii("ABC"),  [65, 66, 67])
check("text_to_ascii('')     == []",           text_to_ascii(""),     [])

# =============================================================================
# ascii_to_text
# =============================================================================

print("\n--- ascii_to_text ---")
check("ascii_to_text([65])         == 'A'",   ascii_to_text([65]),         "A")
check("ascii_to_text([72, 105])    == 'Hi'",  ascii_to_text([72, 105]),    "Hi")
check("ascii_to_text([65, 66, 67]) == 'ABC'", ascii_to_text([65, 66, 67]), "ABC")
check("ascii_to_text([])           == ''",    ascii_to_text([]),           "")

# =============================================================================
# Round-trip: text -> ascii -> text
# =============================================================================

print("\n--- Round-trip: text -> ascii -> text ---")
for s in ["Hello", "CS rocks", "3Compute", "!@#"]:
    result = ascii_to_text(text_to_ascii(s))
    check(f"round-trip({s!r}) == {s!r}", result, s)

# =============================================================================
# rgb_to_hex
# =============================================================================

print("\n--- rgb_to_hex ---")
check("rgb_to_hex(0,   0,   0)   == '#000000'", rgb_to_hex(0,   0,   0),   "#000000")
check("rgb_to_hex(255, 255, 255) == '#FFFFFF'", rgb_to_hex(255, 255, 255), "#FFFFFF")
check("rgb_to_hex(255, 0,   0)   == '#FF0000'", rgb_to_hex(255, 0,   0),   "#FF0000")
check("rgb_to_hex(0,   255, 0)   == '#00FF00'", rgb_to_hex(0,   255, 0),   "#00FF00")
check("rgb_to_hex(0,   0,   255) == '#0000FF'", rgb_to_hex(0,   0,   255), "#0000FF")
check("rgb_to_hex(255, 165, 0)   == '#FFA500'", rgb_to_hex(255, 165, 0),   "#FFA500")
check("rgb_to_hex(128, 0,   128) == '#800080'", rgb_to_hex(128, 0,   128), "#800080")
# Single-digit hex values must be zero-padded
check("rgb_to_hex(1,   2,   3)   == '#010203'", rgb_to_hex(1,   2,   3),   "#010203")

# =============================================================================
# hex_to_rgb
# =============================================================================

print("\n--- hex_to_rgb ---")
check("hex_to_rgb('#000000')  == (0,   0,   0)",   hex_to_rgb("#000000"),  (0,   0,   0))
check("hex_to_rgb('#FFFFFF')  == (255, 255, 255)",  hex_to_rgb("#FFFFFF"),  (255, 255, 255))
check("hex_to_rgb('#FF0000')  == (255, 0,   0)",    hex_to_rgb("#FF0000"),  (255, 0,   0))
check("hex_to_rgb('#FFA500')  == (255, 165, 0)",    hex_to_rgb("#FFA500"),  (255, 165, 0))
check("hex_to_rgb('FFA500')   == (255, 165, 0) [no #]", hex_to_rgb("FFA500"),  (255, 165, 0))
check("hex_to_rgb('#ffa500')  == (255, 165, 0) [lowercase]", hex_to_rgb("#ffa500"), (255, 165, 0))
check("hex_to_rgb('#800080')  == (128, 0,   128)",  hex_to_rgb("#800080"),  (128, 0,   128))
check("hex_to_rgb('#010203')  == (1,   2,   3)",    hex_to_rgb("#010203"),  (1,   2,   3))

# =============================================================================
# Round-trip: rgb -> hex -> rgb
# =============================================================================

print("\n--- Round-trip: rgb -> hex -> rgb ---")
for color in [(0, 0, 0), (255, 255, 255), (255, 165, 0), (128, 0, 128), (1, 2, 3)]:
    result = hex_to_rgb(rgb_to_hex(*color))
    check(f"round-trip{color} == {color}", result, color)

# =============================================================================
# Summary
# =============================================================================

total = passed + failed
print(f"\n{'=' * 50}")
print(f"Results: {passed}/{total} tests passed")
if failed == 0:
    print("All tests passed. Run 'python main.py' to see the full demo.")
else:
    print(f"{failed} test(s) failed. Review the output above for details.")
print("=" * 50)

sys.exit(0 if failed == 0 else 1)
