import { supabase } from '../config/supabase'
import crypto from 'crypto'

const BUCKET_NAME = 'odontoflow-uploads'

export async function uploadToSupabase(file: Express.Multer.File): Promise<string> {
  const fileHash = crypto.randomBytes(10).toString('hex')
  const cleanName = file.originalname.replace(/\s+/g, '_')
  const fileName = `evolutions/${fileHash}-${cleanName}`

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(fileName, file.buffer, {
      contentType: file.mimetype,
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