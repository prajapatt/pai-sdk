# Prajapatt SDK

Small, dependency-light clients for applications that call the Prajapatt API.
The SDK is a client library: model training and inference stay in the Prajapatt
server.

## Packages

```text
sdk/
├── README.md
├── python/
│   ├── .gitignore
│   ├── README.md
│   ├── docs/
│   │   ├── README.md
│   │   ├── api-reference.md
│   │   └── getting-started.md
│   ├── pyproject.toml
│   ├── prajapatt_sdk/
│   │   ├── __init__.py
│   │   ├── client.py
│   │   ├── errors.py
│   │   └── types.py
│   └── tests/
│       └── test_client.py
└── typescript/
    ├── .gitignore
    ├── README.md
    ├── docs/
    │   ├── README.md
    │   ├── api-reference.md
    │   └── getting-started.md
    ├── package.json
    ├── tsconfig.json
    ├── src/
    │   ├── client.ts
    │   ├── errors.ts
    │   ├── index.ts
    │   └── types.ts
    └── test/
        └── client.test.mjs
```

## API setup

Start the API from the `server` directory after installing its server
dependencies and training a compatible JAX release. Configure a long,
per-customer API key on the server with `PRAJAPATT_API_KEYS`, for example a
JSON object mapping a key to a customer subject. Keep API keys on trusted
servers; do not embed them in browser code or public mobile bundles.

The API currently exposes:

- `GET /health` (unauthenticated health/status)
- `GET /v1/models` (authenticated)
- `POST /v1/chat/completions` (authenticated, text only)

`stream: true` uses Server-Sent Events, but the current server generates the
whole answer before sending chunks; it is not token-by-token generation.

## Python

Install the local package from the repository root:

```text
pip install ./sdk/python
```

```python
from prajapatt_sdk import PrajapattClient

client = PrajapattClient(
    base_url="http://127.0.0.1:8000",
    api_key="your-server-issued-api-key",
)

models = client.list_models()
answer = client.chat(
    [{"role": "user", "content": "What can Prajapatt do?"}],
    model=models[0]["id"],
)
print(answer.choices[0].message.content)
```

For a streamed response:

```python
for text in client.stream_chat(
    [{"role": "user", "content": "Explain a transformer briefly."}]
):
    print(text, end="", flush=True)
```

## TypeScript

```typescript
import { PrajapattClient } from "./sdk/typescript/src/index";

const client = new PrajapattClient({
  baseURL: "http://127.0.0.1:8000",
  apiKey: process.env.PRAJAPATT_API_KEY!,
});

const models = await client.listModels();
const answer = await client.chat({
  model: models[0].id,
  messages: [{ role: "user", content: "What can Prajapatt do?" }],
});
console.log(answer.choices[0]?.message.content);

for await (const text of client.streamChat({
  messages: [{ role: "user", content: "Explain a transformer briefly." }],
})) {
  process.stdout.write(text);
}
```

Run the Python SDK tests from `sdk/python` with
`python -m unittest discover -s tests`. Run the TypeScript package build and
tests from `sdk/typescript` with `npm test`.

The TypeScript package targets runtimes with the standard `fetch`,
`AbortSignal`, and `ReadableStream` APIs. Compile it with `npm run build` inside
`sdk/typescript` before publishing the generated `dist/` package.
From this repository root, install the local package in another Node project
with `npm install <path-to-repository>/sdk/typescript`.

## Compatibility notes

- Model defaults to `prajapatt-1`, matching the API default.
- Set `model` explicitly when the server uses a different public model ID.
- Use HTTPS for remote API servers. HTTP is suitable only for local development.
- `user` is deliberately not sent as an identity field. The server binds
  memory to the authenticated API-key subject; use a separate key per customer.
- The current model supports text only. Image input, voice, tool administration,
  and training are not exposed as working SDK features.
- A non-success API response raises a typed SDK exception; it is never returned
  as a successful completion.
