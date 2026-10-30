// backend/src/routes/clinic.routes.ts

import { Router } from 'express'
import {
  createClinicController,
  listClinicsController,
  getClinicByIdController,
  updateClinicController,
  deactivateClinicController,
  reactivateClinicController,
  getClinicCustomizationController,
  updateClinicCustomizationController,
} from '../controllers/clinicController'
import {
  setClinicProcedureController,
  cloneClinicProceduresController,
  reconcileRecipesController,
  proceduresWithoutRecipeController,
} from '../controllers/clinicCatalogController'
import { authenticate, authorize } from '../middlewares/authMiddlewares'
import { ownClinicOrOwner } from '../middlewares/clinicAcessMiddlewares'

const router = Router()

// Todas as rotas de clínicas são privadas
router.use(authenticate)

// White-Label & Customização Visual (declaradas antes de :id genérico ou ações específicas)
router.get('/:id/customization', getClinicCustomizationController)
router.put('/:id/customization', authorize('ADMIN'), ownClinicOrOwner, updateClinicCustomizationController)

// ─── Catálogo por unidade (Enterprise) ───
// :id = unidade que está sendo configurada (a do próprio ADMIN, ou qualquer uma para o OWNER)
router.get('/:id/procedures-without-recipe', authorize('ADMIN'), ownClinicOrOwner, proceduresWithoutRecipeController)
router.post('/:id/procedures/clone', authorize('ADMIN'), ownClinicOrOwner, cloneClinicProceduresController)
router.patch('/:id/procedures/:procedureId', authorize('ADMIN'), ownClinicOrOwner, setClinicProcedureController)
router.post('/:id/recipes/reconcile', authorize('ADMIN'), ownClinicOrOwner, reconcileRecipesController)

// Leitura (todos os papéis autenticados)
router.get('/', listClinicsController)
router.get('/:id', getClinicByIdController)

// Escrita e Ações de Status (ADMIN; na rede, criar/desativar/reativar unidade é do OWNER: validado no service)
router.post('/', authorize('ADMIN'), createClinicController)
router.put('/:id', authorize('ADMIN'), ownClinicOrOwner, updateClinicController)
router.patch('/:id/deactivate', authorize('ADMIN'), deactivateClinicController)
router.patch('/:id/reactivate', authorize('ADMIN'), reactivateClinicController)

export default router