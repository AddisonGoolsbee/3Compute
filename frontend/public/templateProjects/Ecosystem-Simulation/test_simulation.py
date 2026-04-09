"""
Test Suite for Ecosystem Simulation
=====================================
Run this file to check your implementations:

    python test_simulation.py

Each test prints  for a pass or  for a fail.
At the end you'll see a summary: "N/M tests passed".
"""

import os
import csv
import tempfile

from main import (
    simulate_step,
    run_simulation,
    save_results,
    DEFAULT_PARAMS,
)

# =============================================================================
# Test helpers
# =============================================================================

passed = 0
failed = 0


def check(description, condition, hint=""):
    global passed, failed
    if condition:
        print(f"  ✅ {description}")
        passed += 1
    else:
        print(f"  ❌ {description}")
        if hint:
            print(f"       Hint: {hint}")
        failed += 1


# =============================================================================
# simulate_step tests
# =============================================================================

print()
print("=" * 55)
print("  Testing simulate_step()")
print("=" * 55)

# Basic sanity: function returns a tuple
result = simulate_step(100, 20, DEFAULT_PARAMS)
check(
    "simulate_step() returns a tuple (not None)",
    result is not None,
    "Make sure you return (new_rabbits, new_foxes) and remove the 'pass'."
)

if result is not None:
    new_rabbits, new_foxes = result

    check(
        "Returns a tuple of two values",
        isinstance(result, tuple) and len(result) == 2,
        "Return value should be (new_rabbits, new_foxes)."
    )

    # Known-value test with DEFAULT_PARAMS
    # rabbits=100, foxes=20, birth_rate=0.1, predation_rate=0.01, death_rate=0.15
    # rabbits_born  = int(100 * 0.1)           = 10
    # rabbits_eaten = int(100 * 20 * 0.01)     = 20
    # foxes_born    = int(20 * 0.1)            = 2
    # foxes_died    = int(20 * 0.15)           = 3
    # new_rabbits   = max(0, min(100+10-20, 500)) = 90
    # new_foxes     = max(0, 20+2-3)           = 19
    check(
        "Correct rabbit count: simulate_step(100, 20, DEFAULT_PARAMS) -> rabbits=90",
        new_rabbits == 90,
        f"Expected 90, got {new_rabbits}. Check birth_rate and predation_rate formulas."
    )
    check(
        "Correct fox count: simulate_step(100, 20, DEFAULT_PARAMS) -> foxes=19",
        new_foxes == 19,
        f"Expected 19, got {new_foxes}. Check death_rate and foxes_born formulas."
    )

    # Zero rabbits: no births, no predation, foxes should decline
    r0, f0 = simulate_step(0, 10, DEFAULT_PARAMS)
    check(
        "Zero rabbits: rabbit population stays at 0",
        r0 == 0,
        f"Expected 0 rabbits, got {r0}."
    )
    check(
        "Zero rabbits: fox population declines (no food)",
        f0 < 10,
        f"Expected fewer than 10 foxes, got {f0}. Foxes should die when there are no rabbits."
    )

    # Zero foxes: rabbits grow uncapped (at low population), foxes stay 0
    r1, f1 = simulate_step(50, 0, DEFAULT_PARAMS)
    check(
        "Zero foxes: fox population stays at 0",
        f1 == 0,
        f"Expected 0 foxes, got {f1}."
    )
    check(
        "Zero foxes: rabbits grow (births, no predation)",
        r1 > 50,
        f"Expected rabbits > 50, got {r1}. With no foxes, rabbits should grow."
    )

    # Max population cap
    params_low_cap = dict(DEFAULT_PARAMS)
    params_low_cap['max_population'] = 50
    r2, _ = simulate_step(50, 0, params_low_cap)
    check(
        "Rabbit population is capped at max_population",
        r2 <= 50,
        f"Expected rabbits <= 50 (cap), got {r2}."
    )

    # Both populations should never go negative
    r3, f3 = simulate_step(1, 1000, DEFAULT_PARAMS)
    check(
        "Populations never go negative (massive predation event)",
        r3 >= 0 and f3 >= 0,
        f"Got rabbits={r3}, foxes={f3}. Both must be >= 0."
    )

    # High-population test with known values
    # rabbits=200, foxes=30, DEFAULT_PARAMS
    # rabbits_born  = int(200 * 0.1)           = 20
    # rabbits_eaten = int(200 * 30 * 0.01)     = 60
    # foxes_born    = int(60 * 0.1)            = 6
    # foxes_died    = int(30 * 0.15)           = 4
    # new_rabbits   = max(0, min(200+20-60, 500)) = 160
    # new_foxes     = max(0, 30+6-4)           = 32
    r4, f4 = simulate_step(200, 30, DEFAULT_PARAMS)
    check(
        "Known-value test: simulate_step(200, 30) -> rabbits=160",
        r4 == 160,
        f"Expected 160, got {r4}."
    )
    check(
        "Known-value test: simulate_step(200, 30) -> foxes=32",
        f4 == 32,
        f"Expected 32, got {f4}."
    )
else:
    # Skip dependent tests
    for _ in range(10):
        check("(skipped: simulate_step returned None)", False)


