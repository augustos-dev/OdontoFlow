import { Prisma, UserRole } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { AppError } from '../shared/AppError'
import { getTenantContext, patientScope, type TenantContext } from '../lib/tenantContext'
import { auditLogService } from './auditLog.service'
import type { CreatePatientDTO, UpdatePatientDTO, PatientFiltersDTO } from '../types/patient.types'

interface ActorContext {
  userId: string
  userName: string
  userRole?: UserRole
}

// Helpers de Higienização de Payload
const clean = (val?: string | null) => (val && val.trim() !== '' ? val.trim() : null)
const cleanDoc = (val?: string | null) => (val ? val.replace(/\D/g, '') || null : null)

/**
 * CPF único por tenant. No Enterprise, se o CPF já existe na rede, devolve o id do cadastro
 * existente para o front abrir o paciente (em vez de criar outro).
 */
async function assertCpfAvailable(ctx: TenantContext, tenantId: string, cpf: string) {
  const existing = await prisma.patient.findUnique({
    where: { tenantId_cpf: { tenantId, cpf } },
    select: { id: true, name: true, deletedAt: true, clinic: { select: { name: true } } },
  })
  if (!existing) return

  if (existing.deletedAt) {
    throw new AppError('Este CPF pertence a um cadastro desativado. Solicite a reativação ao administrador.', 409)
  }
  if (ctx.isNetwork) {
    throw new AppError('Este CPF já está cadastrado na rede. Abra o cadastro existente em vez de criar outro.', 409, {
      code: 'PATIENT_EXISTS_IN_NETWORK',
      patientId: existing.id,
      patientName: existing.name,
      registeredAt: existing.clinic.name,
    })
  }
  throw new AppError('CPF já cadastrado neste tenant.', 409)
}

// Helper com suporte a string, Date ou undefined/null
const parseDate = (val?: string | Date | null): Date | null => {
  if (!val) return null
  if (val instanceof Date) return val
  if (typeof val === 'string' && val.trim() !== '') {
    const parsed = new Date(val)
    return isNaN(parsed.getTime()) ? null : parsed
  }
  return null
}

// ─── Create ──────────────────────────────────────────────────────────────────

export async function createPatient(
  tenantId: string,
  clinicId: string,
  data: CreatePatientDTO,
  actor: ActorContext
) {
  const ctx = await getTenantContext(tenantId)
  const sanitizedCpf = cleanDoc(data.cpf)

  if (sanitizedCpf) await assertCpfAvailable(ctx, tenantId, sanitizedCpf)

  const {
    historyNotes,
    allergies,
    medications,
    medicationsInUse,
    mainComplaint,
    chiefComplaint,
    habits,
    systemicDiseases,
    bloodType,
    birthDate,
    guardianBirthDate,
    ...patientData
  } = data

  const normalizedComplaint = clean(mainComplaint || chiefComplaint)
  const normalizedMeds = clean(medicationsInUse || medications)

  const patient = await prisma.patient.create({
    data: {
      tenantId,
      clinicId,
      name: patientData.name.trim(),
      phone: cleanDoc(patientData.phone) || patientData.phone,
      email: clean(patientData.email),
      cpf: sanitizedCpf,
      birthDate: parseDate(birthDate),
      gender: patientData.gender || 'NAO_INFORMADO',

      // Endereço
      address: clean(patientData.address),
      zipCode: cleanDoc(patientData.zipCode),
      city: clean(patientData.city),
      state: clean(patientData.state),

      // Responsável Legal
      guardianName: clean(patientData.guardianName),
      guardianCpf: cleanDoc(patientData.guardianCpf),
      guardianBirthDate: parseDate(guardianBirthDate),

      // Convênio
      insuranceName: clean(patientData.insuranceName) || 'Particular',
      insuranceCardNumber: clean(patientData.insuranceCardNumber),
      insuranceHolderName: clean(patientData.insuranceHolderName),
      insuranceHolderCpf: cleanDoc(patientData.insuranceHolderCpf),

      // Prontuário Clínico (Criação automática 1:1)
      medicalRecord: {
        create: {
          tenantId,
          clinicId,
          chiefComplaint: normalizedComplaint,
          mainComplaint: normalizedComplaint,
          historyNotes: clean(historyNotes),
          allergies: clean(allergies),
          medications: normalizedMeds,
          medicationsInUse: normalizedMeds,
          bloodType: clean(bloodType),
          habits: clean(habits),
          systemicDiseases: clean(systemicDiseases),
        },
      },
    },
    include: {
      medicalRecord: { select: { id: true } },
    },
  })

  // 🟢 Log de Auditoria
  await auditLogService.createLog({
    tenantId,
    clinicId,
    userId: actor.userId,
    userName: actor.userName,
    userRole: actor.userRole || 'ADMIN',
    action: 'CREATE',
    entity: 'PATIENT',
    entityId: patient.id,
    details: `Cadastrou o novo paciente: "${patient.name}" (CPF: ${patient.cpf || 'Não informado'})`,
  })

  return patient
}

