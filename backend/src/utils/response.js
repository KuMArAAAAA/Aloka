// src/utils/response.js

export const successResponse = (res, data = null, message = "Success", statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    data,
    message,
    error: null
  });
};

export const errorResponse = (res, message = "Internal Server Error", statusCode = 500, error = null) => {
  return res.status(statusCode).json({
    success: false,
    data: null,
    message,
    error
  });
};
