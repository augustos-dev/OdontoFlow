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
} from '../../controllers/clinicController'
import {
  setClinicProcedureController,
  cloneClinicProceduresController,
  reconcileRecipesController,
  proceduresWithoutRecipeController,
} from '../../controllers/clinicCatalogController'
import { authenticate, authorize } from '../../middlewares/authMiddlewares'
import { ownClinicOrOwner } from '../../middlewares/clinicAcessMiddlewares'

const router = Router()

router.use(authenticate)

/**
 * @openapi
 * /clinics:
 *   get:
 *     summary: Lista clínicas do tenant
 *     tags: [Clinics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: name
 *         schema: { type: string }
 *       - in: query
 *         name: isActive
 *         schema: { type: boolean }
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, default: 20 }
 *     responses:
 *       200: { description: Lista de clínicas com paginação }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *   post:
 *     summary: Cria uma clínica no tenant
 *     description: Requer ADMIN. No plano Enterprise, somente OWNER pode criar unidades; os limites contratados do plano são aplicados.
 *     tags: [Clinics]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string, example: "Unidade Centro" }
 *               cnpj: { type: string }
 *               phone: { type: string }
 *               email: { type: string, format: email }
 *               address: { type: string }
 *               logoUrl: { type: string, format: uri }
 *               paymentIntegrationActive: { type: boolean, default: false }
 *     responses:
 *       201: { description: Clínica criada }
 *       400: { description: Dados inválidos }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { description: Papel sem permissão, assinatura inativa ou limite de unidades atingido }
 *       409: { description: CNPJ já cadastrado }
 */
router.get('/', listClinicsController)
router.post('/', authorize('ADMIN'), createClinicController)

/**
 * @openapi
 * /clinics/{id}:
 *   get:
 *     summary: Busca uma clínica pelo ID
 *     tags: [Clinics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Clínica encontrada }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *   put:
 *     summary: Atualiza os dados cadastrais de uma clínica
 *     description: Requer ADMIN e, no Enterprise, OWNER ou administrador da própria unidade. O status isActive não pode ser alterado por esta operação; use deactivate/reactivate.
 *     tags: [Clinics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               cnpj: { type: string }
 *               phone: { type: string }
 *               email: { type: string, format: email }
 *               address: { type: string }
 *               logoUrl: { type: string, format: uri }
 *               paymentIntegrationActive: { type: boolean }
 *     responses:
 *       200: { description: Clínica atualizada }
 *       400: { description: Dados inválidos ou tentativa de alterar isActive por esta rota }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       409: { description: CNPJ já cadastrado }
 */
router.get('/:id', getClinicByIdController)
router.put('/:id', authorize('ADMIN'), ownClinicOrOwner, updateClinicController)

