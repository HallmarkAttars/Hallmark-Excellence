const cloudinary = require('../config/cloudinary')

// POST /api/upload
// Protected. Expects multipart/form-data with field name "image",
// already parsed into req.file by the upload.middleware multer handler.
async function uploadImage(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file attached. Use the "image" field.' })
    }

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'perfume-ecommerce' },
        (error, uploadResult) => {
          if (error) reject(error)
          else resolve(uploadResult)
        }
      )
      stream.end(req.file.buffer)
    })

    return res.json({ url: result.secure_url, public_id: result.public_id })
  } catch (err) {
    console.error('uploadImage error:', err)
    return res.status(500).json({ error: 'Failed to upload image.' })
  }
}

module.exports = { uploadImage }
