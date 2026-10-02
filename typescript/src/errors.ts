export class PrajapattError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "PrajapattError";
  }
}

export class PrajapattConnectionError extends PrajapattError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "PrajapattConnectionError";
  }
}

export class PrajapattAPIError extends PrajapattError {
  readonly statusCode: number;
  readonly detail: unknown;

  constructor(
    message: string,
    statusCode: number,
    detail: unknown,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "PrajapattAPIError";
    this.statusCode = statusCode;
    this.detail = detail;
  }
}
