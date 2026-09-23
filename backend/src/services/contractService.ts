import {prisma} from '../lib/prisma'
import { AppError } from '../shared/AppError'
import crypto from 'crypto'
import type { CreatePreRegistrationLinkDTO } from '../types/contract.types'

interface CreateContractData {
  patientId: string
  title: string
  contentHtml: string
}

export async function listContracts(tenantId: string, clinicId: string, patientId?: string) {
  return prisma.clinicalContract.findMany({
    where: {
      tenantId,
      clinicId,
      ...(patientId && { patientId }),
    },
    include: {
      patient: { select: { id: true, name: true, cpf: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function createContract(tenantId: string, clinicId: string, data: CreateContractData) {
  if (!data.title || !data.contentHtml) {
    throw new AppError('Título e conteúdo do documento são obrigatórios.', 400)
  }

  const patient = await prisma.patient.findFirst({
    where: { id: data.patientId, tenantId, clinicId },
  })

  if (!patient) {
    throw new AppError('Paciente não encontrado.', 404)
  }

  return prisma.clinicalContract.create({
    data: {
      tenantId,
      clinicId,
      patientId: data.patientId,
      title: data.title,
      contentHtml: data.contentHtml,
      status: 'DRAFT',
    },
  })
}

export async function signContract(
  tenantId: string,
  contractId: string,
  signatureUrl: string,
  clientIp: string
) {
  const contract = await prisma.clinicalContract.findFirst({
    where: { id: contractId, tenantId },
  })

  if (!contract) {
    throw new AppError('Contrato não encontrado.', 404)
  }

  return prisma.clinicalContract.update({
    where: { id: contractId },
    data: {
      status: 'SIGNED',
      signatureUrl,
      signerIp: clientIp,
      signedAt: new Date(),
    },
  })
}

export async function generatePreRegLink(
  tenantId: string,
  clinicId: string,
  data: CreatePreRegistrationLinkDTO
) {
  if (!data.patientName || !data.phone) {
    throw new AppError('Nome do paciente e telefone são obrigatórios para gerar o link.', 400)
  }

  const token = crypto.randomBytes(24).toString('hex')
  const expiresInDays = data.expiresInDays || 7
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)

  const record = await prisma.publicPreRegistration.create({
    data: {
      tenantId,
      clinicId,
      patientId: data.patientId,
      token,
      patientName: data.patientName.trim(),
      phone: data.phone.trim(),
      expiresAt,
      status: 'PENDING',
    },
  })

  return {
    token: record.token,
    expiresAt: record.expiresAt,
    url: `/pre-cadastro/${record.token}`,
  }
}

export async function submitPreRegByToken(token: string, formData: any) {
  const preReg = await prisma.publicPreRegistration.findUnique({
    where: { token },
  })

  if (!preReg) {
    throw new AppError('Link de pré-cadastro inválido ou inexistente.', 404)
  }

  if (preReg.status === 'COMPLETED') {
    throw new AppError('Este pré-cadastro já foi respondido.', 400)
  }

  if (new Date() > preReg.expiresAt) {
    await prisma.publicPreRegistration.update({
      where: { token },
      data: { status: 'EXPIRED' },
    })
    throw new AppError('Este link expirou. Solicite um novo à recepção da clínica.', 410)
  }

  return prisma.publicPreRegistration.update({
    where: { token },
    data: {
      formData,
      status: 'COMPLETED',
    },
  })
}