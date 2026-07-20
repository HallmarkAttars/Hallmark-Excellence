const multer = require('multer')

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024 // 5MB

const storage = multer.memoryStorage()

function fileFilter(req, file, cb) {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error('INVALID_FILE_TYPE'))
  }
}

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter,
})

// Wraps multer's single-file middleware so multer errors (wrong type,
// too large) come back as clean 400 JSON responses instead of crashing
// or falling through to the generic error handler.
function uploadSingleImage(req, res, next) {
  const handler = upload.single('image')
  handler(req, res, (err) => {
    if (!err) return next()

    if (err.message === 'INVALID_FILE_TYPE') {
      return res.status(400).json({
        error: 'Invalid file type. Only JPEG, JPG, PNG, and WEBP images are allowed.',
      })
    }
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File is too large. Maximum size is 5MB.' })
    }
    return res.status(400).json({ error: 'File upload failed.' })
  })
}

module.exports = { uploadSingleImage }
