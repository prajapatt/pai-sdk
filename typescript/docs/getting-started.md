# Getting started

## Requirements and installation

The package requires Node.js 20.3 or later and has no runtime dependencies.
Build it from `sdk/typescript`:

```text
npm install
npm run build
```

The generated `dist/` directory is the package output and is intentionally
ignored by git. To use this local package from another Node project:

```text
npm install <path-to-repository>/sdk/typescript
```

Start and configure the Prajapatt API separately. API keys must stay in a
trusted server-side runtime; do not bundle them into browser or public mobile
code.

## Create a client

```typescript
import { PrajapattClient } from "@prajapatt/ai-sdk";

const client = new PrajapattClient({
  apiKey: process.env.PRAJAPATT_API_KEY!,
  baseURL: "http://127.0.0.1:8000",
  timeoutMs: 60_000,
});
```

`baseURL` defaults to `http://127.0.0.1:8000`; `timeoutMs` defaults to 60,000.
Use HTTPS for remote servers.

## Check the API and select a model

The health endpoint does not require authentication; listing models does:

```typescript
const health = await client.health();
const models = await client.listModels();
const model = models[0]?.id ?? "prajapatt-1";
console.log(health.status, model);
```

## Send a chat request

Messages accept `system`, `user`, and `assistant` roles with non-empty text.
The final message must be from the user.

```typescript
const completion = await client.chat({
  model,
  messages: [
    { role: "system", content: "Answer clearly and briefly." },
    { role: "user", content: "What is a transformer model?" },
  ],
  session_id: "optional-conversation-id",
});

console.log(completion.choices[0]?.message.content);
```

`session_id` is optional and lets the server associate requests with the same
conversation session. The API scopes memory to the authenticated key's subject;
the SDK does not accept a client-supplied user identity.

## Stream response text

```typescript
for await (const text of client.streamChat({
  messages: [{ role: "user", content: "Explain attention briefly." }],
  model,
})) {
  process.stdout.write(text);
}
```

Pass an `AbortSignal` as the second argument to `chat`, `listModels`,
`health`, or `streamChat` to cancel a request:

```typescript
const controller = new AbortController();
const pending = client.chat(
  { messages: [{ role: "user", content: "Explain attention briefly." }] },
  { signal: controller.signal },
);
controller.abort();
try {
  await pending;
} catch (error) {
  console.error("Request was cancelled:", error);
}
```

The external-signal option uses `AbortSignal.any`, available in Node.js 20.3
and later.

The current server computes the full answer before delivering SSE chunks.
Streaming changes transport, not token-generation latency.

## Build and test

From `sdk/typescript`, run `npm test` to compile and execute the SDK tests.
