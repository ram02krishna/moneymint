const AppError = require("../utils/AppError");

let handleCastErrorDB = (err) => {
  let message = `Invalid ${err.path}: ${err.value}.`;
  return new AppError(message, 400);
};

let handleDuplicateFieldsDB = (err) => {
  let field = Object.keys(err.keyValue || {})[0];
  let message = field
    ? `That ${field} is already in use. Please use another one.`
    : "Duplicate value. Please use another one.";
  return new AppError(message, 400);
};

let handleValidationErrorDB = (err) => {
  let errors = Object.values(err.errors).map((el) => el.message);
  let message = `Invalid input data. ${errors.join(". ")}`;
  return new AppError(message, 400);
};

let handleJWTError = () =>
  new AppError("Invalid token. Please log in again!", 401);
let handleJWTExpiredError = () =>
  new AppError("Your token has expired! Please log in again.", 401);

let sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

let sendErrorProd = (err, res) => {
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  } else {
    console.error("ERROR ", err);
    res.status(500).json({
      status: "error",
      message: "Something went very wrong!",
    });
  }
};

// eslint-disable-next-line no-unused-vars -- Express only treats a 4-argument function as an error handler
module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  if (process.env.NODE_ENV === "development") {
    return sendErrorDev(err, res);
  }

  // Everything that is not explicitly "development" is treated like production,
  // so an unset NODE_ENV can no longer leave the request hanging without a reply.
  let error = err;
  if (err.name === "CastError") error = handleCastErrorDB(err);
  else if (err.code === 11000) error = handleDuplicateFieldsDB(err);
  else if (err.name === "ValidationError") error = handleValidationErrorDB(err);
  else if (err.name === "JsonWebTokenError") error = handleJWTError();
  else if (err.name === "TokenExpiredError") error = handleJWTExpiredError();
  else if (err.type === "entity.parse.failed") error = new AppError("Request body is not valid JSON", 400);

  sendErrorProd(error, res);
};
