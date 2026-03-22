/*
 * Snake Game - Core Logic
 * =======================
 *
 * This is where the game lives. You will implement the core mechanics
 * one function at a time. By the end, you will have a working game that
 * anyone can play at your public URL.
 *
 * YOUR TASKS (in order):
 *   TODO #1: initSnake()         - Create the starting snake
 *   TODO #2: spawnFood(snake)    - Place food on the board
 *   TODO #3: moveSnake(snake, direction) - Move the snake one step
 *   TODO #4: isCollision(snake)  - Detect wall and self collisions
 *   TODO #5: didEatFood(snake, food) - Detect food collection
 *   TODO #6: handleKeyPress(event, currentDirection) - Keyboard controls
 *   TODO #7: gameStep(gameState) - The main game tick (uses all of the above)
 *
 * The drawing functions, leaderboard, and game loop wiring are all provided.
 * Focus on the logic inside each TODO.
 */


// =============================================================================
// CONSTANTS (PROVIDED)
// =============================================================================

const CANVAS_SIZE  = 600;   // pixels
const CELL_SIZE    = 30;    // pixels per grid cell
const GRID_SIZE    = 20;    // cells per row/column (600 / 30 = 20)

const INITIAL_SPEED     = 150;  // milliseconds between game ticks
const SPEED_INCREMENT   = 10;   // ms faster every SPEED_STEP_SCORE points
const SPEED_STEP_SCORE  = 5;    // points between speed increases
const MIN_SPEED         = 60;   // fastest the game can go (ms)

// Colors
const COLOR_BACKGROUND  = "#0f0f1a";
const COLOR_GRID        = "#16213e";
const COLOR_SNAKE_HEAD  = "#4ade80";
const COLOR_SNAKE_BODY  = "#22c55e";
const COLOR_FOOD        = "#f87171";


// =============================================================================
// DRAWING FUNCTIONS (PROVIDED)
// =============================================================================

/**
 * Draw a single grid cell filled with color.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x - Grid column (0 to GRID_SIZE-1)
 * @param {number} y - Grid row (0 to GRID_SIZE-1)
 * @param {string} color - CSS color string
 */
function drawCell(ctx, x, y, color) {
  const padding = 2;
  ctx.fillStyle = color;
  ctx.fillRect(
    x * CELL_SIZE + padding,
    y * CELL_SIZE + padding,
    CELL_SIZE - padding * 2,
    CELL_SIZE - padding * 2
  );
}

/**
 * Draw subtle grid lines on the canvas.
 * @param {CanvasRenderingContext2D} ctx
 */
function drawGrid(ctx) {
  ctx.strokeStyle = COLOR_GRID;
  ctx.lineWidth = 0.5;
  for (let i = 0; i <= GRID_SIZE; i++) {
    ctx.beginPath();
    ctx.moveTo(i * CELL_SIZE, 0);
    ctx.lineTo(i * CELL_SIZE, CANVAS_SIZE);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, i * CELL_SIZE);
    ctx.lineTo(CANVAS_SIZE, i * CELL_SIZE);
    ctx.stroke();
  }
}

/**
 * Draw the entire snake. Index 0 is the head (brighter color).
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array<{x: number, y: number}>} snake
 */
function drawSnake(ctx, snake) {
  for (let i = 0; i < snake.length; i++) {
    const color = i === 0 ? COLOR_SNAKE_HEAD : COLOR_SNAKE_BODY;
    drawCell(ctx, snake[i].x, snake[i].y, color);
  }
}

/**
 * Draw the food as a filled circle.
 * @param {CanvasRenderingContext2D} ctx
 * @param {{x: number, y: number}} food
 */
