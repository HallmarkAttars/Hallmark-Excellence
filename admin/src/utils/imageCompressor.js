/**
 * Client-Side Image Optimization Utility
 * 
 * Safely scales and compresses product images before upload to Cloudinary:
 * - Constrains dimensions to standard e-commerce resolution (max 1400px)
 *   preserving crisp luxury perfume bottle detail, textures, and readable labels.
 * - Encodes to WebP at 0.82 quality for optimal size-to-clarity ratio.
 * - Automatically falls back to JPEG if WebP encoding is unsupported.
 * - Returns a single optimized File.
 * - If compression fails for ANY reason, gracefully falls back to the original file.
 */

export function calculateTargetDimensions(width, height, maxWidth = 1400, maxHeight = 1400) {
  if (!width || !height || width <= 0 || height <= 0) {
    return { width: maxWidth, height: maxHeight }
  }

  if (width <= maxWidth && height <= maxHeight) {
    return { width, height }
  }

  const ratio = Math.min(maxWidth / width, maxHeight / height)
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  }
}

/**
 * Checks if a file is an image that should be compressed.
 * Skips SVGs, GIFs (to preserve animation), and non-image files.
 */
export function isCompressibleImage(file) {
  if (!file || !file.type) return false
  const type = file.type.toLowerCase()
  return (
    type.startsWith('image/') &&
    !type.includes('svg') &&
    !type.includes('gif') &&
    !type.includes('icon')
  )
}

/**
 * Compresses an image file using browser Canvas API.
 * 
 * @param {File} file - Original image file from file input
 * @param {Object} options
 * @param {number} [options.maxWidth=1400]
 * @param {number} [options.maxHeight=1400]
 * @param {number} [options.quality=0.82]
 * @returns {Promise<File>} Compressed file, or original file on fallback
 */
export async function compressProductImage(file, options = {}) {
  if (!file) return file
  if (typeof window === 'undefined' || typeof document === 'undefined') return file
  if (!isCompressibleImage(file)) return file

  const {
    maxWidth = 1400,
    maxHeight = 1400,
    quality = 0.82,
  } = options

  return new Promise((resolve) => {
    let objectUrl = null

    const cleanup = () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
        objectUrl = null
      }
    }

    try {
      objectUrl = URL.createObjectURL(file)
      const img = new Image()

      img.onload = () => {
        try {
          const naturalWidth = img.naturalWidth || img.width
          const naturalHeight = img.naturalHeight || img.height

          // If dimensions are already within bounds and file is reasonably small (<300KB),
          // preserve original file to avoid unnecessary generation.
          if (
            naturalWidth <= maxWidth &&
            naturalHeight <= maxHeight &&
            file.size < 300 * 1024
          ) {
            cleanup()
            return resolve(file)
          }

          const { width: targetWidth, height: targetHeight } = calculateTargetDimensions(
            naturalWidth,
            naturalHeight,
            maxWidth,
            maxHeight
          )

          const canvas = document.createElement('canvas')
          canvas.width = targetWidth
          canvas.height = targetHeight

          const ctx = canvas.getContext('2d')
          if (!ctx) {
            cleanup()
            return resolve(file)
          }

          ctx.imageSmoothingEnabled = true
          ctx.imageSmoothingQuality = 'high'
          ctx.drawImage(img, 0, 0, targetWidth, targetHeight)

          const baseName = file.name.replace(/\.[^/.]+$/, '')

          // Helper to convert canvas to blob with WebP -> JPEG fallback
          const convertWithFallback = (blobFormat, fallbackFormat) => {
            canvas.toBlob(
              (blob) => {
                if (blob && blob.size > 0) {
                  const extension = blobFormat === 'image/webp' ? '.webp' : '.jpg'
                  const finalFile = new File([blob], `${baseName}${extension}`, {
                    type: blobFormat,
                    lastModified: Date.now(),
                  })
                  cleanup()
                  return resolve(finalFile)
                }

                // If WebP produced no blob or failed, try JPEG fallback
                if (fallbackFormat && blobFormat !== fallbackFormat) {
                  canvas.toBlob(
                    (fallbackBlob) => {
                      if (fallbackBlob && fallbackBlob.size > 0) {
                        const finalFile = new File([fallbackBlob], `${baseName}.jpg`, {
                          type: fallbackFormat,
                          lastModified: Date.now(),
                        })
                        cleanup()
                        return resolve(finalFile)
                      }
                      cleanup()
                      return resolve(file)
                    },
                    fallbackFormat,
                    quality
                  )
                } else {
                  cleanup()
                  return resolve(file)
                }
              },
              blobFormat,
              quality
            )
          }

          // Prefer WebP with fallback to JPEG
          convertWithFallback('image/webp', 'image/jpeg')
        } catch (canvasErr) {
          console.warn('[imageCompressor] Canvas processing failed, falling back to original file:', canvasErr)
          cleanup()
          resolve(file)
        }
      }

      img.onerror = (imgErr) => {
        console.warn('[imageCompressor] Image loading failed, falling back to original file:', imgErr)
        cleanup()
        resolve(file)
      }

      img.src = objectUrl
    } catch (err) {
      console.warn('[imageCompressor] Compression init failed, falling back to original file:', err)
      cleanup()
      resolve(file)
    }
  })
}
