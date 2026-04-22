# Tic-Tac-Toe AI (Minimax)

In this project you build a Tic-Tac-Toe AI that cannot be beaten. The algorithm it uses, minimax, is the same foundational technique behind chess engines, other game-playing AIs, and many decision-making systems.

This README covers background knowledge that may be necessary or helpful for this lesson. Read through it once before you start coding.

## What You Will Learn

- How an AI can "think ahead" by simulating every possible future outcome
- How recursion lets a function solve a large problem by breaking it into smaller copies of itself
- Game-theory basics such as optimal play and zero-sum games
- Why minimax guarantees the best possible move given enough time

## Setup

Right-click the `Tic-Tac-Toe` folder in the file explorer on the left and select **Open in Terminal**. This executes `cd` (change directory) in your terminal to the project folder so the commands below will work.

Install the dependencies:

```bash
pip install -r requirements.txt
```

Open `main.py` and read through it before writing any code, so you know where the TODOs are and what each function should do. Complete the TODOs in order (1 through 4). As you work, run the tests:

```bash
python test_game.py
```

Once every test passes, play the game:

```bash
python main.py
```

## What This README Covers

- How the minimax algorithm explores every possible game
- Why the algorithm is called "minimax"
- A pseudocode view of the recursive structure
- The four functions you will implement
- Real-world applications in chess, checkers, Go, and decision-making systems
- Extension challenges, reflection questions, and troubleshooting

## How the Minimax Algorithm Works

Imagine playing a game and thinking ahead: "If I move here, they will probably move there, and then I could move here..."

Minimax does this exhaustively. It considers every possible future move all the way to the end of the game, assuming both players play perfectly.

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

The algorithm:

1. **Simulate every possible game** from the current position.
2. **Score end states:** AI wins (+10), Human wins (-10), Draw (0).
3. **Back up those scores** through the tree. The AI picks moves that maximize the score; the human picks moves that minimize it.
4. **Choose the best move:** the one that leads to the highest guaranteed outcome.

### Why the Name "Minimax"

- The **MAX**imizing player (AI) wants the highest score.
- The **MIN**imizing player (human) wants the lowest score.

The AI assumes the human plays perfectly, meaning the human picks the move that minimizes the AI's score. The AI then picks the move that maximizes its minimum guaranteed outcome.

### Recursion in Action

```
minimax(board, is_maximizing):
    if game_over:
        return score  # base case

    if is_maximizing:
        best = -infinity
        for each move:
            score = minimax(after_move, False)  # recursive call
            best = max(best, score)
        return best
    else:
        best = +infinity
        for each move:
            score = minimax(after_move, True)   # recursive call
            best = min(best, score)
        return best
```

## Your Tasks

Open `main.py` and complete these functions in order.

### TODO #1: `check_winner(board)`

Detect whether X or O has won the game.

**Hints:**

- There are eight winning combinations: three rows, three columns, and two diagonals.
- Return `"X"`, `"O"`, or `None`.

### TODO #2: `is_board_full(board)`

Check whether the board has any empty spaces. If not, the game is a draw.

**Hints:**

- Check whether `EMPTY` (the `" "` string) still appears in the board.
- Return `True` or `False`.

### TODO #3: `minimax(board, is_maximizing)`

The core of the AI. Recursively evaluates every possible game.

**Hints:**

- Handle the base cases first (there is a winner, or the board is full).
- Recursively explore every empty square as a possible move.
- Maximize when it is the AI's turn; minimize when it is the human's turn.

### TODO #4: `get_best_move(board)`

Use `minimax` to find the best move for the current board.

**Hints:**

- Try every empty square.
- Call `minimax` on each one and track the highest score.
- Return the move index (the square), not the score.

## Testing Your Implementation

Run the test suite:

```bash
python test_game.py
```

Implement the functions in order. Later tests depend on earlier functions working correctly.

## Real-World Applications

The minimax algorithm appears in far more places than Tic-Tac-Toe.

### Game AI

