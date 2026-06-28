import type { Request, Response, NextFunction } from 'express'
import * as userService from '../services/userService'
import type {
  CreateUserDTO,
  UpdateUserDTO,
  UpdateUserRoleDTO,
  UpdateUserStatusDTO,
  ChangePasswordDTO,
  UserFiltersDTO,
} from '../types/user.types'

export async function createUserController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { tenantId, clinicId } = req.user!
    const user = await userService.createUser(tenantId, clinicId, req.body as CreateUserDTO)
    res.status(201).json(user)
  } catch (error) {
    next(error)
  }
}

export async function listUsersController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { tenantId, clinicId } = req.user!
    const filters: UserFiltersDTO = {
      name: req.query.name as string,
      role: req.query.role as 'ADMIN' | 'DENTIST' | 'SECRETARY',
      isActive: req.query.isActive ? req.query.isActive === 'true' : undefined,
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    }
    const result = await userService.listUsers(tenantId, clinicId, filters)
    res.status(200).json(result)
  } catch (error) {
    next(error)
  }
}

export async function getUserByIdController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { tenantId, clinicId } = req.user!
    const { id } = req.params
    const user = await userService.getUserById(tenantId, clinicId, id as string)
    res.status(200).json(user)
  } catch (error) {
    next(error)
  }
}

export async function updateUserController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { tenantId, clinicId } = req.user!
    const { id } = req.params
    const user = await userService.updateUser(tenantId, clinicId, id as string , req.body as UpdateUserDTO)
    res.status(200).json(user)
  } catch (error) {
    next(error)
  }
}

export async function updateUserRoleController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { tenantId, clinicId, sub: requesterId } = req.user!
    const { id } = req.params
    const user = await userService.updateUserRole(tenantId, clinicId, id as string, req.body as UpdateUserRoleDTO, requesterId)
    res.status(200).json(user)
  } catch (error) {
    next(error)
  }
}

export async function updateUserStatusController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { tenantId, clinicId, sub: requesterId } = req.user!
    const { id } = req.params
    const user = await userService.updateUserStatus(tenantId, clinicId, id as string , req.body as UpdateUserStatusDTO, requesterId)
    res.status(200).json(user)
  } catch (error) {
    next(error)
  }
}

export async function changePasswordController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { sub: userId } = req.user!
    await userService.changePassword(userId, req.body as ChangePasswordDTO)
    res.status(200).json({ message: 'Senha alterada com sucesso.' })
  } catch (error) {
    next(error)
  }
}

export async function deleteUserController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { tenantId, clinicId, sub: requesterId } = req.user!
    const { id } = req.params
    await userService.deleteUser(tenantId, clinicId, id as string , requesterId)
    res.status(204).send()
  } catch (error) {
    next(error)
  }
}