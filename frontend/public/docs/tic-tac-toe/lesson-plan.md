# Tic-Tac-Toe AI: Instructor Lesson Plan

## Overview

Students implement an unbeatable Tic-Tac-Toe AI using the minimax algorithm. They write five functions across two files (~50 lines of code total). The hard part is conceptual: recursion and looking ahead in a game tree.

**Estimated Duration:** 3 class periods (45-50 minutes each), plus 1 optional extension day.

**Prerequisites:**
- Basic Python (variables, functions, loops, conditionals, lists)

This project introduces recursion — no prior exposure required. The factorial warm-up on Day 2 is designed to give students who have never written a recursive function the muscle they need before tackling minimax.

> A CSTA standards crosswalk is included at the end of this document.

---

## Learning Objectives

By the end of this project, students should be able to:

1. **Explain** how minimax evaluates game states recursively
2. **Implement** recursive functions with proper base cases and recursive cases
3. **Trace** a recursive algorithm through a game tree
4. **Test** their implementation systematically using the provided suite
5. **Connect** simple game AI to real-world AI applications
6. **Analyze** algorithm efficiency (extension: alpha-beta pruning)

---

## Lesson Sequence

### Day 1: Concept, Hand-Trace, and Game Logic (45 min)

**Objectives:** Build intuition for game trees. Hand-trace a small minimax example. Implement `check_winner()` and `is_board_full()`.

1. **Hook (5 min):** "Can Tic-Tac-Toe be solved? What does it mean for an AI to be 'unbeatable'?" Establish that perfect play always draws.

2. **Hand-Trace Minimax (15 min):** Use a board with three empty squares so the tree is small enough to draw on the board:

   ```
   X | O | X
   O | X | _
   _ | _ | O
   ```

   Walk through the tree as a class. Establish:
   - Scoring: +10 (AI wins), -10 (human wins), 0 (draw)
   - Maximizer (AI) vs. minimizer (human)
   - Base case vs. recursive case

3. **Open the project (5 min):** Tour `main.py`, `test_game.py`, `warmup_factorial.py`, `test_warmup.py`, `README.md`.

4. **Implement `check_winner()` and `is_board_full()` (20 min):** Whiteboard the 8 winning lines and the empty-row pitfall. Students code and run `python test_game.py` until the relevant test classes pass.

**Common student error:**

```python
# Wrong: doesn't check that positions are non-empty
if board[0] == board[1] == board[2]:
    return board[0]  # returns " " for an empty row!

# Right: check non-empty first
if board[0] != EMPTY and board[0] == board[1] == board[2]:
    return board[0]
```

**Tests progress incrementally:** the test suite reports `7/22` once `check_winner` is implemented and `10/22` once `is_board_full` is too. Students get visible progress as they go — they don't need to finish everything before tests are useful.

**If students finish early:** start `warmup_factorial.py`. **If they get stuck:** finish game logic at home — Day 2 assumes it works.

---

### Day 2: Recursion and Minimax (45 min)

**Objectives:** Teach recursion, then use it to implement minimax.

1. **Teach Recursion (10 min):** Most students have not seen recursion before. Walk through the structure on the whiteboard:

   - Every recursive function has **two parts**: a *base case* (an input the function answers directly, with no further calls) and a *recursive case* (express the answer for the current input using the answer for a smaller input).
   - Demo with factorial: `factorial(0) == 1` is the base case; `factorial(n) == n * factorial(n - 1)` is the recursive case.
   - Optionally trace `factorial(3)` by hand on the board, showing how the calls stack and unwind.

2. **Recursion Warm-Up (10 min):** Students open `warmup_factorial.py`, implement `factorial(n)`, and run `python test_warmup.py` until 5/5 passes. **A student who can't get factorial working will not get minimax working — pair them with a peer before moving on.**

