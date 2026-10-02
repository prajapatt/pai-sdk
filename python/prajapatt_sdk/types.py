"""Typed API request and response structures."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal, TypedDict


class ChatMessage(TypedDict):
    role: Literal["system", "user", "assistant"]
    content: str


class Model(TypedDict):
    id: str
    object: str
    created: int
    owned_by: str


@dataclass(frozen=True)
class ChatCompletionMessage:
    role: str
    content: str


@dataclass(frozen=True)
class ChatCompletionChoice:
    index: int
    message: ChatCompletionMessage
    finish_reason: str | None


@dataclass(frozen=True)
class ChatCompletion:
    id: str
    object: str
    created: int
    model: str
    choices: tuple[ChatCompletionChoice, ...]

    @classmethod
    def from_dict(cls, payload: dict[str, object]) -> ChatCompletion:
        choices_payload = payload.get("choices")
        if not isinstance(choices_payload, list):
            raise ValueError("API completion response has no choices list.")

        choices: list[ChatCompletionChoice] = []
        for item in choices_payload:
            if not isinstance(item, dict):
                raise ValueError("API completion response contains an invalid choice.")
            message = item.get("message")
            if not isinstance(message, dict):
                raise ValueError("API completion choice has no message object.")
            role = message.get("role")
            content = message.get("content")
            if not isinstance(role, str) or not isinstance(content, str):
                raise ValueError("API completion message has invalid role or content.")
            index = item.get("index")
            finish_reason = item.get("finish_reason")
            choices.append(
                ChatCompletionChoice(
                    index=index if isinstance(index, int) else len(choices),
                    message=ChatCompletionMessage(role=role, content=content),
                    finish_reason=(
                        finish_reason if isinstance(finish_reason, str) else None
                    ),
                )
            )

        return cls(
            id=str(payload.get("id", "")),
            object=str(payload.get("object", "")),
            created=int(payload.get("created", 0)),
            model=str(payload.get("model", "")),
            choices=tuple(choices),
        )
