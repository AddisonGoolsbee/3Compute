"""
Weather App: API Module (Solution)
====================================

Complete reference implementation for instructor use.
"""

import requests

GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search"
WEATHER_URL = "https://api.open-meteo.com/v1/forecast"


def get_coordinates(city: str) -> tuple[float, float, str] | None:
    """
    Look up the latitude and longitude for a city name.

    Returns (latitude, longitude, display_name) or None.
    """
    params = {
        "name": city,
        "count": 1,
        "language": "en",
        "format": "json",
    }
    try:
        response = requests.get(GEOCODING_URL, params=params, timeout=10)
        data = response.json()
    except Exception:
        return None

    if "results" not in data or len(data["results"]) == 0:
        return None

    result = data["results"][0]
    return (result["latitude"], result["longitude"], result["name"])


def get_weather(lat: float, lon: float) -> dict | None:
    """
    Fetch current conditions and a 7-day forecast for a location.

    Returns the full parsed JSON response or None on error.
    """
    params = {
        "latitude": lat,
        "longitude": lon,
        "current": "temperature_2m,wind_speed_10m,weather_code",
        "daily": "temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code",
        "temperature_unit": "fahrenheit",
        "wind_speed_unit": "mph",
        "precipitation_unit": "inch",
        "forecast_days": 7,
        "timezone": "auto",
    }
    try:
        response = requests.get(WEATHER_URL, params=params, timeout=10)
        return response.json()
    except Exception:
        return None
