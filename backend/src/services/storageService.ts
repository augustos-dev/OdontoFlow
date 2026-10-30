import { supabase } from '../config/supabase'
import crypto from 'crypto'
import sharp from 'sharp'
import { auditLogService } from './auditLog.service'
import { AppError } from '../shared/AppError'
import type { UserRole } from '@prisma/client'

const BUCKET_NAME = process.env.SUPABASE_BUCKET || 'odontoflow-uploads'

/**
 * Modo privado (recomendado para dado de saúde): defina STORAGE_PRIVATE=true DEPOIS de tornar o bucket privado no painel do Supabase.
 *  - o upload passa a devolver o CAMINHO do arquivo (não uma URL pública);
 *  - nas leituras, `resolveAttachmentUrls` troca caminhos E as URLs públicas antigas por URLs assinadas e temporárias.
 * Com STORAGE_PRIVATE desligado, tudo funciona como antes (URL pública).
 */
const PRIVATE_MODE = process.env.STORAGE_PRIVATE === 'true'
const SIGNED_URL_TTL_SECONDS = Number(process.env.STORAGE_SIGNED_URL_TTL) || 3600

interface ActorContext {
  tenantId: string
  clinicId: string
  userId: string
  userName: string
  userRole?: UserRole
}

/**
 * Otimiza a imagem enviada (redimensiona e converte para WebP)
 */
async function optimizeImage(buffer: Buffer): Promise<Buffer> {
  return await sharp(buffer)
    .resize({
      width: 1200,
      withoutEnlargement: true,
      fit: 'inside',
    })
    .toFormat('webp', { quality: 80 })
    .toBuffer()
}

export async function uploadToSupabase(
  file: Express.Multer.File,
  actor?: ActorContext
): Promise<string> {
  const fileHash = crypto.randomBytes(16).toString('hex')

  let finalBuffer: Buffer
  let extension: string
  let contentType: string

  // 🔴 CONDICIONAL CRUCIAL: Separa Imagem de PDF
  if (file.mimetype === 'application/pdf') {
    // O mimetype vem do cliente: confere a assinatura real do arquivo.
    if (file.buffer.subarray(0, 5).toString('latin1') !== '%PDF-') {
      throw new AppError('O arquivo enviado não é um PDF válido.', 400)
    }
    // É PDF: NÃO passa pelo Sharp
    finalBuffer = file.buffer
    extension = 'pdf'
    contentType = 'application/pdf'
  } else {
    // É Imagem: Passa pelo Sharp para otimização em WebP (se não for imagem de verdade, o Sharp recusa)
    try {
      finalBuffer = await optimizeImage(file.buffer)
    } catch {
      throw new AppError('Imagem inválida ou corrompida.', 400)
    }
    extension = 'webp'
    contentType = 'image/webp'
  }

  // O nome original NÃO entra no caminho (costuma conter o nome do paciente) e o caminho carrega o tenant e a unidade.
  const prefix = actor ? `${actor.tenantId}/${actor.clinicId}/evolutions` : 'evolutions'
  const fileName = `${prefix}/${fileHash}.${extension}`

  // Upload no Supabase Storage
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(fileName, finalBuffer, {
      contentType, // Dinâmico: image/webp ou application/pdf
      upsert: false,
    })

  if (error) {
    console.error('❌ Erro no upload para o Supabase Storage:', error)
    throw new AppError('Falha no upload do arquivo. Tente novamente.', 502)
  }

  // 🟢 Log de Auditoria (se o contexto de usuário for informado)
  if (actor) {
    await auditLogService.createLog({
      tenantId: actor.tenantId,
      clinicId: actor.clinicId,
      userId: actor.userId,
      userName: actor.userName,
      userRole: actor.userRole || 'ADMIN',
      action: 'CREATE',
      entity: 'PATIENT', // Ou DOCUMENT / EVOLUTION
      details: `Upload de arquivo realizado: ${file.originalname} (${contentType})`,
    })
  }

  // Modo privado: guarda só o caminho. Modo público (padrão): URL pública, como antes.
  if (PRIVATE_MODE) return data.path

  const { data: publicUrlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(data.path)
  return publicUrlData.publicUrl
}

// ─── Referências a anexos (caminho, URL pública antiga ou URL assinada) ─────────

/** Extrai o caminho dentro do bucket. Retorna null para URLs de fora do nosso bucket. */
export function toStoragePath(value: string): string | null {
  if (!/^https?:\/\//i.test(value)) return value // já é um caminho
  for (const kind of ['public', 'sign']) {
    const marker = `/storage/v1/object/${kind}/${BUCKET_NAME}/`
    const i = value.indexOf(marker)
    if (i !== -1) return decodeURIComponent(value.slice(i + marker.length).split('?')[0])
  }
  return null
}

/**
 * Valida (e normaliza) um anexo vindo do cliente no corpo da requisição.
 * Antes, qualquer string (inclusive URL de terceiros) era gravada em evolutions.attachments.
 * Aceita só arquivos do nosso bucket: do próprio tenant, ou o formato antigo sem prefixo ("evolutions/...").
 */
export function normalizeAttachmentRef(value: unknown, tenantId: string): string | null {
  if (typeof value !== 'string' || value.length === 0 || value.length > 1000) return null
  const path = toStoragePath(value)
  if (!path || path.includes('..')) return null
  if (!path.startsWith(`${tenantId}/`) && !path.startsWith('evolutions/')) return null
  return PRIVATE_MODE ? path : value
}

/** Troca caminhos e URLs públicas antigas por URLs assinadas (só no modo privado). Sem efeito no modo público. */
export async function resolveAttachmentUrls(values?: string[] | null): Promise<string[]> {
  const list = values ?? []
  if (!PRIVATE_MODE || list.length === 0) return list

  const result = [...list]
  const positions: number[] = []
  const paths: string[] = []
  list.forEach((value, i) => {
    // Assina caminhos simples e URLs PÚBLICAS antigas do nosso bucket; URLs já assinadas ou externas ficam como estão.
    const isPlainPath = !/^https?:\/\//i.test(value)
    const isOurPublicUrl = value.includes(`/storage/v1/object/public/${BUCKET_NAME}/`)
    if (!isPlainPath && !isOurPublicUrl) return
    const path = toStoragePath(value)
    if (!path) return
    positions.push(i)
    paths.push(path)
  })
  if (paths.length === 0) return result

  const { data, error } = await supabase.storage.from(BUCKET_NAME).createSignedUrls(paths, SIGNED_URL_TTL_SECONDS)
  if (error || !data) {
    console.error('❌ Erro ao assinar URLs de anexos:', error)
    return result
  }
  data.forEach((item, k) => {
    if (item.signedUrl) result[positions[k]] = item.signedUrl
  })
  return result
}

/** Aplica resolveAttachmentUrls a uma lista de evoluções. */
export async function signEvolutionAttachments<T extends { attachments?: string[] | null }>(evolutions: T[]): Promise<T[]> {
  if (!PRIVATE_MODE) return evolutions
  return Promise.all(
    evolutions.map(async (evo) => ({ ...evo, attachments: await resolveAttachmentUrls(evo.attachments) }))
  )
}
