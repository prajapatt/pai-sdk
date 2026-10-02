"""Synchronous, standard-library-only Prajapatt API client."""

from __future__ import annotations

import json
from collections.abc import Iterator, Mapping, Sequence
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from .errors import PrajapattAPIError, PrajapattConnectionError
from .types import ChatCompletion, ChatMessage, Model


class PrajapattClient:
    """Call Prajapatt's authenticated HTTP API from a trusted Python runtime."""

    def __init__(
        self,
        *,
        api_key: str,
        base_url: str = "http://127.0.0.1:8000",
        timeout: float = 60.0,
    ) -> None:
        if not api_key or not api_key.strip():
            raise ValueError("api_key must be a non-empty server-issued key.")
        if not base_url or not base_url.strip():
            raise ValueError("base_url must be a non-empty URL.")
        if timeout <= 0:
            raise ValueError("timeout must be greater than zero.")
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout

    def health(self) -> dict[str, Any]:
        """Read server health; the API's health route does not require a key."""
        return self._request("GET", "/health", authenticated=False)

    def list_models(self) -> list[Model]:
        """List public models available to this API key."""
        payload = self._request("GET", "/v1/models")
        data = payload.get("data")
        if not isinstance(data, list):
            raise ValueError("API model response has no data list.")
        models: list[Model] = []
        for item in data:
            if not isinstance(item, dict) or not isinstance(item.get("id"), str):
                raise ValueError("API model response contains an invalid model.")
            models.append(
                Model(
                    id=item["id"],
                    object=str(item.get("object", "model")),
                    created=int(item.get("created", 0)),
                    owned_by=str(item.get("owned_by", "")),
                )
            )
        return models

    def chat(
        self,
        messages: Sequence[ChatMessage | Mapping[str, str]],
        *,
        model: str = "prajapatt-1",
        session_id: str | None = None,
    ) -> ChatCompletion:
        """Create a non-streaming text completion."""
        payload = self._request(
            "POST",
            "/v1/chat/completions",
            body=self._chat_payload(messages, model=model, session_id=session_id),
        )
        return ChatCompletion.from_dict(payload)

    def stream_chat(
        self,
        messages: Sequence[ChatMessage | Mapping[str, str]],
        *,
        model: str = "prajapatt-1",
        session_id: str | None = None,
    ) -> Iterator[str]:
        """Yield text chunks from the API's Server-Sent Events response."""
        body = self._chat_payload(messages, model=model, session_id=session_id)
        body["stream"] = True
        request = self._build_request(
            "POST",
            "/v1/chat/completions",
            body=body,
            accept="text/event-stream",
        )
        try:
            response = urlopen(request, timeout=self.timeout)
        except HTTPError as error:
            self._raise_api_error(error)
        except (URLError, TimeoutError, OSError) as error:
            raise PrajapattConnectionError(str(error)) from error

        with response:
            for raw_line in response:
                line = raw_line.decode("utf-8").strip()
                if not line.startswith("data:"):
                    continue
                data = line[5:].strip()
                if data == "[DONE]":
                    return
                try:
                    event = json.loads(data)
                except json.JSONDecodeError as error:
                    raise ValueError("API sent an invalid streaming event.") from error
                yield self._stream_text(event)

    @staticmethod
    def _chat_payload(
        messages: Sequence[ChatMessage | Mapping[str, str]],
        *,
        model: str,
        session_id: str | None,
    ) -> dict[str, object]:
        if not messages:
            raise ValueError("At least one chat message is required.")
        if not model or not model.strip():
            raise ValueError("model must be a non-empty model ID.")

        normalized: list[dict[str, str]] = []
        for item in messages:
            role = item.get("role")
            content = item.get("content")
            if role not in {"system", "user", "assistant"}:
                raise ValueError("Messages must use system, user, or assistant role.")
            if not isinstance(content, str) or not content.strip():
                raise ValueError("Message content must be non-empty text.")
            normalized.append({"role": role, "content": content})
        if normalized[-1]["role"] != "user":
            raise ValueError("The final chat message must be from the user.")
        payload: dict[str, object] = {"model": model, "messages": normalized}
        if session_id is not None:
            if not session_id.strip():
                raise ValueError("session_id cannot be blank.")
            payload["session_id"] = session_id
        return payload

    @staticmethod
    def _stream_text(event: object) -> str:
        if not isinstance(event, dict):
            raise ValueError("API streaming event must be a JSON object.")
        choices = event.get("choices")
        if not isinstance(choices, list) or not choices:
            return ""
        choice = choices[0]
        if not isinstance(choice, dict):
            return ""
        delta = choice.get("delta")
        if not isinstance(delta, dict):
            return ""
        content = delta.get("content", "")
        if not isinstance(content, str):
            raise ValueError("API streaming content must be text.")
        return content

    def _request(
        self,
        method: str,
        path: str,
        *,
        body: dict[str, object] | None = None,
        authenticated: bool = True,
    ) -> dict[str, Any]:
        request = self._build_request(
            method,
            path,
            body=body,
            authenticated=authenticated,
        )
        try:
            with urlopen(request, timeout=self.timeout) as response:
                payload = json.loads(response.read().decode("utf-8"))
        except HTTPError as error:
            self._raise_api_error(error)
        except (URLError, TimeoutError, OSError) as error:
            raise PrajapattConnectionError(str(error)) from error
        except (UnicodeDecodeError, json.JSONDecodeError) as error:
            raise ValueError("API returned an invalid JSON response.") from error
        if not isinstance(payload, dict):
            raise ValueError("API response must be a JSON object.")
        return payload

    def _build_request(
        self,
        method: str,
        path: str,
        *,
        body: dict[str, object] | None = None,
        authenticated: bool = True,
        accept: str = "application/json",
    ) -> Request:
        headers = {"Accept": accept}
        if authenticated:
            headers["Authorization"] = f"Bearer {self.api_key}"
        data = None
        if body is not None:
            data = json.dumps(body).encode("utf-8")
            headers["Content-Type"] = "application/json"
        return Request(
            f"{self.base_url}{path}",
            data=data,
            headers=headers,
            method=method,
        )

    @staticmethod
    def _raise_api_error(error: HTTPError) -> None:
        raw = error.read()
        try:
            payload = json.loads(raw.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            payload = {"detail": raw.decode("utf-8", errors="replace")}
        detail = payload.get("detail") if isinstance(payload, dict) else payload
        message = detail if isinstance(detail, str) else str(detail or error.reason)
        raise PrajapattAPIError(
            message,
            status_code=error.code,
            detail=detail,
        ) from error
