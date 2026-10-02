from __future__ import annotations

import json
import unittest

from prajapatt_sdk import PrajapattAPIError, PrajapattClient


class PrajapattClientTests(unittest.TestCase):
    def setUp(self) -> None:
        self.client = PrajapattClient(
            api_key="test-api-key",
            base_url="http://localhost:8000/",
        )

    def test_builds_authenticated_chat_request_without_client_identity(self) -> None:
        body = self.client._chat_payload(
            [{"role": "user", "content": "Hello"}],
            model="prajapatt-1",
            session_id="session-1",
        )
        request = self.client._build_request(
            "POST",
            "/v1/chat/completions",
            body=body,
        )

        self.assertEqual(request.full_url, "http://localhost:8000/v1/chat/completions")
        self.assertEqual(request.get_header("Authorization"), "Bearer test-api-key")
        self.assertNotIn("user", json.loads(request.data.decode("utf-8")))

    def test_health_request_does_not_send_api_key(self) -> None:
        request = self.client._build_request(
            "GET",
            "/health",
            authenticated=False,
        )

        self.assertIsNone(request.get_header("Authorization"))

    def test_rejects_chat_without_final_user_message(self) -> None:
        with self.assertRaisesRegex(ValueError, "final chat message"):
            self.client._chat_payload(
                [{"role": "assistant", "content": "An answer"}],
                model="prajapatt-1",
                session_id=None,
            )

    def test_api_error_keeps_status_and_detail(self) -> None:
        error = PrajapattAPIError(
            "Model is unavailable",
            status_code=503,
            detail="Model is unavailable",
        )

        self.assertEqual(error.status_code, 503)
        self.assertEqual(error.detail, "Model is unavailable")
        self.assertEqual(str(error), "Model is unavailable")


if __name__ == "__main__":
    unittest.main()
