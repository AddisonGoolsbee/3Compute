# Snake

You're going to build Snake. The same game that's been on Nokia phones and Google search results. By the end, you'll have a real game you can share with anyone -- just send them the link.

The game runs in a browser. You write Python (the server) and JavaScript (the game logic). When you're done, anyone with your public URL can play against your leaderboard.

## How to run it

```bash
python app.py
```

Then open the URL printed in your terminal. The game should load. It won't do much yet -- that's your job.

---

## How the game works

Before you start coding, here's the mental model:

**The snake is an array.** Index 0 is the head. Each element is a grid cell `{x, y}`.

```
snake = [
  {x: 10, y: 10},   // head
  {x: 9,  y: 10},   // body
  {x: 8,  y: 10},   // tail
]
```

**Moving the snake** means adding a new head in the direction of travel and removing the tail. The body just shifts along. When the snake eats food, you skip removing the tail -- that's how it grows.

**The game loop** runs every 150ms (faster as your score increases). Each tick it calls `gameStep()`, which figures out what happened and returns a new state. The loop draws whatever the state says.

**The grid** is 20x20 cells. Each cell is 30x30 pixels. Position (0,0) is the top-left corner. x increases right, y increases down.

---

## Your tasks

Open `static/game.js`. Complete each TODO in order. Each one builds on the last.

### TODO #1: `initSnake()`

Return an array of 3 cells for the starting snake. Head at (10, 10), facing right.

```js
// Expected output:
[ {x:10, y:10}, {x:9, y:10}, {x:8, y:10} ]
```

**Testing:** Once you implement this, the game will show a green snake in the center when you load the page (even before movement works).

---

### TODO #2: `spawnFood(snake)`

Return a random `{x, y}` grid position that is not on the snake.

```js
// Random cell:
let x = Math.floor(Math.random() * GRID_SIZE);
let y = Math.floor(Math.random() * GRID_SIZE);

// Check if it's on the snake:
snake.some(cell => cell.x === x && cell.y === y)
```

Keep looping until you find a clear spot. A `do...while` loop works well here.

**Testing:** You should see a red circle appear somewhere on the board.

---

### TODO #3: `moveSnake(snake, direction)`

Return a **new** array with the snake moved one cell in the direction. Do not modify the original.

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

**Testing:** The snake should now move on its own. It'll run into walls and wrap through them for now -- that's fine until TODO #4.

---

### TODO #4: `isCollision(snake)`

Return `true` if the snake is in an illegal state.

Two things to check:
1. **Wall:** Head is outside the grid (x < 0, x >= 20, y < 0, y >= 20)
2. **Self:** Head overlaps any other body cell

```js
const head = snake[0];

// Wall check:
if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) return true;

// Self check:
if (snake.slice(1).some(cell => cell.x === head.x && cell.y === head.y)) return true;

return false;
```

**Testing:** The game should now end when you hit a wall or yourself.

---

### TODO #5: `didEatFood(snake, food)`

Return `true` if the snake's head is at the food's position.

```js
return snake[0].x === food.x && snake[0].y === food.y;
```

One line. That's it.

**Testing:** Nothing changes visually yet -- this gets wired in during TODO #7.

---

### TODO #6: `handleKeyPress(event, currentDirection)`

Return the new direction based on a key press. Block any move that would reverse the snake.

Supported keys: arrow keys and WASD.

```js
// Use event.code to identify the key:
// "ArrowUp" or "KeyW"  =>  "UP"
// "ArrowDown" or "KeyS" => "DOWN"
// etc.
```

The reverse pairs: UP/DOWN block each other, LEFT/RIGHT block each other. If someone presses the opposite direction, ignore it and return `currentDirection`.

**Testing:** You should now control the snake with arrow keys or WASD.

---

### TODO #7: `gameStep(gameState)`

This is the main tick. It takes the current game state and returns the next one.