/**
 * @openapi
 * /clinics/{id}/deactivate:
 *   patch:
 *     summary: Desativa uma unidade clínica
 *     description: Requer ADMIN; no plano Enterprise, a regra do serviço restringe a ação ao OWNER.
 *     tags: [Clinics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Clínica desativada }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.patch('/:id/deactivate', authorize('ADMIN'), deactivateClinicController)

/**
 * @openapi
 * /clinics/{id}/reactivate:
 *   patch:
 *     summary: Reativa uma unidade clínica
 *     description: Requer ADMIN; no plano Enterprise, a regra do serviço restringe a ação ao OWNER e aplica o limite de unidades.
 *     tags: [Clinics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Clínica reativada }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { description: Sem permissão ou limite de clínicas do plano atingido }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.patch('/:id/reactivate', authorize('ADMIN'), reactivateClinicController)

/**
 * @openapi
 * /clinics/{id}/customization:
 *   get:
 *     summary: Consulta a identidade visual de uma clínica
 *     tags: [Clinics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Configuração visual retornada }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *   put:
 *     summary: Atualiza a identidade visual de uma clínica
 *     description: Requer ADMIN e, no Enterprise, OWNER ou administrador da própria unidade.
 *     tags: [Clinics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               clinicName: { type: string }
 *               primaryColor: { type: string, example: "#06b6d4" }
 *               accentColor: { type: string, example: "#0891b2" }
 *               secondaryColor: { type: string, example: "#0f172a" }
 *               fontFamily: { type: string, enum: [Inter, Roboto, Poppins, Montserrat] }
 *               darkModeDefault: { type: boolean }
 *               customLogoUrl: { type: string, nullable: true }
 *               customFavicon: { type: string, nullable: true }
 *               customDocumentHeader: { type: string, nullable: true }
 *               customReceiptFooter: { type: string, nullable: true }
 *     responses:
 *       200: { description: Identidade visual atualizada }
 *       400: { description: Dados inválidos }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.get('/:id/customization', getClinicCustomizationController)
router.put('/:id/customization', authorize('ADMIN'), ownClinicOrOwner, updateClinicCustomizationController)

/**
 * @openapi
 * /clinics/{id}/procedures/{procedureId}:
 *   patch:
 *     summary: Ativa ou desativa um procedimento e define seu preço para a unidade
 *     description: Recurso do catálogo por unidade Enterprise. Requer ADMIN da unidade de destino ou OWNER.
 *     tags: [Clinic catalog]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID da unidade que será configurada
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: procedureId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             minProperties: 1
 *             properties:
 *               isActive: { type: boolean }
 *               price: { type: number, minimum: 0, nullable: true, description: null usa o preço-base do catálogo }
 *     responses:
 *       200: { description: Configuração do procedimento na unidade atualizada }
 *       400: { description: Preço ou status inválido }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { description: Recurso exige Enterprise ou usuário sem acesso à unidade }
 *       404: { description: Procedimento ou clínica não encontrados }
 */
router.patch('/:id/procedures/:procedureId', authorize('ADMIN'), ownClinicOrOwner, setClinicProcedureController)

/**
 * @openapi
 * /clinics/{id}/procedures/clone:
 *   post:
 *     summary: Copia o catálogo de procedimentos de outra unidade
 *     description: A unidade do path é o destino. Copia somente os vínculos ainda inexistentes; não substitui configurações já presentes.
 *     tags: [Clinic catalog]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID da unidade de destino
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fromClinicId]
 *             properties:
 *               fromClinicId: { type: string, format: uuid, description: Unidade de origem }
 *               copyPrices: { type: boolean, default: true }
 *     responses:
 *       200:
 *         description: Resultado da cópia
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 copied: { type: integer }
 *                 alreadyPresent: { type: integer }
 *       400: { description: Unidade de origem ausente ou inválida }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { description: Recurso exige Enterprise ou usuário sem acesso à unidade }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.post('/:id/procedures/clone', authorize('ADMIN'), ownClinicOrOwner, cloneClinicProceduresController)

/**
 * @openapi
 * /clinics/{id}/recipes/reconcile:
 *   post:
 *     summary: Recria receitas de procedimentos usando os produtos da unidade de destino
 *     description: A unidade do path é o destino; os produtos são associados por nome normalizado. Itens sem correspondência são retornados como pendências.
 *     tags: [Clinic catalog]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID da unidade de destino
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fromClinicId]
 *             properties:
 *               fromClinicId: { type: string, format: uuid, description: Unidade da qual serão lidas as receitas }
 *     responses:
 *       200: { description: Quantidade criada e itens pendentes de correspondência }
 *       400: { description: Unidades de origem e destino devem ser diferentes }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { description: Recurso exige Enterprise ou usuário sem acesso à unidade }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.post('/:id/recipes/reconcile', authorize('ADMIN'), ownClinicOrOwner, reconcileRecipesController)

/**
 * @openapi
 * /clinics/{id}/procedures-without-recipe:
 *   get:
 *     summary: Lista procedimentos ativos sem receita de estoque na unidade
 *     tags: [Clinic catalog]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Procedimentos que ainda não têm insumos configurados para esta unidade
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { type: object, properties: { id: { type: string }, name: { type: string } } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { description: Recurso exige Enterprise ou usuário sem acesso à unidade }
 */
router.get('/:id/procedures-without-recipe', authorize('ADMIN'), ownClinicOrOwner, proceduresWithoutRecipeController)

export default router
