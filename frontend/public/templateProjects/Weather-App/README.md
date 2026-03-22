# Weather App (APIs and Libraries)

Build a terminal weather app that fetches real data from the internet, displays current conditions, and shows a 7-day forecast for any city in the world.

## What You'll Learn

By completing this project, you'll understand:

- **What an API is** and why software systems communicate through them
- **How to make HTTP requests** in Python using the `requests` library
- **How to work with JSON** responses and navigate nested data structures
- **Why decomposition matters**: splitting a program into modules with clear responsibilities

## Quick Start

1. **Read through all three files** to understand the structure before writing any code
2. **Complete the TODOs** in order (1 through 3)
3. **Test your work:** `python test_weather.py`
4. **Run the app:** `python main.py "New York"`

---

## What Is an API?

An **API** (Application Programming Interface) is a way for two programs to communicate. When you use a weather app on your phone, that app does not store weather data locally. Instead, it sends a request to a weather server, and the server sends back fresh data.

You interact with APIs constantly:
- A maps app asks a map server for directions
- A rideshare app asks a server where nearby drivers are
- A social app asks a server for new posts

In this project, you will talk to the **Open-Meteo API**, a free public weather service. No account or API key is required.

### How an HTTP Request Works

```
Your program                     Open-Meteo server
     |                                  |
     |  GET /v1/search?name=London      |
     | -------------------------------->|
     |                                  |
     |  200 OK                          |
     |  {"results": [{"latitude": ...}]}|
     | <--------------------------------|
     |                                  |
```

You make a **GET request** to a URL with some parameters. The server returns a **response** with a status code (200 means OK) and a body containing data.

### The URLs You'll Use

**Geocoding** (city name to coordinates):
```
https://geocoding-api.open-meteo.com/v1/search?name=London&count=1&language=en&format=json
```

**Weather forecast** (coordinates to weather data):
```
https://api.open-meteo.com/v1/forecast?latitude=51.5&longitude=-0.1&current=temperature_2m,wind_speed_10m,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&forecast_days=7&timezone=auto
```

Each `?key=value` pair after the `?` is a **query parameter**. The `requests` library lets you pass these as a Python dict instead of building the URL by hand.

---

## What Is JSON?

**JSON** (JavaScript Object Notation) is the most common format for sending structured data over the internet. It looks like Python dicts and lists.

A JSON response from the geocoding API looks like this:

```json
{
    "results": [
        {
            "name": "London",
            "latitude": 51.5085,
            "longitude": -0.1257,
            "country": "United Kingdom"
        }
    ]
}
```

When you call `response.json()` in Python, you get a regular Python dict you can index normally:

```python
data = response.json()
lat = data["results"][0]["latitude"]   # 51.5085
```

The `[0]` is needed because `results` is a list. You requested `count=1`, so there is always at most one item in that list.

---

## Project Structure

This project uses three Python files. Each file has a single clear responsibility.

```
Weather-App/
  weather_api.py    -- talks to the internet
  display.py        -- formats and prints data
  main.py           -- ties the modules together
  test_weather.py   -- verifies your implementations
  requirements.txt  -- lists the libraries you need
```

### Why Three Files?

Imagine you want to add a feature: display temperatures in Celsius. With this structure, you change only `display.py`. The API code is untouched.

Now imagine the weather API you use shuts down and you switch to a different one. You change only `weather_api.py`. The display code is untouched.

This is the principle behind **separation of concerns**: keep code that changes for different reasons in different files. It is the same reason large programs are organized into modules, packages, and services.

---

## Your Tasks

### TODO #1: `get_coordinates(city)` in `weather_api.py`

Look up the latitude and longitude for a city name.

- Make a GET request to the geocoding API
- Parse the JSON response
- Return `(latitude, longitude, display_name)` as a tuple, or `None` if the city is not found
- Use `try/except` to handle network errors

### TODO #2: `get_weather(lat, lon)` in `weather_api.py`