`gameState` has:
```js
{
  snake:     [...],     // current snake positions
  food:      {x, y},   // current food position
  direction: "RIGHT",  // current direction
  score:     0,        // current score
  speed:     150,      // current tick interval in ms
  running:   true,     // false means game over
}
```

Steps:
1. Move the snake: `const newSnake = moveSnake(snake, direction)`
2. Collision check: if hit, `return { ...gameState, running: false }`
3. Food check:
   - **Ate food:** grow the snake (add new head but keep old tail), spawn new food, increment score, recalculate speed
   - **No food:** just return the moved snake

**Growing the snake:** When food is eaten, instead of `[newHead, ...snake.slice(0, -1)]`, use `[newHead, ...snake]`. You keep the tail, so the snake gets one cell longer.

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

## The leaderboard (Flask, TODOs #8 and #9)

Open `app.py`. There are two routes to implement.

**TODO #8: `save_score()` -- POST /api/score**

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

**TODO #9: `get_leaderboard()` -- GET /api/leaderboard**

Load `scores.json`, sort by score descending, return the top 10.

```python
try:
    with open(SCORES_FILE) as f:
        scores = json.load(f)
except FileNotFoundError:
    scores = []

scores.sort(key=lambda x: x["score"], reverse=True)
return jsonify(scores[:10])
```

**Testing:** Play a game, enter your name, click "Save Score". Your name should appear in the Top Scores panel.

---

## Ideas to make it your own

Once the base game works, try some of these:

**Change the look**
- Edit `static/style.css` to change colors, fonts, or sizing
- Give the snake a gradient or different head shape in `drawSnake()`

**Change the feel**
- Increase `INITIAL_SPEED` to start slower, or decrease `SPEED_STEP_SCORE` to speed up faster
- Change `CELL_SIZE` (and update the canvas width/height in game.html to match)

**Add obstacles**
- Create an array of wall cells at the start
- Draw them in gray
- Add a check in `isCollision()` for hitting a wall cell

**Wrap-around walls**
- Instead of ending the game on wall collision, teleport the snake to the other side
- Modify `moveSnake()` to use `% GRID_SIZE` on the new head's position

**Multiple food**
- Keep an array of food instead of a single cell
- Spawn 3 at a time, replace whichever one gets eaten

**Different food types**
- Regular food: +1 point
- Bonus food (appears for 5 seconds): +3 points
- Poison food: -1 length

---

## Extension: AI Snake

After the game works, add an auto-play mode. The AI uses a greedy algorithm: at each step, it looks at all four possible moves and picks the one that gets closer to the food without immediately hitting a wall or itself.

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

  // Can't reverse
  const opposites = { "UP": "DOWN", "DOWN": "UP", "LEFT": "RIGHT", "RIGHT": "LEFT" };

  let bestDir = direction;
  let bestDist = Infinity;

  for (const [dir, delta] of Object.entries(moves)) {
    if (dir === opposites[direction]) continue;  // no reversing

    const nx = head.x + delta.dx;
    const ny = head.y + delta.dy;

    // Skip immediately unsafe moves
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

Then add a button in `templates/game.html` inside `#canvas-wrapper`:
```html
<button id="autoplay-btn">Auto-play</button>
```

The game loop already checks for `autoPlayStep` and hooks it up -- look at the `watchSpeedChange` / loop code in `game.js` for how it's wired.

This greedy AI is not perfect. It can trap itself. The interesting question: why? Can you make it smarter?

---

## Reflection questions

1. Why is the snake represented as an array where index 0 is the head? What would break if you stored it the other way?

2. `moveSnake()` returns a new array instead of modifying the existing one. Why does that matter for `gameStep()`?

3. The greedy AI picks the move that gets closest to food. What kind of board layout can fool it into dying? Draw an example.

4. The leaderboard is stored in a JSON file. What are the downsides of this approach? What would you use instead for a real production game?

5. Right now, the speed increases forever (up to `MIN_SPEED`). Is that a good game design decision? How would you adjust it?
