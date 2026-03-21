# Tic-Tac-Toe AI: Instructor Lesson Plan

## Overview

This project guides students through implementing an unbeatable Tic-Tac-Toe AI using the minimax algorithm. Students learn recursion, game theory, and algorithm design while building a working AI opponent.

**Estimated Duration:** 5-7 class periods (45-50 minutes each)

**Prerequisites:**
- Basic Python (variables, functions, loops, conditionals)
- Lists and list operations
- Understanding of functions and return values
- Helpful but not required: prior exposure to recursion

---

## CSTA Standards Addressed

This project is designed to address the following CSTA K-12 Computer Science Standards for Grades 11-12:

> **Note:** This content has not been submitted for official CSTA alignment review. The crosswalk below shows which standards this project is designed to address.

### Primary Standards (Direct Instruction)

| Standard | Description | How This Project Addresses It |
|----------|-------------|-------------------------------|
| **3B-AP-09** | Implement an artificial intelligence algorithm to play a game against a human opponent or solve a problem. | Students implement the minimax algorithm to create an AI that plays Tic-Tac-Toe optimally. |
| **3B-AP-10** | Use and adapt classic algorithms to solve computational problems. | Minimax is a classic game theory algorithm (von Neumann, 1928). Students implement and may extend it with alpha-beta pruning. |
| **3B-AP-11** | Evaluate algorithms in terms of their efficiency, correctness, and clarity. | Extension activities have students count recursive calls and discuss exponential growth; alpha-beta pruning demonstrates efficiency optimization. |
| **3B-AP-13** | Illustrate the flow of execution of a recursive algorithm. | Minimax is inherently recursive. Students trace execution through game trees. |
| **3B-AP-14** | Construct solutions to problems using student-created components, such as procedures, modules and/or objects. | Students implement modular functions (check_winner, minimax, get_best_move) that compose into a complete system. |
| **3B-AP-21** | Develop and use a series of test cases to verify that a program performs according to its design specifications. | A test suite is provided; students run tests to verify each function before integration. |

### Supporting Standards (Context & Discussion)

| Standard | Description | How This Project Supports It |
|----------|-------------|------------------------------|
| **3B-AP-08** | Describe how artificial intelligence drives many software and physical systems. | README and discussion prompts connect minimax to chess engines, self-driving cars, and decision-making AI. |
| **3B-AP-23** | Evaluate key qualities of a program through a process such as a code review. | Suggested code review activity; students evaluate correctness, efficiency, and clarity. |

---

## Learning Objectives

By the end of this project, students should be able to:

1. **Explain** how the minimax algorithm evaluates game states recursively
2. **Implement** recursive functions with proper base cases and recursive cases
3. **Trace** the execution of a recursive algorithm through a game tree
4. **Test** implementations systematically using provided test cases
5. **Connect** simple game AI to real-world AI applications
6. **Analyze** algorithm efficiency (extension: alpha-beta pruning)

---

## Lesson Sequence

### Day 1: Introduction to Game AI (45 min)

**Objectives:**
- Understand what makes a game "solvable"
- Develop intuition for looking ahead in games

**Activities:**

1. **Warm-up (10 min):** Play Tic-Tac-Toe
   - Pair students, play 3 games
   - Discussion: "What strategy did you use? How far ahead did you think?"

2. **Discussion (15 min):** Perfect Play
   - "Can Tic-Tac-Toe be solved?"
   - "What does it mean for an AI to be 'unbeatable'?"
   - Show that perfect play always results in a draw

3. **Introduction to Minimax (15 min):**
   - Draw a simple game tree on the board
   - Example: Game with 2 moves left
   - Concept: "If I go here, they'll go there..."

4. **Wrap-up (5 min):**
   - Preview the project
   - Students access the template

**Materials:**
- Whiteboard for game tree diagrams
- Project template access

---

### Day 2: Understanding Minimax (45 min)

**Objectives:**
- Trace minimax execution by hand
- Understand maximizing vs. minimizing players

**Activities:**

1. **Warm-up (5 min):** Quick review of game trees

2. **Guided Practice (25 min):** Hand-trace Minimax
   - Use this board state:
     ```
     X | O | X
     O | X | _
     _ | _ | O
     ```
   - Only 3 empty spaces = small game tree
   - Students trace on paper: What move should O play?
   - Walk through the complete minimax tree together

3. **Key Concepts Discussion (10 min):**
   - Why "minimax"? (Maximize your minimum guaranteed outcome)
   - Scoring: +10 (AI wins), -10 (human wins), 0 (draw)
   - Base case vs. recursive case

