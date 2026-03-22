"""
Weather App: API Module
=======================

This module handles all communication with the Open-Meteo API.
It is responsible for fetching coordinates from a city name and
fetching weather data from those coordinates.

Keeping API code in its own file makes it easy to swap out data
sources later without touching the rest of the program.

YOUR TASKS:
1. Implement get_coordinates(city) - Look up latitude/longitude for a city
2. Implement get_weather(lat, lon)  - Fetch current and forecast weather data

Run the tests to check your work: python test_weather.py
"""

import requests


# =============================================================================
# API ENDPOINTS (PROVIDED)
# =============================================================================

GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search"
WEATHER_URL = "https://api.open-meteo.com/v1/forecast"


# =============================================================================
# TODO #1: IMPLEMENT COORDINATE LOOKUP
# =============================================================================

def get_coordinates(city: str) -> tuple[float, float, str] | None:
    """
    Look up the latitude and longitude for a city name.

    Args:
        city: The name of the city to look up (e.g., "New York")

    Returns:
        A tuple of (latitude, longitude, display_name) if the city is found,
        or None if the city is not found or a network error occurs.

    API details:
        URL:  https://geocoding-api.open-meteo.com/v1/search
        Params: name=<city>, count=1, language=en, format=json

        Example response (truncated):
        {
            "results": [
                {
                    "name": "New York",
                    "latitude": 40.71427,
                    "longitude": -74.00597
                }
            ]
        }

    HINT: Use requests.get(url, params=params) to make the request.
          Then call .json() on the response to get a Python dict.
          Check if "results" is in the response and has at least one entry.
          Wrap everything in try/except to handle network errors.
    """
    # TODO: Build the query parameters dict
    # params = {
    #     "name": city,
    #     "count": 1,
    #     "language": "en",
    #     "format": "json",
    # }

    # TODO: Make the GET request inside a try/except block
    # try:
    #     response = requests.get(GEOCODING_URL, params=params)
    #     data = response.json()
    # except Exception:
    #     return None

    # TODO: Check if any results were returned
    # The API returns an empty dict (no "results" key) when nothing is found.
    # if "results" not in data or len(data["results"]) == 0:
    #     return None

    # TODO: Extract and return (latitude, longitude, display_name)
    # result = data["results"][0]
    # return (result["latitude"], result["longitude"], result["name"])

    pass  # Remove this line when you implement the function


# =============================================================================
# TODO #2: IMPLEMENT WEATHER FETCHING
# =============================================================================

def get_weather(lat: float, lon: float) -> dict | None:
    """
    Fetch current conditions and a 7-day forecast for a location.

    Args:
        lat: Latitude of the location
        lon: Longitude of the location

    Returns:
        The full parsed JSON response as a Python dict, or None on error.

    API details:
        URL:  https://api.open-meteo.com/v1/forecast
        Required params (use exactly as shown):
            latitude          = lat
            longitude         = lon
            current           = temperature_2m,wind_speed_10m,weather_code
            daily             = temperature_2m_max,temperature_2m_min,
                                precipitation_sum,weather_code
            temperature_unit  = fahrenheit
            wind_speed_unit   = mph
            precipitation_unit= inch
            forecast_days     = 7
            timezone          = auto

        Example response structure (truncated):
        {
            "current": {
                "temperature_2m": 68.5,
                "wind_speed_10m": 12.3,
                "weather_code": 1
            },
            "daily": {
                "time": ["2026-03-21", "2026-03-22", ...],
                "temperature_2m_max": [72.1, 69.4, ...],
                "temperature_2m_min": [55.2, 53.8, ...],
                "precipitation_sum": [0.0, 0.12, ...],
                "weather_code": [1, 61, ...]
            }
        }

    HINT: Build a params dict with all of the fields above.
          Use try/except around the request in case of network errors.
          Return response.json() on success, None on any exception.
    """
    # TODO: Build the query parameters dict
    # params = {
    #     "latitude": lat,
    #     "longitude": lon,
    #     "current": "temperature_2m,wind_speed_10m,weather_code",
    #     "daily": "temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code",
    #     "temperature_unit": "fahrenheit",
    #     "wind_speed_unit": "mph",
    #     "precipitation_unit": "inch",
    #     "forecast_days": 7,
    #     "timezone": "auto",
    # }

    # TODO: Make the GET request inside a try/except block
    # try:
    #     response = requests.get(WEATHER_URL, params=params)
    #     return response.json()
    # except Exception:
    #     return None

    pass  # Remove this line when you implement the function
