"""
Ecosystem Simulation - Reference Solution
==========================================
INSTRUCTOR USE ONLY. Do not distribute to students.

This file contains complete implementations of all four TODO functions.
"""

import csv
import os


DEFAULT_PARAMS = {
    'birth_rate':      0.1,
    'predation_rate':  0.01,
    'death_rate':      0.15,
    'max_population':  500,
}


# =============================================================================
# Solution: simulate_step
# =============================================================================

def simulate_step(rabbits, foxes, params):
    """
    Calculate one time step of population change.

    Each quantity is converted to int immediately to keep the simulation
    working in whole-number populations throughout.
    """
    rabbits_born  = int(rabbits * params['birth_rate'])
    rabbits_eaten = int(rabbits * foxes * params['predation_rate'])
    foxes_born    = int(rabbits_eaten * 0.1)
    foxes_died    = int(foxes * params['death_rate'])

    new_rabbits = max(0, min(rabbits + rabbits_born - rabbits_eaten,
                             params['max_population']))
    new_foxes   = max(0, foxes + foxes_born - foxes_died)

    return (new_rabbits, new_foxes)


# =============================================================================
# Solution: run_simulation
# =============================================================================

def run_simulation(initial_rabbits, initial_foxes, params, steps=100):
    """
    Run the simulation for `steps` time steps.

    History lists include the initial state (step 0) as their first element,
    so each list has length steps + 1.
    """
    rabbit_history = [initial_rabbits]
    fox_history    = [initial_foxes]

    for _ in range(steps):
        rabbits, foxes = simulate_step(rabbit_history[-1], fox_history[-1], params)
        rabbit_history.append(rabbits)
        fox_history.append(foxes)

    return (rabbit_history, fox_history)


# =============================================================================
# Solution: save_results
# =============================================================================

def save_results(rabbit_history, fox_history, filename="results.csv"):
    """
    Write simulation results to a CSV file with columns: step, rabbits, foxes.

    The newline='' argument prevents Python's csv module from writing an extra
    blank line between rows on Windows.
    """
    with open(filename, 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['step', 'rabbits', 'foxes'])
        for i in range(len(rabbit_history)):
            writer.writerow([i, rabbit_history[i], fox_history[i]])


# =============================================================================
# Solution: print_chart
# =============================================================================

def print_chart(rabbit_history, fox_history):
    """
    Print an ASCII bar chart of both populations, printing every 5th step.

    Scaling: both populations are divided by the global maximum and then
    multiplied by chart_width to produce a bar length in characters.

    Overlap logic: if both scaled bars have length >= N, the first N characters
    are printed as '*'. The remaining R-only and F-only sections follow.

    The f-string format specifier `{bar:<{chart_width}}` left-aligns `bar`
    in a field of exactly chart_width characters, padding with spaces. This
    keeps the population numbers on the right aligned across all rows.
    """
    max_pop = max(max(rabbit_history), max(fox_history))
    if max_pop == 0:
        return

    chart_width = 40

    for i in range(0, len(rabbit_history), 5):
        r = rabbit_history[i]
        f = fox_history[i]

        r_scaled = int(r / max_pop * chart_width)
        f_scaled = int(f / max_pop * chart_width)

        overlap = min(r_scaled, f_scaled)
        r_only  = r_scaled - overlap
        f_only  = f_scaled - overlap

        bar = '*' * overlap + 'R' * r_only + 'F' * f_only
        print(f"Step {i:3d} | {bar:<{chart_width}}  r={r:3d}  f={f:3d}")


# =============================================================================
# load_results (provided in student main.py as well)
# =============================================================================

def load_results(filename="results.csv"):
    """Reload results from CSV for further analysis."""
    rabbit_history = []
    fox_history    = []
    with open(filename, newline='') as f:
        reader = csv.DictReader(f)
        for row in reader:
            rabbit_history.append(int(row['rabbits']))
            fox_history.append(int(row['foxes']))
    return rabbit_history, fox_history


# =============================================================================
# main
# =============================================================================

def main():
    print("=" * 60)
    print("   Ecosystem Simulation: Rabbits and Foxes  [SOLUTION]")
    print("=" * 60)
    print()

    rabbit_history, fox_history = run_simulation(
        initial_rabbits=100,
        initial_foxes=20,
        params=DEFAULT_PARAMS,
        steps=100
    )

    print(f"Simulation complete. {len(rabbit_history) - 1} steps recorded.")
    print()
    print("Population over time  (R = rabbits, F = foxes, * = overlap):")
    print("-" * 60)
    print_chart(rabbit_history, fox_history)
    print()

    save_results(rabbit_history, fox_history)
    if os.path.exists("results.csv"):
        print("Results saved to results.csv")

    print()
    print("Summary:")
    print(f"  Starting:  rabbits={rabbit_history[0]}, foxes={fox_history[0]}")
    print(f"  Final:     rabbits={rabbit_history[-1]}, foxes={fox_history[-1]}")
    print(f"  Peak rabbits: {max(rabbit_history)}")
    print(f"  Peak foxes:   {max(fox_history)}")


if __name__ == "__main__":
    main()