4. **Wrap-up (5 min):**
   - Preview tomorrow's coding
   - "You'll implement this algorithm in Python"

**Materials:**
- Worksheet with game tree template (optional)
- Hand-trace example board states

**Instructor Notes:**
- This conceptual foundation is critical!
- Students who understand the algorithm by hand will implement it faster

---

### Day 3: Implementing Game Logic (45 min)

**Objectives:**
- Implement `check_winner()` and `is_board_full()`
- Run tests to verify implementations

**Activities:**

1. **Setup (5 min):**
   - Open the template project
   - Review file structure: `main.py`, `test_game.py`

2. **Implement `check_winner()` (20 min):**
   - Review the 8 winning combinations
   - Students implement (use TODO comments as guide)
   - Common issues:
     - Forgetting to check that positions are non-empty
     - Off-by-one errors in position indices

3. **Implement `is_board_full()` (10 min):**
   - Simple check for EMPTY in board
   - Multiple valid approaches

4. **Test (10 min):**
   - Run `python test_game.py`
   - Debug until check_winner and is_board_full pass
   - Celebrate passing tests! 🎉

**Common Student Errors:**

```python
# Wrong: Doesn't check that positions are non-empty
if board[0] == board[1] == board[2]:
    return board[0]  # Returns " " for empty row!

# Right: Check non-empty first
if board[0] != EMPTY and board[0] == board[1] == board[2]:
    return board[0]
```

---

### Day 4: Implementing Minimax (45 min)

**Objectives:**
- Implement the core minimax algorithm
- Understand recursion in practice

**Activities:**

1. **Review (5 min):**
   - Recap minimax concept from Day 2
   - Pseudocode on board:
     ```
     minimax(board, is_maximizing):
         if game_over: return score
         if maximizing: find MAX of all children
         else: find MIN of all children
     ```

2. **Guided Implementation (30 min):**
   - Work through base case together
   - Students implement recursive case
   - **Key scaffolding:** The TODO comments include pseudocode

3. **Debug and Test (10 min):**
   - Run tests for minimax
   - Common issue: infinite recursion (base case not working)
   - Common issue: Wrong score signs (+10 vs -10)

**Instructor Notes:**
- Walk around the room—students will have questions
- If students are stuck, have them hand-trace with print statements
- This is the hardest day—allow extra time if needed

**Debugging Tips for Students:**
```python
# Add this to see what minimax is doing:
def minimax(board, is_maximizing):
    print(f"Evaluating: {board}, maximizing={is_maximizing}")
    # ... rest of function
```

---

### Day 5: Completing the AI (45 min)

**Objectives:**
- Implement `get_best_move()`
- Test the complete AI
- Play against your creation!

**Activities:**

1. **Implement `get_best_move()` (15 min):**
   - This function uses minimax to choose the best move
   - Simpler than minimax—just loops through moves

2. **Test Complete System (10 min):**
   - All tests should pass
   - Debug any remaining issues

