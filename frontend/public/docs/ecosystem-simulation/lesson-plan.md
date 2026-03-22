# Ecosystem Simulation: Instructor Lesson Plan

## Overview

Students implement a predator-prey population simulation based on a simplified
Lotka-Volterra model, then analyze the results. The project uses only the Python
standard library and produces an ASCII population chart alongside a CSV output
file. The model's structure connects directly to disease spread, economic
competition, and any other domain involving two interacting populations.

**Estimated Duration:** 4-5 class periods (45-50 minutes each)

**Grade Level:** 9-10

**Prerequisites:**
- Basic Python: variables, functions, loops, conditionals
- Lists and list indexing
- Understanding of function arguments and return values
- Familiarity with reading/writing files is helpful but not required

---

## CSTA Standards Addressed

> **Note:** This content has not been submitted for official CSTA alignment review. The crosswalk below shows which standards this project is designed to address.

### Primary Standards (Direct Instruction)

| Standard | Description | How This Project Addresses It |
|---|---|---|
| **3A-DA-12** | Create computational models that represent the relationships among different elements of data collected from a phenomenon or process. | Students implement a computational model (simulate_step) that encodes biological relationships between birth rates, predation rates, and death rates, then collect population histories over time. |
| **3B-DA-07** | Evaluate the ability of models and simulations to test and support the refinement of hypotheses. | Students form hypotheses about parameter effects, run controlled experiments by changing one parameter at a time, and compare results to real-world predator-prey data from Yellowstone and fur trade records. |
| **3A-IC-26** | Demonstrate ways a given algorithm applies to problems across disciplines. | The Lotka-Volterra structure is explicitly connected to epidemiology (SIR model), economics (market competition), and ecology (keystone species), showing that the same algorithmic pattern solves problems across fields. |

### Supporting Standards (Context and Discussion)

| Standard | Description | How This Project Supports It |
|---|---|---|
| **3A-AP-17** | Decompose problems into smaller components through systematic analysis, using constructs such as procedures, modules, and objects. | The simulation is decomposed into four focused functions: simulate_step, run_simulation, save_results, and print_chart, each with a single responsibility. |
| **3A-AP-21** | Evaluate and refine computational artifacts to make them more usable and accessible. | Students observe ASCII chart output and CSV data, then consider what information is lost in each format (reflection question 5). |
| **3B-AP-21** | Develop and use a series of test cases to verify that a program performs according to its design specifications. | A provided test suite checks known-value outputs, edge cases (zero populations), and file format correctness. |

---

## Learning Objectives

By the end of this project, students should be able to:

1. Translate a set of biological rules into arithmetic formulas in Python
2. Use lists to record and analyze a simulation over time
3. Write data to a CSV file and reload it for analysis
4. Build a readable ASCII visualization without external libraries
5. Explain how the same model structure applies in at least two other domains
6. Form and test a hypothesis about parameter effects on population dynamics

---

## Lesson Sequence

### Day 1: Introduction to Predator-Prey Dynamics (45 min)

**Objectives:**
- Understand the cycle of predator-prey population change
- Form hypotheses about what drives the oscillations
- Connect the concept to real-world data

**Materials:**
- Whiteboard or projector
- Optional: printed graph of Hudson Bay lynx/hare data (widely available online)
- Optional: printed graph of Yellowstone elk population before and after wolf reintroduction

**Activities:**

1. **Warm-up (10 min):** Think-pair-share
   - "If all the foxes in a forest disappeared tomorrow, what would happen to the
     rabbit population? What would happen six months later?"
   - Collect predictions. Do not correct yet, return to them on Day 4.

2. **Real data discussion (15 min):**
   - Show the Hudson Bay lynx/snowshoe hare data (1900-1920). The 10-year cycle is
     clear even on a rough sketch.
   - Ask: "What causes the hare population to crash? What happens to the lynx after?"
   - Briefly describe the Yellowstone wolf reintroduction (1995) as a modern example.
     Wolves were absent for 70 years; elk overpopulated; reintroducing wolves changed
     river courses within a decade by shifting elk grazing behavior.

3. **Introduce the model (15 min):**
   - Write the four rules on the board in plain English:
     1. Rabbits reproduce every step.
     2. Rabbits and foxes meet, and some meetings end in a kill.
     3. Each kill gives foxes a small population boost.
     4. Foxes die at a fixed rate regardless of food.
   - Ask: "Which of these rules do you think drives the oscillation?"
     Record student hypotheses, revisit on Day 4.

4. **Preview the project (5 min):**
   - Open the template. Walk through the file structure: `main.py`, `test_simulation.py`.
   - Show that `DEFAULT_PARAMS` is provided and `main()` is provided. Their job is
     to fill in the four functions.

---

### Day 2: Implement simulate_step (45 min)

**Objectives:**
- Translate biological rules into arithmetic formulas
- Use `int()`, `max()`, `min()` correctly
- Verify the implementation with the test suite

**Activities:**

