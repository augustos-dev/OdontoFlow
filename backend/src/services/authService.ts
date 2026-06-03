import bcrypt from "bcryptjs";
import jwt from 'jsonwebtoken'
import { prisma } from '../lib/prisma'
import type { RegisterDTO,LoginDTO,AuthResponse,JwtPayload } from "../types/auth.types";


const JWT_SECRET =process.env.JWT_SECRET!
const JWT_EXPIRES_IN = process.env.JWT_SECRET_IN ?? '8h'

// RESGITRO

export async function register(data: RegisterDTO): Promise<AuthResponse> {
    const {clinicId, name, email, password ,role , phone, cro} = data

    //garante que a clinica exista antes de criar usuario

    const clinic =await prisma.clinic.findUnique({
        where:{id: clinicId }
    })
    if (!clinicId){
        throw new Error('Clinica nao econtrada')
    }

    // verifica se email ja existe se sim nao deixa duplicar 
    const existing = await prisma.user.findUnique({
        where:{email}
    })

    if(existing){
        throw new Error('E-mail ja cadastrado')
    }

    const passwordHash = await bcrypt.hash(password , 12)

    const user = await prisma.user.create({
        data:{
            clinicId,
            name,
            email,
            passwordHash,
            role,
            phone,
            cro
        },
        select:{
            id:true,
            name: true,
            email:true,
            role:true,
            clinicId: true
        }

    })

    const token = generateToken({sub: user.id, clinicId: user.clinicId , role: user.role})
    return{token, user}
}

// login // importa o DTO de types e gerar token com 8h de duracao 

export async function login(data:LoginDTO): Promise<AuthResponse> {
    const {email,password} = data

    const user = await prisma.user.findUnique({
        where:{email},
        select:{
            id:true,
            name:true,
            email:true,
            role:true,
            clinicId:true,
            passwordHash:true,
            isActive:true
        }
    })

    if(!user){
        throw new Error('Credencias invalidas')
    }

    if (!user.isActive){
        throw new Error('Usuairo inativo entre em contato com o admistardor')
    }

    const  passwordMatch = await bcrypt.compare(password ,user.passwordHash)
    if(!passwordMatch){
        throw new Error('Credenciais invalidas.')
    }

    // Atualiza lastLoginAt sem bloquear a resposta
     prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  }).catch(() => {}) //// dispara o e esquece nao guarda em memoria 


  const token = generateToken({sub:user.id, clinicId:user.clinicId, role: user.role})
  const {passwordHash: _, ...userWithoutPassoword} = user

  return{token, user:userWithoutPassoword}
}

// perfl autenticado - PRINCIPAL LOGIN MULT-TENANT 

export async function getMe(userId:string, clinicId: string){
    const user = await prisma.user.findFirst({
    where:{
        id: userId,
        clinicId // isolamento por clinica mult-tenant
    },
    select:{
        id:true,
        name:true,
        email:true,
        role:true,
        phone:true,
        cro:true,
        avatarUrl:true,
        lastLoginAt:true,
        createdAt:true,
        clinic:{
            select:{ id: true, name: true}
        },

    },

    })

    if (!user){
        throw new Error('Usuario nao encontrado')
    }
    return user
}

// Helpers gerais  auth

 
function generateToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions)
}