function drawFood(ctx, food) {
  const cx = food.x * CELL_SIZE + CELL_SIZE / 2;
  const cy = food.y * CELL_SIZE + CELL_SIZE / 2;
  const radius = CELL_SIZE / 2 - 4;
  ctx.fillStyle = COLOR_FOOD;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Update the score counter in the page header.
 * @param {number} score
 */
function drawScore(score) {
  document.getElementById("score").textContent = score;
}

/**
 * Show the game-over overlay with the final score.
 * @param {number} score
 */
function showGameOver(score) {
  document.getElementById("final-score").textContent = score;
  document.getElementById("game-over-overlay").classList.remove("hidden");
}

/**
 * Hide the game-over overlay.
 */
function hideGameOver() {
  document.getElementById("game-over-overlay").classList.add("hidden");
}


// =============================================================================
// LEADERBOARD FUNCTIONS (PROVIDED)
// =============================================================================

/**
 * POST a score to the server.
 * @param {string} playerName
 * @param {number} score
 */
function submitScore(playerName, score) {
  fetch("/api/score", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: playerName, score: score })
  })
    .then(res => res.json())
    .then(() => {
      loadLeaderboard();
    })
    .catch(err => console.error("Failed to save score:", err));
}

/**
 * GET the leaderboard from the server and render it in the DOM.
 */
function loadLeaderboard() {
  fetch("/api/leaderboard")
    .then(res => res.json())
    .then(scores => {
      const list = document.getElementById("leaderboard-list");
      list.innerHTML = "";
      if (scores.length === 0) {
        const li = document.createElement("li");
        li.innerHTML = '<span class="empty-msg">No scores yet. Be the first!</span>';
        list.appendChild(li);
        return;
      }
      scores.forEach((entry, index) => {
        const li = document.createElement("li");
        li.innerHTML = `
          <span class="lb-rank">#${index + 1}</span>
          <span class="lb-name">${entry.name}</span>
          <span class="lb-score">${entry.score}</span>
          <span class="lb-date">${entry.date}</span>
        `;
        list.appendChild(li);
      });
    })
    .catch(err => console.error("Failed to load leaderboard:", err));
}


// =============================================================================
// TODO #1: CREATE THE STARTING SNAKE
// =============================================================================

/**
 * Return the initial snake as an array of {x, y} grid positions.
 *
 * The snake should be 3 cells long, facing right, with its head at (10, 10).
 *
 * HINT: Index 0 is always the head. The body extends to the left.
 *       So head is at x=10, next cell at x=9, tail at x=8. All at y=10.
 *
 * @returns {Array<{x: number, y: number}>}
 */
function initSnake() {
  // TODO: Return an array of 3 cells
  // [
  //   { x: 10, y: 10 },  // head
  //   { x: 9,  y: 10 },  // body
  //   { x: 8,  y: 10 },  // tail
  // ]
}


// =============================================================================
// TODO #2: SPAWN FOOD IN A RANDOM EMPTY CELL
// =============================================================================

/**
 * Return a random {x, y} grid position that is NOT occupied by the snake.
 *
 * HINT: Use Math.floor(Math.random() * GRID_SIZE) to pick a random column or row.
 * HINT: Use snake.some(cell => cell.x === x && cell.y === y) to check if the
 *       position is already taken.
 * HINT: Keep trying until you find a free position.
 *
 * @param {Array<{x: number, y: number}>} snake
 * @returns {{x: number, y: number}}
 */
function spawnFood(snake) {
  // TODO: Pick a random cell that is not on the snake.
  //
  // let x, y;
  // do {
  //   x = Math.floor(Math.random() * GRID_SIZE);
  //   y = Math.floor(Math.random() * GRID_SIZE);
  // } while ( /* position is on the snake */ );
  // return { x, y };
}


// =============================================================================
// TODO #3: MOVE THE SNAKE ONE STEP
// =============================================================================

/**
 * Return a NEW snake array moved one step in the given direction.
 * Do NOT modify the original array.
 *
 * HOW SNAKE MOVEMENT WORKS:
 *   - Add a new head in the direction of movement.
 *   - Remove the tail (last element).
 *   - The body just shifts along: every cell takes the position
 *     the cell in front of it just vacated.
 *
 * Direction deltas:
 *   "UP"    => { dx:  0, dy: -1 }
 *   "DOWN"  => { dx:  0, dy:  1 }
 *   "LEFT"  => { dx: -1, dy:  0 }
 *   "RIGHT" => { dx:  1, dy:  0 }
 *
 * HINT: newHead = { x: snake[0].x + dx, y: snake[0].y + dy }
 * HINT: Use slice(0, -1) to drop the last element of an array.
 * HINT: Use [newHead, ...snake.slice(0, -1)] to build the new array.
 *
 * @param {Array<{x: number, y: number}>} snake
 * @param {string} direction - "UP" | "DOWN" | "LEFT" | "RIGHT"
 * @returns {Array<{x: number, y: number}>}
 */
