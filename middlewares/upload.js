const multer = require("multer");

const storageEngine = multer.diskStorage({});

const fileFilter = (req, file, callback) => {
    let allowedFileTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/svg+xml",
        "image/svg",
        "video/mp4",
        "audio/mp3",
    ];
    if (allowedFileTypes.includes(file.mimetype)) {
        // will store the file
        callback(null, true);
    } else {
        // rejects storing a file
        callback(null, false);
    }
};

// initialize multer
const upload = multer({
    storage: storageEngine,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: fileFilter,
});

module.exports = upload;
