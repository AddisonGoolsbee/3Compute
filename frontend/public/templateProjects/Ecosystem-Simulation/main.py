"""
Ecosystem Simulation: Predator-Prey Population Dynamics
========================================================

In this project, you'll model how rabbit and fox populations change over time.
When rabbits are plentiful, fox populations grow. When foxes eat too many rabbits,
rabbit populations crash, which then causes fox populations to decline. The cycle
repeats, producing the oscillating patterns seen in real ecosystems.

This is a simplified version of the Lotka-Volterra model, used in biology,
economics, and epidemiology.

YOUR TASKS:
1. Implement simulate_step()   - Calculate one time step of population change
2. Implement run_simulation()  - Run many steps and record the history
3. Implement save_results()    - Save the population history to a CSV file
4. Implement print_chart()     - Display an ASCII chart of the results

Run the tests to check your work: python test_simulation.py
"""

import csv
import os


# =============================================================================
# SIMULATION PARAMETERS (PROVIDED)
# =============================================================================

DEFAULT_PARAMS = {
    'birth_rate':      0.1,   # Fraction of rabbits that reproduce each step
    'predation_rate':  0.01,  # Fraction of rabbit-fox encounters that result in a kill
    'death_rate':      0.15,  # Fraction of foxes that die each step (starvation, age)
    'max_population':  500,   # Carrying capacity: rabbits can't exceed this
}


# =============================================================================
# TODO #1: IMPLEMENT simulate_step
# =============================================================================

def simulate_step(rabbits, foxes, params):
    """
    Calculate the next population values for one time step.

    The rules:
      - Rabbits reproduce at a fixed rate each step.
      - Rabbits are eaten at a rate proportional to how often rabbits and foxes meet.
      - Each predation event produces a small gain in fox population.
      - Foxes die at a fixed rate each step (starvation, old age, etc.).
      - Rabbit population is capped at params['max_population'].
      - Neither population can go below zero.

    Args:
        rabbits (int): Current rabbit population
        foxes   (int): Current fox population
        params  (dict): Keys: birth_rate, predation_rate, death_rate, max_population

    Returns:
        (new_rabbits, new_foxes): A tuple of two ints

    HINT:
        rabbits_born  = int(rabbits * params['birth_rate'])
        rabbits_eaten = int(rabbits * foxes * params['predation_rate'])
        foxes_born    = int(rabbits_eaten * 0.1)   # foxes gain from eating
        foxes_died    = int(foxes * params['death_rate'])

        new_rabbits = max(0, min(rabbits + rabbits_born - rabbits_eaten,
                                 params['max_population']))
        new_foxes   = max(0, foxes + foxes_born - foxes_died)
    """
    # TODO: Calculate how many rabbits are born this step
    # rabbits_born = int(rabbits * params['birth_rate'])

    # TODO: Calculate how many rabbits are eaten this step
    # (depends on both rabbit AND fox populations)
    # rabbits_eaten = int(rabbits * foxes * params['predation_rate'])

    # TODO: Calculate how many foxes are born from eating
    # foxes_born = int(rabbits_eaten * 0.1)

    # TODO: Calculate how many foxes die this step
    # foxes_died = int(foxes * params['death_rate'])

    # TODO: Calculate new populations
    # new_rabbits = max(0, min(rabbits + rabbits_born - rabbits_eaten,
    #                          params['max_population']))
    # new_foxes = max(0, foxes + foxes_born - foxes_died)

    # TODO: Return the new populations as a tuple
    # return (new_rabbits, new_foxes)

    pass  # Remove this line when you implement the function


# =============================================================================
# TODO #2: IMPLEMENT run_simulation
# =============================================================================

def run_simulation(initial_rabbits, initial_foxes, params, steps=100):
    """
    Run the simulation for a given number of steps, recording population
    counts at each step.

    Args:
        initial_rabbits (int): Starting rabbit population
        initial_foxes   (int): Starting fox population
        params          (dict): Simulation parameters (see DEFAULT_PARAMS)
        steps           (int): Number of steps to simulate (default 100)

    Returns:
        (rabbit_history, fox_history): Two lists, each of length steps+1.
        The first element is the initial population; each subsequent element
        is the population after that step.

    HINT:
        Start both lists with the initial values.
        Loop 'steps' times, calling simulate_step each iteration.
        Append the results to the history lists.
    """
    # TODO: Initialize history lists with starting populations
    # rabbit_history = [initial_rabbits]
    # fox_history    = [initial_foxes]

    # TODO: Run the simulation for 'steps' steps
    # for _ in range(steps):
    #     rabbits, foxes = simulate_step(rabbit_history[-1], fox_history[-1], params)
    #     rabbit_history.append(rabbits)
    #     fox_history.append(foxes)

    # TODO: Return both history lists
    # return (rabbit_history, fox_history)

    pass  # Remove this line when you implement the function


# =============================================================================
# TODO #3: IMPLEMENT save_results
# =============================================================================

