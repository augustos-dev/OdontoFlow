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
      withoutEnlargement: true, // Se for menor que 1200px, mantém o tamanho original
      fit: 'inside'
    })
    .toFormat('webp', { quality: 80 }) // Reduz até 80-90% do peso mantendo excelente qualidade
    .toBuffer()
}

export async function uploadToSupabase(file: Express.Multer.File): Promise<string> {
  const fileHash = crypto.randomBytes(10).toString('hex')
  
  // Extrai o nome sem extensão e força o final como .webp
  const nameWithoutExt = file.originalname.substring(0, file.originalname.lastIndexOf('.')) || file.originalname
  const cleanName = nameWithoutExt.replace(/\s+/g, '_')
  const fileName = `evolutions/${fileHash}-${cleanName}.webp`

  // 🚀 Compressão e otimização da imagem via Sharp
  const optimizedBuffer = await optimizeImage(file.buffer)

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(fileName, optimizedBuffer, {
      contentType: 'image/webp', // Agora o conteúdo é formalmente WebP
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