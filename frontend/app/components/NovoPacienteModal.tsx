'use client'

import { useState } from 'react'
import { 
  User, 
  MapPin, 
  FileText, 
  X, 
  ArrowRight, 
  Plus, 
  Loader2, 
  ShieldAlert, 
  Users,
  SendHorizontal,
  CheckCircle2,
  Copy
} from 'lucide-react'
import api from '@/lib/api'
import styles from './NovoPacienteModal.module.css'

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  branding?: {
    clinicName?: string
    primaryColor?: string
    clinicAddress?: string
  }
}

export default function NovoPacienteModal({ open, onClose, onSuccess, branding }: Props) {
  const clinicName = branding?.clinicName || 'Clarium Clinic - Messejana'
  const primaryColor = branding?.primaryColor || '#0284c7'

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<'dados' | 'endereco' | 'convenio'>('dados')

  // Estado de Sucesso pós-criação do paciente (Gera Link com ID)
  const [createdPatient, setCreatedPatient] = useState<{ id: string; name: string; phone: string } | null>(null)
  const [linkCopied, setLinkCopied] = useState(false)

  const [form, setForm] = useState({
    // Dados Pessoais & Preferências
    name: '',
    phone: '',
    landlinePhone: '',
    email: '',
    cpf: '',
    rg: '',
    birthDate: '',
    gender: 'NAO_INFORMADO',
    profession: '',
    howHeardAboutUs: '',
    isForeigner: false,
    reminderPref: 'WHATSAPP',
    notes: '',

    // Endereço Estruturado
    zipCode: '',
    address: '',
    addressComp: '',
    neighborhood: '',
    city: '',
    state: '',

    // Contato de Emergência
    emergencyName: '',
    emergencyPhone: '',

    // Responsável Legal (Menores)
    guardianName: '',
    guardianCpf: '',
    guardianBirth: '',

    // Dados do Convênio
    insuranceName: 'Particular',
    insuranceHolder: '',
    insuranceNumber: '',
    holderCpf: '',
  })

  function set(field: string, value: any) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  // Busca automática do CEP via ViaCEP
  async function handleCepBlur() {
    const cepClean = form.zipCode.replace(/\D/g, '')
    if (cepClean.length === 8) {
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cepClean}/json/`)
        const data = await res.json()
        if (!data.erro) {
          setForm((prev) => ({
            ...prev,
            address: data.logradouro,
            neighborhood: data.bairro,
            city: data.localidade,
            state: data.uf,
          }))
        }
      } catch (err) {
        console.error('Erro ao buscar CEP:', err)
      }
    }
  }

  function getAnamneseLink(patientId: string, patientName: string) {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://odontoflow.com.br'
    return `${origin}/anamnese?patientId=${patientId}&name=${encodeURIComponent(patientName)}`
  }

  // Disparo do WhatsApp com o link exclusivo gerado a partir do ID do paciente
  function handleSendWhatsappLink() {
    if (!createdPatient) return

    const cleanPhone = createdPatient.phone.replace(/\D/g, '')
    const fullPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`
    const anamneseLink = getAnamneseLink(createdPatient.id, createdPatient.name)

    const lines = [
      `Olá, *${createdPatient.name}*! Tudo bem?`,
      '',
      `Seu cadastro inicial na *${clinicName}* foi concluído com sucesso! 🎉`,
      '',
      `Para adiantar seu atendimento e orientar o dentista, pedimos que preencha sua ficha rápida de saúde (anamnese) pelo link seguro:`,
      '',
      `🔗 ${anamneseLink}`,
      '',
      `Leva menos de 2 minutos. Se tiver qualquer dúvida, estamos por aqui! 💙`
    ]

    const textEncoded = lines.map((l) => encodeURIComponent(l)).join('%0A')
    window.open(`https://api.whatsapp.com/send?phone=${fullPhone}&text=${textEncoded}`, '_blank')
  }

  function handleCopyLink() {
    if (!createdPatient) return
    const anamneseLink = getAnamneseLink(createdPatient.id, createdPatient.name)
    navigator.clipboard.writeText(anamneseLink)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2500)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!form.name.trim()) { setError('Nome é obrigatório.'); setTab('dados'); return }
    if (!form.phone.trim()) { setError('Celular é obrigatório.'); setTab('dados'); return }

    setLoading(true)
    try {
      const { data } = await api.post('/patients', {
        name: form.name,
        phone: form.phone,
        landlinePhone: form.landlinePhone || undefined,
        email: form.email || undefined,
        cpf: form.cpf || undefined,
        rg: form.rg || undefined,
        birthDate: form.birthDate || undefined,
        gender: form.gender,
        profession: form.profession || undefined,
        howHeardAboutUs: form.howHeardAboutUs || undefined,
        isForeigner: form.isForeigner,
        reminderPref: form.reminderPref,
        notes: form.notes || undefined,

        zipCode: form.zipCode || undefined,
        address: form.address || undefined,
        addressComp: form.addressComp || undefined,
        neighborhood: form.neighborhood || undefined,
        city: form.city || undefined,
        state: form.state || undefined,

        emergencyName: form.emergencyName || undefined,
        emergencyPhone: form.emergencyPhone || undefined,

        guardianName: form.guardianName || undefined,
        guardianCpf: form.guardianCpf || undefined,
        guardianBirth: form.guardianBirth || undefined,

        insuranceName: form.insuranceName || undefined,
        insuranceHolder: form.insuranceHolder || undefined,
        insuranceNumber: form.insuranceNumber || undefined,
        holderCpf: form.holderCpf || undefined,
      })

      // Pega o ID retornado do paciente recém-criado
      const newId = data?.data?.id || data?.id
      if (newId) {
        setCreatedPatient({
          id: newId,
          name: form.name,
          phone: form.phone,
        })
      }

      onSuccess()
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Erro ao cadastrar paciente.')
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    setForm({
      name: '', phone: '', landlinePhone: '', email: '', cpf: '', rg: '',
      birthDate: '', gender: 'NAO_INFORMADO', profession: '', howHeardAboutUs: '',
      isForeigner: false, reminderPref: 'WHATSAPP', notes: '',
      zipCode: '', address: '', addressComp: '', neighborhood: '', city: '', state: '',
      emergencyName: '', emergencyPhone: '',
      guardianName: '', guardianCpf: '', guardianBirth: '',
      insuranceName: 'Particular', insuranceHolder: '', insuranceNumber: '', holderCpf: '',
    })
    setError('')
    setCreatedPatient(null)
    setLinkCopied(false)
    setTab('dados')
    onClose()
  }

  if (!open) return null

  return (
    <div 
      className={styles.overlay} 
      onClick={(e) => e.target === e.currentTarget && handleClose()}
      style={{ '--primary': primaryColor } as React.CSSProperties}
    >
      <div className={styles.modal}>

        {/* ─── Header ─── */}
        <div className={styles.modalHeader}>
          <div>
            <h2 className={styles.modalTitle}>Cadastro de Paciente</h2>
            <p className={styles.modalSub}>Preencha a ficha cadastral do paciente na recepção</p>
          </div>
          <button className={styles.closeBtn} onClick={handleClose} aria-label="Fechar modal">
            <X size={18} />
          </button>
        </div>

        {/* ─── SE JÁ FOI CADASTRADO: CARD DE DISPONIBILIZAÇÃO DO LINK DE ANAMNESE ─── */}
        {createdPatient ? (
          <div className={styles.form} style={{ padding: '28px 24px' }}>
            <div style={{ textAlign: 'center', marginBottom: '18px' }}>
              <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <CheckCircle2 size={30} />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Paciente Cadastrado com Sucesso!</h3>
              <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                O cadastro de <strong>{createdPatient.name}</strong> está salvo no banco. Agora disponibilize o link para ele responder a anamnese pelo celular.
              </p>
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Link Exclusivo de Anamnese
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  readOnly
                  className={styles.input}
                  style={{ background: '#ffffff', fontSize: '12px', color: '#334155' }}
                  value={getAnamneseLink(createdPatient.id, createdPatient.name)}
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className={styles.nextBtn}
                  style={{ padding: '0 14px', flexShrink: 0 }}
                  title="Copiar link"
                >
                  <Copy size={15} />
                  <span>{linkCopied ? 'Copiado!' : 'Copiar'}</span>
                </button>
              </div>
            </div>

            <div className={styles.actions} style={{ justifyContent: 'space-between', marginTop: '16px' }}>
              <button type="button" className={styles.cancelBtn} onClick={handleClose}>
                Fechar e Concluir
              </button>
              <button 
                type="button" 
                onClick={handleSendWhatsappLink}
                className={styles.btnWhatsappPreReg}
                style={{ padding: '10px 18px', fontSize: '13px' }}
              >
                <SendHorizontal size={15} />
                <span>Enviar Link no WhatsApp</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* ─── Tabs ─── */}
            <div className={styles.tabs} style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
              <button
                type="button"
                className={`${styles.tab} ${tab === 'dados' ? styles.tabActive : ''}`}
                onClick={() => setTab('dados')}
              >
                <User size={15} />
                <span>Dados</span>
              </button>
              <button
                type="button"
                className={`${styles.tab} ${tab === 'endereco' ? styles.tabActive : ''}`}
                onClick={() => setTab('endereco')}
              >
                <MapPin size={15} />
                <span>Endereço</span>
              </button>
              <button
                type="button"
                className={`${styles.tab} ${tab === 'convenio' ? styles.tabActive : ''}`}
                onClick={() => setTab('convenio')}
              >
                <FileText size={15} />
                <span>Convênio</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className={styles.form}>

              {/* ─── ABA 1: DADOS PESSOAIS ─── */}
              {tab === 'dados' && (
                <div className={styles.fields}>
                  <div className={styles.field}>
                    <label className={styles.label}>
                      Nome completo <span className={styles.required}>*</span>
                    </label>
                    <input
                      className={styles.input}
                      placeholder="Ex: Maria da Silva"
                      value={form.name}
                      onChange={(e) => set('name', e.target.value)}
                      required
                    />
                  </div>

                  <div className={styles.row3}>
                    <div className={styles.field}>
                      <label className={styles.label}>
                        Celular (WhatsApp) <span className={styles.required}>*</span>
                      </label>
                      <input
                        className={styles.input}
                        placeholder="(85) 99999-0000"
                        value={form.phone}
                        onChange={(e) => set('phone', e.target.value)}
                        required
                      />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>Lembretes por</label>
                      <select className={styles.select} value={form.reminderPref} onChange={(e) => set('reminderPref', e.target.value)}>
                        <option value="WHATSAPP">WhatsApp</option>
                        <option value="SMS">SMS</option>
                        <option value="EMAIL">E-mail</option>
                        <option value="NENHUM">Não enviar</option>
                      </select>
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>E-mail</label>
                      <input
                        type="email"
                        className={styles.input}
                        placeholder="email@exemplo.com"
                        value={form.email}
                        onChange={(e) => set('email', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className={styles.row3}>
                    <div className={styles.field}>
                      <label className={styles.label}>Telefone Fixo</label>
                      <input
                        className={styles.input}
                        placeholder="(85) 3333-0000"
                        value={form.landlinePhone}
                        onChange={(e) => set('landlinePhone', e.target.value)}
                      />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>Como conheceu a clínica?</label>
                      <input
                        className={styles.input}
                        placeholder="Ex: Instagram, Indicação..."
                        value={form.howHeardAboutUs}
                        onChange={(e) => set('howHeardAboutUs', e.target.value)}
                      />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>Profissão</label>
                      <input
                        className={styles.input}
                        placeholder="Ex: Engenheiro"
                        value={form.profession}
                        onChange={(e) => set('profession', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className={styles.row3}>
                    <div className={styles.field}>
                      <label className={styles.label}>Data de nascimento</label>
                      <input
                        type="date"
                        className={styles.input}
                        value={form.birthDate}
                        onChange={(e) => set('birthDate', e.target.value)}
                      />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>CPF</label>
                      <input
                        className={styles.input}
                        placeholder="000.000.000-00"
                        value={form.cpf}
                        onChange={(e) => set('cpf', e.target.value)}
                      />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>RG</label>
                      <input
                        className={styles.input}
                        placeholder="0000000000-0"
                        value={form.rg}
                        onChange={(e) => set('rg', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className={styles.row2}>
                    <div className={styles.field}>
                      <label className={styles.label}>Gênero</label>
                      <select className={styles.select} value={form.gender} onChange={(e) => set('gender', e.target.value)}>
                        <option value="NAO_INFORMADO">Não informado</option>
                        <option value="MASCULINO">Masculino</option>
                        <option value="FEMININO">Feminino</option>
                        <option value="OUTRO">Outro</option>
                      </select>
                    </div>
                    <div className={styles.checkboxField}>
                      <label className={styles.checkboxLabel}>
                        <input
                          type="checkbox"
                          checked={form.isForeigner}
                          onChange={(e) => set('isForeigner', e.target.checked)}
                        />
                        Paciente estrangeiro (Sem CPF/RG)
                      </label>
                    </div>
                  </div>

                  <div className={styles.field}>
                    <label className={styles.label}>Observações sobre o paciente</label>
                    <textarea
                      className={styles.textarea}
                      rows={2}
                      placeholder="Observações internas..."
                      value={form.notes}
                      onChange={(e) => set('notes', e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* ─── ABA 2: ENDEREÇO & EMERGÊNCIA ─── */}
              {tab === 'endereco' && (
                <div className={styles.fields}>
                  <h4 className={styles.groupTitle}>
                    <MapPin size={13} />
                    <span>Endereço Residencial</span>
                  </h4>

                  <div className={styles.row3}>
                    <div className={styles.field}>
                      <label className={styles.label}>CEP (Auto-preenchimento)</label>
                      <input
                        className={styles.input}
                        placeholder="00000-000"
                        value={form.zipCode}
                        onChange={(e) => set('zipCode', e.target.value)}
                        onBlur={handleCepBlur}
                      />
                    </div>
                    <div className={styles.field} style={{ gridColumn: 'span 2' }}>
                      <label className={styles.label}>Logradouro e Número</label>
                      <input
                        className={styles.input}
                        placeholder="Rua, Av, Número..."
                        value={form.address}
                        onChange={(e) => set('address', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className={styles.row3}>
                    <div className={styles.field}>
                      <label className={styles.label}>Complemento</label>
                      <input
                        className={styles.input}
                        placeholder="Apto, Bloco..."
                        value={form.addressComp}
                        onChange={(e) => set('addressComp', e.target.value)}
                      />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>Bairro</label>
                      <input
                        className={styles.input}
                        placeholder="Bairro"
                        value={form.neighborhood}
                        onChange={(e) => set('neighborhood', e.target.value)}
                      />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>Cidade / UF</label>
                      <div className={styles.cityStateGroup}>
                        <input
                          className={styles.input}
                          placeholder="Cidade"
                          value={form.city}
                          onChange={(e) => set('city', e.target.value)}
                        />
                        <input
                          className={styles.input}
                          style={{ width: '60px', textTransform: 'uppercase' }}
                          maxLength={2}
                          placeholder="UF"
                          value={form.state}
                          onChange={(e) => set('state', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <hr className={styles.divider} />

                  <h4 className={styles.groupTitle}>
                    <ShieldAlert size={13} />
                    <span>Contato de Emergência</span>
                  </h4>

                  <div className={styles.row2}>
                    <div className={styles.field}>
                      <label className={styles.label}>Nome do Contato</label>
                      <input
                        className={styles.input}
                        placeholder="Ex: Mãe, Cônjuge..."
                        value={form.emergencyName}
                        onChange={(e) => set('emergencyName', e.target.value)}
                      />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>Telefone de Emergência</label>
                      <input
                        className={styles.input}
                        placeholder="(85) 99999-0000"
                        value={form.emergencyPhone}
                        onChange={(e) => set('emergencyPhone', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ─── ABA 3: RESPONSÁVEL & CONVÊNIO ─── */}
              {tab === 'convenio' && (
                <div className={styles.fields}>
                  <h4 className={styles.groupTitle}>
                    <Users size={13} />
                    <span>Responsável Legal (Pacientes Menores)</span>
                  </h4>

                  <div className={styles.row3}>
                    <div className={styles.field}>
                      <label className={styles.label}>Nome do Responsável</label>
                      <input
                        className={styles.input}
                        placeholder="Nome completo"
                        value={form.guardianName}
                        onChange={(e) => set('guardianName', e.target.value)}
                      />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>CPF do Responsável</label>
                      <input
                        className={styles.input}
                        placeholder="000.000.000-00"
                        value={form.guardianCpf}
                        onChange={(e) => set('guardianCpf', e.target.value)}
                      />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>Data Nasc. Responsável</label>
                      <input
                        type="date"
                        className={styles.input}
                        value={form.guardianBirth}
                        onChange={(e) => set('guardianBirth', e.target.value)}
                      />
                    </div>
                  </div>

                  <hr className={styles.divider} />

                  <h4 className={styles.groupTitle}>
                    <FileText size={13} />
                    <span>Dados do Convênio</span>
                  </h4>

                  <div className={styles.row2}>
                    <div className={styles.field}>
                      <label className={styles.label}>Convênio / Plano</label>
                      <input
                        className={styles.input}
                        placeholder="Ex: Particular, Unimed, Bradesco..."
                        value={form.insuranceName}
                        onChange={(e) => set('insuranceName', e.target.value)}
                      />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>Titular do Convênio</label>
                      <input
                        className={styles.input}
                        placeholder="Nome do titular"
                        value={form.insuranceHolder}
                        onChange={(e) => set('insuranceHolder', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className={styles.row2}>
                    <div className={styles.field}>
                      <label className={styles.label}>Número da Carteirinha</label>
                      <input
                        className={styles.input}
                        placeholder="Ex: 0012345678"
                        value={form.insuranceNumber}
                        onChange={(e) => set('insuranceNumber', e.target.value)}
                      />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>CPF do Titular</label>
                      <input
                        className={styles.input}
                        placeholder="000.000.000-00"
                        value={form.holderCpf}
                        onChange={(e) => set('holderCpf', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {error && <p className={styles.error}>{error}</p>}

              {/* ─── Ações Rodapé ─── */}
              <div className={styles.actions}>
                <button type="button" className={styles.cancelBtn} onClick={handleClose}>
                  Cancelar
                </button>
                {tab === 'dados' && (
                  <button type="button" className={styles.nextBtn} onClick={() => setTab('endereco')}>
                    <span>Próximo: Endereço</span>
                    <ArrowRight size={15} />
                  </button>
                )}
                {tab === 'endereco' && (
                  <button type="button" className={styles.nextBtn} onClick={() => setTab('convenio')}>
                    <span>Próximo: Convênio</span>
                    <ArrowRight size={15} />
                  </button>
                )}
                {tab === 'convenio' && (
                  <button 
                    type="submit" 
                    className={styles.submitBtn} 
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 size={15} className={styles.spinner} />
                        <span>Cadastrando...</span>
                      </>
                    ) : (
                      <>
                        <Plus size={15} />
                        <span>Cadastrar Paciente</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </form>
          </>
        )}

      </div>
    </div>
  )
}