# TypeScript SDK API reference

Import `PrajapattClient`, error classes, and types from `@prajapatt/ai-sdk`.

## `new PrajapattClient(options)`

`PrajapattClientOptions` fields:

- `apiKey` (required): non-empty server-issued key, sent as a Bearer token for
  authenticated endpoints.
- `baseURL` (optional): API origin. Defaults to `http://127.0.0.1:8000`;
  trailing slashes are removed.
- `timeoutMs` (optional): positive request timeout in milliseconds. Defaults
  to 60,000.
- `fetch` (optional): replacement Fetch-compatible implementation, useful for
  custom runtimes or tests.

## Methods

### `health(options?)`

Returns the `PrajapattHealth` JSON response from unauthenticated `GET /health`.

### `listModels(options?)`

Returns `Promise<PrajapattModel[]>` from authenticated `GET /v1/models`.
Each model has `id`, `object`, `created`, and `owned_by`.

### `chat(request, options?)`

Returns `Promise<ChatCompletion>` from authenticated
`POST /v1/chat/completions`.

`ChatCompletionRequest` fields:

- `messages`: non-empty readonly array of `{ role, content }`; roles are
  `system`, `user`, or `assistant`, and content must be non-empty text.
- `model` (optional): public model ID. Defaults to `prajapatt-1`.
- `session_id` (optional): non-empty conversation/session identifier.

The final message must have role `user`. Completion data includes `id`,
`object`, `created`, `model`, and `choices`.

### `streamChat(request, options?)`

Returns an `AsyncGenerator<string>` that yields text from server-sent events.
It ends at the server's `[DONE]` event or when the response stream ends.

### Request options

`ChatRequestOptions` supports `signal?: AbortSignal`. It can be supplied as the
second argument to any method. Calls also use the client's configured timeout.

## Exceptions

- `PrajapattAPIError`: non-success HTTP status. Inspect `statusCode` and
  `detail`.
- `PrajapattConnectionError`: fetch/network/timeout request failure.
- `PrajapattError`: base SDK error for malformed responses and other SDK errors.
- `TypeError`: invalid client options or chat request input.

## Security and current limitations

The key is sent in `Authorization: Bearer ...`. Store it in a trusted
server-side environment, use HTTPS remotely, and issue separate keys for
separate customer subjects. The API currently supports text chat only; image
input, voice, and training are not SDK operations.
