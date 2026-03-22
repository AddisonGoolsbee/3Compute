"""
Weather App
===========

This program fetches current weather and a 7-day forecast for any city
using the Open-Meteo API (free, no account or API key required).

The project is split into three files:
  weather_api.py  - fetches data from the internet
  display.py      - formats and prints the data
  main.py         - ties the two modules together (this file)

YOUR TASKS (in weather_api.py and display.py):
  1. Implement get_coordinates()    in weather_api.py
  2. Implement get_weather()        in weather_api.py
  3. Implement weather_description() in display.py

This file is complete. Once your other functions are implemented,
you can run this program with:

    python main.py "New York"
    python main.py "Tokyo"
    python main.py          (will prompt you to enter a city)

Run the tests to check your work: python test_weather.py
"""

import sys
from weather_api import get_coordinates, get_weather
from display import print_weather


# =============================================================================
# MAIN PROGRAM (PROVIDED)
# =============================================================================

def main():
    # Get city name from command-line argument or prompt the user
    if len(sys.argv) > 1:
        city = " ".join(sys.argv[1:])
    else:
        city = input("Enter a city name: ").strip()

    if not city:
        print("Error: no city name provided.")
        sys.exit(1)

    # Step 1: Convert city name to coordinates
    print(f"Looking up coordinates for '{city}'...")
    result = get_coordinates(city)

    if result is None:
        print(f"Could not find '{city}'. Check the spelling and try again.")
        sys.exit(1)

    lat, lon, display_name = result

    # Step 2: Fetch weather data for those coordinates
    print(f"Fetching weather data for {display_name}...")
    weather_data = get_weather(lat, lon)

    if weather_data is None:
        print("Could not retrieve weather data. Check your internet connection.")
        sys.exit(1)

    # Step 3: Display the results
    print_weather(weather_data, display_name)


if __name__ == "__main__":
    main()
