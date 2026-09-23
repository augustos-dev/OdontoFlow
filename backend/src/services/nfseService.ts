import axios from 'axios'
import { AppError } from '../shared/AppError'

interface EmitNfsePayload {
  clinicCnpj: string
  im: string // Inscrição Municipal
  patient: {
    name: string
    cpf: string
    email?: string
    address?: {
      street: string
      number: string
      neighborhood: string
      city: string
      uf: string
      cep: string
    }
  }
  serviceValue: number
  serviceDescription: string
  cnaeCode?: string // Ex: 8630-5/04 (Atividade odontológica)
}

export async function emitNfseService(payload: EmitNfsePayload) {
  const apiKey = process.env.FOCUS_NFE_API_KEY
  const baseUrl = process.env.FOCUS_NFE_URL || 'https://api.focusnfe.com.br/v2'

  if (!apiKey) {
    throw new AppError('Integração de NFS-e não configurada nesta clínica.', 500)
  }

  // Estrutura padrão para envio
  const body = {
    data_emissao: new Date().toISOString().split('T')[0],
    prestador: {
      cnpj: payload.clinicCnpj.replace(/\D/g, ''),
      inscricao_municipal: payload.im,
    },
    tomador: {
      cpf: payload.patient.cpf.replace(/\D/g, ''),
      razao_social: payload.patient.name,
      email: payload.patient.email,
    },
    servico: {
      valor_servicos: payload.serviceValue,
      discriminacao: payload.serviceDescription,
      item_lista_servico: '04.01', // Serviços de odontologia
    },
  }

  try {
    const response = await axios.post(`${baseUrl}/nfse`, body, {
      auth: { username: apiKey, password: '' },
    })

    return {
      protocol: response.data.protocolo,
      status: response.data.status, // "processando_autorizacao"
      referenceId: response.data.referencia,
    }
  } catch (error: any) {
    const errorMsg = error.response?.data?.mensagem || 'Falha ao emitir NFS-e na prefeitura'
    throw new AppError(`Erro Fiscal: ${errorMsg}`, 400)
  }
}