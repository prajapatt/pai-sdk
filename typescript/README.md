# Prajapatt TypeScript SDK

The package has no runtime dependencies and uses standard `fetch` APIs.

```typescript
import { PrajapattClient } from "@prajapatt/ai-sdk";

const client = new PrajapattClient({
  baseURL: "http://127.0.0.1:8000",
  apiKey: process.env.PRAJAPATT_API_KEY!,
});

const models = await client.listModels();
const completion = await client.chat({
  model: models[0]?.id ?? "prajapatt-1",
  messages: [{ role: "user", content: "Hello from TypeScript" }],
});
console.log(completion.choices[0]?.message.content);
```

Stream text with `for await (const text of client.streamChat({ messages }))`.
The SDK requires a trusted runtime for API keys. Never bundle private keys into
browser or public mobile code.

Run `npm run build` in this directory before publishing. Generated output is
written to `dist/` and should not be committed.

More detail: [SDK documentation](docs/README.md), [getting started](docs/getting-started.md),
and [API reference](docs/api-reference.md).
