"""
Weather App: Test Suite
========================

Run these tests to verify your implementations:

    python test_weather.py

Tests marked [LIVE] make real network requests to the Open-Meteo API.
They require an internet connection and may occasionally fail if the
API is temporarily unavailable.

Tests marked [UNIT] run without any network access.
"""

EXPECTED_TOTAL = 3  # total number of checks in this file

import atexit, os
passed = 0
failed = 0
if os.environ.get("TCOMPUTE_SCORE"):
    atexit.register(lambda: print(f"{passed}/{EXPECTED_TOTAL}"))

import sys


def run_test(name, passed, hint=""):
    """Print a single test result."""
    status = "PASS" if passed else "FAIL"
    marker = "[OK]" if passed else "[!!]"
    print(f"  {marker} {name}")
    if not passed and hint:
        print(f"       Hint: {hint}")
    return passed


def section(title):
    print(f"\n{title}")
    print("-" * len(title))


# =============================================================================
# UNIT TESTS: weather_description()
# =============================================================================

def test_weather_description():
    section("Tests for weather_description() [UNIT]")
    from display import weather_description

    results = []

    results.append(run_test(
        "Code 0 returns 'Clear sky'",
        weather_description(0) == "Clear sky",
        "if code == 0: return 'Clear sky'"
    ))
    results.append(run_test(
        "Code 1 returns 'Partly cloudy'",
        weather_description(1) == "Partly cloudy",
        "1, 2, and 3 all map to 'Partly cloudy'"
    ))
    results.append(run_test(
        "Code 3 returns 'Partly cloudy'",
        weather_description(3) == "Partly cloudy",
    ))
    results.append(run_test(
        "Code 45 returns 'Foggy'",
        weather_description(45) == "Foggy",
        "45 and 48 map to 'Foggy'"
    ))
    results.append(run_test(
        "Code 51 returns 'Drizzle'",
        weather_description(51) == "Drizzle",
        "51-55 map to 'Drizzle'"
    ))
    results.append(run_test(
        "Code 56 returns 'Freezing drizzle'",
        weather_description(56) == "Freezing drizzle",
        "56 and 57 map to 'Freezing drizzle'"
    ))
    results.append(run_test(
        "Code 61 returns 'Rain'",
        weather_description(61) == "Rain",
        "61-65 map to 'Rain'"
    ))
    results.append(run_test(
        "Code 66 returns 'Freezing rain'",
        weather_description(66) == "Freezing rain",
        "66 and 67 map to 'Freezing rain'"
    ))
    results.append(run_test(
        "Code 71 returns 'Snow'",
        weather_description(71) == "Snow",
        "71-77 map to 'Snow'"
    ))
    results.append(run_test(
        "Code 80 returns 'Rain showers'",
        weather_description(80) == "Rain showers",
        "80-82 map to 'Rain showers'"
    ))
    results.append(run_test(
        "Code 85 returns 'Snow showers'",
        weather_description(85) == "Snow showers",
        "85 and 86 map to 'Snow showers'"
    ))
    results.append(run_test(
        "Code 95 returns 'Thunderstorm'",
        weather_description(95) == "Thunderstorm",
    ))
    results.append(run_test(
        "Code 99 returns 'Heavy thunderstorm'",
        weather_description(99) == "Heavy thunderstorm",
        "96-99 map to 'Heavy thunderstorm'"
    ))
    results.append(run_test(
        "Unknown code returns 'Unknown'",
        weather_description(999) == "Unknown",
        "The else/default case should return 'Unknown'"
    ))

    return results


# =============================================================================
# LIVE TESTS: get_coordinates()
# =============================================================================

