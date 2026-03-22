# Snake Game: Instructor Lesson Plan

## Overview

Students build a complete, browser-playable Snake game served by a Flask backend. The game is constructed incrementally -- each TODO adds one mechanic. By Day 4 the game is fully playable. Days 5-6 focus on the leaderboard API and polish. An optional AI extension is available for advanced students.

**Estimated Duration:** 6-8 class periods (45-50 minutes each)

**Primary Grade Level:** 9-10

**Extension Grade Level:** 11-12 (AI snake)

**Prerequisites:**
- Basic Python (variables, functions, loops, conditionals, file I/O)
- Basic JavaScript familiarity helpful but not required -- the provided code is heavily commented
- Some understanding of HTML is helpful but not necessary

---

## CSTA Standards Addressed

> **Note:** This content has not been submitted for official CSTA alignment review. The crosswalk below shows which standards this project is designed to address.

### Primary Standards (Direct Instruction)

| Standard | Description | How This Project Addresses It |
|----------|-------------|-------------------------------|
| **3A-AP-13** | Create prototypes that use algorithms to solve computational problems. | Students build a working game from scratch, implementing each algorithm (collision detection, movement, food spawning) incrementally. |
| **3A-AP-15** | Justify the selection of specific control structures when tradeoffs involve implementation, readability, and program performance. | Students choose between loop structures for food spawning; discuss why the game loop uses `setInterval` rather than recursion. |
| **3A-AP-16** | Design and iteratively develop computational artifacts using events to initiate instructions. | Arrow key / WASD events drive all player movement. Students implement the event handler and see the direct effect on game state. |
| **3A-AP-17** | Decompose problems into smaller components through systematic analysis. | The entire project is structured as decomposition: each TODO is a standalone function with a single responsibility. |
| **3A-AP-18** | Create artifacts by using procedures within a program. | `gameStep()` composes all prior functions. Students see how small, well-defined procedures combine into a larger system. |
| **3B-AP-09** | Implement an artificial intelligence algorithm to play a game against a human opponent or solve a problem. | The extension AI snake implements a greedy algorithm using Manhattan distance. Students analyze its weaknesses. |
| **3B-AP-10** | Use and adapt classic algorithms to solve computational problems. | Greedy pathfinding and game loop patterns are classic algorithms. Students implement and discuss their limitations. |
| **3B-AP-16** | Demonstrate code reuse by creating programming solutions using libraries and APIs. | The leaderboard uses Flask as a web API. Students call it from JavaScript with `fetch()` and implement it in Python. |
| **3B-AP-19** | Develop programs for multiple computing platforms. | The game runs in any browser via Flask + HTML Canvas. Students share their public URL for cross-device play. |

---

## Learning Objectives

By the end of this project, students should be able to:

1. Represent game state as a data structure and explain why immutable updates matter
2. Implement a game loop and describe how events modify state between ticks
3. Decompose a multi-part problem into small, testable functions
4. Write a simple REST API in Python and call it from JavaScript using `fetch()`
5. Describe what a greedy algorithm is and identify a case where it fails (extension)
6. Analyze the tradeoffs between a file-based data store and a database (extension discussion)

---

## Project File Overview

| File | Who writes it | What it does |
|------|---------------|--------------|
| `static/game.js` | Student (TODOs 1-7) | All game logic, rendering, event handling |
| `app.py` | Student (TODOs 8-9) | Flask server + leaderboard API |
| `templates/game.html` | Provided | HTML structure (canvas, overlays, leaderboard panel) |
| `static/style.css` | Provided (students may customize) | Dark game theme |
| `requirements.txt` | Provided | Flask + Waitress |

---

## Lesson Sequence

### Day 1: Play the game, understand the structure (45 min)

**Objectives:**
- Understand the concept of a game loop and game state
- Read unfamiliar code and identify what is provided vs. what needs to be written
- Understand the grid coordinate system

**Activities:**

1. **Warm-up (10 min):** Play Snake
   - Students play Snake in a browser (Google "snake game")
   - Discussion: "What data does the game need to remember? What changes each tick?"
   - Goal: students articulate that the snake is a sequence of positions, and each tick moves it

2. **Introduce the project (10 min):**
   - "You're going to build this. It will run on a real server that anyone can visit."
   - Walk through the file structure: `app.py`, `game.js`, `game.html`
   - Point out the CONSTANTS at the top of `game.js`: GRID_SIZE=20, CELL_SIZE=30

3. **Read the provided code (20 min):**
   - Students open `game.js` and read the provided drawing functions
   - Key questions to prompt: "What does `drawSnake` expect as input? What does the game loop do with the state it gets back from `gameStep()`?"
   - Look at the game loop in the IIFE at the bottom -- trace what happens each tick

