"""
Weather App: Display Module (Solution)
========================================

Complete reference implementation for instructor use.
"""


def weather_description(code: int) -> str:
    """Convert a WMO weather code to a human-readable description."""
    if code == 0:
        return "Clear sky"
    elif 1 <= code <= 3:
        return "Partly cloudy"
    elif 45 <= code <= 48:
        return "Foggy"
    elif 51 <= code <= 55:
        return "Drizzle"
    elif 56 <= code <= 57:
        return "Freezing drizzle"
    elif 61 <= code <= 65:
        return "Rain"
    elif 66 <= code <= 67:
        return "Freezing rain"
    elif 71 <= code <= 77:
        return "Snow"
    elif 80 <= code <= 82:
        return "Rain showers"
    elif 85 <= code <= 86:
        return "Snow showers"
    elif code == 95:
        return "Thunderstorm"
    elif 96 <= code <= 99:
        return "Heavy thunderstorm"
    else:
        return "Unknown"


def format_current(weather_data: dict, city_name: str) -> str:
    """Format the current conditions block as a string."""
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
    """Format the 7-day forecast as a string."""
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
        date_str = dates[i][5:]
        rain = precip[i] if precip[i] is not None else 0.0
        row = (
            f"|  {date_str}  {desc:<18}  "
            f"{highs[i]:>5.1f}  {lows[i]:>5.1f}  {rain:>4.2f}  |"
        )
        lines.append(row)

    lines.append(header)
    return "\n".join(lines)


def print_weather(weather_data: dict, city_name: str) -> None:
    """Print the full weather report to the terminal."""
    print()
    print(format_current(weather_data, city_name))
    print()
    print(format_forecast(weather_data))
    print()
