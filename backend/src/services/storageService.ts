import { supabase } from '../config/supabase'
import crypto from 'crypto'
import sharp from 'sharp'

const BUCKET_NAME = 'odontoflow-uploads'

/**
 * Otimiza a imagem enviada (redimensiona e converte para WebP)
 */
async function optimizeImage(buffer: Buffer): Promise<Buffer> {
  return await sharp(buffer)
  .resize({
    width: 1200,
    withoutEnlargement: true,
    fit: 'inside'
  })
  .toFormat('webp', { quality: 80 })
  .toBuffer()
}

export async function uploadToSupabase(file: Express.Multer.File): Promise<string> {
  const fileHash = crypto.randomBytes(10).toString('hex')
  
  // Limpa o nome removendo caracteres especiais e espaços
  const nameWithoutExt = file.originalname.substring(0, file.originalname.lastIndexOf('.')) || file.originalname
  const cleanName = nameWithoutExt.replace(/[^a-zA-Z0-9_-]/g, '_')

  let finalBuffer: Buffer
  let fileName: string
  let contentType: string

  // 🔴 CONDICIONAL CRUCIAL: Separa Imagem de PDF
  if (file.mimetype === 'application/pdf') {
    // É PDF: NÃO passa pelo Sharp
    finalBuffer = file.buffer
    fileName = `evolutions/${fileHash}-${cleanName}.pdf`
    contentType = 'application/pdf'
  } else {
    // É Imagem: Passa pelo Sharp para otimização em WebP
    finalBuffer = await optimizeImage(file.buffer)
    fileName = `evolutions/${fileHash}-${cleanName}.webp`
    contentType = 'image/webp'
  }

  // Upload no Supabase Storage
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(fileName, finalBuffer, {
      contentType, // Dinâmico: image/webp ou application/pdf
      upsert: false
    })

  if (error) {
    console.error('❌ Erro no upload para o Supabase Storage:', error)
    throw new Error(`Falha no upload do arquivo: ${error.message}`)
  }

  // Obtém a URL pública do arquivo enviado
  const { data: publicUrlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(data.path)

  return publicUrlData.publicUrl
}