3. **Play the Game! (15 min):**
   - Run `python main.py`
   - Try to beat the AI (spoiler: you can't)
   - What's the best you can do? (draw)

4. **Reflection Discussion (5 min):**
   - "How did it feel playing against your own AI?"
   - "What would it take to beat this AI?"

---

### Day 6 (Optional): Extensions & Analysis

**Objectives:**
- Analyze algorithm efficiency
- Implement optimizations

**Activities:**

1. **Efficiency Analysis (15 min):**
   - Add a move counter to minimax
   - How many positions does it evaluate from an empty board?
   - Discuss: Why is this exponential?

2. **Alpha-Beta Pruning (25 min):**
   - Explain the concept: "Don't explore branches we know are bad"
   - Provide or walk through the implementation
   - Compare move counts: before vs. after

3. **Discussion (5 min):**
   - "Why can't we use basic minimax for chess?"
   - "How do real chess engines handle this?"

**Extension Code (Alpha-Beta):**

```python
def minimax_ab(board, is_maximizing, alpha, beta):
    winner = check_winner(board)
    if winner == PLAYER_O:
        return 10
    elif winner == PLAYER_X:
        return -10
    elif is_board_full(board):
        return 0
    
    if is_maximizing:
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

---

### Day 7 (Optional): Code Review & Real-World Connections

**Objectives:**
- Practice code review
- Connect to real-world AI

**Activities:**

1. **Peer Code Review (20 min):**
   - Pairs exchange code
   - Review checklist:
     - [ ] Does it pass all tests?
     - [ ] Is the code readable?
     - [ ] Are variable names clear?
     - [ ] Could any parts be simplified?
   - Provide constructive feedback

2. **Real-World AI Discussion (20 min):**
   - How is minimax used in:
     - Chess engines (Deep Blue, Stockfish)
     - Go AI (AlphaGo combines minimax with neural networks)
     - Decision-making systems
   - How is this different from ChatGPT?
     - Game AI: exhaustive search of defined rules
     - LLMs: pattern matching on training data

3. **Wrap-up (5 min):**
   - Reflection: What did you learn?
   - What would you explore further?

---

## Assessment Ideas

### Formative Assessment

- **Test Suite:** Built-in tests provide immediate feedback
- **Observation:** Monitor progress during implementation
- **Exit Tickets:** "Explain in one sentence how minimax chooses a move"

### Summative Assessment

**Option A: Code Submission**
- Submit completed `main.py`
- Rubric:
  - All tests pass (40%)
  - Code readability (20%)
  - Correct implementation approach (40%)

**Option B: Written Reflection**
- "Trace minimax for this board state" (show work)
- "Explain why the AI is unbeatable"
- "How would you modify this for a larger game?"

**Option C: Extension Project**
- Implement alpha-beta pruning
- Add depth scoring (prefer faster wins)
- Implement for a different game (Connect 4, Nim)

---

## Differentiation

### For Struggling Students

- Provide partially completed functions
- Pair with stronger partner
- Focus on Days 1-5; skip extensions
- Use more scaffolded pseudocode

### For Advanced Students

- Skip to Day 4 if they already know recursion
- Challenge: Implement alpha-beta without guidance
- Challenge: Implement for Connect 4
- Research and present on Monte Carlo Tree Search

---

## Discussion Prompts

Use these throughout the unit to deepen understanding:

1. "What makes Tic-Tac-Toe 'solvable'? What games are not solvable this way?"

2. "The AI explores thousands of positions for one move. How do humans play without doing this?"

3. "Is this AI 'intelligent'? What does intelligence mean in this context?"

4. "Could we use minimax to solve real-world problems outside of games?"

5. "What are the ethical implications of unbeatable game AI? (Think: casinos, competitive gaming)"

---

## Common Misconceptions

| Misconception | Reality |
|--------------|---------|
| "The AI learns from playing" | No learning—minimax always calculates from scratch. Every game is independent. |
| "The AI is thinking like a human" | It's exhaustive search, not intuition. Humans use pattern recognition and heuristics. |
| "Bigger games just need more time" | Exponential growth makes brute-force minimax impossible for chess (~10^120 positions). |
| "The AI might make mistakes" | With correct implementation, minimax is provably optimal. Any loss indicates a bug. |

---

## Troubleshooting Guide

| Symptom | Likely Cause | Solution |
|---------|--------------|----------|
| "Maximum recursion depth exceeded" | Base case not triggering | Check `check_winner()` and `is_board_full()` |
| AI makes random-seeming moves | Score signs reversed | Verify +10 for AI win, -10 for human win |
| Tests pass but AI loses | `get_best_move()` returning wrong value | Check it returns position, not score |
| Infinite loop in game | `is_game_over()` not working | Test `check_winner()` and `is_board_full()` manually |

---

## Files in This Package

| File | Purpose |
|------|---------|
| `solution.py` | Complete reference implementation (instructor only) |
| `lesson-plan.md` | This document |
| Tic-Tac-Toe` student template | |
| → `main.py` | Scaffolded code with TODOs |
| → `test_game.py` | Test suite for verification |
| → `README.md` | Student-facing instructions |

---

## Additional Resources

### For Instructors

- [Minimax Wikipedia](https://en.wikipedia.org/wiki/Minimax) - Mathematical foundations
- [Sebastian Lague's Minimax Video](https://www.youtube.com/watch?v=l-hh51ncgDI) - Excellent visual explanation to show in class
- [CS Unplugged: Divide and Conquer](https://www.csunplugged.org/en/) - Related unplugged activities

### For Students (in README.md)

- GeeksforGeeks tutorials
- Python recursion guides
- Game theory introductions

---

## Feedback

If you use this lesson plan, we'd love to hear how it went! Consider noting:
- What worked well
- What students struggled with
- How you modified the pacing
- Any resources you added

---

*Last updated: January 2026*
