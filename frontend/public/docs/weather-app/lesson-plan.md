# Weather App: Instructor Lesson Plan

## Overview

Students build a terminal weather app that fetches real data from the Open-Meteo API, displaying current conditions and a 7-day forecast for any city. The project focuses on decomposition into modules, using external libraries, and reading API documentation.

**Estimated Duration:** 4-5 class periods (45-50 minutes each)

**Primary Grade Level:** 11-12

**Supporting Grade Level:** 9-10 (with additional scaffolding, see Differentiation section)

**Prerequisites:**
- Python functions, loops, conditionals, and dictionaries
- Basic understanding of lists and indexing
- Familiarity with importing modules (`import`, `from ... import`)
- No prior API or networking experience required

---

## CSTA Standards Addressed

> **Note:** This content has not been submitted for official CSTA alignment review. The crosswalk below shows which standards this project is designed to address.

### Primary Standards (Direct Instruction)

| Standard | Description | How This Project Addresses It |
|----------|-------------|-------------------------------|
| **3B-AP-16** | Demonstrate code reuse by creating programming solutions using libraries and APIs. | Students use the `requests` library and the Open-Meteo API to retrieve real weather data. The project cannot be completed without understanding what a library and API provide. |
| **3B-AP-15** | Analyze a large-scale computational problem and identify generalizable patterns that can be applied to a solution. | Students see that "fetch data from the internet" and "display data" are separable concerns that appear in nearly every connected application. The three-module structure makes this pattern explicit. |
| **3A-AP-17** | Decompose problems into smaller components through systematic analysis, using constructs such as procedures, modules, and/or objects. | The project is deliberately split into `weather_api.py`, `display.py`, and `main.py`. Day 1 discussion focuses on why this decomposition is useful before students write any code. |
| **3A-AP-18** | Create artifacts by using procedures within a program, combinations of data and procedures, or independent but interrelated programs. | Students implement procedures in two separate modules that are then composed in `main.py` to produce a working artifact. |
| **3A-AP-13** | Create prototypes that use algorithms to solve computational problems by leveraging prior student knowledge and personal interests. | Students apply prior knowledge of dicts, functions, and conditionals to interact with a real-world system. City selection allows for personal connection. |

### Supporting Standards (Context and Discussion)

| Standard | Description | How This Project Supports It |
|----------|-------------|------------------------------|
| **3B-AP-21** | Develop and use a series of test cases to verify that a program performs according to its design specifications. | A test suite is provided. Students run tests incrementally as they implement each function. |
| **3A-AP-19** | Systematically design and develop programs for broad audiences by incorporating feedback from users. | Extension challenge (side-by-side comparison) prompts students to think about what a user might want and how to restructure the interface accordingly. |

---

## Learning Objectives

By the end of this project, students should be able to:

1. **Explain** what an API is and describe the request/response cycle
2. **Use** the `requests` library to make HTTP GET requests and parse JSON responses
3. **Navigate** nested Python dicts returned from a real API
4. **Justify** splitting a program into modules based on separation of concerns
5. **Implement** functions with clear contracts (defined inputs, outputs, and error behavior)
6. **Test** their implementations incrementally using a provided test suite

---

## Lesson Sequence

### Day 1: What Is an API? (45 min)

**Objectives:**
- Understand what an API is and why they exist
- Explore the Open-Meteo API manually in a browser
- Understand the three-module project structure

**Activities:**

1. **Warm-up discussion (10 min):** "When you open a weather app, where does the data come from?"
   - "Is the data stored on your phone?"
   - "How does your phone know the weather right now?"
   - Guide students to the idea that the app is asking a server for information.

2. **Direct instruction: APIs and HTTP (15 min):**
   - Draw the request/response cycle on the board (browser asks, server responds)
   - Show the Open-Meteo geocoding URL live in a browser:
     ```
     https://geocoding-api.open-meteo.com/v1/search?name=London&count=1&language=en&format=json
     ```
   - Ask: "What do you notice about this URL? What are the parts after the `?`?"
   - Show the JSON response and explain the structure: objects (dicts), arrays (lists), key-value pairs
   - Change `name=London` to `name=Paris` and observe the response change

3. **Project orientation (15 min):**
   - Open the three project files together as a class
   - Ask: "Why might we put the API code in a separate file from the display code?"
   - Discuss: if you switch to a different weather API, which file would you change? If you want the output to look different, which file?

4. **Wrap-up (5 min):**
   - Students identify which function they will implement first
   - Preview: "Tomorrow you will write code that does what we just did in the browser"

