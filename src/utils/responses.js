export function success(data, message = 'Success') {
  return { success: true, message, data };
}

export function error(code, message, details = null, statusCode = 400) {
  const err = new Error(message);
  err.code = code;
  err.statusCode = statusCode;
  err.details = details;
  return err;
}

export function sendSuccess(res, data, message = 'Success', statusCode = 200) {
  return res.status(statusCode).json(success(data, message));
}

export function sendError(res, err) {
  const statusCode = err.statusCode ?? 500;
  const response = {
    success: false,
    error: {
      code: err.code ?? 'INTERNAL_ERROR',
      message: err.message ?? 'Internal server error',
    },
  };
  if (err.details) {
    response.error.details = err.details;
  }
  return res.status(statusCode).json(response);
}

export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
};

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
};