function moveSnake(snake, direction) {
  // TODO: Calculate the delta for the given direction.
  // TODO: Build and return the new snake array.
}


// =============================================================================
// TODO #4: CHECK FOR COLLISIONS
// =============================================================================

/**
 * Return true if the snake has collided with a wall or with itself.
 *
 * Check #1 - Wall collision:
 *   The head (snake[0]) is out of bounds if:
 *     x < 0 OR x >= GRID_SIZE OR y < 0 OR y >= GRID_SIZE
 *
 * Check #2 - Self collision:
 *   The head overlaps any other cell in the snake (snake[1], snake[2], ...).
 *   Use snake.slice(1).some(cell => cell.x === head.x && cell.y === head.y)
 *
 * @param {Array<{x: number, y: number}>} snake
 * @returns {boolean}
 */
function isCollision(snake) {
  // TODO: Check wall collision.
  // TODO: Check self collision.
  // TODO: Return true if either applies.
}


// =============================================================================
// TODO #5: CHECK IF THE SNAKE ATE THE FOOD
// =============================================================================

/**
 * Return true if the snake's head is at the same position as the food.
 *
 * HINT: Compare snake[0].x === food.x && snake[0].y === food.y
 *
 * @param {Array<{x: number, y: number}>} snake
 * @param {{x: number, y: number}} food
 * @returns {boolean}
 */
function didEatFood(snake, food) {
  // TODO: Return true if the head is on the food.
}


// =============================================================================
// TODO #6: HANDLE KEYBOARD INPUT
// =============================================================================

/**
 * Return the new direction based on a keydown event.
 * Ignore keys that would reverse the snake (180-degree turn).
 * Return currentDirection unchanged for any unrecognized key.
 *
 * Supported keys:
 *   ArrowUp    / KeyW  => "UP"
 *   ArrowDown  / KeyS  => "DOWN"
 *   ArrowLeft  / KeyA  => "LEFT"
 *   ArrowRight / KeyD  => "RIGHT"
 *
 * Reverse pairs to block:
 *   UP <-> DOWN
 *   LEFT <-> RIGHT
 *
 * HINT: Use event.code to get the key (e.g. "ArrowUp", "KeyW").
 * HINT: Check the reverse before returning. If the new direction
 *       is directly opposite to currentDirection, return currentDirection.
 *
 * @param {KeyboardEvent} event
 * @param {string} currentDirection - "UP" | "DOWN" | "LEFT" | "RIGHT"
 * @returns {string}
 */
function handleKeyPress(event, currentDirection) {
  // TODO: Map keys to directions.
  // TODO: Block 180-degree reversals.
  // TODO: Return the new direction (or currentDirection if nothing changed).
}


// =============================================================================
// TODO #7: THE MAIN GAME TICK
// =============================================================================

/**
 * Compute the next game state from the current one.
 *
 * This function ties everything together. Each time the game loop fires,
 * it calls gameStep() and uses the returned state for the next frame.
 *
 * gameState shape:
 *   {
 *     snake:     Array<{x, y}>,
 *     food:      {x, y},
 *     direction: string,
 *     score:     number,
 *     speed:     number,   // current interval in ms
 *     running:   boolean,
 *   }
 *
 * Steps:
 *   1. Move the snake in the current direction.
 *   2. Check for collision. If collision: return { ...gameState, running: false }.
 *   3. Check if the snake ate the food.
 *      YES: spawn new food, increment score, recalculate speed.
 *           Return updated state. (The snake grows because we keep the tail.)
 *      NO:  Return updated state with the moved snake.
 *
 * Growing the snake when food is eaten:
 *   Normally moveSnake removes the tail. When food is eaten, we keep the
 *   tail by NOT removing it. The easiest way: build the new snake as
 *   [newHead, ...snake] instead of [newHead, ...snake.slice(0, -1)].
 *   OR: call moveSnake normally, then push the old tail back on.
 *   OR: add a separate growSnake() step.
 *
 * Speed calculation:
 *   newSpeed = Math.max(MIN_SPEED, INITIAL_SPEED - Math.floor(newScore / SPEED_STEP_SCORE) * SPEED_INCREMENT)
 *
 * HINT: Use the spread operator to copy state:
 *   return { ...gameState, snake: newSnake, score: newScore, ... }
 *
 * @param {object} gameState
 * @returns {object} - Next game state
 */
