import { sendError, ERROR_CODES } from '../utils/responses.js';

export function notFoundHandler(req, res) {
  return sendError(res, {
    code: ERROR_CODES.NOT_FOUND,
    message: `Route ${req.method} ${req.originalUrl} not found`,
    statusCode: 404,
  });
}

export function errorHandler(err, _req, res, _next) {
  console.error('❌ Error:', err);

  if (err.name === 'ValidationError') {
    return sendError(res, {
      code: ERROR_CODES.VALIDATION_ERROR,
      message: 'Validation failed',
      details: err.details,
      statusCode: 400,
    });
  }

  if (err.code === 'ER_DUP_ENTRY') {
    return sendError(res, {
      code: ERROR_CODES.CONFLICT,
      message: 'Resource already exists',
      statusCode: 409,
    });
  }

  if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.code === 'ER_ROW_IS_REFERENCED_2') {
    return sendError(res, {
      code: ERROR_CODES.CONFLICT,
      message: 'Referenced resource not found or still in use',
      statusCode: 409,
    });
  }

  const statusCode = err.statusCode ?? 500;
  const code = err.code ?? ERROR_CODES.INTERNAL_ERROR;
  const message = err.message ?? 'Internal server error';

  return sendError(res, { code, message, statusCode });
}