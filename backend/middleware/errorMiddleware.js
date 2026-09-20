// Handles requests that matched no route
const notFound = (req, res, next) => {
  res.status(404);
  next(new Error(`Not Found - ${req.originalUrl}`));
};

// Central error handler: turns thrown errors into the { message } JSON shape
// the frontend services read from error.response.data.message
const errorHandler = (err, req, res, next) => {
  // Controllers set the status before throwing; default to 500 when they didn't
  let code = 500;
  if (err.statusCode) {
    code = err.statusCode;
  } else if (res.statusCode && res.statusCode >= 400) {
    code = res.statusCode;
  }

  // Mongoose bad ObjectId reads as a 500 otherwise
  let message = err.message;
  if (err.name === "CastError" && err.kind === "ObjectId") {
    code = 404;
    message = "Resource not found";
  }
  if (err.code === 11000) {
    code = 400;
    message = "Duplicate value for a unique field";
  }

  console.error(`[error] ${req.method} ${req.originalUrl} -> ${code}:`, message);

  res.status(code).json({
    message,
    stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
  });
};

module.exports = { notFound, errorHandler };
