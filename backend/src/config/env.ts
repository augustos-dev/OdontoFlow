/**
 * Variáveis de ambiente obrigatórias.
 * Sem fallback: um segredo JWT "padrão" permite que qualquer pessoa forje tokens
 * (inclusive com tenantId, role e plan à escolha).
 *
 * Chame assertRequiredEnv() no boot do servidor (logo depois de carregar o dotenv).
 */
let cachedJwtSecret: string | undefined

export function getJwtSecret(): string {
  if (cachedJwtSecret) return cachedJwtSecret
  const secret = process.env.JWT_SECRET
  if (!secret || secret.trim().length < 32) {
    throw new Error(
      'JWT_SECRET ausente ou curto demais (mínimo 32 caracteres). Defina a variável de ambiente antes de iniciar o servidor.'
    )
  }
  cachedJwtSecret = secret
  return secret
}

export function assertRequiredEnv(): void {
  getJwtSecret()
}
