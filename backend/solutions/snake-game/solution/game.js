/*
 * Snake Game - SOLUTION
 * =====================
 * Complete implementation of all TODOs.
 * This file is for instructor reference only.
 */


// =============================================================================
// CONSTANTS
// =============================================================================

const CANVAS_SIZE  = 600;
const CELL_SIZE    = 30;
const GRID_SIZE    = 20;

const INITIAL_SPEED     = 150;
const SPEED_INCREMENT   = 10;
const SPEED_STEP_SCORE  = 5;
const MIN_SPEED         = 60;

const COLOR_BACKGROUND  = "#0f0f1a";
const COLOR_GRID        = "#16213e";
const COLOR_SNAKE_HEAD  = "#4ade80";
const COLOR_SNAKE_BODY  = "#22c55e";
const COLOR_FOOD        = "#f87171";


// =============================================================================
// DRAWING FUNCTIONS (PROVIDED)
// =============================================================================

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

function drawSnake(ctx, snake) {
  for (let i = 0; i < snake.length; i++) {
    const color = i === 0 ? COLOR_SNAKE_HEAD : COLOR_SNAKE_BODY;
    drawCell(ctx, snake[i].x, snake[i].y, color);
  }
}

function drawFood(ctx, food) {
  const cx = food.x * CELL_SIZE + CELL_SIZE / 2;
  const cy = food.y * CELL_SIZE + CELL_SIZE / 2;
  const radius = CELL_SIZE / 2 - 4;
  ctx.fillStyle = COLOR_FOOD;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawScore(score) {
  document.getElementById("score").textContent = score;
}

function showGameOver(score) {
  document.getElementById("final-score").textContent = score;
  document.getElementById("game-over-overlay").classList.remove("hidden");
}

function hideGameOver() {
  document.getElementById("game-over-overlay").classList.add("hidden");
}


// =============================================================================
// LEADERBOARD FUNCTIONS (PROVIDED)
// =============================================================================

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
// TODO #1 SOLUTION: initSnake()
// =============================================================================

function initSnake() {
  return [
    { x: 10, y: 10 },
    { x: 9,  y: 10 },
    { x: 8,  y: 10 },
  ];
}


// =============================================================================
// TODO #2 SOLUTION: spawnFood(snake)
// =============================================================================

function spawnFood(snake) {
  let x, y;
  do {
    x = Math.floor(Math.random() * GRID_SIZE);
    y = Math.floor(Math.random() * GRID_SIZE);
  } while (snake.some(cell => cell.x === x && cell.y === y));
  return { x, y };
}


// =============================================================================
// TODO #3 SOLUTION: moveSnake(snake, direction)
// =============================================================================

function moveSnake(snake, direction) {
  const deltas = {
    "UP":    { dx:  0, dy: -1 },
    "DOWN":  { dx:  0, dy:  1 },
    "LEFT":  { dx: -1, dy:  0 },
    "RIGHT": { dx:  1, dy:  0 },
  };
  const { dx, dy } = deltas[direction];
  const newHead = { x: snake[0].x + dx, y: snake[0].y + dy };
  return [newHead, ...snake.slice(0, -1)];
}


// =============================================================================
// TODO #4 SOLUTION: isCollision(snake)
// =============================================================================

function isCollision(snake) {
  const head = snake[0];

  // Wall collision
  if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
    return true;
  }

  // Self collision
  if (snake.slice(1).some(cell => cell.x === head.x && cell.y === head.y)) {
    return true;
  }

  return false;
}


// =============================================================================
// TODO #5 SOLUTION: didEatFood(snake, food)
// =============================================================================

function didEatFood(snake, food) {
  return snake[0].x === food.x && snake[0].y === food.y;
}


// =============================================================================
// TODO #6 SOLUTION: handleKeyPress(event, currentDirection)
// =============================================================================

