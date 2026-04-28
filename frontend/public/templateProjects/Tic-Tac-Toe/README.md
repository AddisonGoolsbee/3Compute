# Tic-Tac-Toe AI (Minimax)

Build a Tic-Tac-Toe AI that cannot be beaten. The algorithm you write — minimax — is the same foundational idea behind chess engines and many other game-playing AIs.

## Quick Start

Right-click the `Tic-Tac-Toe` folder in the file explorer and choose **Open in Terminal**, then:

```bash
pip install -r requirements.txt
python test_warmup.py   # recursion warm-up — start here
python test_game.py     # main tests — run as you implement each function
python main.py          # play the game once test_game.py passes
```

You'll write five functions across two files. Do them in order — each one prepares you for the next.

**Step 0 — `warmup_factorial.py`**

- **`factorial(n)`** — return `n!`. A tiny recursive function so you've written one before tackling minimax.

**Steps 1-4 — `main.py`**

1. **`check_winner(board)`** — return `"X"`, `"O"`, or `None`.
2. **`is_board_full(board)`** — return `True` or `False`.
3. **`minimax(board, is_ai_turn)`** — recursively score the position.
4. **`get_best_move(board)`** — use minimax to pick the AI's move.

Run the matching test file after each step. Move on once it passes.

Stuck on minimax? Skip down to [How Minimax Works](#how-minimax-works) and [Pseudocode](#pseudocode) before you start writing code.

## TODO Hints

### Step 0: `factorial(n)` (warmup_factorial.py)

Every recursive function has two parts: a **base case** that returns directly, and a **recursive case** that calls itself with a smaller input. For factorial: `factorial(0) == 1`, and `factorial(n) == n * factorial(n - 1)`. Internalize that shape — you'll use it again in `minimax`.

### TODO #1: `check_winner(board)`

There are eight winning lines: three rows, three columns, two diagonals. A line wins only if all three squares hold the same non-empty player. Three blanks in a row are not a win.

### TODO #2: `is_board_full(board)`

Either check whether `EMPTY` (`" "`) still appears in the board, or check the length of `get_valid_moves(board)`. Return `True` or `False`.

### TODO #3: `minimax(board, is_ai_turn)`

This is the hardest function. The shape is the same as `factorial` from Step 0 — a base case plus a recursive case — but with two differences: there are **three** base cases (AI won, human won, board full), and the recursive case loops over every empty square instead of taking one step `n - 1`.

Handle the base cases first (somebody won, or the board is full). Then write the recursive case: try every empty square as the next move, recurse, and pick the best score. Maximize on the AI's turn, minimize on the human's turn. The pseudocode below maps directly to the code.

### TODO #4: `get_best_move(board)`

Call `minimax` once for each empty square (with `is_ai_turn=False`, because after the AI moves it's the human's turn) and return the square with the highest score.

## How Minimax Works

Imagine playing a game and thinking ahead: *"If I move here, they'll probably move there, then I could move here…"*

Minimax does this exhaustively. From the current position it considers every possible future move, all the way to the end of the game, assuming both players play perfectly.

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

The algorithm:

1. **Simulate every possible game** from the current position.
2. **Score the end states:** AI wins (+10), Human wins (-10), Draw (0).
3. **Back the scores up the tree.** The AI picks moves that maximize the score; the human picks moves that minimize it.
4. **Choose the best move:** the one that leads to the highest guaranteed outcome against a perfect opponent.

### Why the name "minimax"

- The **MAX**imizing player (AI) wants the highest score.
- The **MIN**imizing player (human) wants the lowest score.

The AI assumes the human plays perfectly — meaning the human picks the move that minimizes the AI's score — and then picks the move that maximizes its minimum guaranteed outcome.

### Pseudocode

```
minimax(board, is_ai_turn):
    if game_over:
        return score                    # base case (+10, -10, or 0)

    if is_ai_turn:
        best = -infinity
        for each empty square:
            score = minimax(after_AI_move, False)
            best = max(best, score)
        return best
    else:
        best = +infinity
        for each empty square:
            score = minimax(after_human_move, True)
            best = min(best, score)
        return best
```

The `is_ai_turn` flag flips on every recursive call because the players alternate.

## Extension Challenges

Once your AI passes all tests, try these. They are listed roughly in order of how interesting most students find them.

### Depth Scoring (Make the AI Win Fast)

Right now the AI scores a win in one move the same as a win in five moves, so it has no preference for finishing the game quickly. Sometimes it'll drag out a guaranteed win in a way that looks weird. Fix it by penalizing slow wins:

```python
def minimax(board, is_ai_turn, depth=0):
    winner = check_winner(board)
    if winner == PLAYER_O:
        return 10 - depth      # prefer winning sooner
    elif winner == PLAYER_X:
        return -10 + depth     # prefer losing later
    elif is_board_full(board):
        return 0
    # ... in the recursive calls, pass depth + 1
```

Now the AI will pick the *fastest* path to a guaranteed win.

### Add a Move Counter

Track how many positions minimax evaluates per move. The number grows fast.

```python
evaluation_count = 0

def minimax(board, is_ai_turn):
    global evaluation_count
    evaluation_count += 1
    # rest of function
```

Print the count after each AI move and watch the search-space shrink as the board fills up.

### Alpha-Beta Pruning

Optimize minimax by skipping branches that cannot affect the outcome. This is the technique that makes real chess engines fast enough to play.

**Concept:** if you have already found a guaranteed win down one path, branches that are already worse don't need to be explored.

### A Different Game

Apply the same minimax idea to:

- **Connect Four** (larger board, longer games)
- **Nim** (a classic mathematical game)
- **Simple chess endgames** such as King + Rook vs King

## Real-World Applications

Minimax shows up in far more places than Tic-Tac-Toe.

### Game AI

- **Chess engines** such as Deep Blue and Stockfish use minimax combined with alpha-beta pruning.
- **Checkers** has been "solved" using minimax: perfect play always ends in a draw.
- **Go** (AlphaGo) combines minimax concepts with neural networks.

### Decision Making

- Predicting how a competitor will respond to a business move
- Anticipating an attacker's next step in security
- Game theory in economics and market competition

### Related AI Ideas

- **Reinforcement learning:** agents learn by simulating outcomes, similar to minimax.
- **Planning systems:** robots look several steps ahead before acting.
- **Adversarial AI:** security systems consider the worst-case input an attacker might send.

## Reflection Questions

1. Why is the AI unbeatable? What would it take to defeat an AI built this way?
2. Roughly how many game states does minimax explore from an empty board?
3. Why does recursion feel natural for this problem? Could you write minimax without recursion?
4. What are the limitations of minimax? Why is this approach not directly usable for real chess?
5. How does this compare to how modern AI systems (such as ChatGPT or self-driving cars) make decisions?

## Troubleshooting

### "AI couldn't find a move"

- Make sure `get_best_move()` returns a position (0-8), not `None`.
- Check that you are returning `best_move`, not `best_score`.

### The AI Makes Strange Moves

- Verify that `check_winner()` catches all eight winning lines.
- Confirm you are using `PLAYER_O` for the AI and `PLAYER_X` for the human consistently.

### Tests Fail but the Game Appears to Work

- Check return values carefully: `None` vs `False`, `-10` vs `10`.
- Confirm that `is_board_full()` returns `True`/`False`, not the result of a different check.

### "Maximum Recursion Depth Exceeded"

- The base case is not triggering.
- Confirm that `check_winner()` and `is_board_full()` work correctly. Minimax loops forever if neither one ever returns a terminating result.

## Learning Resources

### Minimax

- [Minimax on Wikipedia](https://en.wikipedia.org/wiki/Minimax)
- [GeeksforGeeks: Minimax in Game Theory](https://www.geeksforgeeks.org/minimax-algorithm-in-game-theory-set-1-introduction/)
- [Sebastian Lague's YouTube Video](https://www.youtube.com/watch?v=l-hh51ncgDI) — clear visual explanation

### Game Theory and AI

- [Alpha-Beta Pruning on Wikipedia](https://en.wikipedia.org/wiki/Alpha%E2%80%93beta_pruning)
- [Game Theory Basics at Investopedia](https://www.investopedia.com/terms/g/gametheory.asp)

### Python Recursion

- [Real Python: Recursion Tutorial](https://realpython.com/python-recursion/)
- [Python Tutor](https://pythontutor.com/) — step through recursive calls visually