# =============================================================================
# run_simulation tests
# =============================================================================

print()
print("=" * 55)
print("  Testing run_simulation()")
print("=" * 55)

sim_result = run_simulation(100, 20, DEFAULT_PARAMS, steps=50)
check(
    "run_simulation() returns a value (not None)",
    sim_result is not None,
    "Make sure you return (rabbit_history, fox_history) and remove the 'pass'."
)

if sim_result is not None:
    rh, fh = sim_result

    check(
        "Returns a tuple of two lists",
        isinstance(rh, list) and isinstance(fh, list),
        "Both rabbit_history and fox_history should be lists."
    )
    check(
        "rabbit_history has steps+1 entries (includes step 0)",
        len(rh) == 51,
        f"Expected 51 entries (steps 0-50), got {len(rh)}."
    )
    check(
        "fox_history has steps+1 entries (includes step 0)",
        len(fh) == 51,
        f"Expected 51 entries (steps 0-50), got {len(fh)}."
    )
    check(
        "First entry is the initial rabbit population",
        rh[0] == 100,
        f"Expected rh[0]=100, got {rh[0]}. History should start with initial values."
    )
    check(
        "First entry is the initial fox population",
        fh[0] == 20,
        f"Expected fh[0]=20, got {fh[0]}."
    )

    # Verify second entry matches simulate_step output
    expected_r1, expected_f1 = simulate_step(100, 20, DEFAULT_PARAMS)
    check(
        "Second entry matches a direct simulate_step() call",
        rh[1] == expected_r1 and fh[1] == expected_f1,
        f"Expected rh[1]={expected_r1}, fh[1]={expected_f1}. Got rh[1]={rh[1]}, fh[1]={fh[1]}."
    )

    # Default steps argument
    sim_default = run_simulation(100, 20, DEFAULT_PARAMS)
    check(
        "Default steps=100 gives 101 entries",
        sim_default is not None and len(sim_default[0]) == 101,
        "run_simulation() with no steps argument should default to 100 steps."
    )

    # All values non-negative
    check(
        "All population values are non-negative",
        all(r >= 0 for r in rh) and all(f >= 0 for f in fh),
        "Populations should never go below 0."
    )
else:
    for _ in range(8):
        check("(skipped: run_simulation returned None)", False)


# =============================================================================
# save_results tests
# =============================================================================

print()
print("=" * 55)
print("  Testing save_results()")
print("=" * 55)

rh_test = [100, 90, 85]
fh_test = [20, 19, 18]

# Use a temp file so we don't litter the working directory
with tempfile.NamedTemporaryFile(
    mode='w', suffix='.csv', delete=False
) as tmp:
    tmp_name = tmp.name

try:
    save_results(rh_test, fh_test, tmp_name)

    check(
        "save_results() creates the output file",
        os.path.exists(tmp_name),
        "Make sure you actually write to the filename argument."
    )

    if os.path.exists(tmp_name) and os.path.getsize(tmp_name) > 0:
        with open(tmp_name, newline='') as f:
            reader = csv.DictReader(f)
            rows = list(reader)

        check(
            "CSV has 'step' column",
            'step' in (rows[0] if rows else {}),
            "Write a header row with columns: step, rabbits, foxes"
        )
        check(
            "CSV has 'rabbits' column",
            'rabbits' in (rows[0] if rows else {}),
            "Write a header row with columns: step, rabbits, foxes"
        )
        check(
            "CSV has 'foxes' column",
            'foxes' in (rows[0] if rows else {}),
            "Write a header row with columns: step, rabbits, foxes"
        )
        check(
            "CSV has the correct number of data rows",
            len(rows) == 3,
            f"Expected 3 rows (one per step), got {len(rows)}."
        )
        if rows:
            check(
                "First row has correct step number (0)",
                rows[0]['step'] == '0',
                f"Expected step=0, got {rows[0].get('step')}."
            )
            check(
                "First row has correct rabbit count",
                rows[0]['rabbits'] == '100',
                f"Expected rabbits=100, got {rows[0].get('rabbits')}."
            )
            check(
                "First row has correct fox count",
                rows[0]['foxes'] == '20',
                f"Expected foxes=20, got {rows[0].get('foxes')}."
            )
            check(
                "Last row has correct step number (2)",
                rows[-1]['step'] == '2',
                f"Expected step=2, got {rows[-1].get('step')}."
            )
    else:
        check("CSV file is not empty", False, "save_results() did not write any data.")
        for _ in range(7):
            check("(skipped: file was empty)", False)

finally:
    if os.path.exists(tmp_name):
        os.remove(tmp_name)


# =============================================================================
# Summary
# =============================================================================

total = passed + failed
print()
print("=" * 55)
print(f"  {passed}/{total} tests passed")
print("=" * 55)

if failed == 0:
    print()
    print("All tests pass. Run 'python main.py' to see the simulation.")
else:
    print()
    print("Some tests failed. Read the hints above and check your code.")
    print("Implement functions in order: simulate_step first, then the rest.")
print()

print(f"###3COMPUTE_RESULTS:{passed}/{passed + failed}###")