function handleKeyPress(event, currentDirection) {
  const keyMap = {
    "ArrowUp":    "UP",
    "KeyW":       "UP",
    "ArrowDown":  "DOWN",
    "KeyS":       "DOWN",
    "ArrowLeft":  "LEFT",
    "KeyA":       "LEFT",
    "ArrowRight": "RIGHT",
    "KeyD":       "RIGHT",
  };

  const opposites = {
    "UP": "DOWN",
    "DOWN": "UP",
    "LEFT": "RIGHT",
    "RIGHT": "LEFT",
  };

  const newDirection = keyMap[event.code];
  if (!newDirection) return currentDirection;
  if (newDirection === opposites[currentDirection]) return currentDirection;
  return newDirection;
}


// =============================================================================
// TODO #7 SOLUTION: gameStep(gameState)
// =============================================================================

function gameStep(gameState) {
  const { snake, food, direction, score, speed } = gameState;

  // Step 1: Move the snake
  const deltas = {
    "UP":    { dx:  0, dy: -1 },
    "DOWN":  { dx:  0, dy:  1 },
    "LEFT":  { dx: -1, dy:  0 },
    "RIGHT": { dx:  1, dy:  0 },
  };
  const { dx, dy } = deltas[direction];
  const newHead = { x: snake[0].x + dx, y: snake[0].y + dy };

  // Step 2: Collision check (test the new head before committing)
  const testSnake = [newHead, ...snake.slice(0, -1)];
  if (isCollision(testSnake)) {
    return { ...gameState, running: false };
  }

  // Step 3: Food check
  if (didEatFood(testSnake, food)) {
    // Grow: keep the full snake (new head + entire old snake, no tail removal)
    const grownSnake = [newHead, ...snake];
    const newScore = score + 1;
    const newFood = spawnFood(grownSnake);
    const newSpeed = Math.max(
      MIN_SPEED,
      INITIAL_SPEED - Math.floor(newScore / SPEED_STEP_SCORE) * SPEED_INCREMENT
    );
    return {
      ...gameState,
      snake: grownSnake,
      food: newFood,
      score: newScore,
      speed: newSpeed,
    };
  }

  // No food eaten: just update snake position
  return { ...gameState, snake: testSnake };
}


// =============================================================================
// EXTENSION SOLUTION: autoPlayStep(gameState) -- greedy AI
// =============================================================================

function autoPlayStep(gameState) {
  const { snake, food, direction } = gameState;
  const head = snake[0];

  const moves = {
    "UP":    { dx:  0, dy: -1 },
    "DOWN":  { dx:  0, dy:  1 },
    "LEFT":  { dx: -1, dy:  0 },
    "RIGHT": { dx:  1, dy:  0 },
  };

  const opposites = { "UP": "DOWN", "DOWN": "UP", "LEFT": "RIGHT", "RIGHT": "LEFT" };

  let bestDir = direction;
  let bestDist = Infinity;

  for (const [dir, delta] of Object.entries(moves)) {
    if (dir === opposites[direction]) continue;

    const nx = head.x + delta.dx;
    const ny = head.y + delta.dy;

    // Test if moving here causes an immediate collision
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

  function watchSpeedChange() {
    setInterval(function () {
      if (gameState && gameState.running && loopInterval) {
        const currentDelay = gameState.speed;
        if (currentDelay !== gameState._lastKnownSpeed) {
          gameState._lastKnownSpeed = currentDelay;
          startLoop(gameState);
        }
      }
    }, 200);
  }

  document.addEventListener("keydown", function (event) {
    if (!gameState || !gameState.running) return;
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.code)) {
      event.preventDefault();
    }
    const newDirection = handleKeyPress(event, gameState.direction);
    gameState = { ...gameState, direction: newDirection };
  });

  document.getElementById("restart-btn").addEventListener("click", restartGame);

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

  const autoplayBtn = document.getElementById("autoplay-btn");
  if (autoplayBtn) {
    autoplayBtn.addEventListener("click", function () {
      autoPlay = !autoPlay;
      autoplayBtn.classList.toggle("active", autoPlay);
      autoplayBtn.textContent = autoPlay ? "Auto: ON" : "Auto-play";
    });
  }

  const initial = buildInitialState();
  render(initial);
  startLoop(initial);
  watchSpeedChange();
  loadLeaderboard();
})();