**Materials:**
- Browser for live API demonstration
- Projector or screen share

---

### Day 2: Implement `get_coordinates()` (45 min)

**Objectives:**
- Make a real HTTP GET request from Python
- Parse a JSON response and extract nested values
- Handle the case where no results are returned

**Activities:**

1. **Setup (5 min):**
   - Verify `requests` is installed: `python -c "import requests; print('OK')"`
   - If not: `pip install -r requirements.txt`

2. **Guided exploration (10 min):**
   - Show how `requests.get()` works with a simple example (not the project):
     ```python
     import requests
     response = requests.get("https://httpbin.org/get")
     print(response.status_code)
     print(response.json())
     ```
   - Explain `response.json()` returns a Python dict

3. **Students implement `get_coordinates()` (20 min):**
   - Read the docstring and TODO comments together
   - Students work independently or in pairs
   - Key questions to circulate with:
     - "What keys are in the params dict?"
     - "What does the API return when the city doesn't exist?"
     - "What could go wrong with the network request?"

4. **Test and debug (10 min):**
   - Run `python test_weather.py` and observe results for `get_coordinates` tests
   - Common issue: checking `data["result"]` instead of `data["results"]`
   - Common issue: forgetting `try/except`

**Instructor Notes:**

The most common mistake is not checking whether `"results"` is present before indexing into it. Students who skip `try/except` will see errors on bad city names rather than `None`. The tests check both cases, which makes this visible quickly.

---

### Day 3: Implement `get_weather()` (45 min)

**Objectives:**
- Build a request with many parameters
- Understand what each parameter does
- See live weather data for the first time

**Activities:**

1. **Review (5 min):**
   - Any remaining `get_coordinates` failures from Day 2?

2. **API documentation reading (10 min):**
   - Open the Open-Meteo forecast docs: `https://open-meteo.com/en/docs`
   - Find each parameter from the project in the docs:
     - What does `timezone=auto` do?
     - What does `temperature_unit=fahrenheit` do?
     - What does `forecast_days=7` do?
   - Reading API documentation is a skill. Point out the "Try It Out" section.

3. **Students implement `get_weather()` (20 min):**
   - Structure is similar to `get_coordinates`: build params dict, make request, return JSON
   - The params dict is longer, but the logic is the same

4. **Test and explore live data (10 min):**
   - Run `python test_weather.py` (all tests should now pass or be close)
   - Run `python main.py "your hometown"` and see real data
   - Ask: "What does the raw JSON look like? Add `print(weather_data)` and run again."

**Instructor Notes:**

Students often omit one or more params and then wonder why certain keys are missing from the response. The test suite checks for specific keys, which helps isolate this. If `temperature_2m` is missing, the `current` parameter string is wrong.

---

### Day 4: `weather_description()` and Wiring Everything Together (45 min)

**Objectives:**
- Implement `weather_description()` with range-based conditionals
- Run the complete application end to end
- Discuss what the provided display code does

**Activities:**

1. **Code reading (10 min):**
   - Walk through `format_current()` and `format_forecast()` in `display.py` together
   - Ask: "What data does `format_current` need? Where does it come from?"
   - Show how the output is built: string formatting, f-strings with alignment specifiers

2. **Students implement `weather_description()` (15 min):**
   - The mapping is mechanical but requires careful range handling
   - Run `python test_weather.py` after; all 14 unit tests should pass

3. **Full integration (15 min):**
   - Run `python main.py "Chicago"`, `python main.py "São Paulo"`, etc.
   - Ask: "What happens when you run `python main.py` with no argument?"
   - Discuss the flow through all three files: `main.py` calls `weather_api.py`, passes results to `display.py`

4. **Reflection (5 min):**
   - "Which of the three files would you change to show a different layout?"
   - "Which would you change to add hourly data?"
   - "Which would you change if Open-Meteo changed their URL?"

---

### Day 5 (Optional): Extensions, Error Handling, and API Concepts (45 min)

**Objectives:**
- Deepen understanding of API design concepts
- Begin an extension challenge
- Discuss rate limits and authentication

**Activities:**

1. **Discussion: Rate Limits and API Keys (15 min):**
   - "Open-Meteo is free. Why do most APIs require keys?"
   - Rate limits: "What happens if one user makes 1 million requests per second?"
   - Authentication: show an example of an API key in a header or param (without using a real key)
   - Paid vs. free tiers: "Why do companies offer free tiers at all?"

2. **Extension time (25 min):**
   - Students choose an extension challenge from the README
   - Green (metric flag): modify `get_weather()` to accept unit parameters
   - Yellow (side-by-side): restructure `main.py` to compare two cities
   - Red (weather alerts): add post-processing logic in `main.py`

