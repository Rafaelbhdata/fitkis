/**
 * Image compression utilities for mobile uploads
 * Compresses images to reduce upload time and storage usage
 */

interface CompressOptions {
  maxWidth?: number
  maxHeight?: number
  quality?: number // 0-1
  maxSizeMB?: number
}

const DEFAULT_OPTIONS: CompressOptions = {
  maxWidth: 1200,
  maxHeight: 1200,
  quality: 0.8,
  maxSizeMB: 1
}

/**
 * Compress an image file to reduce size
 * Uses canvas to resize and compress
 */
export async function compressImage(
  file: File,
  options: CompressOptions = {}
): Promise<File> {
  const opts = { ...DEFAULT_OPTIONS, ...options }

  // Skip compression for small files (< 500KB)
  if (file.size < 500 * 1024) {
    return file
  }

  // Skip non-image files
  if (!file.type.startsWith('image/')) {
    return file
  }

  return new Promise((resolve, reject) => {
    const img = new Image()
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      reject(new Error('Canvas context not available'))
      return
    }

    img.onload = () => {
      // Calculate new dimensions maintaining aspect ratio
      let { width, height } = img

      if (width > opts.maxWidth! || height > opts.maxHeight!) {
        const ratio = Math.min(
          opts.maxWidth! / width,
          opts.maxHeight! / height
        )
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }

      canvas.width = width
      canvas.height = height

      // Draw image with white background (for transparency)
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, width, height)
      ctx.drawImage(img, 0, 0, width, height)

      // Convert to blob
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to compress image'))
            return
          }

          // If still too large, reduce quality further
          if (blob.size > opts.maxSizeMB! * 1024 * 1024) {
            canvas.toBlob(
              (smallerBlob) => {
                if (!smallerBlob) {
                  // Return original quality blob
                  resolve(new File([blob], file.name, { type: 'image/jpeg' }))
                  return
                }
                resolve(new File([smallerBlob], file.name, { type: 'image/jpeg' }))
              },
              'image/jpeg',
              0.6 // Lower quality for large images
            )
          } else {
            resolve(new File([blob], file.name, { type: 'image/jpeg' }))
          }
        },
        'image/jpeg',
        opts.quality
      )
    }

    img.onerror = () => {
      reject(new Error('Failed to load image'))
    }

    // Load image from file
    const reader = new FileReader()
    reader.onload = (e) => {
      img.src = e.target?.result as string
    }
    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }
    reader.readAsDataURL(file)
  })
}

/**
 * Get human-readable file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