def save_results(rabbit_history, fox_history, filename="results.csv"):
    """
    Save the simulation results to a CSV file with columns: step, rabbits, foxes.

    Args:
        rabbit_history (list): Rabbit population at each step
        fox_history    (list): Fox population at each step
        filename       (str):  Output filename (default "results.csv")

    HINT:
        Use the csv module. Open the file with newline='' to avoid extra blank
        lines on Windows. Write a header row, then one row per step.

        with open(filename, 'w', newline='') as f:
            writer = csv.writer(f)
            writer.writerow(['step', 'rabbits', 'foxes'])
            for i in range(len(rabbit_history)):
                writer.writerow([i, rabbit_history[i], fox_history[i]])
    """
    # TODO: Open the file and write header + data rows
    # with open(filename, 'w', newline='') as f:
    #     writer = csv.writer(f)
    #     writer.writerow(['step', 'rabbits', 'foxes'])
    #     for i in range(len(rabbit_history)):
    #         writer.writerow([i, rabbit_history[i], fox_history[i]])

    pass  # Remove this line when you implement the function


# =============================================================================
# TODO #4: IMPLEMENT print_chart
# =============================================================================

def print_chart(rabbit_history, fox_history):
    """
    Print an ASCII chart showing how rabbit and fox populations change over time.

    Format:
      - Print every 5th step (steps 0, 5, 10, ...).
      - Scale each population to fit within 40 characters of width.
      - Use 'R' for the rabbit bar, 'F' for the fox bar.
      - If the bars would overlap (same scaled length), print '*' for the
        overlap portion instead.
      - Print a step number and the two populations at the end of each line.

    Example output (values approximate):
        Step   0 | RRRRRRRRRR....FFFFF            r=100  f= 20
        Step   5 | RRRRRRRRRRRRR..FFFF            r=120  f= 18
        ...

    HINT:
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
    """
    # TODO: Find the maximum population across both histories (used for scaling)
    # max_pop = max(max(rabbit_history), max(fox_history))
    # if max_pop == 0:
    #     return

    # TODO: Set chart width and loop over every 5th step
    # chart_width = 40
    # for i in range(0, len(rabbit_history), 5):
    #     r = rabbit_history[i]
    #     f = fox_history[i]
    #     r_scaled = int(r / max_pop * chart_width)
    #     f_scaled = int(f / max_pop * chart_width)
    #
    #     overlap = min(r_scaled, f_scaled)
    #     r_only  = r_scaled - overlap
    #     f_only  = f_scaled - overlap
    #
    #     bar = '*' * overlap + 'R' * r_only + 'F' * f_only
    #     print(f"Step {i:3d} | {bar:<{chart_width}}  r={r:3d}  f={f:3d}")

    pass  # Remove this line when you implement the function


# =============================================================================
# LOAD RESULTS (PROVIDED)
# =============================================================================

def load_results(filename="results.csv"):
    """
    Reload simulation results from a CSV file for further analysis.

    Returns:
        (rabbit_history, fox_history): Two lists of ints.
    """
    rabbit_history = []
    fox_history    = []
    with open(filename, newline='') as f:
        reader = csv.DictReader(f)
        for row in reader:
            rabbit_history.append(int(row['rabbits']))
            fox_history.append(int(row['foxes']))
    return rabbit_history, fox_history


# =============================================================================
# MAIN (PROVIDED)
# =============================================================================

def main():
    print("=" * 60)
    print("   Ecosystem Simulation: Rabbits and Foxes")
    print("=" * 60)

    # Check that the student has started implementing
    result = simulate_step(100, 20, DEFAULT_PARAMS)
    if result is None:
        print()
        print("It looks like you haven't implemented the required functions yet.")
        print("Open main.py and complete the TODO sections:")
        print("  1. simulate_step()")
        print("  2. run_simulation()")
        print("  3. save_results()")
        print("  4. print_chart()")
        print()
        print("Run 'python test_simulation.py' to test your implementations.")
        return

    print()
    print("Running simulation with default parameters...")
    print(f"  birth_rate:     {DEFAULT_PARAMS['birth_rate']}")
    print(f"  predation_rate: {DEFAULT_PARAMS['predation_rate']}")
    print(f"  death_rate:     {DEFAULT_PARAMS['death_rate']}")
    print(f"  max_population: {DEFAULT_PARAMS['max_population']}")
    print()

    rabbit_history, fox_history = run_simulation(
        initial_rabbits=100,
        initial_foxes=20,
        params=DEFAULT_PARAMS,
        steps=100
    )

    if rabbit_history is None:
        print("run_simulation() returned None. Check your implementation.")
        return

    print(f"Simulation complete. {len(rabbit_history) - 1} steps recorded.")
    print()

    # Print the ASCII chart
    print("Population over time  (R = rabbits, F = foxes, * = overlap):")
    print("-" * 60)
    print_chart(rabbit_history, fox_history)
    print()

    # Save to CSV
    save_results(rabbit_history, fox_history)
    if os.path.exists("results.csv"):
        print("Results saved to results.csv")

    # Quick summary
    print()
    print("Summary:")
    print(f"  Starting populations:  rabbits={rabbit_history[0]}, foxes={fox_history[0]}")
    print(f"  Final populations:     rabbits={rabbit_history[-1]}, foxes={fox_history[-1]}")
    print(f"  Peak rabbit population: {max(rabbit_history)}")
    print(f"  Peak fox population:    {max(fox_history)}")


if __name__ == "__main__":
    main()