4. **Wrap-up (5 min):**
   - "Tomorrow you write `initSnake()`. That's it. One function."
   - Preview: by end of Day 3, the snake will move on screen

**Materials:**
- Browser access to play Snake
- Whiteboard to sketch the grid and coordinate system

---

### Day 2: Snake appears on screen (TODOs #1, #2, #3) (45 min)

**Objectives:**
- Return structured data from a function
- Use `Math.random()` to generate positions within constraints
- Understand array spread syntax for immutable array operations

**Activities:**

1. **TODO #1: `initSnake()` (10 min)**
   - Students just return a hard-coded array of 3 objects
   - "Run `python app.py`, open your browser. You should see a green snake."
   - If they see nothing, the function is probably returning `undefined` -- remind them to return the array

2. **TODO #2: `spawnFood(snake)` (15 min)**
   - Introduce `Math.floor(Math.random() * GRID_SIZE)`
   - Introduce the `do...while` loop for retry logic
   - Discuss: "Why do we need to check that the food isn't on the snake?"
   - A red circle should appear after implementing this

3. **TODO #3: `moveSnake(snake, direction)` (15 min)**
   - Discuss direction deltas. Sketch on the board: "If x increases to the right and y increases downward, what is the delta for UP?"
   - Key concept: the function returns a **new** array, not the modified original
   - Introduce spread syntax `[newHead, ...snake.slice(0, -1)]`
   - "Refresh the game. The snake should move on its own (straight right). It won't stop at walls yet."

4. **Wrap-up (5 min)**
   - Students should have a moving snake on screen
   - Preview: "Tomorrow we stop it from going through walls and make it respond to keys."

**Common issues:**
- Forgetting to `return` from `initSnake` -- snake doesn't appear
- Wrong y-delta for UP/DOWN (students expect y to decrease going up, but screen coordinates are flipped)
- Modifying `snake` directly instead of creating a new array (snake gets distorted)

---

### Day 3: Full basic game (TODOs #4, #5, #6) (45 min)

**Objectives:**
- Implement boundary and self-intersection checks
- Use `Array.some()` for membership testing
- Handle keyboard events and prevent illegal moves

**Activities:**

1. **TODO #4: `isCollision(snake)` (15 min)**
   - Write the wall check first: 4 conditions on `snake[0]`
   - Then write the self check using `snake.slice(1).some(...)`
   - Test: run into a wall. The game should stop.

2. **TODO #5: `didEatFood(snake, food)` (5 min)**
   - Single comparison. Point out: "This is one line. Simple functions are good."
   - Nothing visible changes yet -- this is used in TODO #7

3. **TODO #6: `handleKeyPress(event, currentDirection)` (20 min)**
   - Show `event.code` in the browser console: `console.log(event.code)` in the keydown listener
   - Build the keyMap object, then the reverse-direction block
   - Test: arrow keys and WASD should now steer the snake
   - Test the reverse block: pressing left while going right should do nothing

4. **Wrap-up (5 min)**
   - Students now control a snake that dies on collision
   - "Tomorrow: wire everything together so the snake grows and scores points."

**Common issues:**
- Using `event.key` instead of `event.code` (works for arrow keys but fails for WASD due to platform differences)
- Forgetting `return currentDirection` at the end -- returning `undefined` breaks the game
- Off-by-one in wall check: `head.x >= GRID_SIZE` not `head.x > GRID_SIZE`

---

### Day 4: Complete game (TODO #7) (45 min)

**Objectives:**
- Compose previously written functions into a larger procedure
- Understand the concept of immutable state updates
- Experience a complete working game of their own creation

**Activities:**

1. **Review game state shape (5 min)**
   - Show the shape of `gameState` on the board
   - "Your job: take this object in, return a new one with updated fields."

2. **TODO #7: `gameStep(gameState)` (30 min)**
   - Work through the steps in order: move, collision, food
   - The key insight for growing: "When food is eaten, you don't call `moveSnake`. Instead, prepend the new head to the full current snake."
   - Work through the speed formula together: "Every 5 points, speed goes up by 10ms."
   - Students should test after each sub-step if possible

3. **Play time (10 min)**
   - Full game should work. Let students play.
   - Peer-challenge: who can get the highest score?

**Common issues:**
- Moving the snake before collision check: the new head needs to be tested, not the old one
- Forgetting to spread `...gameState` when returning -- partial state causes missing fields
- Growing snake: adding `[newHead, ...snake]` (correct) vs. using `moveSnake` and pushing (also works but more complex)
- Speed not changing: forgetting to include `speed: newSpeed` in the returned state