3. **Sharing (5 min):**
   - One or two students demo their work
   - "What was the hardest part? What would you add next?"

---

## Assessment Ideas

### Formative Assessment

- **Test suite:** Running `python test_weather.py` gives immediate feedback on correctness
- **Observation:** During Day 2 and 3, circulate and ask students to explain what their `try/except` block is for
- **Exit ticket (Day 1):** "In one sentence, explain the difference between `weather_api.py` and `display.py`. Why are they separate?"

### Summative Assessment

**Option A: Code Submission**
- Submit `weather_api.py` and `display.py`
- Rubric:
  - All tests pass (50%)
  - `try/except` used correctly in both API functions (20%)
  - Code is readable with clear variable names (15%)
  - `weather_description` handles all ranges including the default case (15%)

**Option B: Written Response**
- "Trace the execution of `python main.py "Tokyo"` from the command line through all three files. What functions are called? In what order? What data is passed between them?"

**Option C: Extension Project**
- Implement one of the extension challenges
- Write a short paragraph explaining what you changed and why

---

## Differentiation

### For Struggling Students (9-10 or students new to dicts)

- On Day 1, spend extra time on JSON navigation. Practice accessing nested dicts in isolation before connecting to the project:
  ```python
  data = {"results": [{"name": "London", "latitude": 51.5}]}
  print(data["results"][0]["latitude"])  # What does this print?
  ```
- Provide a partially completed `get_coordinates()` with the params dict filled in and blanks for the return statement
- Pair with a student who is comfortable with dict indexing

### For Advanced Students

- Challenge: extend `get_weather()` to accept optional `unit` parameters (Celsius/Fahrenheit) and thread those through the display functions
- Challenge: add hourly temperature data by consulting the Open-Meteo docs independently
- Challenge: replace print statements with a structured log and add a `--verbose` flag

---

## Common Student Errors

| Error | Cause | How to Address |
|-------|-------|----------------|
| `KeyError: 'results'` on valid city | Not checking if key exists before indexing | Review: `if "results" in data` before `data["results"][0]` |
| `get_coordinates` crashes on bad city | No `try/except`, or not checking for empty results | Show the test that catches this; trace through what the API returns |
| Missing keys in weather response | Params not matching the required field names exactly | Print `response.url` to see the actual URL being sent |
| `weather_description` returns `None` | Function falls through all conditions without returning | Make sure the `else` / default case is present |
| Off-by-one in date display | `dates[i][5:]` slicing confusion | Print `dates[0]` to see the full format (`"2026-03-21"`), then show the slice |

---

## Discussion Prompts

Use these across the unit:

1. "What would break first if you turned off your internet connection while the app was running? How would you make it more resilient?"

2. "Open-Meteo is free and open-source. Who pays for the servers? Why might a company choose to make their API free?"

3. "We split the program into three files. What would the code look like if everything was in one file? What would be harder to change?"

4. "The `requests` library is not built into Python. Where does it come from? Who wrote it? How do you know it is safe to use?" (Introduce PyPI, open source, and package trust briefly.)

5. "Lots of apps have 'free' tiers. What data might a weather API company collect from your requests?"

---

## Files in This Package

| File | Purpose |
|------|---------|
| `solution/weather_api.py` | Complete reference implementation (instructor only) |
| `solution/display.py` | Complete reference implementation (instructor only) |
| `lesson-plan.md` | This document |
| Weather-App student template: | |
| `main.py` | Provided in full; orchestrates the other modules |
| `weather_api.py` | Scaffolded with TODOs for `get_coordinates` and `get_weather` |
| `display.py` | Scaffolded with TODO for `weather_description`; display functions provided |
| `test_weather.py` | Test suite covering all student-implemented functions |
| `README.md` | Student-facing instructions and API explanation |
| `requirements.txt` | `requests==2.32.3` |

---

## Additional Resources

### For Instructors

- [Open-Meteo API docs](https://open-meteo.com/en/docs) - Full parameter reference; useful to show in class on Day 3
- [requests library docs](https://requests.readthedocs.io/) - Official documentation, well-written for classroom use
- [httpbin.org](https://httpbin.org/) - A simple HTTP testing service; useful for demonstrating requests before touching the real API
- [WMO weather codes](https://open-meteo.com/en/docs#weathervariables) - Full list of WMO weather interpretation codes

### For Students (in README.md)

- Open-Meteo API documentation
- `requests` library quickstart
- JSON format overview (json.org)

---

*Last updated: March 2026*
