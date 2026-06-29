const multer = require('multer');

// Memory storage only — no filesystem writes
// Required for serverless environments (Vercel, Railway, Render, etc.)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPG, PNG, WEBP and PDF files are allowed'), false);
    }
  },
});

module.exports = upload;
