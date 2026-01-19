# Tic-Tac-Toe AI (Minimax Algorithm)

Build an **unbeatable AI** that plays Tic-Tac-Toe using the minimax algorithm—the same foundational technique used in chess engines, game-playing AIs, and decision-making systems.

## What You'll Learn

By completing this project, you'll understand:

- **How AI "thinks"** by exploring all possible future outcomes
- **Recursive algorithms** that call themselves to solve smaller subproblems
- **Game theory** concepts like optimal play and zero-sum games
- **Algorithm evaluation** by seeing how minimax guarantees the best move

## Quick Start

1. **Open `main.py`** and read through the code structure
2. **Complete the TODOs** in order (1 through 4)
3. **Test your work:** `python test_game.py`
4. **Play the game:** `python main.py`

---

## How the Minimax Algorithm Works

Imagine you're playing a game and thinking ahead:

> "If I move here, they'll probably move there, then I could move here..."

Minimax does this **exhaustively**—it considers **every possible future move** all the way to the end of the game. It assumes both players play perfectly.

### The Core Idea

```
       Current Board
            |
     AI considers move A
           /    \
    Human responds   Human responds
       X              Y
      /  \           /  \
   AI moves...    AI moves...
```

The algorithm works by:

1. **Simulating every possible game** from the current position
2. **Scoring end states**: AI wins (+10), Human wins (-10), Draw (0)
3. **Backing up scores**: AI picks moves that maximize score, Human picks moves that minimize score
4. **Choosing the best move**: The one that leads to the highest guaranteed outcome

### Why "Minimax"?

- **MAX**imizing player (AI): Wants the highest score
- **MIN**imizing player (Human): Wants the lowest score