1. **Warm-up: unit check (5 min)**
   - Write on the board: `birth_rate = 0.1`, `rabbits = 100`.
   - "What does `int(rabbits * birth_rate)` give?" (10)
   - "What units does this number have?" (rabbits per step)
   - This confirms students understand why each formula produces the right type of value.

2. **Work through the formulas together (10 min):**
   - Write each formula on the board alongside its plain-English rule.
   - Emphasize the `rabbits * foxes` term: "Why does predation depend on both
     populations? If there are very few foxes, does it matter how many rabbits there are?"
   - Emphasize the cap: "Why cap the rabbit population? What does that represent?"

3. **Independent/pair implementation (20 min):**
   - Students implement `simulate_step`. The TODO comments in `main.py` provide
     the exact formulas; students need to wire them together.
   - Most students will finish; a few may need help with the `max(0, min(...))` nesting.

4. **Test and debug (10 min):**
   - Run `python test_simulation.py`. The first section tests `simulate_step`.
   - Common issues:
     - Forgetting `int()`: `rabbits_born` becomes a float, which causes downstream errors.
     - Wrong sign: subtracting births instead of eaten (read the variable names carefully).
     - Not applying the cap to rabbits but applying it to foxes by mistake.

**Instructor Notes:**
- The test suite provides the expected values (90 rabbits, 19 foxes for the default
  input). If a student is off by one, have them work through the arithmetic by hand.
- Students who finish early: ask them to predict what will happen if `predation_rate`
  is doubled. They can test by temporarily changing the value.

---

### Day 3: Implement run_simulation and save_results (45 min)

**Objectives:**
- Run multi-step simulations and record history
- Write structured data to a CSV file
- Run initial experiments by varying parameters

**Activities:**

1. **Quick review (5 min):**
   - "What does `simulate_step` return?" (a tuple of two ints)
   - "How do we get the most recent value from a list?" (`list[-1]`)
   - These two facts are the core of `run_simulation`.

2. **Implement run_simulation (15 min):**
   - This function is structurally straightforward once `simulate_step` works.
   - The main sticking point is remembering that history starts at step 0
     (include the initial values before the loop starts).
   - Run the test suite after implementation.

3. **Implement save_results (15 min):**
   - Walk through `csv.writer` briefly if students haven't used it before.
   - Show the header row: `['step', 'rabbits', 'foxes']`.
   - After implementation, open `results.csv` in the terminal with `cat results.csv`
     to verify the format visually.

4. **Run experiments (10 min):**
   - Students run `python main.py` for the first time (chart not yet working, but
     the summary prints).
   - Ask each student to change one parameter and record: "What did you change?
     What happened to the final populations?"
   - This sets up the Day 4 analysis.

**Common Issues:**
- `save_results` writes `None` because `pass` is still in the function. Double-check
  that the `pass` line was removed.
- CSV file has extra blank lines on Windows: make sure `newline=''` is in the `open()` call.

---

### Day 4: Implement print_chart and Analyze Results (45 min)

**Objectives:**
- Build an ASCII visualization with proper scaling
- Analyze population histories against original hypotheses
- Connect the model to other domains

**Activities:**

1. **Implement print_chart (20 min):**
   - This is the most involved function in terms of output formatting.
   - The key insight: both populations are scaled relative to the global maximum,
     so the chart is always the same width regardless of actual values.
   - Walk through the overlap logic: `overlap = min(r_scaled, f_scaled)`, then
     `r_only = r_scaled - overlap`, `f_only = f_scaled - overlap`.
   - The f-string `{bar:<{chart_width}}` left-aligns the bar in a fixed-width field.
     Explain the `:<` syntax if students haven't seen it.
   - Run `python main.py` and verify the chart is readable.

2. **Hypothesis review (15 min):**
   - Return to the Day 1 predictions.
   - "What actually drives the oscillation?" (predation rate and death rate together;
     neither alone is sufficient)
   - "What happens when foxes die off? What does the rabbit population do?"
   - Students who ran experiments on Day 3 share their findings.

3. **Cross-domain connections (10 min):**
   - Draw the parallel to the SIR model on the board:
     - Susceptible = rabbits, Infected = foxes, predation_rate = transmission_rate
     - Point out: the equations are structurally identical.
   - Briefly discuss the economic competition angle.
   - Ask: "What would you need to change in the code to make this a disease model?"

**Instructor Notes:**
- If students struggle with the f-string alignment, provide the format string and
  focus their attention on getting the bar construction correct first.
- The chart does not need to be pixel-perfect. As long as oscillations are visible
  and R/F labels are correct, it is working.

---

### Day 5 (Optional): Refinement, Extensions, and Presentations (45 min)

**Objectives:**
- Refine the model with additional features
- Connect findings to real-world data
- Practice explaining a computational model to peers

**Activities:**

