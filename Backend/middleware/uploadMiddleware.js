const multer = require("multer");
let storage = multer.memoryStorage();

let upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    let allowedFormats = ["image/jpeg", "image/png", "image/jpg"];
    if (allowedFormats.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error("Invalid file format. Only JPEG, PNG, and JPG are allowed."),
        false,
      );
    }
  },
});

module.exports = upload;