The AI assumes the human plays perfectly (minimizes AI's score), and picks the move that **maximizes** its **minimum** guaranteed outcome.

### Recursion in Action

```
minimax(board, is_maximizing):
    if game_over:
        return score  # Base case
    
    if is_maximizing:
        best = -infinity
        for each move:
            score = minimax(after_move, False)  # Recursive call
            best = max(best, score)
        return best
    else:
        best = +infinity
        for each move:
            score = minimax(after_move, True)   # Recursive call
            best = min(best, score)
        return best
```

---

## Your Tasks

Open `main.py` and complete these functions **in order**:

### TODO #1: `check_winner(board)`

Detect if X or O has won the game.

**Hints:**
- There are 8 winning combinations (3 rows, 3 columns, 2 diagonals)
- Return `"X"`, `"O"`, or `None`

### TODO #2: `is_board_full(board)`

Check if the board has no empty spaces (draw condition).

**Hints:**
- Check if `EMPTY` (" ") exists in the board
- Return `True` or `False`

### TODO #3: `minimax(board, is_maximizing)`

The heart of the AI—recursively evaluate all possible games.

**Hints:**
- Start with base cases (game over conditions)
- Recursively explore all moves
- Maximize when it's AI's turn, minimize when it's human's turn

### TODO #4: `get_best_move(board)`

Use minimax to find the optimal move for the AI.

**Hints:**
- Try each valid move
- Use minimax to score each move
- Return the move with the highest score

---

## Testing Your Implementation

Run the test suite to verify your work:

```bash
python test_game.py
```

You should see:
- ✅ for passing tests
- ❌ for failing tests (with hints about what went wrong)

**Important:** Implement functions in order! Later tests depend on earlier functions working correctly.

---

## Real-World AI Applications

The minimax algorithm you're implementing is the foundation of many AI systems:

### Game AI
- **Chess engines** (Deep Blue, Stockfish) use minimax with alpha-beta pruning
- **Checkers** was "solved" using minimax—perfect play always leads to a draw
- **Go** (AlphaGo) uses minimax concepts combined with neural networks

### Decision Making
- **Business decisions**: Evaluating competitor responses
- **Security**: Anticipating attacker strategies
- **Economics**: Game theory in market competition

### Modern AI Connections
- **Reinforcement Learning**: Agents learn by simulating outcomes (like minimax)
- **Planning Systems**: Robots plan by considering future states
- **Adversarial AI**: Security systems anticipate malicious inputs

---

## Extension Challenges

Once your basic implementation works, try these enhancements:

### 🟢 Easy: Add Move Counter
Track how many positions minimax evaluates. You'll see it checks thousands of positions!

```python
evaluation_count = 0

def minimax(board, is_maximizing):
    global evaluation_count
    evaluation_count += 1
    # ... rest of function
```

### 🟡 Medium: Alpha-Beta Pruning
Optimize minimax by skipping branches that can't affect the outcome. This is how real chess engines work!

**Concept:** If you've found a guaranteed win down one path, you don't need to explore paths that are already worse.

### 🟡 Medium: Add Depth Scoring
Currently, a win in 1 move scores the same as a win in 5 moves. Modify the scoring to prefer faster wins:

```python
# Instead of just returning 10 or -10:
return 10 - depth  # Prefer winning sooner
return -10 + depth  # Prefer losing later
```

### 🔴 Hard: Implement for a Different Game
Apply minimax to:
- **Connect Four** (larger board, more complex)
- **Nim** (mathematical game)
- **Simple Chess Endgames** (King + Rook vs King)

---

## Reflection Questions

After completing the project, consider these questions:

1. **Why is the AI "unbeatable"?** What would it take to beat an AI using minimax?

2. **How many positions does minimax check?** For an empty board, approximately how many game states does it explore?

3. **Why is recursion natural for this problem?** Could you implement minimax without recursion?

4. **What are the limitations of minimax?** Why can't we use it for games like chess without modifications?

5. **How does this connect to other AI?** What similarities do you see between minimax and how ChatGPT or self-driving cars make decisions?

---

## Code Review Checklist

Before submitting, verify:

- [ ] All tests pass (`python test_game.py`)
- [ ] The game runs without errors (`python main.py`)
- [ ] The AI never loses (test by playing several games)
- [ ] Code is readable with clear variable names
- [ ] You understand how each function works

---

## Troubleshooting

### "AI couldn't find a move"
- Make sure `get_best_move()` returns a position (0-8), not `None`
- Check that you're returning `best_move`, not `best_score`

### AI makes weird moves
- Verify `check_winner()` catches all 8 winning patterns
- Make sure you're using `PLAYER_O` for AI and `PLAYER_X` for human consistently

### Tests fail but game seems to work
- Check return values carefully (`None` vs `False`, `-10` vs `10`)
- Make sure `is_board_full()` returns `True`/`False`, not the result of another check

### "Maximum recursion depth exceeded"
- Your base case might not be triggering
- Make sure `check_winner()` and `is_board_full()` are implemented correctly

---

## Learning Resources

### Minimax Algorithm
- **[Minimax Wikipedia](https://en.wikipedia.org/wiki/Minimax)** - Mathematical foundations
- **[GeeksforGeeks Minimax](https://www.geeksforgeeks.org/minimax-algorithm-in-game-theory-set-1-introduction/)** - Step-by-step tutorial
- **[Sebastian Lague Video](https://www.youtube.com/watch?v=l-hh51ncgDI)** - Excellent visual explanation

### Game Theory & AI
- **[Alpha-Beta Pruning](https://en.wikipedia.org/wiki/Alpha%E2%80%93beta_pruning)** - Optimization technique
- **[Game Theory Basics](https://www.investopedia.com/terms/g/gametheory.asp)** - Real-world applications

### Python Recursion
- **[Real Python - Recursion](https://realpython.com/python-recursion/)** - Recursion tutorial
- **[Visualize Recursion](https://pythontutor.com/)** - Step through code visually

---

## For Instructors

### Suggested Pacing (5-7 class periods)

| Day | Activity |
|-----|----------|
| 1 | Introduce game theory, play Tic-Tac-Toe, discuss "perfect play" |
| 2 | Explain minimax with whiteboard examples, trace algorithm by hand |
| 3 | Students implement `check_winner()` and `is_board_full()` |
| 4 | Students implement `minimax()` with guidance |
| 5 | Students implement `get_best_move()`, test complete AI |
| 6 | Extension: Alpha-beta pruning or different game |
| 7 | Reflection, code review, connect to real-world AI |

### Discussion Prompts

- "What makes Tic-Tac-Toe 'solvable'? Could we apply this to chess?"
- "How is this AI different from ChatGPT or image recognition AI?"
- "What ethical considerations exist for game-playing AI in casinos or competitive gaming?"

### Assessment Ideas

- **Code Review**: Students evaluate each other's implementations
- **Trace Exercise**: Hand-trace minimax on a small game tree
- **Extension Project**: Implement alpha-beta pruning, measure improvement
- **Written Reflection**: Connect minimax to one real-world AI application

### Customization

Copy this template to your classroom's `templates/` directory to:
- Pre-fill some functions for scaffolded learning
- Add additional test cases
- Modify the extension challenges for your class level