1. **Extension work (25 min):**
   - Students choose an extension challenge from the README.
   - The grass extension (easy) can be implemented in one class period with guidance.
   - The seasonal variation (medium) requires understanding `math.sin` briefly.
   - The spatial grid (hard) is suitable for a take-home project.

2. **Brief presentations (15 min):**
   - Each student or pair shares one finding: "I changed X, and Y happened."
   - Encourage students to connect their finding to a real-world scenario.

3. **Wrap-up (5 min):**
   - Return to the original warm-up question from Day 1.
   - "Were your predictions right? What did the model show that surprised you?"

---

## Assessment Ideas

### Formative Assessment

- **Test suite results:** Built-in tests provide immediate pass/fail feedback on
  each function. Check student progress at the end of Day 2 and Day 3.
- **Parameter experiment log:** A simple table students fill in during Day 3.
  One column for the change made, one for what happened. Reveals whether students
  understand what each parameter controls.
- **Exit ticket (Day 2):** "In one sentence, explain what the `predation_rate`
  parameter controls and why it appears in the formula as `rabbits * foxes * rate`."

### Summative Assessment

**Option A: Code Submission**
- Rubric:
  - All test suite tests pass (40%)
  - ASCII chart is readable and correct (20%)
  - CSV file is properly formatted (20%)
  - Code is readable with clear variable names (20%)

**Option B: Analysis Write-up**
- Students run three experiments (change birth_rate, predation_rate, and death_rate
  separately) and write a paragraph about each.
- "What did you change? What happened? Why does that make biological sense?"

**Option C: Extension Project**
- Implement one of the three extension challenges and document the changes made
  and the new behavior observed.

---

## Differentiation

### For Students Who Need More Support

- Provide the complete body of `simulate_step` as a worked example and ask
  students to implement only `run_simulation` and `save_results`.
- Pair with a stronger student for the ASCII chart.
- Focus on Days 1-4; the optional Day 5 work is not required.

### For Students Who Move Ahead

- Challenge: Implement the grass/vegetation layer (third population).
- Challenge: Modify the model so foxes have a maximum population cap too.
  What biological concept does that represent?
- Challenge: Look up the actual Lotka-Volterra differential equations and explain
  how the discrete version (this model) relates to the continuous version.
- Research prompt: The SIR model uses the same structure. Find a published COVID-19
  model and identify which parameters correspond to which in this simulation.

---

## Discussion Prompts

Use these at natural transition points across the unit:

1. "The predation term is `rabbits * foxes * rate`. Why multiply all three? What
   happens to predation if one population goes to zero?"

2. "This model uses integers (whole animals). Real populations are continuous.
   What errors does that introduce, especially at low population counts?"

3. "In the Yellowstone example, removing wolves for 70 years had effects nobody
   predicted. What does that tell you about the limits of a two-species model?"

4. "If this model were used to make policy decisions about an actual ecosystem,
   what assumptions would you want to check before trusting it?"

5. "The model is deterministic: given the same inputs, it always produces the same
   outputs. Real ecosystems are not deterministic. How would you add randomness,
   and would that make the model more or less useful?"

---

## Common Misconceptions

| Misconception | Reality |
|---|---|
| "The model predicts exact populations." | It models tendencies and cycles, not precise counts. Real ecosystems have weather, disease, and other variables not captured here. |
| "A higher birth rate always leads to more rabbits long-term." | At high birth rates, rabbit populations overshoot, attract more fox predation, and then crash harder. The interaction matters more than any single parameter. |
| "The oscillations will eventually stabilize." | With these equations, the oscillations can be stable cycles, damped (dying out), or growing. The outcome depends on the specific parameter values. |
| "Foxes only depend on rabbits." | In this model, yes. Real fox populations have multiple prey species, which buffers against rabbit population crashes. The model is intentionally simplified. |

---

## Troubleshooting Guide

| Symptom | Likely Cause | Solution |
|---|---|---|
| `simulate_step` returns `None` | `pass` was not removed | Verify the function ends with `return (new_rabbits, new_foxes)` |
| Float values in population | Missing `int()` conversion | Wrap each calculated quantity in `int()` |
| Rabbit population goes negative | Missing `max(0, ...)` | Check the `new_rabbits` formula |
| CSV file has blank lines between rows (Windows) | Missing `newline=''` in `open()` | Add `newline=''` as a keyword argument |
| ASCII chart prints nothing | `max_pop` is 0 or `pass` still in function | Check that `run_simulation` returned non-empty lists |
| Chart bars are all the same length | Populations not being scaled | Verify `r_scaled = int(r / max_pop * chart_width)` |

---

## Files in This Package

| File | Purpose |
|---|---|
| `solution.py` | Complete reference implementation (instructor only) |
| `lesson-plan.md` | This document |
| Ecosystem-Simulation student template: | |
| `main.py` | Scaffolded code with TODOs and provided helpers |
| `test_simulation.py` | Test suite for student verification |
| `README.md` | Student-facing instructions and context |
| `requirements.txt` | Empty (stdlib only) |

---

*Last updated: March 2026*
