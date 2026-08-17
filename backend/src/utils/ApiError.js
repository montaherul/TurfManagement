export class AppError extends Error {
  constructor(statusCode, message, { code = null, data = null, errors = null } = {}) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.data = data;
    this.errors = errors;
  }
}
