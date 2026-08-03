import multer from 'multer'
import { AppError } from '../shared/AppError'

// Armazenamento em memória RAM para repassar o buffer direto ao Supabase
const storage = multer.memoryStorage()

// Filtro de segurança (imagens e documentos médicos)
const fileFilter: multer.Options['fileFilter'] = (req, file, cb) => {
  const allowedMimes = [
    'image/jpeg',
    'image/pjpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf'
  ]

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new AppError('Tipo de arquivo inválido. Envie apenas imagens (JPG, PNG, WEBP) ou PDF.', 400))
  }
}

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // Limite expandido para 10MB
  }
})