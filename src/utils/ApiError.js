class ApiError extends Error {
  constructor(statusCode, message = "something went wrong", errors = [], stack) {
    super(message);

    (this.status = statusCode),
      (this.message = message),
      (this.errors = errors),
      (this.sucess = false),
      (this.data = null);

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export { ApiError };
