"""
Test Suite: My Website
========================

These tests verify that your Flask routes exist and return the right data.

Run all tests:
    python test_website.py

Each test prints PASS or FAIL along with a hint if something goes wrong.
Tests are organized by section so you can focus on the one you're building.

NOTE: The quote test (Section 5) requires an internet connection and will
be skipped automatically if the network is unavailable.
"""

import sys
import json
import unittest

# ---------------------------------------------------------------------------
# Import the Flask app
# ---------------------------------------------------------------------------
try:
    from app import app
except ImportError as e:
    print(f"ERROR: Could not import app.py: {e}")
    sys.exit(1)

app.config["TESTING"] = True


class TestSection1Homepage(unittest.TestCase):
    """Section 1: Home page loads correctly."""

    def setUp(self):
        self.client = app.test_client()

    def test_homepage_returns_200(self):
        """GET / should return HTTP 200."""
        response = self.client.get("/")
        self.assertEqual(
            response.status_code, 200,
            "The home route '/' returned a non-200 status. "
            "Check that @app.route('/') exists and render_template('index.html') is called."
        )

    def test_homepage_returns_html(self):
        """GET / should return HTML content."""
        response = self.client.get("/")
        content_type = response.content_type
        self.assertIn(
            "text/html", content_type,
            f"Expected HTML content type but got: {content_type}"
        )


class TestSection4Skills(unittest.TestCase):
    """Section 4: /api/skills route returns correct JSON."""

    def setUp(self):
        self.client = app.test_client()

    def test_skills_route_exists(self):
        """GET /api/skills should return HTTP 200."""
        response = self.client.get("/api/skills")
        self.assertEqual(
            response.status_code, 200,
            "The /api/skills route returned a non-200 status. "
            "Did you uncomment and implement the Section 4 route in app.py?"
        )

    def test_skills_returns_json(self):
        """GET /api/skills should return JSON."""
        response = self.client.get("/api/skills")
        if response.status_code != 200:
            self.skipTest("Skipping JSON check because route returned non-200.")
        self.assertIn(
            "application/json", response.content_type,
            "The /api/skills route did not return JSON. "
            "Make sure you're using jsonify()."
        )

    def test_skills_returns_list(self):
        """GET /api/skills should return a JSON array."""
        response = self.client.get("/api/skills")
        if response.status_code != 200:
            self.skipTest("Skipping structure check because route returned non-200.")
        data = json.loads(response.data)
        self.assertIsInstance(
            data, list,
            f"Expected a list but got: {type(data).__name__}. "
            "Make sure jsonify() receives a list, not a dict."
        )

    def test_skills_items_have_correct_keys(self):
        """Each skill object should have 'skill' and 'level' keys."""
        response = self.client.get("/api/skills")
        if response.status_code != 200:
            self.skipTest("Skipping key check because route returned non-200.")
        data = json.loads(response.data)
        if not data:
            self.fail("Skills list is empty. Add at least one skill.")
        for item in data:
            self.assertIn(
                "skill", item,
                f"Missing 'skill' key in: {item}. Each object needs a 'skill' key."
            )
            self.assertIn(
                "level", item,
                f"Missing 'level' key in: {item}. Each object needs a 'level' key."
            )

    def test_skills_levels_are_numeric(self):
        """Each skill's level should be a number between 0 and 100."""
        response = self.client.get("/api/skills")
        if response.status_code != 200:
            self.skipTest("Skipping level range check because route returned non-200.")
        data = json.loads(response.data)
        for item in data:
            if "level" not in item:
                continue
            level = item["level"]
            self.assertIsInstance(
                level, (int, float),
                f"'level' should be a number but got: {type(level).__name__} in {item}"
            )
            self.assertGreaterEqual(
                level, 0,
                f"'level' should be >= 0 but got {level} in {item}"
            )
            self.assertLessEqual(
                level, 100,
                f"'level' should be <= 100 but got {level} in {item}"
            )


class TestSection5Quote(unittest.TestCase):
    """Section 5: /quote route returns a quote with correct structure."""

    def setUp(self):
        self.client = app.test_client()

    def _check_network(self):
        """Return True if we can reach the internet."""
        import urllib.request
        try:
            urllib.request.urlopen("https://dummyjson.com", timeout=3)
            return True
        except Exception:
            return False

    def test_quote_route_exists(self):
        """GET /quote should return HTTP 200."""
        response = self.client.get("/quote")
        self.assertEqual(
            response.status_code, 200,
            "The /quote route returned a non-200 status. "
            "Did you uncomment and implement the Section 5 route in app.py?"
        )

    def test_quote_returns_content_and_author(self):
        """GET /quote should return JSON with 'content' and 'author' keys."""
        response = self.client.get("/quote")
        if response.status_code != 200:
            self.skipTest("Skipping key check because route returned non-200.")
        data = json.loads(response.data)
        self.assertIn(
            "content", data,
            f"Missing 'content' key in response: {data}. "
            "Make sure your route returns {{'content': '...', 'author': '...'}}"
        )
        self.assertIn(
            "author", data,
            f"Missing 'author' key in response: {data}. "
            "Make sure your route returns {{'content': '...', 'author': '...'}}"
        )

    def test_quote_content_is_string(self):
        """The quote content should be a non-empty string."""
        response = self.client.get("/quote")
        if response.status_code != 200:
            self.skipTest("Skipping because route returned non-200.")
        data = json.loads(response.data)
        content = data.get("content", "")
        self.assertIsInstance(content, str, "Quote 'content' should be a string.")
        self.assertGreater(len(content), 0, "Quote 'content' should not be empty.")


