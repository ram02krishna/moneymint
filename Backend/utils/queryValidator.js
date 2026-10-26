// validate inputs to prevent hacks
const mongoose = require("mongoose");
const AppError = require("./AppError");

// check if id is valid mongo id
let validateObjectId = (id, paramName = "ID") => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(`Invalid ${paramName} format`, 400);
  }
  return new mongoose.Types.ObjectId(id);
};

// check if email is good
let validateEmail = (email) => {
  let emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new AppError("Invalid email format", 400);
  }
  return email.trim().toLowerCase();
};

// clean up string inputs
let sanitizeString = (input, fieldName = "input", maxLength = 500) => {
  if (typeof input !== "string") {
    throw new AppError(`${fieldName} must be a string`, 400);
  }

  let trimmed = input.trim();
  if (trimmed.length === 0) {
    throw new AppError(`${fieldName} cannot be empty`, 400);
  }

  if (trimmed.length > maxLength) {
    throw new AppError(`${fieldName} is too long, max is ${maxLength}`, 400);
  }

  return trimmed;
};

// clean up numbers
let sanitizeNumber = (input, fieldName = "number") => {
  let num = Number(input);
  if (isNaN(num) || num < 0) {
    throw new AppError(`${fieldName} must be a positive number`, 400);
  }
  return num;
};

// validate query object
let validateQueryObject = (queryObj) => {
  if (typeof queryObj !== "object" || queryObj === null) {
    throw new AppError("Query object must be an object", 400);
  }
  return queryObj;
};

module.exports = {
  validateObjectId,
  validateEmail,
  sanitizeString,
  sanitizeNumber,
  validateQueryObject,
};
