import type { Request, Response, NextFunction } from "express";
import  jwt  from "jsonwebtoken";
import type { JwtPayload } from "../types/auth.types";

const JWT_SECRET = process.env.JWT_SECRET!


// exentend o Request do express para carregar os dados do usuario autenticados para para por verificaoes middlewares

declare global {
    namespace Express {
        interface Request {
            user?:JwtPayload
        }
    }
}

export function authenticate(req: Request, res: Response, next: NextFunction):void {
    const authHeader = req.headers.authorization


    if (!authHeader?.startsWith('Bearer')){
        res.status(401).json({message:'Token nao forncecido '})
        return
    }
    const token = authHeader.split('')[1]

    try{
        const payload =jwt.verify(token,JWT_SECRET) as JwtPayload
        req.user = payload
        next()

    } catch {
        res.status(400).json({message:'Token invalido ou expirado'})
    }
}

// midd de autorizacao por role

export async function authorize(...roles:string[]){
    return (req:Request,res:Response, next:NextFunction):void => {
        if (!req.user){
            res.status(401).json({message:'Token nao fornecido'})
            return
        }
        if (!roles.includes(req.user.role)){
            res.status(403).json({message:'Acesso negado. Permissao insuficiente'})
            return
        }

        next()
    }
}
