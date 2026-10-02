"""Explicit exceptions raised by the Prajapatt SDK."""

from __future__ import annotations


class PrajapattError(Exception):
    """Base class for SDK errors."""


class PrajapattConnectionError(PrajapattError):
    """The SDK could not establish or complete an HTTP request."""


class PrajapattAPIError(PrajapattError):
    """The Prajapatt API returned a non-success HTTP response."""

    def __init__(
        self,
        message: str,
        *,
        status_code: int,
        detail: object = None,
    ) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.detail = detail
