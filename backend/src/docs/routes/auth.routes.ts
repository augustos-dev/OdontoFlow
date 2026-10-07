import { Router } from 'express'
import {
  registerController,
  loginController,
  getMeController,
} from '../../controllers/authController'
import { authenticate } from '../../middlewares/authMiddlewares'
import { loginLimiter } from '../../middlewares/rateLimiter.middleware'

const router = Router()

/**
 * @openapi
 * /auth/register:
 *   post:
 *     summary: Registra um novo tenant com sua primeira clínica e administrador (ou cadastra colaborador interno)
 *     description: Aceita os dados completos para onboarding atômico do SaaS (criando Tenant, Clínica e Admin do zero) ou os IDs existentes para cadastro de novos membros de equipe.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             oneOf:
 *               - type: object
 *                 title: OnboardingSaaS
 *                 required: [tenantName, slug, adminName, email, password]
 *                 properties:
 *                   tenantName:
 *                     type: string
 *                     example: "Clínica Sorriso & Arte"
 *                   slug:
 *                     type: string
 *                     example: "sorrisoearte"
 *                   plan:
 *                     type: string
 *                     enum: [BASIC, PREMIUM, ENTERPRISE]
 *                     default: PREMIUM
 *                   billingCycle:
 *                     type: string
 *                     enum: [MONTHLY, YEARLY]
 *                     default: MONTHLY
 *                   phone:
 *                     type: string
 *                     example: "(85) 99999-0000"
 *                   cnpjOrCpf:
 *                     type: string
 *                     example: "12.345.678/0001-90"
 *                   adminName:
 *                     type: string
 *                     example: "Dra. Mariana Costa"
 *                   email:
 *                     type: string
 *                     example: "mariana@sorrisoearte.com.br"
 *                   password:
 *                     type: string
 *                     example: "SenhaForte@123"
 *               - type: object
 *                 title: ColaboradorInterno
 *                 required: [tenantId, clinicId, name, email, password, role]
 *                 properties:
 *                   tenantId:
 *                     type: string
 *                     example: "uuid-do-tenant"
 *                   clinicId:
 *                     type: string
 *                     example: "uuid-da-clinica"
 *                   name:
 *                     type: string
 *                     example: "Dr. Roberto Neves"
 *                   email:
 *                     type: string
 *                     example: "roberto@clinica.com.br"
 *                   password:
 *                     type: string
 *                     example: "Senha@123"
 *                   role:
 *                     type: string
 *                     enum: [ADMIN, DENTIST, SECRETARY]
 *                   phone:
 *                     type: string
 *                     example: "(85) 98888-7777"
 *                   cro:
 *                     type: string
 *                     example: "CE-12345"
 *     responses:
 *       201:
 *         description: Conta criada com sucesso e token JWT retornado
 *       400:
 *         description: Dados inválidos fornecidos
 *       404:
 *         description: Tenant ou clínica não encontrados (fluxo de colaborador)
 *       409:
 *         description: E-mail ou subdomínio/slug já em uso
 */
router.post('/register', registerController)

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Realiza autenticação com e-mail e senha
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 example: "admin@odontoflow.com"
 *               password:
 *                 type: string
 *                 example: "Senha@123"
 *     responses:
 *       200:
 *         description: Sucesso, retorna JWT e dados do usuário
 *       401:
 *         description: Credenciais inválidas
 *       403:
 *         description: Assinatura do tenant inativa ou usuário desativado
 *       429:
 *         description: Limite de tentativas excedido ou conta temporariamente bloqueada
 */
router.post('/login', loginLimiter, loginController)

/**
 * @openapi
 * /auth/me:
 *   get:
 *     summary: Retorna os dados do perfil do usuário autenticado
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Perfil do usuário atual com detalhes da clínica e tenant
 *       401:
 *         description: Não autenticado ou token inválido
 *       404:
 *         description: Usuário não encontrado
 */
router.get('/me', authenticate, getMeController)

export default router