export type ChatRole = "system" | "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface ChatCompletionRequest {
  model?: string;
  messages: readonly ChatMessage[];
  session_id?: string;
}

export interface ChatCompletionMessage {
  role: string;
  content: string;
}

export interface ChatCompletionChoice {
  index: number;
  message: ChatCompletionMessage;
  finish_reason: string | null;
}

export interface ChatCompletion {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: ChatCompletionChoice[];
}

export interface PrajapattModel {
  id: string;
  object: string;
  created: number;
  owned_by: string;
}

export interface PrajapattHealth {
  status: string;
  authentication_configured: boolean;
  reasoning_backend: string;
  reasoning_model_configured: boolean;
}

export interface PrajapattClientOptions {
  apiKey: string;
  baseURL?: string;
  timeoutMs?: number;
  fetch?: typeof fetch;
}

export interface ChatRequestOptions {
  signal?: AbortSignal;
}
