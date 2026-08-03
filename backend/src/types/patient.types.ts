export interface CreatePatientDTO {
  // 👤 Dados Pessoais
  name: string
  phone: string
  email?: string
  cpf?: string
  birthDate?: string
  gender?: 'MASCULINO' | 'FEMININO' | 'OUTRO' | 'NAO_INFORMADO'

  // 📍 Endereço Detalhado
  address?: string
  zipCode?: string
  city?: string
  state?: string

  // 👨‍👩‍👦 Responsável Legal (Pacientes Menores)
  guardianName?: string
  guardianCpf?: string
  guardianBirthDate?: string

  // 💳 Dados do Convênio
  insuranceName?: string
  insuranceCardNumber?: string
  insuranceHolderName?: string
  insuranceHolderCpf?: string

  // 🩺 Dados Iniciais de Anamnese / Saúde
  historyNotes?: string
  allergies?: string
  medications?: string
  bloodType?: string
}

export interface UpdatePatientDTO extends Partial<CreatePatientDTO> {}

export interface PatientFiltersDTO {
  name?: string
  cpf?: string
  page?: number
  limit?: number
}