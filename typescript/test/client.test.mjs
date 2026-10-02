import assert from "node:assert/strict";
import test from "node:test";

import { PrajapattAPIError, PrajapattClient } from "../dist/index.js";

const completion = {
  id: "completion-1",
  object: "chat.completion",
  created: 1,
  model: "prajapatt-1",
  choices: [
    {
      index: 0,
      message: { role: "assistant", content: "Hello back." },
      finish_reason: "stop",
    },
  ],
};

test("chat sends bearer auth and the documented JSON payload", async () => {
  let requestedURL;
  let requestedInit;
  const client = new PrajapattClient({
    apiKey: "test-api-key",
    baseURL: "http://localhost:8000/",
    fetch: async (input, init) => {
      requestedURL = String(input);
      requestedInit = init;
      return new Response(JSON.stringify(completion), {
        headers: { "Content-Type": "application/json" },
      });
    },
  });

  const result = await client.chat({
    messages: [{ role: "user", content: "Hello" }],
  });

  assert.equal(requestedURL, "http://localhost:8000/v1/chat/completions");
  assert.equal(requestedInit.headers.get("Authorization"), "Bearer test-api-key");
  assert.deepEqual(JSON.parse(requestedInit.body), {
    model: "prajapatt-1",
    messages: [{ role: "user", content: "Hello" }],
  });
  assert.equal(result.choices[0].message.content, "Hello back.");
});

test("chat rejects a request that does not end with a user message", async () => {
  const client = new PrajapattClient({
    apiKey: "test-api-key",
    fetch: async () => {
      throw new Error("Fetch should not be called for invalid input.");
    },
  });

  await assert.rejects(
    client.chat({
      messages: [{ role: "assistant", content: "Not a valid final turn." }],
    }),
    TypeError,
  );
});

test("streamChat yields SSE text and stops at [DONE]", async () => {
  const client = new PrajapattClient({
    apiKey: "test-api-key",
    fetch: async (_input, init) => {
      assert.equal(init.headers.get("Accept"), "text/event-stream");
      return new Response(
        [
          'data: {"choices":[{"delta":{"content":"A"}}]}',
          "",
          'data: {"choices":[{"delta":{"content":"B"}}]}',
          "",
          "data: [DONE]",
          "",
          "",
        ].join("\n"),
        { headers: { "Content-Type": "text/event-stream" } },
      );
    },
  });

  const chunks = [];
  for await (const chunk of client.streamChat({
    messages: [{ role: "user", content: "Stream this" }],
  })) {
    chunks.push(chunk);
  }

  assert.deepEqual(chunks, ["A", "B"]);
});

test("non-success responses become typed API errors", async () => {
  const client = new PrajapattClient({
    apiKey: "test-api-key",
    fetch: async () =>
      new Response(JSON.stringify({ detail: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }),
  });

  await assert.rejects(
    client.listModels(),
    (error) =>
      error instanceof PrajapattAPIError &&
      error.statusCode === 401 &&
      error.detail === "Unauthorized",
  );
});
