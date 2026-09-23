import multer from 'multer'
import path from 'path'
import crypto from 'crypto'
import fs from 'fs'

const tempDir = path.resolve(__dirname, '../../uploads/temp')
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, tempDir)
  },
  filename: (_req, file, cb) => {
    const fileHash = crypto.randomBytes(12).toString('hex')
    const ext = path.extname(file.originalname) || '.webm'
    cb(null, `${Date.now()}-${fileHash}${ext}`)
  },
})

export const audioUpload = multer({
  storage,
  limits: {
    fileSize: 20 * 1024 * 1024, // Limite de 20MB
  },
})