- **Chess engines** such as Deep Blue and Stockfish use minimax combined with alpha-beta pruning.
- **Checkers** has been "solved" using minimax: perfect play always ends in a draw.
- **Go** (AlphaGo) combines minimax concepts with neural networks.

### Decision Making

- Predicting how competitors will respond to a business move
- Anticipating an attacker's next step in security
- Game theory in economics and market competition

### Related AI Ideas

- **Reinforcement learning:** agents learn by simulating outcomes, similar to minimax.
- **Planning systems:** robots look several steps ahead before acting.
- **Adversarial AI:** security systems consider the worst-case input an attacker might send.

## Extension Challenges

Once the basic AI works, try these.

### Easy: Add a Move Counter

Track how many positions minimax evaluates. The number grows quickly.

```python
evaluation_count = 0

def minimax(board, is_maximizing):
    global evaluation_count
    evaluation_count += 1
    # rest of function
```

### Medium: Alpha-Beta Pruning

Optimize minimax by skipping branches that cannot affect the outcome. This is the technique that makes real chess engines fast enough to play.

**Concept:** If you have already found a guaranteed win down one path, paths that are already worse do not need to be explored.

### Medium: Depth Scoring

Right now, a win in one move scores the same as a win in five moves, so the AI has no preference for finishing quickly. Adjust the scoring so it prefers faster wins:

```python
# Instead of returning 10 or -10:
return 10 - depth  # prefer winning sooner
return -10 + depth  # prefer losing later
```

### Hard: A Different Game

Apply the same minimax idea to:

- **Connect Four** (larger board, longer games)
- **Nim** (a classic mathematical game)
- **Simple chess endgames** such as King + Rook vs King

## Reflection Questions

1. Why is the AI unbeatable? What would it take to defeat an AI built this way?
2. Roughly how many game states does minimax explore from an empty board?
3. Why does recursion feel natural for this problem? Could you write minimax without recursion?
4. What are the limitations of minimax? Why is this approach not directly usable for real chess?
5. How does this compare to how modern AI systems (such as ChatGPT or self-driving cars) make decisions?

## Code Review Checklist

Before submitting, verify:

- [ ] All tests pass (`python test_game.py`)
- [ ] The game runs without errors (`python main.py`)
- [ ] The AI never loses. Play several games to confirm.
- [ ] Variable names are clear.
- [ ] You can explain each function aloud.

## Troubleshooting

### "AI couldn't find a move"

- Make sure `get_best_move()` returns a position (0-8), not `None`.
- Check that you are returning `best_move`, not `best_score`.

### The AI Makes Strange Moves

- Verify that `check_winner()` catches all eight winning patterns.
- Confirm you are using `PLAYER_O` for the AI and `PLAYER_X` for the human consistently.

### Tests Fail but the Game Appears to Work

- Check return values carefully: `None` vs `False`, `-10` vs `10`.
- Confirm that `is_board_full()` returns `True` or `False`, not the result of a different check.

### "Maximum Recursion Depth Exceeded"

- The base case is not triggering.
- Confirm that `check_winner()` and `is_board_full()` are correct. Minimax loops forever if neither one ever returns a terminating result.

## Learning Resources

### Minimax

- [Minimax on Wikipedia](https://en.wikipedia.org/wiki/Minimax)
- [GeeksforGeeks: Minimax in Game Theory](https://www.geeksforgeeks.org/minimax-algorithm-in-game-theory-set-1-introduction/)
- [Sebastian Lague's YouTube Video](https://www.youtube.com/watch?v=l-hh51ncgDI) for a clear visual explanation

### Game Theory and AI

- [Alpha-Beta Pruning on Wikipedia](https://en.wikipedia.org/wiki/Alpha%E2%80%93beta_pruning)
- [Game Theory Basics at Investopedia](https://www.investopedia.com/terms/g/gametheory.asp)

### Python Recursion

- [Real Python: Recursion Tutorial](https://realpython.com/python-recursion/)
- [Python Tutor](https://pythontutor.com/) for stepping through recursive calls visually
