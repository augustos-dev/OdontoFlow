import type { Request, Response, NextFunction } from 'express'
import * as userService from '../services/userService'
import type { UserRole } from '@prisma/client'
import type {
  CreateUserDTO,
  UpdateUserDTO,
  UpdateUserRoleDTO,
  UpdateUserStatusDTO,
  ChangePasswordDTO,
  UserFiltersDTO,
} from '../types/user.types'
import type { BulkUpdateRolePermissionsDTO } from '../types/permission.types'
import { getSessionUser } from '../middlewares/authMiddlewares'

function getActor(req: Request) {
  const user = getSessionUser(req)
  return {
    userId: user.userId || (user.sub as string),
    userName: user.name || 'Utilizador',
    userRole: user.role,
  }
}

export async function createUserController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = getSessionUser(req)
    const actor = getActor(req)

    const created = await userService.createUser(user.tenantId, user.clinicId, req.body as CreateUserDTO, actor)
    res.status(201).json(created)
  } catch (error) {
    next(error)
  }
}

export async function listUsersController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = getSessionUser(req)
    const filters: UserFiltersDTO = {
      name: req.query.name as string | undefined,
      role: req.query.role as UserRole | undefined,
      isActive: req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined,
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    }
    const result = await userService.listUsers(user.tenantId, user.clinicId, filters)
    res.status(200).json(result)
  } catch (error) {
    next(error)
  }
}

export async function getUserByIdController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = getSessionUser(req)
    const { id } = req.params
    const found = await userService.getUserById(user.tenantId, user.clinicId, id as string)
    res.status(200).json(found)
  } catch (error) {
    next(error)
  }
}

export async function updateUserController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = getSessionUser(req)
    const actor = getActor(req)
    const { id } = req.params

    const updated = await userService.updateUser(
      user.tenantId,
      user.clinicId,
      id as string,
      req.body as UpdateUserDTO,
      actor
    )
    res.status(200).json(updated)
  } catch (error) {
    next(error)
  }
}

export async function updateUserRoleController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = getSessionUser(req)
    const actor = getActor(req)
    const { id } = req.params

    const updated = await userService.updateUserRole(
      user.tenantId,
      user.clinicId,
      id as string,
      req.body as UpdateUserRoleDTO,
      actor
    )
    res.status(200).json(updated)
  } catch (error) {
    next(error)
  }
}

export async function updateUserStatusController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = getSessionUser(req)
    const actor = getActor(req)
    const { id } = req.params

    const updated = await userService.updateUserStatus(
      user.tenantId,
      user.clinicId,
      id as string,
      req.body as UpdateUserStatusDTO,
      actor
    )
    res.status(200).json(updated)
  } catch (error) {
    next(error)
  }
}

export async function resetUserLockoutController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = getSessionUser(req)
    const actor = getActor(req)
    const { id } = req.params

    const unlocked = await userService.resetUserLockout(user.tenantId, user.clinicId, id as string, actor)
    res.status(200).json({ message: 'Conta desbloqueada com sucesso.', user: unlocked })
  } catch (error) {
    next(error)
  }
}

export async function changePasswordController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = getSessionUser(req)
    const userId = user.userId || (user.sub as string)

    await userService.changePassword(
      user.tenantId,
      user.clinicId,
      userId,
      req.body as ChangePasswordDTO,
      user.name || 'Utilizador'
    )
    res.status(200).json({ message: 'Senha alterada com sucesso.' })
  } catch (error) {
    next(error)
  }
}

export async function deleteUserController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = getSessionUser(req)
    const actor = getActor(req)
    const { id } = req.params

    await userService.deleteUser(user.tenantId, user.clinicId, id as string, actor)
    res.status(204).send()
  } catch (error) {
    next(error)
  }
}

export async function getRolePermissionsController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = getSessionUser(req)
    const { role } = req.params

    const permissions = await userService.getRolePermissions(user.tenantId, user.clinicId, role as UserRole)
    res.status(200).json(permissions)
  } catch (error) {
    next(error)
  }
}

export async function updateRolePermissionsController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = getSessionUser(req)
    const actor = getActor(req)

    const updated = await userService.updateRolePermissions(
      user.tenantId,
      user.clinicId,
      req.body as BulkUpdateRolePermissionsDTO,
      actor
    )
    res.status(200).json(updated)
  } catch (error) {
    next(error)
  }
}