// ─── List ─────────────────────────────────────────────────────────────────────

export async function listPatients(tenantId: string, clinicId: string, filters: PatientFiltersDTO) {
  const { name, cpf, phone, insuranceName, clinicId: filterClinicId, page = 1, limit = 20 } = filters
  const skip = (page - 1) * limit
  const ctx = await getTenantContext(tenantId)
  const sanitizedCpf = cleanDoc(cpf)
  const sanitizedPhone = cleanDoc(phone)

  const where: Prisma.PatientWhereInput = {
    // Enterprise: a rede inteira (CPF achado em qualquer unidade). Demais planos: só a clínica.
    ...patientScope(ctx, clinicId),
    ...(ctx.isNetwork && filterClinicId && { clinicId: filterClinicId }),
    deletedAt: null,
    ...(name && { name: { contains: name.trim(), mode: 'insensitive' } }),
    ...(sanitizedCpf && { cpf: { contains: sanitizedCpf } }),
    ...(sanitizedPhone && { phone: { contains: sanitizedPhone } }),
    ...(insuranceName && { insuranceName: { contains: insuranceName.trim(), mode: 'insensitive' } }),
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
        insuranceName: true,
        createdAt: true,
        clinicId: true,
        clinic: { select: { id: true, name: true } }, // unidade onde o paciente foi cadastrado
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

export async function getPatientById(
  tenantId: string,
  clinicId: string,
  patientId: string,
  actor?: ActorContext
) {
  const ctx = await getTenantContext(tenantId)
  const patient = await prisma.patient.findFirst({
    where: { id: patientId, ...patientScope(ctx, clinicId), deletedAt: null },
    include: {
      clinic: { select: { id: true, name: true } },
      medicalRecord: {
        select: {
          id: true,
          mainComplaint: true,
          chiefComplaint: true,
          historyNotes: true,
          allergies: true,
          medicationsInUse: true,
          medications: true,
          bloodType: true,
          habits: true,
          systemicDiseases: true,
        },
      },
      appointments: {
        orderBy: { dateTime: 'desc' },
        take: 5,
        select: {
          id: true,
          dateTime: true,
          status: true,
          type: true,
          clinic: { select: { id: true, name: true } },
          dentist: { select: { id: true, name: true } },
        },
      },
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

  // LGPD: acesso a paciente cadastrado em OUTRA unidade da rede fica registrado.
  if (actor && patient.clinicId !== clinicId) {
    await auditLogService.createLog({
      tenantId,
      clinicId,
      userId: actor.userId,
      userName: actor.userName,
      userRole: actor.userRole || 'SECRETARY',
      action: 'READ',
      entity: 'PATIENT',
      entityId: patient.id,
      details: `Acessou o cadastro de "${patient.name}", registrado em outra unidade da rede (${patient.clinic.name})`,
    })
  }

  return patient
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updatePatient(
  tenantId: string,
  clinicId: string,
  patientId: string,
  data: UpdatePatientDTO,
  actor: ActorContext
) {
  const ctx = await getTenantContext(tenantId)
  const patient = await prisma.patient.findFirst({
    where: { id: patientId, ...patientScope(ctx, clinicId), deletedAt: null },
    include: { medicalRecord: true },
  })

  if (!patient) throw new AppError('Paciente não encontrado.', 404)

  const sanitizedCpf = data.cpf !== undefined ? cleanDoc(data.cpf) : undefined

  if (sanitizedCpf && sanitizedCpf !== patient.cpf) await assertCpfAvailable(ctx, tenantId, sanitizedCpf)

  const {
    historyNotes,
    allergies,
    medications,
    medicationsInUse,
    mainComplaint,
    chiefComplaint,
    habits,
    systemicDiseases,
    bloodType,
    birthDate,
    guardianBirthDate,
    ...patientData
  } = data

  const normalizedComplaint = mainComplaint !== undefined || chiefComplaint !== undefined
    ? clean(mainComplaint || chiefComplaint)
    : undefined

  const normalizedMeds = medicationsInUse !== undefined || medications !== undefined
    ? clean(medicationsInUse || medications)
    : undefined

  const hasMrUpdates =
    historyNotes !== undefined ||
    allergies !== undefined ||
    medications !== undefined ||
    medicationsInUse !== undefined ||
    mainComplaint !== undefined ||
    chiefComplaint !== undefined ||
    habits !== undefined ||
    systemicDiseases !== undefined ||
    bloodType !== undefined

  const updatedPatient = await prisma.patient.update({
    where: { id: patientId },
    data: {
      ...(patientData.name && { name: patientData.name.trim() }),
      ...(patientData.phone && { phone: cleanDoc(patientData.phone) || patientData.phone }),
      ...(patientData.email !== undefined && { email: clean(patientData.email) }),
      ...(sanitizedCpf !== undefined && { cpf: sanitizedCpf }),
      ...(birthDate !== undefined && { birthDate: parseDate(birthDate) }),
      ...(patientData.gender && { gender: patientData.gender }),

      // Endereço
      ...(patientData.address !== undefined && { address: clean(patientData.address) }),
      ...(patientData.zipCode !== undefined && { zipCode: cleanDoc(patientData.zipCode) }),
      ...(patientData.city !== undefined && { city: clean(patientData.city) }),
      ...(patientData.state !== undefined && { state: clean(patientData.state) }),

      // Responsável Legal
      ...(patientData.guardianName !== undefined && { guardianName: clean(patientData.guardianName) }),
      ...(patientData.guardianCpf !== undefined && { guardianCpf: cleanDoc(patientData.guardianCpf) }),
      ...(guardianBirthDate !== undefined && { guardianBirthDate: parseDate(guardianBirthDate) }),

      // Convênio
      ...(patientData.insuranceName !== undefined && { insuranceName: clean(patientData.insuranceName) || 'Particular' }),
      ...(patientData.insuranceCardNumber !== undefined && { insuranceCardNumber: clean(patientData.insuranceCardNumber) }),
      ...(patientData.insuranceHolderName !== undefined && { insuranceHolderName: clean(patientData.insuranceHolderName) }),
      ...(patientData.insuranceHolderCpf !== undefined && { insuranceHolderCpf: cleanDoc(patientData.insuranceHolderCpf) }),

      // Atualiza prontuário médico caso existam alterações de saúde/anamnese
      ...(patient.medicalRecord && hasMrUpdates && {
        medicalRecord: {
          update: {
            ...(normalizedComplaint !== undefined && {
              chiefComplaint: normalizedComplaint,
              mainComplaint: normalizedComplaint,
            }),
            ...(historyNotes !== undefined && { historyNotes: clean(historyNotes) }),
            ...(allergies !== undefined && { allergies: clean(allergies) }),
            ...(normalizedMeds !== undefined && {
              medications: normalizedMeds,
              medicationsInUse: normalizedMeds,
            }),
            ...(bloodType !== undefined && { bloodType: clean(bloodType) }),
            ...(habits !== undefined && { habits: clean(habits) }),
            ...(systemicDiseases !== undefined && { systemicDiseases: clean(systemicDiseases) }),
          },
        },
      }),
    },
  })

  // 🟢 Log de Auditoria
  await auditLogService.createLog({
    tenantId,
    clinicId,
    userId: actor.userId,
    userName: actor.userName,
    userRole: actor.userRole || 'ADMIN',
    action: 'UPDATE',
    entity: 'PATIENT',
    entityId: patientId,
    details: `Atualizou informações cadastrais/prontuário do paciente "${updatedPatient.name}"`,
  })

  return updatedPatient
}

// ─── Soft Delete ──────────────────────────────────────────────────────────────

export async function deletePatient(
  tenantId: string,
  clinicId: string,
  patientId: string,
  actor: ActorContext
) {
  const ctx = await getTenantContext(tenantId)
  const patient = await prisma.patient.findFirst({
    where: { id: patientId, ...patientScope(ctx, clinicId), deletedAt: null },
  })

  if (!patient) throw new AppError('Paciente não encontrado.', 404)

  await prisma.patient.update({
    where: { id: patientId },
    data: { deletedAt: new Date() },
  })

  // 🟢 Log de Auditoria
  await auditLogService.createLog({
    tenantId,
    clinicId,
    userId: actor.userId,
    userName: actor.userName,
    userRole: actor.userRole || 'ADMIN',
    action: 'DELETE',
    entity: 'PATIENT',
    entityId: patientId,
    details: `Efetuou remoção (soft delete) do paciente "${patient.name}"`,
  })
}