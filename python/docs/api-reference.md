# Python SDK API reference

## `PrajapattClient`

Import from `prajapatt_sdk`.

```python
PrajapattClient(*, api_key, base_url="http://127.0.0.1:8000", timeout=60.0)
```

- `api_key`: required, non-empty server-issued key. Sent as a Bearer token for
  authenticated endpoints.
- `base_url`: API origin, with trailing slashes removed.
- `timeout`: HTTP request timeout in seconds; must be positive.

### `health()`

Returns the JSON object from unauthenticated `GET /health`.

### `list_models()`

Returns a list of model records from authenticated `GET /v1/models`. Each
record is a `Model` mapping with `id`, `object`, `created`, and `owned_by`
fields.

### `chat(messages, *, model="prajapatt-1", session_id=None)`

Sends authenticated `POST /v1/chat/completions` and returns a frozen
`ChatCompletion` dataclass.

- `messages`: non-empty sequence of `ChatMessage` mappings. Each has a `role`
  (`system`, `user`, or `assistant`) and non-empty string `content`.
- `model`: non-empty public model ID.
- `session_id`: optional non-empty conversation/session identifier.

`ChatCompletion` exposes `id`, `object`, `created`, `model`, and `choices`.
Each choice contains `index`, `message`, and `finish_reason`; message content
is available as `completion.choices[0].message.content`.

### `stream_chat(messages, *, model="prajapatt-1", session_id=None)`

Returns an iterator of text strings from the server-sent event response. Uses
the same message and session validation as `chat`.

## Exceptions

All SDK exceptions inherit from `PrajapattError`.

- `PrajapattAPIError`: HTTP error response. Inspect `status_code` and `detail`.
- `PrajapattConnectionError`: network, timeout, or connection failure.
- `PrajapattError`: base SDK error.
- `ValueError`: invalid input or malformed API response.

## Security and current limitations

The API key is sent in an `Authorization: Bearer ...` header. Keep the key in
trusted server-side code and use HTTPS for non-local connections. Use separate
server-issued keys for separate customer subjects. The API currently supports
text chat only; image input, voice, and training are not SDK operations.
