import { Router } from "express";
import {
    createProductController,
    listProductController,
    adjustStockController,
    expringProductController,
    productByIdController,
    deleteProductController,
    lowStockController,
    updateProductController

} from '../controllers/productController'
import { authenticate,authorize } from "../middlewares/authMiddlewares";

const productRouter = Router()

// rotas product todas sao privadas 

productRouter.use(authenticate)

// rotas de leitura

productRouter.get('/',listProductController)
productRouter.get('/loe-stock',lowStockController)
productRouter.get('/expiring',expringProductController)
productRouter.get('/:id',productByIdController)

// rotas de escrita  adm e secretaria 

productRouter.post('/', authorize('ADMIN','SECRETARY'),createProductController)
productRouter.put('/', authorize('ADMIN','SECRETARY'),updateProductController)

// rotas de ajuste stock 

productRouter.patch('/:id/stock',authorize('ADMIN','SECRETARY','DENTIST'),adjustStockController)

//rotas de exclusao

productRouter.delete('/:id',authorize('ADMIN'),deleteProductController)

export default productRouter