Fetch weather data for a set of coordinates.

- Make a GET request to the weather API with all required parameters
- Return the parsed JSON dict, or `None` on error

### TODO #3: `weather_description(code)` in `display.py`

Convert a WMO weather code (an integer) to a readable string.

- Use `if/elif` statements to handle each range
- See the comments in `display.py` for the full list of codes

---

## Testing Your Implementation

```bash
python test_weather.py
```

Tests labeled `[UNIT]` run without network access. Tests labeled `[LIVE]` make real API calls and require an internet connection.

Implement the functions in order. `get_weather` and the display functions depend on `get_coordinates` working first.

---

## Running the App

Once all tests pass:

```bash
python main.py "New York"
python main.py "Paris"
python main.py "Lagos"
python main.py          # will prompt for a city name
```

Expected output (values will vary):

```
Looking up coordinates for 'New York'...
Fetching weather data for New York...

+--------------------------------------+
| Current Weather: New York            |
+--------------------------------------+
|  Conditions : Partly cloudy          |
|  Temperature: 58.2 F                 |
|  Wind Speed : 14.7 mph               |
+--------------------------------------+

+----------------------------------------------------+
| 7-Day Forecast                                     |
|----------------------------------------------------|
|  Date        Conditions         Hi    Lo   Rain   |
|----------------------------------------------------|
|  03-21  Partly cloudy       62.1   49.3   0.00   |
|  ...                                               |
+----------------------------------------------------+
```

---

## Real-World Connection

Every app on your phone that shows live data is doing a version of what you just built:

- The weather app fetches from a weather API
- Google Maps fetches from a maps and traffic API
- Instagram fetches posts and images from Meta's API
- Spotify fetches song data and audio from Spotify's API

When companies expose their data through an API, other developers can build products on top of it. The Open-Meteo API is fully open-source. The National Weather Service also provides a free API at `api.weather.gov`. Many services require an **API key** (a secret token that identifies your app and tracks usage) because they charge for high-volume access or want to prevent abuse.

---

## Extension Challenges

Once your app is working, try one of these:

### 🟢 Easy: Add a Metric Flag

Add a `--metric` command-line flag so running `python main.py "London" --metric` shows temperatures in Celsius and wind speed in km/h.

The Open-Meteo API supports `temperature_unit=celsius` and `wind_speed_unit=kmh`. You will need to modify `get_weather()` to accept optional unit parameters and update the display to show the correct units.

### 🟡 Medium: Side-by-Side Comparison

Allow the user to enter two city names and display their current conditions side by side in the terminal. What changes are needed in `main.py`? Can you reuse your existing functions without modifying them?

### 🔴 Hard: Weather Alerts

After fetching weather data, scan the 7-day forecast and print a warning if dangerous conditions are detected. Examples: thunderstorm in the forecast, high temperature above 100 F, rain exceeding 1 inch in a single day.

Define clear rules for what counts as an alert and print a summary before the forecast table.

---

## Troubleshooting

### "ModuleNotFoundError: No module named 'requests'"
Run `pip install requests` (or `pip install -r requirements.txt`) to install the library.

### `get_coordinates` returns `None` for a real city
Check that your params dict uses the key `"name"` (not `"city"`). Also verify you are checking for `"results"` in the response, not `"result"`.

### The forecast shows 8 days instead of 7
The API returns the current day plus the next N days depending on the `forecast_days` parameter. Make sure `"forecast_days": 7` is in your params.

### Network request succeeds but output looks wrong
Add `print(response.json())` right after the request to inspect the raw data. Check whether you are accessing the right keys in the response.

---

## Code Review Checklist

Before submitting:

- [ ] All tests pass (`python test_weather.py`)
- [ ] The app runs for at least three different cities without errors
- [ ] `get_coordinates` returns `None` for a nonsense city name (not a crash)
- [ ] `weather_description` handles all code ranges including the default case
- [ ] Variable names are clear and match what they represent
