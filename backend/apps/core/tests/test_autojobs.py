import time
from unittest import mock

from django.test import SimpleTestCase

from apps.core import autojobs


class AutoJobsTests(SimpleTestCase):
    def setUp(self):
        autojobs._last.clear()
        autojobs._running.clear()

    def test_jobs_start_once_then_wait_for_their_interval(self):
        calls = []
        jobs = {"a": (60, lambda: calls.append("a")), "b": (3600, lambda: calls.append("b"))}
        with mock.patch.object(autojobs, "JOBS", jobs):
            self.assertEqual(sorted(autojobs.kick()), ["a", "b"])
            time.sleep(0.2)
            self.assertEqual(autojobs.kick(), [])  # not due yet
            autojobs._last["a"] -= 61  # a minute later
            self.assertEqual(autojobs.kick(), ["a"])
            time.sleep(0.2)
        self.assertEqual(sorted(calls), ["a", "a", "b"])

    def test_a_failing_job_does_not_break_anything(self):
        def boom():
            raise RuntimeError("nope")

        with mock.patch.object(autojobs, "JOBS", {"x": (60, boom)}), self.assertLogs("apps.core.autojobs", "ERROR"):
            autojobs.kick()
            time.sleep(0.2)
        self.assertNotIn("x", autojobs._running)

    def test_off_while_tests_run(self):
        self.assertFalse(autojobs.enabled())
