import { Router } from "express";
import {
  registerController,
  loginController,
  getMeController,
  listMyClinicsController,
  switchClinicController,
} from "../controllers/authController";
import { authenticate, authorize } from "../middlewares/authMiddlewares";


const authRouter = Router()

// POST Cria colaborador vinculado à clínica.
// ANTES era pública e aceitava tenantId/clinicId/role do body (qualquer pessoa criava ADMIN em qualquer tenant).
// Agora exige ADMIN/OWNER autenticado; o tenantId vem do token.
authRouter.post('/register', authenticate, authorize('ADMIN'), registerController)

// POST retorna login e jwt
// (confirme que o loginLimiter está montado em /auth/login no app.ts: nas rotas enviadas ele não é usado)
authRouter.post('/login', loginController)

// GET retorna o perfil (com a unidade ativa e as unidades acessíveis)
authRouter.get('/me', authenticate, getMeController)

// ─── Rede de clínicas ───
// GET unidades que o usuário pode acessar
authRouter.get('/clinics', authenticate, listMyClinicsController)

// POST troca a unidade ativa (devolve novo token)
authRouter.post('/switch-clinic', authenticate, switchClinicController)


export default authRouter