**Key question to ask:** "Why does `gameStep` return a new object rather than modifying `gameState` directly? What would go wrong if it mutated the original?"

---

### Day 5: Leaderboard (TODOs #8, #9) (45 min)

**Objectives:**
- Write Flask routes that accept and return JSON
- Read and write files in Python
- Understand how a browser calls a server using `fetch()`

**Activities:**

1. **Show how the pieces connect (10 min)**
   - Open `game.js` and show `submitScore()` and `loadLeaderboard()` -- they're already written
   - "These use `fetch()` to talk to your Python server. Your job is to write what's on the other end."

2. **TODO #8: `save_score()` (20 min)**
   - Walk through the steps: parse JSON, load file, append, save, return
   - Show `try/except FileNotFoundError` pattern for first-run case
   - Test: enter a name in the game-over screen, click "Save Score", check that `scores.json` was created

3. **TODO #9: `get_leaderboard()` (15 min)**
   - Load, sort, slice, return
   - Show `list.sort(key=lambda x: x["score"], reverse=True)`
   - Test: refresh the page. The leaderboard panel should show the saved scores.

**Common issues:**
- Returning `jsonify(scores[:10])` instead of just `scores[:10]` -- Flask requires `jsonify` for lists
- Sorting ascending instead of descending (forgetting `reverse=True`)
- Not handling the case where `scores.json` doesn't exist yet on GET

**Discussion:** "What are the downsides of storing scores in a JSON file? When would you use a real database?"

---

### Day 6: Polish and peer play (45 min)

**Objectives:**
- Apply iterative improvement to a working product
- Give and receive constructive feedback on a game

**Activities:**

1. **Customization time (20 min)**
   - Students pick at least one thing to customize. Suggestions (all in README):
     - Color scheme (edit `style.css` or color constants in `game.js`)
     - Starting speed or speed step (edit constants)
     - Obstacles (add a `walls` array, check in `isCollision`, draw in `render`)
     - Wrap-around walls (modify `moveSnake` to use `% GRID_SIZE`)

2. **Peer play session (20 min)**
   - Students share their public URL with two classmates
   - Rotate: each person plays each other's game, leaves a score
   - Leaderboard should fill up

3. **Debrief (5 min)**
   - "What was the hardest function to implement? Why?"
   - "If you had more time, what would you add?"

---

### Day 7 (Optional): AI Snake (45 min)

**Objectives:**
- Understand what a greedy algorithm is
- Implement an algorithm that uses game state to make decisions
- Identify failure cases for a greedy approach

**Activities:**

1. **Introduce the greedy algorithm (10 min)**
   - "At each step, the AI picks the direction that gets closest to the food."
   - Draw a case on the board where this works perfectly.
   - Draw a case where it traps the snake.

2. **Implement `autoPlayStep(gameState)` (25 min)**
   - Walk through the Manhattan distance formula: `|nx - food.x| + |ny - food.y|`
   - Students implement the function from the README pseudocode
   - Add the Auto-play button to `game.html` (one line, shown in README)
   - Test: toggle auto-play. Watch the snake navigate.

3. **Discussion (10 min)**
   - "When does the greedy AI die? Draw a board state where it fails."
   - "What would make it smarter? (Flood fill to check if the path ahead has enough space, look-ahead search like BFS/DFS)"
   - Connect to 3B-AP-09: "This is a game-playing AI algorithm. It's different from minimax because it doesn't look ahead -- it only sees one step."

**Common issues:**
- Forgetting to skip the reverse direction in the move loop
- Not checking `isCollision` on the test snake before accepting the move
- `bestDir` initialized to `direction` -- this is intentional (fall back to current direction if no safe move exists)

---

### Day 8 (Optional): AI tournament and analysis (45 min)

**Activities:**

1. **Tournament (25 min)**
   - Run several AI games in a row. Record scores.
   - Students modify the greedy algorithm to try to improve it (e.g., add a tie-breaking rule, add a small look-ahead)
   - Compare scores before and after modification

2. **Analysis discussion (15 min)**
   - "The greedy AI scores consistently but rarely high. Why?"
   - "BFS/DFS pathfinding would always find the food if a path exists. What's the cost?"
   - "AlphaGo used a different approach entirely -- what do you know about it?"

3. **Reflection (5 min)**
   - "Human players use spatial reasoning and pattern recognition the AI can't. What would it take to match that?"

---

## Assessment Ideas

### Formative

- **Check-ins after each day:** "Run the game and show me [the snake moves / collision works / the leaderboard saves a score]"
- **Exit ticket:** "Draw the game state object after the snake eats food. What fields changed?"

### Summative

