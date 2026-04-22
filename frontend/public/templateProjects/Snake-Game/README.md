# Snake

In this project you build the classic Snake game: the one from old Nokia phones and Google search results. By the end you have a working browser game with a leaderboard that anyone can play by visiting your public URL.

The game runs in a browser. You write the server in Python (Flask) and the game logic in JavaScript.

This README covers background knowledge that may be necessary or helpful for this lesson. Read through it once before you start coding.

## How to Run It

Right-click the `Snake-Game` folder in the file explorer on the left and select **Open in Terminal**. This executes `cd` (change directory) in your terminal to the project folder so the commands below will work.

Install the dependencies and start the server:

```bash
pip install -r requirements.txt
python app.py
```

Open the URL printed in the terminal. The page loads, but the game will not do much yet. That is what you are about to build.

## What This README Covers

- How the game works: the array-based snake, the game loop, and the grid
- Nine TODOs: seven JavaScript functions for game logic and two Flask routes for the leaderboard
- Ideas to customize the look, the feel, obstacles, and food types
- An AI Snake extension using a greedy algorithm
- Reflection questions on data representation and design decisions

---

## How the Game Works

Read this section before you start coding. The code will make more sense once you have the model in mind.

**The snake is an array.** Index 0 is the head. Each element is a grid cell `{x, y}`.

```
snake = [
  {x: 10, y: 10},   // head
  {x: 9,  y: 10},   // body
  {x: 8,  y: 10},   // tail
]
```

**Moving the snake** means adding a new head in the direction of travel and removing the tail. The body shifts along automatically. When the snake eats food, skip removing the tail; that is how the snake grows.

**The game loop** runs every 150ms (faster as the score increases). Each tick it calls `gameStep()`, which figures out what happened and returns a new state. The loop draws whatever the state says.

**The grid** is 20x20 cells, each 30x30 pixels. Position (0, 0) is the top-left corner. x increases to the right; y increases downward.

---

## Your Tasks

Open `static/game.js`. Complete each TODO in order. Each one builds on the previous.

### TODO #1: `initSnake()`

Return an array of three cells for the starting snake. Head at (10, 10), facing right.

```js
// Expected output:
[ {x:10, y:10}, {x:9, y:10}, {x:8, y:10} ]
```

**Testing:** Once this is in place, reloading the page should show a green snake in the center (even before movement works).

---

### TODO #2: `spawnFood(snake)`

Return a random `{x, y}` grid position that is not on the snake.

```js
// Random cell:
let x = Math.floor(Math.random() * GRID_SIZE);
let y = Math.floor(Math.random() * GRID_SIZE);

// Check whether it overlaps the snake:
snake.some(cell => cell.x === x && cell.y === y)
```

Keep picking new positions until you find a clear one. A `do...while` loop works well here.

**Testing:** A red circle should appear somewhere on the board.

---

### TODO #3: `moveSnake(snake, direction)`

Return a new array with the snake moved one cell in the given direction. Do not modify the original array.

Direction deltas:

| Direction | dx | dy |
|-----------|----|----|
| UP        | 0  | -1 |
| DOWN      | 0  | +1 |
| LEFT      | -1 | 0  |
| RIGHT     | +1 | 0  |

```js
// New head:
const newHead = { x: snake[0].x + dx, y: snake[0].y + dy };

// New snake (drop the tail):
return [newHead, ...snake.slice(0, -1)];
```

**Testing:** The snake should now move on its own. It will pass through walls for now; that is fixed in TODO #4.

---

### TODO #4: `isCollision(snake)`

Return `true` if the snake is in an illegal state.

Two checks:

1. **Wall.** The head is outside the grid (`x < 0`, `x >= 20`, `y < 0`, `y >= 20`).
2. **Self.** The head overlaps any other body cell.

```js
const head = snake[0];

// Wall check:
if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) return true;

// Self check:
if (snake.slice(1).some(cell => cell.x === head.x && cell.y === head.y)) return true;

return false;
```

**Testing:** The game should now end when the snake hits a wall or itself.

---

### TODO #5: `didEatFood(snake, food)`

Return `true` if the snake's head is at the food's position.

```js
return snake[0].x === food.x && snake[0].y === food.y;
```

**Testing:** Nothing changes visually yet. This function gets wired in during TODO #7.

---

### TODO #6: `handleKeyPress(event, currentDirection)`

Return the new direction based on a key press. Block any move that would reverse the snake into itself.

Supported keys: arrow keys and WASD.

```js
// Use event.code to identify the key:
// "ArrowUp" or "KeyW"  =>  "UP"
// "ArrowDown" or "KeyS" => "DOWN"
// etc.
```

Reverse pairs block each other: UP/DOWN and LEFT/RIGHT. If the user presses the opposite direction, ignore it and return `currentDirection`.

**Testing:** You should now control the snake with arrow keys or WASD.

---

### TODO #7: `gameStep(gameState)`

This is the main tick. It takes the current game state and returns the next one.

`gameState` has:

```js
{
  snake:     [...],     // current snake positions
  food:      {x, y},    // current food position
  direction: "RIGHT",   // current direction
  score:     0,         // current score
  speed:     150,       // tick interval in ms
  running:   true,      // false means game over
}
```

Steps:

