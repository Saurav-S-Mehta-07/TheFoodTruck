const AppError = require("../utils/AppError");

const notFoundHandler = (req, res, next) => {
  next(new AppError("Page not found", 404));
};

const normalizeMongooseErrors = (err) => {
  if (!err) return err;

  if (err.name === "CastError") {
    return new AppError("Invalid request parameter", 400, { code: "INVALID_ID" });
  }

  if (err.name === "ValidationError") {
    const details = Object.values(err.errors || {}).map((e) => e.message);
    return new AppError(details[0] || "Validation failed", 400, { code: "VALIDATION_ERROR", details });
  }

  if (err.code === 11000) {
    return new AppError("Duplicate value found", 409, { code: "DUPLICATE_KEY" });
  }

  return err;
};

const globalErrorHandler = (error, req, res, next) => {
  const normalized = normalizeMongooseErrors(error);
  const err = normalized instanceof AppError
    ? normalized
    : new AppError(normalized.message || "Something went wrong", normalized.statusCode || 500);

  if (normalized && normalized.name === "MulterError") {
    err.statusCode = 400;
    err.message = normalized.message || "File upload error";
  }

  if (normalized && normalized.message && normalized.message.includes("Only image files")) {
    err.statusCode = 400;
    err.message = normalized.message;
  }

  const statusCode = err.statusCode || 500;

  if (req.xhr || req.originalUrl.startsWith("/api") || req.accepts(["json", "html"]) === "json") {
    return res.status(statusCode).json({
      success: false,
      message: err.message,
      code: err.code || "UNHANDLED_ERROR",
      details: err.details || null,
    });
  }

  if (statusCode === 404) {
    return res.status(404).render("404", { messages: req.flash() });
  }

  req.flash("error", err.message || "Something went wrong");
  return res.status(statusCode).render("500", { messages: req.flash(), errorStatus: statusCode });
};

module.exports = {
  notFoundHandler,
  globalErrorHandler,
};
