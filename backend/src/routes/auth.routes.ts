import { Router } from "express";
import { registerController,loginController,getMeController } from "../controllers/authController";
import { authenticate } from "../middlewares/authMiddlewares";


const authRouter = Router()

//POST Cria usuer vinculado a clinia
authRouter.post('/register',registerController)

// POST retorna login e jwt 
authRouter.post('/login',loginController)

// GET retorna o perfil 
authRouter.get('/me',authenticate,getMeController)


export default authRouter