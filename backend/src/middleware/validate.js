import { AppError } from '../utils/ApiError.js';

/**
 * Zod validation middleware. Schema shape: { body?, query?, params? }.
 * On success the parsed values are merged back onto req so downstream code
 * sees validated data.
 */
export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse({
    ...(schema.shape.body && { body: req.body }),
    ...(schema.shape.query && { query: req.query }),
    ...(schema.shape.params && { params: req.params }),
  });

  if (!result.success) {
    const errors = result.error.issues.map((issue) => ({
      field: issue.path.slice(1).join('.') || issue.path.join('.'),
      message: issue.message,
    }));
    return next(new AppError(422, 'Validation failed', { code: 'VALIDATION_ERROR', errors }));
  }

  const parsed = result.data;
  if (parsed.body !== undefined) req.body = parsed.body;
  if (parsed.query !== undefined) req.query = parsed.query;
  if (parsed.params !== undefined) req.params = parsed.params;
  next();
};