1. Move the snake: `const newSnake = moveSnake(snake, direction)`.
2. Collision check: if a hit, `return { ...gameState, running: false }`.
3. Food check:
   - **Ate food:** grow the snake (new head, keep the old tail), spawn new food, increment score, recalculate speed.
   - **No food:** return the moved snake as is.

**Growing the snake.** When food is eaten, instead of `[newHead, ...snake.slice(0, -1)]`, use `[newHead, ...snake]`. Keeping the tail makes the snake one cell longer.

**Speed calculation:**

```js
const newSpeed = Math.max(MIN_SPEED, INITIAL_SPEED - Math.floor(newScore / SPEED_STEP_SCORE) * SPEED_INCREMENT);
```

Use the spread operator to return a new state object:

```js
return { ...gameState, snake: newSnake, score: newScore, food: newFood, speed: newSpeed };
```

**Testing:** You now have a complete working game. Play it.

---

## The Leaderboard (Flask, TODOs #8 and #9)

Open `app.py`. There are two routes to implement.

### TODO #8: `save_score()` (POST /api/score)

The browser sends `{ "name": "Alice", "score": 42 }`. Save it to `scores.json`.

```python
data = request.get_json()
# Load existing scores (handle missing file):
try:
    with open(SCORES_FILE) as f:
        scores = json.load(f)
except FileNotFoundError:
    scores = []

# Add the new score:
scores.append({
    "name": data["name"],
    "score": data["score"],
    "date": str(date.today())
})

# Save back:
with open(SCORES_FILE, "w") as f:
    json.dump(scores, f)

return jsonify({"ok": True})
```

### TODO #9: `get_leaderboard()` (GET /api/leaderboard)

Load `scores.json`, sort by score descending, and return the top 10.

```python
try:
    with open(SCORES_FILE) as f:
        scores = json.load(f)
except FileNotFoundError:
    scores = []

scores.sort(key=lambda x: x["score"], reverse=True)
return jsonify(scores[:10])
```

**Testing:** Play a game, enter your name, and click "Save Score". Your name should appear in the Top Scores panel.

---

## Ideas to Make It Your Own

Once the base game works, try some of these.

### Change the Look

- Edit `static/style.css` to change colors, fonts, or sizing.
- Give the snake a gradient or a different head shape in `drawSnake()`.

### Change the Feel

- Increase `INITIAL_SPEED` to start slower, or decrease `SPEED_STEP_SCORE` to speed up faster.
- Change `CELL_SIZE`, and update the canvas width and height in `game.html` to match.

### Add Obstacles

- Create an array of wall cells at the start.
- Draw them in gray.
- Add a check in `isCollision()` for hitting a wall cell.

### Wrap-Around Walls

- Instead of ending the game on a wall collision, teleport the snake to the other side.
- Modify `moveSnake()` to use `% GRID_SIZE` on the new head's position.

### Multiple Food

- Keep an array of food instead of a single cell.
- Spawn three at a time. Replace whichever one gets eaten.

### Different Food Types

- Regular food: +1 point
- Bonus food (appears for five seconds): +3 points
- Poison food: -1 length

---

## Extension: AI Snake

After the game works, add an auto-play mode. The AI uses a greedy algorithm: at each step it looks at the four possible moves and picks the one that gets closer to the food without immediately hitting a wall or itself.

Add this to `game.js`:

```js
function autoPlayStep(gameState) {
  const { snake, food, direction } = gameState;
  const head = snake[0];

  const moves = {
    "UP":    { dx: 0,  dy: -1 },
    "DOWN":  { dx: 0,  dy:  1 },
    "LEFT":  { dx: -1, dy:  0 },
    "RIGHT": { dx: 1,  dy:  0 },
  };

  // Cannot reverse
  const opposites = { "UP": "DOWN", "DOWN": "UP", "LEFT": "RIGHT", "RIGHT": "LEFT" };

  let bestDir = direction;
  let bestDist = Infinity;

  for (const [dir, delta] of Object.entries(moves)) {
    if (dir === opposites[direction]) continue;  // no reversing

    const nx = head.x + delta.dx;
    const ny = head.y + delta.dy;

    // Skip moves that would immediately kill the snake
    const testSnake = [{ x: nx, y: ny }, ...snake.slice(0, -1)];
    if (isCollision(testSnake)) continue;

    const dist = Math.abs(nx - food.x) + Math.abs(ny - food.y);
    if (dist < bestDist) {
      bestDist = dist;
      bestDir = dir;
    }
  }

  return bestDir;
}
```

Then add a button inside `#canvas-wrapper` in `templates/game.html`:

```html
<button id="autoplay-btn">Auto-play</button>
```

The game loop already checks for `autoPlayStep` and hooks it up. The `watchSpeedChange` and loop code in `game.js` show how it is wired.

The greedy AI is not perfect; it can trap itself. The interesting question is why. Can you make it smarter?

---

## Reflection Questions

1. Why is the snake stored as an array with index 0 as the head? What would break if it were stored the other way?
2. `moveSnake()` returns a new array instead of modifying the existing one. Why does that matter for `gameStep()`?
3. The greedy AI picks the move that gets closest to the food. What kind of board layout can fool it into dying? Draw an example.
4. The leaderboard is stored in a JSON file. What are the downsides of that approach? What would you use instead for a production game?
5. The speed currently increases forever (up to `MIN_SPEED`). Is that a good design decision? How would you change it?
