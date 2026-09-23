import axios from 'axios'

interface SendTextMessageParams {
  phone: string
  message: string
}

export async function sendWhatsAppMessage({ phone, message }: SendTextMessageParams) {
  const instanceUrl = process.env.WHATSAPP_INSTANCE_URL
  const token = process.env.WHATSAPP_TOKEN

  if (!instanceUrl || !token) {
    console.warn('⚠️ WhatsApp API não configurada. Mensagem simulada no console:')
    console.log(`[Para: ${phone}]: ${message}`)
    return { success: true, simulated: true }
  }

  // Higieniza número (padrão Brasil 55 + DDD + Número)
  const cleanPhone = phone.replace(/\D/g, '')
  const fullPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`

  try {
    const response = await axios.post(
      `${instanceUrl}/message/sendText`,
      {
        number: fullPhone,
        text: message,
      },
      {
        headers: { apikey: token },
      }
    )

    return { success: true, data: response.data }
  } catch (error: any) {
    console.error('❌ Erro no envio de WhatsApp:', error.response?.data || error.message)
    return { success: false, error: error.message }
  }
}

// ─── TEMPLATES DE ALTO IMPACTO PARA O ODONTOFLOW ─────────────────────────────

// 1. Envio de link de Pré-cadastro e Anamnese antes da consulta
export async function sendPreRegistrationWhatsApp(phone: string, patientName: string, linkUrl: string) {
  const message = `Olá, *${patientName}*! Tudo bem? 🦷\n\nPara agilizar o seu atendimento na sua chegada à clínica, por favor preencha sua ficha rápida e anamnese pelo link abaixo:\n\n🔗 ${linkUrl}\n\nLeva menos de 2 minutinhos. Até breve!`
  return sendWhatsAppMessage({ phone, message })
}

// 2. Lembrete com Confirmação Ativa (Redução de "Faltou" na Agenda)
export async function sendAppointmentReminderWhatsApp(phone: string, patientName: string, dateStr: string, timeStr: string) {
  const message = `Olá, *${patientName}*! Lembramos de sua consulta agendada para *${dateStr} às ${timeStr}*.\n\nPor favor, responda:\n*1* para *Confirmar*\n*2* para *Remarcar*`
  return sendWhatsAppMessage({ phone, message })
}