const multer = require("multer");
const AppError = require("../utils/AppError");

const ALLOWED_FORMATS = ["image/jpeg", "image/png", "image/jpg"];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 }, // the upload route is public, so cap memory use
  fileFilter: (req, file, cb) => {
    if (ALLOWED_FORMATS.includes(file.mimetype)) return cb(null, true);
    cb(new AppError("Invalid file format. Only JPEG, PNG, and JPG are allowed.", 400), false);
  },
});

module.exports = upload;