function gameStep(gameState) {
  // TODO: Destructure what you need from gameState.
  // TODO: Move the snake.
  // TODO: Check collision — return stopped state if hit.
  // TODO: Check food — grow, new food, update score & speed if eaten.
  // TODO: Return new state.
}


// =============================================================================
// GAME LOOP & EVENT WIRING (PROVIDED)
// =============================================================================

(function () {
  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");

  let gameState = null;
  let loopInterval = null;
  let autoPlay = false;

  function buildInitialState() {
    const snake = initSnake();
    return {
      snake: snake,
      food: spawnFood(snake),
      direction: "RIGHT",
      score: 0,
      speed: INITIAL_SPEED,
      running: true,
    };
  }

  function render(state) {
    // Clear
    ctx.fillStyle = COLOR_BACKGROUND;
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    drawGrid(ctx);
    drawFood(ctx, state.food);
    drawSnake(ctx, state.snake);
    drawScore(state.score);
  }

  function startLoop(state) {
    if (loopInterval) clearInterval(loopInterval);
    gameState = state;

    loopInterval = setInterval(function () {
      // If auto-play is active, override the direction with the AI's choice
      if (autoPlay && typeof autoPlayStep === "function") {
        gameState = { ...gameState, direction: autoPlayStep(gameState) };
      }

      const nextState = gameStep(gameState);
      gameState = nextState;
      render(gameState);

      if (!gameState.running) {
        clearInterval(loopInterval);
        loopInterval = null;
        showGameOver(gameState.score);
      }
    }, state.speed);
  }

  function restartGame() {
    autoPlay = false;
    const btn = document.getElementById("autoplay-btn");
    if (btn) btn.classList.remove("active");

    hideGameOver();
    drawScore(0);

    const initial = buildInitialState();
    render(initial);
    startLoop(initial);
  }

  // Speed may change as the score increases — restart the interval when needed
  function watchSpeedChange() {
    // The loop interval is fixed at creation time. When the speed field changes,
    // restart the loop so the new speed takes effect.
    setInterval(function () {
      if (gameState && gameState.running && loopInterval) {
        const currentDelay = gameState.speed;
        // We can't read the interval delay directly, so we track it separately.
        if (currentDelay !== gameState._lastKnownSpeed) {
          gameState._lastKnownSpeed = currentDelay;
          startLoop(gameState);
        }
      }
    }, 200);
  }

  // Keyboard input
  document.addEventListener("keydown", function (event) {
    if (!gameState || !gameState.running) return;
    // Prevent arrow keys from scrolling the page
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.code)) {
      event.preventDefault();
    }
    const newDirection = handleKeyPress(event, gameState.direction);
    gameState = { ...gameState, direction: newDirection };
  });

  // Restart button
  document.getElementById("restart-btn").addEventListener("click", restartGame);

  // Submit score button
  document.getElementById("submit-score-btn").addEventListener("click", function () {
    const name = document.getElementById("player-name").value.trim();
    if (!name) {
      document.getElementById("player-name").focus();
      return;
    }
    submitScore(name, gameState.score);
    document.getElementById("submit-score-btn").textContent = "Saved!";
    document.getElementById("submit-score-btn").disabled = true;
  });

  // Auto-play button (added by extension)
  const autoplayBtn = document.getElementById("autoplay-btn");
  if (autoplayBtn) {
    autoplayBtn.addEventListener("click", function () {
      autoPlay = !autoPlay;
      autoplayBtn.classList.toggle("active", autoPlay);
      autoplayBtn.textContent = autoPlay ? "Auto: ON" : "Auto-play";
    });
  }

  // Kick things off
  const initial = buildInitialState();
  render(initial);
  startLoop(initial);
  watchSpeedChange();
  loadLeaderboard();
})();
