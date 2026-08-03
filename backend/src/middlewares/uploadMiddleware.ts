import multer from 'multer'
import path from 'path'
import crypto from 'crypto'
import { AppError } from '../shared/AppError' // Ou o seu tratamento de erro padronizado

// Configuração de armazenamento local
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Pasta onde as fotos serão salvas no servidor
    cb(null, path.resolve(__dirname, '..', '..', 'uploads'))
  },
  filename: (req, file, cb) => {
    // Gera um hash aleatório para evitar sobrescrever arquivos com mesmo nome
    const fileHash = crypto.randomBytes(10).toString('hex')
    const fileName = `${fileHash}-${file.originalname.replace(/\s+/g, '_')}`

    cb(null, fileName)
  }
})

// Filtro de segurança (apenas imagens)
const fileFilter: multer.Options['fileFilter'] = (req, file, cb) => {
  const allowedMimes = [
    'image/jpeg',
    'image/pjpeg',
    'image/png',
    'image/gif',
    'image/webp'
  ]

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new AppError('Tipo de arquivo inválido. Envie apenas imagens (JPG, PNG, WEBP).', 400))
  }
}

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // Limite de 5MB por arquivo
  }
})