3. **Bridge to Minimax (5 min):** Factorial had *one* base case and *one* recursive call. Minimax has *three* base cases (AI wins, human wins, board is full) and a *loop* of recursive calls (one per empty square). Same shape, more branches.

   ```
   minimax(board, is_ai_turn):
       if game_over: return score
       if is_ai_turn: find MAX of children's scores
       else:          find MIN of children's scores
   ```

4. **Implement `minimax()` (20 min):** Work the base cases together. Students write the recursive case independently. Walk the room. Common issues: infinite recursion (base case not triggering), reversed score signs, forgetting to flip `is_ai_turn` on recursive calls.

**Debugging tip for stuck students:**

```python
def minimax(board, is_ai_turn):
    print(f"Evaluating: {board}, ai_turn={is_ai_turn}")
    # ... rest of function
```

**Instructor note:** This is the hardest day. Plan for it to run long. Day 3's first block is a buffer for anyone who isn't done.

---

### Day 3: Best Move, Play, Reflect (45 min)

**Objectives:** Finish the AI, play it, and reflect.

1. **Buffer for Day 2 (10-15 min):** Anyone who didn't finish minimax catches up. This is real, expected time — Day 2 is hard and most classes will spill over.

2. **Implement `get_best_move()` (15 min):** Loop empty squares, call `minimax(new_board, False)`, return the position with the highest score. The smallest function in the project. When students finish, they run `python test_game.py` and should see 22/22.

