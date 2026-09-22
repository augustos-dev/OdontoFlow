import { Router } from 'express'
import {
  listContractsController,
  createContractController,
  signContractController,
  generatePreRegLinkController,
  submitPublicPreRegController,
} from '../controllers/contractController'
import { authenticate, authorize } from '../middlewares/authMiddlewares'

const contractRouter = Router()

// ─── 1. ROTA PÚBLICA (PACIENTE VIA WHATSAPP / SEM AUTH) ──────────────────────
// Submissão de pré-cadastro e anamnese preenchida pelo próprio paciente no telemóvel
contractRouter.post('/pre-cadastro/:token', submitPublicPreRegController)

// ─── MIDDLEWARE DE AUTENTICAÇÃO PARA DEMAIS OPERAÇÕES ────────────────────────
contractRouter.use(authenticate)

// ─── 2. ROTAS DE CONTRATOS & TERMOS (ADMIN, SECRETARY, DENTIST) ──────────────
// Listagem de termos de consentimento e orçamentos assinados ou pendentes
contractRouter.get('/', authorize('ADMIN', 'SECRETARY', 'DENTIST'), listContractsController)

// Elaboração de novo contrato/termo vinculado ao paciente
contractRouter.post('/', authorize('ADMIN', 'SECRETARY', 'DENTIST'), createContractController)

// Assinatura digital com captura de IP e carimbo de tempo (LGPD/CFO)
contractRouter.patch('/:id/sign', authorize('ADMIN', 'SECRETARY', 'DENTIST'), signContractController)

// ─── 3. GERAÇÃO DE LINKS TEMPORÁRIOS (ADMIN, SECRETARY, DENTIST) ─────────────
// Criação de link único criptografado com prazo de expiração para envio por WhatsApp
contractRouter.post('/pre-registration/link', authorize('ADMIN', 'SECRETARY', 'DENTIST'), generatePreRegLinkController)

export default contractRouter