export class AppError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly originalError?: any;

  constructor(
    message: string,
    code: string = "app/internal-error",
    status: number = 500,
    originalError?: any
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
    this.originalError = originalError;

    // Adjust prototype chain for proper ES5+ subclass inheritance
    Object.setPrototypeOf(this, new.target.prototype);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  public toJSON() {
    return {
      error: {
        name: this.name,
        message: this.message,
        code: this.code,
        status: this.status,
      },
    };
  }
}

export default AppError;
