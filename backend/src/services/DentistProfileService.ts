import {prisma} from '../lib/prisma'
import { AppError } from '../shared/AppError'
import type { UpdateDentistProfileDTO } from '../types/dentistProfile.types'
import { UserRole } from '@prisma/client'

export async function getProfile(tenantId: string, clinicId: string, userId: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId, tenantId, clinicId },
    include: { dentistProfile: true },
  })

  if (!user) {
    throw new AppError('Profissional não encontrado na clínica.', 404)
  }

  if (user.role !== UserRole.DENTIST && user.role !== UserRole.ADMIN) {
    throw new AppError('Este usuário não possui atribuição de cirurgião-dentista.', 403)
  }

  // Criação preguiçosa (lazy create) do perfil padrão caso ainda não exista
  if (!user.dentistProfile) {
    return prisma.dentistProfile.create({
      data: {
        tenantId,
        clinicId,
        userId,
        slotDurationMin: 30,
        specialties: [],
        aiVoiceShortcut: true,
      },
    })
  }

  return user.dentistProfile
}

export async function updateProfile(
  tenantId: string,
  clinicId: string,
  userId: string,
  data: UpdateDentistProfileDTO
) {
  const user = await prisma.user.findFirst({
    where: { id: userId, tenantId, clinicId },
  })

  if (!user) {
    throw new AppError('Profissional não encontrado.', 404)
  }

  return prisma.dentistProfile.upsert({
    where: { userId },
    create: {
      tenantId,
      clinicId,
      userId,
      specialties: data.specialties || [],
      bio: data.bio,
      defaultRoom: data.defaultRoom || 'SALA_1',
      signatureImageUrl: data.signatureImageUrl,
      croState: data.croState,
      rqe: data.rqe,
      slotDurationMin: data.slotDurationMin || 30,
      workSchedule: data.workSchedule as any,
      aiVoiceShortcut: data.aiVoiceShortcut ?? true,
      quickNotes: data.quickNotes as any,
    },
    update: {
      ...(data.specialties && { specialties: data.specialties }),
      ...(data.bio !== undefined && { bio: data.bio }),
      ...(data.defaultRoom && { defaultRoom: data.defaultRoom }),
      ...(data.signatureImageUrl !== undefined && { signatureImageUrl: data.signatureImageUrl }),
      ...(data.croState !== undefined && { croState: data.croState }),
      ...(data.rqe !== undefined && { rqe: data.rqe }),
      ...(data.slotDurationMin && { slotDurationMin: data.slotDurationMin }),
      ...(data.workSchedule && { workSchedule: data.workSchedule as any }),
      ...(data.aiVoiceShortcut !== undefined && { aiVoiceShortcut: data.aiVoiceShortcut }),
      ...(data.quickNotes && { quickNotes: data.quickNotes as any }),
    },
  })
}