def test_get_coordinates():
    section("Tests for get_coordinates() [LIVE - requires internet]")
    from weather_api import get_coordinates

    results = []

    # Known city should return a valid tuple
    result = get_coordinates("London")
    results.append(run_test(
        "get_coordinates('London') returns a tuple",
        result is not None and isinstance(result, tuple) and len(result) == 3,
        "Should return (latitude, longitude, display_name), not None"
    ))
    if result is not None:
        lat, lon, name = result
        results.append(run_test(
            "Latitude for London is near 51.5",
            abs(lat - 51.5) < 1.0,
            f"Expected ~51.5, got {lat}"
        ))
        results.append(run_test(
            "Longitude for London is near -0.1",
            abs(lon - (-0.1)) < 1.0,
            f"Expected ~-0.1, got {lon}"
        ))
        results.append(run_test(
            "Display name is a non-empty string",
            isinstance(name, str) and len(name) > 0,
            f"Got: {repr(name)}"
        ))

    # Gibberish input should return None
    bad_result = get_coordinates("xyzxyznotacity123")
    results.append(run_test(
        "get_coordinates('xyzxyznotacity123') returns None",
        bad_result is None,
        "Return None when 'results' key is missing or empty in the API response"
    ))

    return results


# =============================================================================
# LIVE TESTS: get_weather()
# =============================================================================

def test_get_weather():
    section("Tests for get_weather() [LIVE - requires internet]")
    from weather_api import get_weather

    results = []

    # London coordinates
    data = get_weather(51.5085, -0.1257)

    results.append(run_test(
        "get_weather() returns a dict",
        data is not None and isinstance(data, dict),
        "Should return the parsed JSON dict, not None"
    ))

    if data is not None:
        results.append(run_test(
            "Response contains 'current' key",
            "current" in data,
            "The API response should have a 'current' section"
        ))
        results.append(run_test(
            "Response contains 'daily' key",
            "daily" in data,
            "The API response should have a 'daily' section"
        ))

        if "current" in data:
            current = data["current"]
            results.append(run_test(
                "'current' has 'temperature_2m'",
                "temperature_2m" in current,
                "Check that 'temperature_2m' is in your 'current' parameter string"
            ))
            results.append(run_test(
                "'current' has 'wind_speed_10m'",
                "wind_speed_10m" in current,
            ))
            results.append(run_test(
                "'current' has 'weather_code'",
                "weather_code" in current,
            ))

        if "daily" in data:
            daily = data["daily"]
            results.append(run_test(
                "'daily' has 'time' list with 7 entries",
                "time" in daily and len(daily["time"]) == 7,
                "Check that forecast_days=7 is in your params"
            ))
            results.append(run_test(
                "'daily' has 'temperature_2m_max'",
                "temperature_2m_max" in daily,
            ))
            results.append(run_test(
                "'daily' has 'temperature_2m_min'",
                "temperature_2m_min" in daily,
            ))
            results.append(run_test(
                "'daily' has 'precipitation_sum'",
                "precipitation_sum" in daily,
            ))

    return results


# =============================================================================
# MAIN TEST RUNNER
# =============================================================================

def main():
    global passed, failed

    print("=" * 50)
    print("  Weather App Test Suite")
    print("=" * 50)

    all_results = []
    func_results = []

    try:
        desc_results = test_weather_description()
        all_results += desc_results
        func_results.append(all(desc_results))
    except Exception as e:
        print(f"\n  [!!] weather_description() raised an error: {e}")
        print("       Make sure you have implemented it in display.py")
        func_results.append(False)

    try:
        coord_results = test_get_coordinates()
        all_results += coord_results
        func_results.append(all(coord_results))
    except Exception as e:
        print(f"\n  [!!] get_coordinates() raised an error: {e}")
        print("       Make sure you have implemented it in weather_api.py")
        func_results.append(False)

    try:
        weather_results = test_get_weather()
        all_results += weather_results
        func_results.append(all(weather_results))
    except Exception as e:
        print(f"\n  [!!] get_weather() raised an error: {e}")
        print("       Make sure you have implemented it in weather_api.py")
        func_results.append(False)

    unit_passed = sum(1 for r in all_results if r)
    total = len(all_results)

    print()
    print("=" * 50)
    print(f"  Results: {unit_passed}/{total} tests passed")
    print("=" * 50)

    if unit_passed == total:
        print("  All tests pass. Try running: python main.py \"New York\"")
    else:
        print(f"  {total - unit_passed} test(s) failed. Review the hints above.")

    print()

    passed = sum(1 for r in func_results if r)
    failed = len(func_results) - passed

    return 0 if unit_passed == total else 1


if __name__ == "__main__":
    sys.exit(main())
