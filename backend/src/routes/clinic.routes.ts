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
import { authenticate, authorize } from '../middlewares/authMiddlewares'
import { requireFeature } from '../middlewares/planMiddleware'

const router = Router()

router.use(authenticate)

// Customização de logotipo e cores (White-Label) a partir de PREMIUM
router.get('/:id/customization', getClinicCustomizationController)
router.put(
  '/:id/customization',
  requireFeature('WHITE_LABEL'),
  authorize('ADMIN'),
  updateClinicCustomizationController
)

router.get('/', listClinicsController)
router.get('/:id', getClinicByIdController)

router.post('/', authorize('ADMIN'), createClinicController)
router.put('/:id', authorize('ADMIN'), updateClinicController)
router.patch('/:id/deactivate', authorize('ADMIN'), deactivateClinicController)
router.patch('/:id/reactivate', authorize('ADMIN'), reactivateClinicController)

export default router