**Option A: Code review**
- Student submits their `game.js` and `app.py`
- Rubric:
  - All 9 TODOs implemented correctly (50%)
  - Code is readable: sensible variable names, no dead code (20%)
  - At least one customization beyond the base game (20%)
  - Student can explain one function during a brief check-in (10%)

**Option B: Written reflection**
- "Trace through one full game tick starting from this state: `{snake: [{x:5,y:5},{x:4,y:5}], food:{x:6,y:5}, direction:'RIGHT', score:0, speed:150}`"
- "Describe a board layout where the greedy AI will always die. Explain why."
- "The leaderboard uses a JSON file. What are two problems this would cause at scale?"

**Option C: Extension**
- Implement one of the README extension ideas (obstacles, wrap-around, multiple food types)
- Implement the AI and improve on the basic greedy algorithm
- Present the improvement and explain the tradeoff

---

## Differentiation

### For students who need more support

- Provide the delta lookup table for `moveSnake` pre-filled
- Break `gameStep` into a guided worksheet: "step 1: call moveSnake. step 2: call isCollision. What do you return if it's true?"
- Focus on TODOs 1-6 and Day 5. `gameStep` can be provided if needed.
- Pair with a partner for the Flask routes (Days 5)

### For advanced students

- Challenge them to implement `gameStep` before reading the hints
- Skip to Day 7 early if the base game is done by Day 3
- Challenge: replace the greedy AI with BFS pathfinding
- Challenge: add persistent high scores using SQLite instead of a JSON file
- Challenge: add a two-player mode (one keyboard, one WASD)

---

## Common Misconceptions

| Misconception | Reality |
|---------------|---------|
| "JavaScript runs on the server" | In this project, JS runs in the browser. Python runs on the server. They talk via HTTP (fetch). |
| "The snake array stores pixel positions" | It stores grid coordinates (0-19). The drawing functions convert to pixels. |
| "Modifying the state directly is fine" | The game loop reads state after `gameStep` returns. If you mutate in place, the old state is gone and debugging gets very hard. |
| "The game loop 'sees' the canvas" | The loop only knows about `gameState`. Rendering is a separate step that reads state and draws it. |
| "Greedy always finds the food" | Greedy can trap itself. It has no memory and no look-ahead. |

---

## Discussion Prompts

Use these throughout the unit:

1. "The snake is an array where index 0 is the head. Why not index 0 as the tail? What would change?"

2. "Every time `moveSnake` is called, it creates a new array. Is that wasteful? Why might we do it anyway?"

3. "Two students both built Snake. One stores game state in global variables. One passes it as a function argument like we do here. What are the tradeoffs?"

4. "Your Flask API has no authentication. Anyone who knows your URL can submit a score of 999999. How would you fix this?"

5. "The AI uses Manhattan distance. What is Manhattan distance? When does it give a bad estimate of the real distance?"

---

## Troubleshooting Guide

| Symptom | Likely cause | What to check |
|---------|--------------|---------------|
| Blank canvas on load | `initSnake()` returns `undefined` | Make sure the function returns the array |
| Food appears on the snake | `spawnFood` doesn't check for overlap, or checks wrong property | Verify `snake.some(cell => cell.x === x && cell.y === y)` |
| Snake teleports or disappears | `moveSnake` modifies original array | Use spread / slice to create a new array |
| Snake goes through walls | `isCollision` not called, or returns wrong value | Check that `gameStep` calls `isCollision` on the moved snake |
| Snake doesn't grow | `gameStep` uses `moveSnake` even when food is eaten | When food is eaten, use `[newHead, ...snake]` not `moveSnake` |
| Arrow keys scroll the page | `event.preventDefault()` missing | It's in the provided keydown listener -- make sure it's not deleted |
| Score submits but leaderboard empty | `get_leaderboard` returns wrong thing | Must return `jsonify(list)`, not just the list |
| Score saves but sorts wrong | `reverse=True` missing from sort | `scores.sort(key=lambda x: x["score"], reverse=True)` |
| AI never moves | `autoPlayStep` not defined or returns undefined | Check the function name matches exactly |

---

## Files in This Package

| File | Purpose |
|------|---------|
| `solution/game.js` | Complete JS solution (instructor only) |
| `solution/app.py` | Complete Python solution (instructor only) |
| `lesson-plan.md` | This document |
| Snake Game student template: | |
| `app.py` | Flask server with TODO stubs |
| `templates/game.html` | Provided HTML (students don't edit) |
| `static/game.js` | Game logic with TODO stubs |
| `static/style.css` | Provided styling |
| `requirements.txt` | Flask + Waitress |
| `README.md` | Student-facing guide |

---

*Last updated: March 2026*
