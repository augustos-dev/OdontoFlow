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
  Users 
} from 'lucide-react'
import api from '@/lib/api'
import styles from './NovoPacienteModal.module.css'

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function NovoPacienteModal({ open, onClose, onSuccess }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<'dados' | 'endereco' | 'convenio'>('dados')

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!form.name.trim()) { setError('Nome é obrigatório.'); setTab('dados'); return }
    if (!form.phone.trim()) { setError('Telefone celular é obrigatório.'); setTab('dados'); return }

    setLoading(true)
    try {
      await api.post('/patients', {
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

      onSuccess()
      handleClose()
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
    setTab('dados')
    onClose()
  }

  if (!open) return null

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && handleClose()}>
      <div className={styles.modal}>

        {/* ─── Header ─── */}
        <div className={styles.modalHeader}>
          <div>
            <h2 className={styles.modalTitle}>Novo Paciente</h2>
            <p className={styles.modalSub}>Preencha a ficha completa do paciente</p>
          </div>
          <button className={styles.closeBtn} onClick={handleClose} aria-label="Fechar modal">
            <X size={18} />
          </button>
        </div>

        {/* ─── Tabs ─── */}
        <div className={styles.tabs}>
          <button
            type="button"
            className={`${styles.tab} ${tab === 'dados' ? styles.tabActive : ''}`}
            onClick={() => setTab('dados')}
          >
            <User size={15} />
            <span>Dados Pessoais</span>
          </button>
          <button
            type="button"
            className={`${styles.tab} ${tab === 'endereco' ? styles.tabActive : ''}`}
            onClick={() => setTab('endereco')}
          >
            <MapPin size={15} />
            <span>Endereço & Contatos</span>
          </button>
          <button
            type="button"
            className={`${styles.tab} ${tab === 'convenio' ? styles.tabActive : ''}`}
            onClick={() => setTab('convenio')}
          >
            <FileText size={15} />
            <span>Responsável & Convênio</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>

          {/* ─── ABA 1: DADOS PESSOAIS ─── */}
          {tab === 'dados' && (
            <div className={styles.fields}>
              <div className={styles.field}>
                <label className={styles.label}>Nome completo <span className={styles.required}>*</span></label>
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
                  <label className={styles.label}>Celular (WhatsApp) <span className={styles.required}>*</span></label>
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
                <MapPin size={14} />
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

              <div className={styles.divider} />

              <h4 className={styles.groupTitle}>
                <ShieldAlert size={14} />
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
                <Users size={14} />
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

              <div className={styles.divider} />

              <h4 className={styles.groupTitle}>
                <FileText size={14} />
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
              <button type="submit" className={styles.submitBtn} disabled={loading}>
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
      </div>
    </div>
  )
}