# Ecosystem Simulation: Predator-Prey Population Dynamics

```
  /\ /\
 ( o.o )    <-- rabbit
  > ^ <

  /^^\
 ( o_o )    <-- fox
  /|||\
```

Model how rabbit and fox populations interact over time. When rabbits are abundant,
foxes thrive. When foxes eat too many rabbits, the rabbit population crashes, and
the fox population follows. The cycle repeats, producing the oscillating patterns
you can observe in real ecosystems and in your ASCII chart.

## What You'll Learn

- How to translate biological rules into mathematical formulas
- How small parameter changes produce dramatically different outcomes
- How the same model structure applies across biology, economics, and epidemiology
- How to save data to CSV and build ASCII visualizations from scratch

## Quick Start

1. Open `main.py` and read through the structure
2. Complete the TODOs in order (1 through 4)
3. Test your work: `python test_simulation.py`
4. Run the simulation:

```bash
pip install -r requirements.txt
python main.py
```

---

## The Model: Lotka-Volterra (Without the Calculus)

In the 1920s, mathematician Alfred Lotka and biologist Vito Volterra independently
developed equations describing predator-prey dynamics. The full version uses
differential equations, but the core idea is simple: populations change based on
rates.

At each time step:

- **Rabbits born** = current rabbits x birth rate
- **Rabbits eaten** = current rabbits x current foxes x predation rate
  (more meetings between rabbits and foxes means more eating)
- **Foxes born** = rabbits eaten x 0.1
  (foxes gain population from eating, but inefficiently)
- **Foxes died** = current foxes x death rate

The rabbit population is also capped by a carrying capacity (`max_population`),
representing limited food, space, and water in the habitat.

### What the Parameters Control

| Parameter | What It Represents | Default |
|---|---|---|
| `birth_rate` | How fast rabbits reproduce each step | 0.1 (10%) |
| `predation_rate` | How often a rabbit-fox encounter results in a kill | 0.01 |
| `death_rate` | Fraction of foxes that die each step (starvation, age) | 0.15 (15%) |
| `max_population` | Maximum rabbits the environment can support | 500 |

Try changing these values in `main.py` and re-running. A small change in
`predation_rate` can cause the fox population to die off entirely or send both
populations into wild oscillations.

---

## Your Tasks

Open `main.py` and complete these functions in order:

### TODO #1: `simulate_step(rabbits, foxes, params)`

Calculate one time step of the simulation. Apply the birth, predation, and death
formulas to produce new population values.

**Hints:**
- Use `int()` to convert float calculations to whole-number population counts
- Use `max(0, ...)` to prevent negative populations
- Use `min(..., params['max_population'])` to enforce the rabbit cap

### TODO #2: `run_simulation(initial_rabbits, initial_foxes, params, steps=100)`

Call `simulate_step` repeatedly and collect the population history.

**Hints:**
- Start both history lists with the initial values
- Each iteration, take the last values from the lists and pass them to `simulate_step`
- Return both lists as a tuple

### TODO #3: `save_results(rabbit_history, fox_history, filename="results.csv")`

Write the population history to a CSV file so you can analyze it later.

**Hints:**
- Import `csv` is already at the top of `main.py`
- Use `csv.writer` and write a header row: `['step', 'rabbits', 'foxes']`
- Loop over the histories with `enumerate` or `range`

### TODO #4: `print_chart(rabbit_history, fox_history)`

Display an ASCII chart showing population trends over time.

**Hints:**
- Print every 5th step to keep output manageable
- Scale both populations to a fixed chart width of 40 characters
- Use `R` for rabbit bars, `F` for fox bars, `*` where they overlap
- Use f-string alignment to keep columns tidy

---

## Testing Your Implementation

```bash
python test_simulation.py
```

You should see:
- for passing tests
- for failing tests, with hints

Implement the functions in order. Each TODO builds on the previous one.

---

## Reading the ASCII Chart

When you run `python main.py`, you'll see output like this:

```
Step   0 | RRRRRRRRRR FFFFF                    r=100  f= 20
Step   5 | RRRRRRRRRRRRR FFFF                  r=130  f= 17
Step  10 | RRRRRRRRRRRRRRRRRR FF               r=180  f= 14
Step  15 | RRRRRRRRRRRRRRRRRRRRRRRRRR F        r=260  f=  9
Step  20 | RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRF=360  f=  4
```

The `R` bar represents rabbit population, the `F` bar represents fox population.
Both are scaled relative to the largest population value observed in the entire run.
`*` appears where the two bars would overlap at the same scaled length.

Look for the oscillation: rabbit population climbs, fox population grows in response,
rabbit population crashes, fox population follows, and the cycle repeats.

---

## Real-World Connections

The same mathematical structure appears across many fields. Once you can read
this model, you can read all of them.

### Biology: Classic Predator-Prey
The Lotka-Volterra model was originally validated using data from the Hudson Bay
Company's fur trade records (1900-1920). Lynx and snowshoe hare populations showed
clear 10-year cycles matching the model's predictions.

### Epidemiology: The SIR Model
In disease modeling, populations are split into Susceptible, Infected, and Recovered.
The "predation rate" becomes a transmission rate; "death rate" becomes a recovery rate.
The same oscillating dynamics produce epidemic waves. COVID-19 models used this
exact structure.

### Economics: Market Competition
Two competing businesses can be modeled with similar equations. One company's growth
comes at the expense of the other's market share. Predation rate becomes competitive
pressure. Death rate becomes market exit. The model predicts boom-bust cycles in
competitive markets.

### Ecology: Keystone Species
The reintroduction of wolves into Yellowstone National Park in 1995 is a famous
real-world example. Wolf predation on elk changed not just elk population but also
river courses, vegetation patterns, and dozens of other species, demonstrating how
one predator-prey relationship propagates through an entire ecosystem.

---

## Extension Challenges

Once your basic implementation works, consider these additions:

### 🟢 Easy: Add a Third Species (Grass)
Rabbits need food too. Add a `grass` population that grows each step and is eaten by
rabbits. Update `simulate_step` to accept a third population and apply the same
predation logic between grass and rabbits.

### 🟡 Medium: Seasonal Variation
In real ecosystems, birth rates change with the seasons. Modify `run_simulation` to
vary `birth_rate` by a sine-wave pattern over time (higher in spring/summer, lower
in fall/winter). Observe how this shifts the population cycles.

### 🔴 Hard: Spatial Grid
Instead of treating all rabbits and foxes as a single mixed population, place each
animal on a grid. At each step, animals move to adjacent cells and only interact
with neighbors in the same cell. You'll need a 2D list and more complex update logic,
but the results produce realistic clustering and migration patterns.

---

## Reflection Questions

After completing the project:

1. What happens to both populations when you set `predation_rate` to `0`? Why?

2. What value of `death_rate` causes foxes to go extinct? What does that tell you
   about the balance required for a stable ecosystem?

3. The model uses integers (whole animals). How does that affect accuracy compared
   to the continuous equations Lotka and Volterra wrote?

4. The SIR model and this model share the same structure. What would you need to
   change to convert this into a disease simulation?

5. Your ASCII chart shows the data, but not as clearly as a line graph would.
   What information is lost in the ASCII representation? What would you need to
   add to make it more useful?

---

## Code Review Checklist

Before submitting:

- [ ] All tests pass (`python test_simulation.py`)
- [ ] The simulation runs without errors (`python main.py`)
- [ ] `results.csv` is created and contains valid data
- [ ] The ASCII chart is readable and updates for each 5th step
- [ ] You can explain what each parameter controls