3. **Play and break the AI (5 min):** Run `python main.py`. Try to beat it (you can't). The "play" segment is short on purpose — losing to your own AI is satisfying for about three games.

4. **Reflection discussion (10-15 min):**
   - "How did it feel playing against your own code?"
   - "What would it take to beat this AI?"
   - "How is this different from how ChatGPT decides what to say?" (Search vs. pattern matching.)
   - "If we wanted to play chess this way, what would go wrong?" (Sets up the Day 4 efficiency discussion.)

---

### Day 4 (Optional): Extensions

1. **Move counter (10 min):** Add a global counter to `minimax` that increments at every call. Print positions evaluated per move. From an empty board it'll evaluate ~550,000 positions for the first move. Discuss exponential growth — for chess (~35 legal moves per position), going 8 plies deep is already 35^8 ≈ 2 trillion positions. *Brute-force minimax does not scale.*

2. **Alpha-beta pruning (25 min):**

   **Teach the concept first.** Draw a small game tree on the board. Imagine the maximizer has already evaluated the first child and got a score of 5. Now look at the second child: the minimizer there has a child with score 2. The minimizer will pick *at most* 2 (it's minimizing), so the maximizer doesn't need to look at any more children of this branch — it already has 5 and can't get worse than 2 here. **Prune the rest of that subtree.**

   The implementation tracks two values:
   - `alpha` — the best score the maximizer is guaranteed so far
   - `beta` — the best score the minimizer is guaranteed so far

   When `beta <= alpha`, the current branch can't influence the final result, so we cut it off. The reference implementation below is a drop-in replacement for `minimax`. After implementing, re-run the move counter — students should see roughly a 5-10× reduction in positions evaluated.

   **Common misunderstanding:** alpha-beta does not change the *result*, only the *speed*. The chosen move is identical to plain minimax against a perfect opponent.

**Reference implementation:**

```python
def minimax_ab(board, is_ai_turn, alpha, beta):
    winner = check_winner(board)
    if winner == PLAYER_O:
        return 10
    elif winner == PLAYER_X:
        return -10
    elif is_board_full(board):
        return 0

    if is_ai_turn:
        best_score = float('-inf')
        for move in get_valid_moves(board):
            new_board = make_move(board, move, PLAYER_O)
            score = minimax_ab(new_board, False, alpha, beta)
            best_score = max(best_score, score)
            alpha = max(alpha, score)
            if beta <= alpha:
                break  # Prune!
        return best_score
    else:
        best_score = float('inf')
        for move in get_valid_moves(board):
            new_board = make_move(board, move, PLAYER_X)
            score = minimax_ab(new_board, True, alpha, beta)
            best_score = min(best_score, score)
            beta = min(beta, score)
            if beta <= alpha:
                break  # Prune!
        return best_score
```

After the move counter is updated to also count alpha-beta calls, students can directly compare the two: roughly 550k positions plain vs. ~50k with pruning on the opening move.

3. **Real-world AI and wrap (10 min):** "Why isn't alpha-beta enough to solve chess?" — even with perfect pruning, chess has too many positions. Then tie back to where students see search-based AI in the wild:
   - Chess engines (Deep Blue, Stockfish): alpha-beta + handcrafted evaluation for non-terminal positions, transposition tables, opening books
   - Go (AlphaGo): Monte Carlo Tree Search guided by neural networks — same "search a tree of future positions" idea as minimax, but uses sampling instead of exhaustive evaluation
   - LLMs (ChatGPT and friends): pattern matching on training data, *not* search. Worth contrasting explicitly so students don't lump all AI together.

Other extensions (in the README, for ambitious students): depth scoring for faster wins, Connect Four, Nim.

---

## Assessment

**During the project (low-stakes, ongoing):** the 27-test suite gives immediate feedback as students implement each function. Optional exit ticket: "Explain in one sentence how minimax chooses a move."

**Final assessment (pick one):**
- Code submission graded on test pass rate + readability.
- Written: trace minimax for a given board state and explain why the AI is unbeatable.
- Project: implement an extension (alpha-beta, depth scoring, or a different game).

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `RecursionError: maximum recursion depth exceeded` | Base case not firing | Verify `check_winner()` and `is_board_full()` |
| AI plays seemingly random moves | Score signs reversed | +10 for AI win, -10 for human win |
| Tests pass but AI loses | `get_best_move()` returns the score, not the position | Return `best_move`, not `best_score` |
| Infinite loop in `play_game()` | `is_game_over()` never terminates | Manually test `check_winner()` and `is_board_full()` |

---

## Files Students See

| File | Purpose |
|------|---------|
| `warmup_factorial.py` | Scaffolded recursion warm-up (Step 0) |
| `test_warmup.py` | 5 tests for the warm-up |
| `main.py` | Scaffolded code with TODOs for Steps 1-4 |
| `test_game.py` | 22 tests for the four main TODOs |
| `README.md` | Student-facing instructions |

---

## Appendix: CSTA Standards Crosswalk

This project is designed to address the following CSTA K-12 Computer Science Standards for Grades 11-12.

> **Note:** This content has not been submitted for official CSTA alignment review. The crosswalk below shows which standards this project is designed to address.

### Primary Standards (Direct Instruction)

| Standard | Description | How This Project Addresses It |
|----------|-------------|-------------------------------|
| **3B-AP-09** | Implement an artificial intelligence algorithm to play a game against a human opponent or solve a problem. | Students implement minimax to create an AI that plays Tic-Tac-Toe optimally. |
| **3B-AP-10** | Use and adapt classic algorithms to solve computational problems. | Minimax is a classic game theory algorithm (von Neumann, 1928). Optional: alpha-beta pruning. |
| **3B-AP-11** | Evaluate algorithms in terms of their efficiency, correctness, and clarity. | Extension activities count recursive calls and contrast minimax with alpha-beta. |
| **3B-AP-13** | Illustrate the flow of execution of a recursive algorithm. | Day 1 hand-trace and Day 2 implementation both center on recursion. |
| **3B-AP-14** | Construct solutions to problems using student-created components, such as procedures, modules and/or objects. | Students compose `check_winner`, `minimax`, and `get_best_move` into a complete system. |
| **3B-AP-21** | Develop and use a series of test cases to verify that a program performs according to its design specifications. | Students run the 27-test suite as they implement each function. |

### Supporting Standards (Context & Discussion)

| Standard | Description | How This Project Supports It |
|----------|-------------|------------------------------|
| **3B-AP-08** | Describe how artificial intelligence drives many software and physical systems. | Day 4's wrap-up connects minimax to chess engines, AlphaGo, and contrasts it with LLMs. |

---

*Last updated: April 2026*
