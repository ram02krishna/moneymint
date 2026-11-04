// Turns user input into a literal pattern so "(" or "[" can't crash a search
// (and can't be used for regex denial-of-service).
const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const searchRegex = (value) => new RegExp(escapeRegex(String(value).trim()), "i");

module.exports = { escapeRegex, searchRegex };
