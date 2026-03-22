"""
Weather App: Display Module
============================

This module handles all terminal output for the weather app.
It converts raw API data into readable, formatted strings.

Separating display logic from API logic means you can change
how things look without touching the network code, and vice versa.

YOUR TASK:
3. Implement weather_description(code) - Map WMO weather codes to descriptions

The format_current(), format_forecast(), and print_weather() functions
are provided so you can see how the data you fetched will be used.

Run the tests to check your work: python test_weather.py
"""


# =============================================================================
# TODO #3: IMPLEMENT WEATHER CODE DESCRIPTIONS
# =============================================================================

def weather_description(code: int) -> str:
    """
    Convert a WMO weather code to a human-readable description.

    WMO (World Meteorological Organization) codes are used by many weather
    APIs as a standardized way to describe conditions.

    Args:
        code: An integer WMO weather code

    Returns:
        A string description of the weather condition.

    Code ranges to handle:
        0         -> "Clear sky"
        1, 2, 3   -> "Partly cloudy"
        45, 48    -> "Foggy"
        51-55     -> "Drizzle"
        56-57     -> "Freezing drizzle"
        61-65     -> "Rain"
        66-67     -> "Freezing rain"
        71-77     -> "Snow"
        80-82     -> "Rain showers"
        85-86     -> "Snow showers"
        95        -> "Thunderstorm"
        96-99     -> "Heavy thunderstorm"
        anything else -> "Unknown"

    HINT: You can use a series of if/elif statements.
          For ranges, use: if 51 <= code <= 55:
    """
    # TODO: Implement this function
    # if code == 0:
    #     return "Clear sky"
    # elif 1 <= code <= 3:
    #     return "Partly cloudy"
    # elif ...

    pass  # Remove this line when you implement the function


# =============================================================================
# DISPLAY FUNCTIONS (PROVIDED)
# =============================================================================

def format_current(weather_data: dict, city_name: str) -> str:
    """
    Format the current conditions block as a string.

    Args:
        weather_data: The dict returned by get_weather()
        city_name:    The display name of the city

    Returns:
        A formatted multi-line string ready to print.
    """
    current = weather_data["current"]
    temp = current["temperature_2m"]
    wind = current["wind_speed_10m"]
    code = current["weather_code"]
    description = weather_description(code)

    lines = [
        "+" + "-" * 38 + "+",
        f"| Current Weather: {city_name:<19} |",
        "+" + "-" * 38 + "+",
        f"|  Conditions : {description:<23} |",
        f"|  Temperature: {temp:<5.1f} F{' ' * 17}|",
        f"|  Wind Speed : {wind:<5.1f} mph{' ' * 15}|",
        "+" + "-" * 38 + "+",
    ]
    return "\n".join(lines)


def format_forecast(weather_data: dict) -> str:
    """
    Format the 7-day forecast as a string.

    Args:
        weather_data: The dict returned by get_weather()

    Returns:
        A formatted multi-line string ready to print.
    """
    daily = weather_data["daily"]
    dates = daily["time"]
    highs = daily["temperature_2m_max"]
    lows = daily["temperature_2m_min"]
    precip = daily["precipitation_sum"]
    codes = daily["weather_code"]

    header = "+" + "-" * 52 + "+"
    title  = "| 7-Day Forecast" + " " * 37 + "|"
    col_hdr = "|  Date        Conditions         Hi    Lo   Rain  |"
    divider = "|" + "-" * 52 + "|"

    lines = [header, title, divider, col_hdr, divider]

    for i in range(len(dates)):
        desc = weather_description(codes[i])
        date_str = dates[i][5:]          # "MM-DD" from "YYYY-MM-DD"
        rain = precip[i] if precip[i] is not None else 0.0
        row = (
            f"|  {date_str}  {desc:<18}  "
            f"{highs[i]:>5.1f}  {lows[i]:>5.1f}  {rain:>4.2f}  |"
        )
        lines.append(row)

    lines.append(header)
    return "\n".join(lines)


def print_weather(weather_data: dict, city_name: str) -> None:
    """
    Print the full weather report to the terminal.

    Args:
        weather_data: The dict returned by get_weather()
        city_name:    The display name of the city
    """
    print()
    print(format_current(weather_data, city_name))
    print()
    print(format_forecast(weather_data))
    print()
