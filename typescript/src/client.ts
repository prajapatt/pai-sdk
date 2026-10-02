import {
  PrajapattAPIError,
  PrajapattConnectionError,
  PrajapattError,
} from "./errors.js";
import type {
  ChatCompletion,
  ChatCompletionRequest,
  ChatMessage,
  ChatRequestOptions,
  PrajapattClientOptions,
  PrajapattHealth,
  PrajapattModel,
} from "./types.js";

const DEFAULT_MODEL = "prajapatt-1";

export class PrajapattClient {
  private readonly apiKey: string;
  private readonly baseURL: string;
  private readonly timeoutMs: number;
  private readonly fetchImplementation: typeof fetch;

  constructor(options: PrajapattClientOptions) {
    if (!options.apiKey.trim()) {
      throw new TypeError("apiKey must be a non-empty server-issued key.");
    }
    const baseURL = options.baseURL ?? "http://127.0.0.1:8000";
    if (!baseURL.trim()) {
      throw new TypeError("baseURL must be a non-empty URL.");
    }
    const timeoutMs = options.timeoutMs ?? 60_000;
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
      throw new TypeError("timeoutMs must be greater than zero.");
    }

    this.apiKey = options.apiKey;
    this.baseURL = baseURL.replace(/\/+$/, "");
    this.timeoutMs = timeoutMs;
    this.fetchImplementation = options.fetch ?? fetch;
  }

  async health(options: ChatRequestOptions = {}): Promise<PrajapattHealth> {
    return this.request<PrajapattHealth>(
      "/health",
      { method: "GET" },
      { ...options, authenticated: false },
    );
  }

  async listModels(options: ChatRequestOptions = {}): Promise<PrajapattModel[]> {
    const response = await this.request<{ data: PrajapattModel[] }>(
      "/v1/models",
      { method: "GET" },
      options,
    );
    if (!Array.isArray(response.data)) {
      throw new PrajapattError("API model response has no data list.");
    }
    return response.data;
  }

  async chat(
    request: ChatCompletionRequest,
    options: ChatRequestOptions = {},
  ): Promise<ChatCompletion> {
    this.validateChatRequest(request);
    return this.request<ChatCompletion>(
      "/v1/chat/completions",
      {
        method: "POST",
        body: JSON.stringify({
          model: request.model ?? DEFAULT_MODEL,
          messages: request.messages,
          ...(request.session_id === undefined
            ? {}
            : { session_id: request.session_id }),
        }),
      },
      options,
    );
  }

  async *streamChat(
    request: ChatCompletionRequest,
    options: ChatRequestOptions = {},
  ): AsyncGenerator<string> {
    this.validateChatRequest(request);
    const response = await this.fetchWithErrors(
      "/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify({
          model: request.model ?? DEFAULT_MODEL,
          messages: request.messages,
          stream: true,
          ...(request.session_id === undefined
            ? {}
            : { session_id: request.session_id }),
        }),
      },
      options,
    );
    if (!response.body) {
      throw new PrajapattError("Streaming response has no readable body.");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    try {
      while (true) {
        const { done, value } = await reader.read();
        buffer += decoder.decode(value, { stream: !done });
        const events = buffer.split(/\r?\n\r?\n/);
        buffer = events.pop() ?? "";
        for (const event of events) {
          const text = this.parseStreamEvent(event);
          if (text === null) {
            await reader.cancel();
            return;
          }
          if (text) {
            yield text;
          }
        }
        if (done) {
          if (buffer.trim()) {
            const text = this.parseStreamEvent(buffer);
            if (text === null) {
              await reader.cancel();
              return;
            }
            if (text) {
              yield text;
            }
          }
          return;
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  private validateChatRequest(request: ChatCompletionRequest): void {
    if (!request.messages.length) {
      throw new TypeError("At least one chat message is required.");
    }
    if (request.model !== undefined && !request.model.trim()) {
      throw new TypeError("model must be a non-empty model ID.");
    }
    if (
      request.session_id !== undefined &&
      !request.session_id.trim()
    ) {
      throw new TypeError("session_id cannot be blank.");
    }
    for (const message of request.messages) {
      if (!["system", "user", "assistant"].includes(message.role)) {
        throw new TypeError("Messages must use system, user, or assistant role.");
      }
      if (!message.content.trim()) {
        throw new TypeError("Message content must be non-empty text.");
      }
    }
    if (request.messages.at(-1)?.role !== "user") {
      throw new TypeError("The final chat message must be from the user.");
    }
  }

  private async request<T>(
    path: string,
    init: RequestInit,
    options: ChatRequestOptions & { authenticated?: boolean } = {},
  ): Promise<T> {
    const response = await this.fetchWithErrors(path, init, options);
    try {
      return (await response.json()) as T;
    } catch (error) {
      throw new PrajapattError("API returned an invalid JSON response.", {
        cause: error,
      });
    }
  }

  private async fetchWithErrors(
    path: string,
    init: RequestInit,
    options: ChatRequestOptions & { authenticated?: boolean } = {},
  ): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    const headers = new Headers(init.headers);
    if (options.authenticated !== false) {
      headers.set("Authorization", `Bearer ${this.apiKey}`);
    }

    let response: Response;
    try {
      response = await this.fetchImplementation(`${this.baseURL}${path}`, {
        ...init,
        headers,
        signal: options.signal
          ? AbortSignal.any([options.signal, controller.signal])
          : controller.signal,
      });
    } catch (error) {
      clearTimeout(timeout);
      throw new PrajapattConnectionError(
        error instanceof Error ? error.message : "Request failed.",
        { cause: error },
      );
    }
    clearTimeout(timeout);

    if (!response.ok) {
      const payload = await this.readErrorPayload(response);
      const detail =
        typeof payload === "object" && payload !== null && "detail" in payload
          ? payload.detail
          : payload;
      const message =
        typeof detail === "string"
          ? detail
          : `Prajapatt API request failed with HTTP ${response.status}.`;
      throw new PrajapattAPIError(message, response.status, detail);
    }
    return response;
  }

  private async readErrorPayload(response: Response): Promise<unknown> {
    const text = await response.text();
    if (!text) {
      return undefined;
    }
    try {
      return JSON.parse(text) as unknown;
    } catch {
      return text;
    }
  }

  private parseStreamEvent(event: string): string | null {
    const data = event
      .split(/\r?\n/)
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trim())
      .join("\n");
    if (!data) {
      return "";
    }
    if (data === "[DONE]") {
      return null;
    }
    let payload: unknown;
    try {
      payload = JSON.parse(data) as unknown;
    } catch (error) {
      throw new PrajapattError("API sent an invalid streaming event.", {
        cause: error,
      });
    }
    if (typeof payload !== "object" || payload === null || !("choices" in payload)) {
      throw new PrajapattError("API streaming event has no choices.");
    }
    const choices = payload.choices;
    if (!Array.isArray(choices) || !choices.length) {
      return "";
    }
    const first = choices[0];
    if (typeof first !== "object" || first === null || !("delta" in first)) {
      return "";
    }
    const delta = first.delta;
    if (typeof delta !== "object" || delta === null || !("content" in delta)) {
      return "";
    }
    const content = delta.content;
    if (content === undefined || content === null) {
      return "";
    }
    if (typeof content !== "string") {
      throw new PrajapattError("API streaming content must be text.");
    }
    return content;
  }
}

export type { ChatMessage };