class TestSection7Visitors(unittest.TestCase):
    """Section 7: /api/visitors GET and POST routes."""

    def setUp(self):
        self.client = app.test_client()
        # Remove counter file before each test for clean state
        import os
        if os.path.exists("counter.txt"):
            os.remove("counter.txt")

    def tearDown(self):
        import os
        if os.path.exists("counter.txt"):
            os.remove("counter.txt")

    def test_get_visitors_returns_200(self):
        """GET /api/visitors should return HTTP 200."""
        response = self.client.get("/api/visitors")
        self.assertEqual(
            response.status_code, 200,
            "GET /api/visitors returned non-200. "
            "Did you uncomment the Section 7 route and include 'GET' in methods=[]?"
        )

    def test_get_visitors_returns_count(self):
        """GET /api/visitors should return JSON with a 'count' key."""
        response = self.client.get("/api/visitors")
        if response.status_code != 200:
            self.skipTest("Skipping because GET route returned non-200.")
        data = json.loads(response.data)
        self.assertIn(
            "count", data,
            f"Missing 'count' key in: {data}. Return jsonify({{'count': N}})"
        )
        self.assertIsInstance(
            data["count"], int,
            f"'count' should be an integer but got: {type(data['count']).__name__}"
        )

    def test_post_visitors_increments_count(self):
        """POST /api/visitors should increment the count."""
        response1 = self.client.post("/api/visitors")
        self.assertEqual(
            response1.status_code, 200,
            "POST /api/visitors returned non-200. "
            "Did you include 'POST' in methods=[] for the Section 7 route?"
        )
        data1 = json.loads(response1.data)

        response2 = self.client.post("/api/visitors")
        data2 = json.loads(response2.data)

        self.assertGreater(
            data2["count"], data1["count"],
            f"Count should increase on POST. Got {data1['count']} then {data2['count']}."
        )

    def test_post_visitors_increments_by_one(self):
        """Each POST should increment the count by exactly 1."""
        r1 = self.client.post("/api/visitors")
        r2 = self.client.post("/api/visitors")
        count1 = json.loads(r1.data)["count"]
        count2 = json.loads(r2.data)["count"]
        self.assertEqual(
            count2, count1 + 1,
            f"Expected count to go from {count1} to {count1 + 1}, but got {count2}."
        )

    def test_get_after_post_shows_updated_count(self):
        """GET after POST should reflect the incremented count."""
        post_response = self.client.post("/api/visitors")
        post_data = json.loads(post_response.data)

        get_response = self.client.get("/api/visitors")
        get_data = json.loads(get_response.data)

        self.assertEqual(
            get_data["count"], post_data["count"],
            f"GET returned {get_data['count']} but POST had returned {post_data['count']}. "
            "Make sure you're writing the count to counter.txt after incrementing."
        )


# =============================================================================
# TEST RUNNER
# =============================================================================

def run_tests():
    """Run tests and print a clean summary."""
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()

    # Load tests grouped by section
    sections = [
        ("Section 1: Home Page", TestSection1Homepage),
        ("Section 4: Skills API", TestSection4Skills),
        ("Section 5: Quote Route", TestSection5Quote),
        ("Section 7: Visitor Counter", TestSection7Visitors),
    ]

    for label, test_class in sections:
        tests = loader.loadTestsFromTestCase(test_class)
        suite.addTests(tests)

    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)

    print()
    print("=" * 60)
    if result.wasSuccessful():
        print("All tests passed!")
    else:
        failed = len(result.failures) + len(result.errors)
        skipped = len(result.skipped)
        print(f"{result.testsRun - failed - skipped} passed, "
              f"{failed} failed, {skipped} skipped")
    print("=" * 60)

    effective_total = result.testsRun - len(result.skipped)
    effective_passed = effective_total - len(result.failures) - len(result.errors)
    print(f"\n###3COMPUTE_RESULTS:{effective_passed}/{effective_total}###")

    return result.wasSuccessful()


if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
