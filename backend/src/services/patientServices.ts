// backend/src/services/patient.service.ts

import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { AppError } from '../shared/AppError'
import type { CreatePatientDTO, UpdatePatientDTO, PatientFiltersDTO } from '../types/patient.types'

// ─── Create ──────────────────────────────────────────────────────────────────

export async function createPatient(tenantId: string, clinicId: string, data: CreatePatientDTO) {
  if (data.cpf) {
    const existing = await prisma.patient.findUnique({
      where: { tenantId_cpf: { tenantId, cpf: data.cpf } },
    })
    if (existing) throw new AppError('CPF já cadastrado neste tenant.', 409)
  }

  // Cria o paciente e já inicializa o prontuário clínico vazio (MedicalRecord 1:1)
  const patient = await prisma.patient.create({
    data: {
      tenantId,
      clinicId,
      ...data,
      birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
      medicalRecord: {
        create: { tenantId, clinicId },
      },
    },
    include: {
      medicalRecord: { select: { id: true } },
    },
  })

  return patient
}

// ─── List ─────────────────────────────────────────────────────────────────────

export async function listPatients(tenantId: string, clinicId: string, filters: PatientFiltersDTO) {
  const { name, cpf, page = 1, limit = 20 } = filters
  const skip = (page - 1) * limit

  const where: Prisma.PatientWhereInput = {
    tenantId,
    clinicId,
    deletedAt: null,
    ...(name && { name: { contains: name, mode: 'insensitive' } }),
    ...(cpf && { cpf: { contains: cpf } }),
  }

  const [patients, total] = await Promise.all([
    prisma.patient.findMany({
      where,
      skip,
      take: limit,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        cpf: true,
        birthDate: true,
        gender: true,
        createdAt: true,
      },
    }),
    prisma.patient.count({ where }),
  ])

  return {
    data: patients,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  }
}

// ─── Get by ID ────────────────────────────────────────────────────────────────

export async function getPatientById(tenantId: string, clinicId: string, patientId: string) {
  const patient = await prisma.patient.findFirst({
    where: { id: patientId, tenantId, clinicId, deletedAt: null },
    include: {
      // Prontuário clínico completo
      medicalRecord: {
        select: {
          id: true,
          chiefComplaint: true,
          historyNotes: true,
          allergies: true,
          medications: true,
          bloodType: true,
          habits: true,
          systemicDiseases: true,
        },
      },
      // Últimos 5 agendamentos
      appointments: {
        orderBy: { dateTime: 'desc' },
        take: 5,
        select: {
          id: true,
          dateTime: true,
          status: true,
          type: true,
          dentist: { select: { id: true, name: true } },
        },
      },
      // Planos de tratamento ativos
      treatmentPlans: {
        where: { status: { not: 'RECUSADO' } },
        select: {
          id: true,
          title: true,
          status: true,
          totalAmount: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!patient) throw new AppError('Paciente não encontrado.', 404)

  return patient
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updatePatient(
  tenantId: string,
  clinicId: string,
  patientId: string,
  data: UpdatePatientDTO
) {
  const patient = await prisma.patient.findFirst({
    where: { id: patientId, tenantId, clinicId, deletedAt: null },
  })

  if (!patient) throw new AppError('Paciente não encontrado.', 404)

  if (data.cpf && data.cpf !== patient.cpf) {
    const existing = await prisma.patient.findUnique({
      where: { tenantId_cpf: { tenantId, cpf: data.cpf } },
    })
    if (existing) throw new AppError('CPF já cadastrado neste tenant.', 409)
  }

  return prisma.patient.update({
    where: { id: patientId },
    data: {
      ...data,
      birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
    },
  })
}

// ─── Soft Delete ──────────────────────────────────────────────────────────────

export async function deletePatient(tenantId: string, clinicId: string, patientId: string) {
  const patient = await prisma.patient.findFirst({
    where: { id: patientId, tenantId, clinicId, deletedAt: null },
  })

  if (!patient) throw new AppError('Paciente não encontrado.', 404)

  await prisma.patient.update({
    where: { id: patientId },
    data: { deletedAt: new Date() },
  })
}