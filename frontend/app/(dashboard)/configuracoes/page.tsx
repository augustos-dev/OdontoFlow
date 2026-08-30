'use client'

import { useEffect, useState } from 'react'
import { 
  Building2, 
  Users, 
  ShieldCheck, 
  Plus, 
  Trash2, 
  Edit, 
  KeyRound, 
  Palette, 
  Loader2, 
  Save, 
  AlertCircle,
  CheckCircle2,
  Lock,
  Mail,
  UserCheck,
  Phone,
  MapPin,
  MoreVertical,
  Upload,
  Image as ImageIcon
} from 'lucide-react'
import api from '@/lib/api'
import styles from './configuracoes.module.css'

interface UserItem {
  id: string
  name: string
  email: string
  role: 'ADMIN' | 'DENTIST' | 'RECEPTIONIST'
  cro?: string
  phone?: string
  createdAt: string
}

interface ClinicSettings {
  name: string
  cnpj: string
  phone: string
  email: string
  address: string
  primaryColor: string
}

const COLOR_PRESETS = ['#06b6d4', '#0284c7', '#16a34a', '#8b5cf6', '#0f172a']

export default function ConfiguracoesPage() {
  const [activeTab, setActiveTab] = useState<'usuarios' | 'clinica' | 'seguranca'>('usuarios')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Usuários
  const [users, setUsers] = useState<UserItem[]>([])
  
  // Modais de Usuário
  const [isNewUserModalOpen, setIsNewUserModalOpen] = useState(false)
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false)
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null)

  // Formulário de Criação/Edição
  const [formName, setFormName] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formPassword, setFormPassword] = useState('')
  const [formRole, setFormRole] = useState<'ADMIN' | 'DENTIST' | 'RECEPTIONIST'>('DENTIST')
  const [formCro, setFormCro] = useState('')
  const [newPasswordValue, setNewPasswordValue] = useState('')

  // Dados da Clínica & Visual
  const [clinic, setClinic] = useState<ClinicSettings>({
    name: 'Clínica Sorriso Feliz',
    cnpj: '12.345.678/0001-90',
    phone: '(85) 99876-5432',
    email: 'contato@sorrisofeliz.com.br',
    address: 'Av. Santos Dumont, 1200 - Aldeota, Fortaleza - CE',
    primaryColor: '#06b6d4',
  })

  // Políticas de Segurança (Toggles)
  const [securitySettings, setSecuritySettings] = useState({
    auditLogs: true,
    autoLogout: true,
    mfaRequired: false,
    sessionHours: 12,
  })

  async function loadData() {
    try {
      setLoading(true)
      const [usersRes, clinicRes] = await Promise.all([
        api.get('/users').catch(() => ({ data: [] })),
        api.get('/clinic').catch(() => ({ data: null })),
      ])

      const userList = Array.isArray(usersRes.data) ? usersRes.data : usersRes.data.data || []
      setUsers(userList)

      if (clinicRes?.data) {
        setClinic(clinicRes.data)
      } else {
        const local = localStorage.getItem('@odontoflow:clinic_config')
        if (local) setClinic(JSON.parse(local))
      }
    } catch (err) {
      console.error('Erro ao carregar configurações:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Criar Usuário
  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    try {
      await api.post('/users', {
        name: formName,
        email: formEmail,
        password: formPassword,
        role: formRole,
        cro: formRole === 'DENTIST' ? formCro : undefined,
      })

      setMessage({ type: 'success', text: 'Funcionário cadastrado com sucesso!' })
      setIsNewUserModalOpen(false)
      resetUserForm()
      loadData()
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Erro ao criar usuário.' })
    } finally {
      setSaving(false)
    }
  }

  // Editar Usuário
  function handleOpenEditModal(user: UserItem) {
    setSelectedUser(user)
    setFormName(user.name)
    setFormEmail(user.email)
    setFormRole(user.role)
    setFormCro(user.cro || '')
    setIsEditUserModalOpen(true)
  }

  async function handleUpdateUser(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedUser) return
    setSaving(true)
    setMessage(null)

    try {
      await api.put(`/users/${selectedUser.id}`, {
        name: formName,
        email: formEmail,
        role: formRole,
        cro: formRole === 'DENTIST' ? formCro : undefined,
      })

      setMessage({ type: 'success', text: 'Dados do funcionário atualizados!' })
      setIsEditUserModalOpen(false)
      loadData()
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Erro ao atualizar funcionário.' })
    } finally {
      setSaving(false)
    }
  }

  // Redefinir Senha
  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedUser) return
    setSaving(true)
    setMessage(null)

    try {
      await api.patch(`/users/${selectedUser.id}/password`, {
        password: newPasswordValue,
      })

      setMessage({ type: 'success', text: `Senha de ${selectedUser.name} redefinida!` })
      setIsResetPasswordModalOpen(false)
      setNewPasswordValue('')
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Erro ao redefinir senha.' })
    } finally {
      setSaving(false)
    }
  }

  // Deletar Usuário
  async function handleDeleteUser(userId: string, userName: string) {
    if (!window.confirm(`Tem certeza que deseja revogar o acesso e excluir ${userName}?`)) return
    try {
      await api.delete(`/users/${userId}`)
      setMessage({ type: 'success', text: 'Usuário removido com sucesso.' })
      loadData()
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Erro ao deletar usuário.' })
    }
  }

  // Salvar Clínica
  async function handleSaveClinic(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    try {
      await api.put('/clinic', clinic).catch(() => {
        localStorage.setItem('@odontoflow:clinic_config', JSON.stringify(clinic))
      })
      setMessage({ type: 'success', text: 'Informações e tema da clínica atualizados!' })
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Erro ao salvar dados.' })
    } finally {
      setSaving(false)
    }
  }

  function resetUserForm() {
    setFormName('')
    setFormEmail('')
    setFormPassword('')
    setFormCro('')
    setFormRole('DENTIST')
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Configurações do Sistema</h1>
          <p className={styles.pageSubtitle}>Gerencie equipe, regras de permissões, dados cadastrais e segurança corporativa.</p>
        </div>
      </div>

      {message && (
        <div className={message.type === 'success' ? styles.alertSuccess : styles.alertError}>
          {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* ─── Navegação por Abas ─── */}
      <div className={styles.tabNav}>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'usuarios' ? styles.tabBtnActive : ''}`}
          onClick={() => { setActiveTab('usuarios'); setMessage(null) }}
        >
          <Users size={16} />
          <span>Equipe & Permissões ({users.length})</span>
        </button>

        <button 
          className={`${styles.tabBtn} ${activeTab === 'clinica' ? styles.tabBtnActive : ''}`}
          onClick={() => { setActiveTab('clinica'); setMessage(null) }}
        >
          <Building2 size={16} />
          <span>Dados da Clínica & Visual</span>
        </button>

        <button 
          className={`${styles.tabBtn} ${activeTab === 'seguranca' ? styles.tabBtnActive : ''}`}
          onClick={() => { setActiveTab('seguranca'); setMessage(null) }}
        >
          <ShieldCheck size={16} />
          <span>Segurança & Conformidade</span>
        </button>
      </div>

      {/* ─── ABA 1: USUÁRIOS E EQUIPE (COM AÇÕES COMPLETAS) ─── */}
      {activeTab === 'usuarios' && (
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h2 className={styles.cardTitle}>Usuários com Acesso ao Sistema</h2>
              <p className={styles.cardSubtitle}>Controle de cargos, redefinição de senhas e bloqueio de acessos.</p>
            </div>
            <button 
              type="button" 
              className={styles.btnPrimary} 
              onClick={() => { resetUserForm(); setIsNewUserModalOpen(true) }}
            >
              <Plus size={16} />
              <span>Novo Funcionário</span>
            </button>
          </div>

          {loading ? (
            <div className={styles.loading}>
              <Loader2 size={24} className={styles.spinner} />
              <span>Carregando equipe...</span>
            </div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>NOME</th>
                  <th>E-MAIL</th>
                  <th>CARGO / NÍVEL</th>
                  <th>REGISTRO (CRO)</th>
                  <th style={{ textAlign: 'right' }}>AÇÕES</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className={styles.row}>
                    <td className={styles.nameCell}>
                      <div className={styles.userAvatar}>
                        {u.name.slice(0, 2).toUpperCase()}
                      </div>
                      <span className={styles.boldText}>{u.name}</span>
                    </td>
                    <td>{u.email}</td>
                    <td>
                      <span className={`${styles.roleBadge} ${styles[u.role.toLowerCase()] || ''}`}>
                        {u.role === 'ADMIN' ? 'Administrador' : u.role === 'DENTIST' ? 'Dentista' : 'Secretária'}
                      </span>
                    </td>
                    <td>{u.cro || '—'}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div className={styles.actionButtonsGroup}>
                        <button 
                          type="button" 
                          onClick={() => handleOpenEditModal(u)}
                          className={styles.btnActionIcon}
                          title="Editar dados e cargo"
                        >
                          <Edit size={15} />
                        </button>

                        <button 
                          type="button" 
                          onClick={() => { setSelectedUser(u); setIsResetPasswordModalOpen(true) }}
                          className={styles.btnActionIcon}
                          title="Redefinir senha"
                        >
                          <KeyRound size={15} />
                        </button>

                        <button 
                          type="button" 
                          onClick={() => handleDeleteUser(u.id, u.name)}
                          className={`${styles.btnActionIcon} ${styles.btnActionDelete}`}
                          title="Excluir acesso"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ─── ABA 2: DADOS DA CLÍNICA & VISUAL ─── */}
      {activeTab === 'clinica' && (
        <div className={styles.card}>
          <form onSubmit={handleSaveClinic} className={styles.formContainer}>
            <div className={styles.cardHeaderClean}>
              <h2 className={styles.cardTitle}>Perfil da Unidade</h2>
              <p className={styles.cardSubtitle}>Informações impressas em receituários, orçamentos e relatórios.</p>
            </div>

            <div className={styles.twoCols}>
              <div className={styles.formGroup}>
                <label>Nome Fantasia da Clínica*</label>
                <div className={styles.inputWrapper}>
                  <Building2 size={16} className={styles.inputIcon} />
                  <input 
                    type="text" 
                    required 
                    value={clinic.name}
                    onChange={(e) => setClinic({ ...clinic, name: e.target.value })}
                    className={styles.inputField} 
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>CNPJ*</label>
                <input 
                  type="text" 
                  required 
                  value={clinic.cnpj}
                  onChange={(e) => setClinic({ ...clinic, cnpj: e.target.value })}
                  className={styles.inputFieldPlain} 
                />
              </div>
            </div>

            <div className={styles.twoCols}>
              <div className={styles.formGroup}>
                <label>Telefone / WhatsApp Comercial</label>
                <div className={styles.inputWrapper}>
                  <Phone size={16} className={styles.inputIcon} />
                  <input 
                    type="text" 
                    value={clinic.phone}
                    onChange={(e) => setClinic({ ...clinic, phone: e.target.value })}
                    className={styles.inputField} 
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>E-mail da Recepção</label>
                <div className={styles.inputWrapper}>
                  <Mail size={16} className={styles.inputIcon} />
                  <input 
                    type="email" 
                    value={clinic.email}
                    onChange={(e) => setClinic({ ...clinic, email: e.target.value })}
                    className={styles.inputField} 
                  />
                </div>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label>Endereço Completo</label>
              <div className={styles.inputWrapper}>
                <MapPin size={16} className={styles.inputIcon} />
                <input 
                  type="text" 
                  value={clinic.address}
                  onChange={(e) => setClinic({ ...clinic, address: e.target.value })}
                  className={styles.inputField} 
                />
              </div>
            </div>

            <hr className={styles.divider} />

            {/* Customização Visual */}
            <div className={styles.cardHeaderClean}>
              <h2 className={styles.cardTitle}>Customização da Marca & Cor</h2>
              <p className={styles.cardSubtitle}>Escolha a paleta de destaque do sistema.</p>
            </div>

            <div className={styles.themeSelectorSection}>
              <div className={styles.colorPresetsRow}>
                {COLOR_PRESETS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`${styles.presetBtn} ${clinic.primaryColor === color ? styles.presetBtnActive : ''}`}
                    style={{ background: color }}
                    onClick={() => setClinic({ ...clinic, primaryColor: color })}
                  />
                ))}
              </div>

              <div className={styles.inputWrapper} style={{ maxWidth: '240px' }}>
                <Palette size={16} className={styles.inputIcon} />
                <input 
                  type="text" 
                  value={clinic.primaryColor}
                  onChange={(e) => setClinic({ ...clinic, primaryColor: e.target.value })}
                  className={styles.inputField} 
                />
              </div>
            </div>

            <div className={styles.formFooter}>
              <button type="submit" disabled={saving} className={styles.btnSave}>
                {saving ? <Loader2 size={16} className={styles.spinner} /> : <Save size={16} />}
                <span>Salvar Alterações</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ─── ABA 3: SEGURANÇA INTERATIVA ─── */}
      {activeTab === 'seguranca' && (
        <div className={styles.card}>
          <div className={styles.cardHeaderClean} style={{ padding: '20px 24px 0' }}>
            <h2 className={styles.cardTitle}>Políticas de Acesso & Compliance</h2>
            <p className={styles.cardSubtitle}>Controle de segurança operacional da clínica.</p>
          </div>

          <div className={styles.securityItem}>
            <div>
              <strong>Rastreabilidade de Prontuário Digital (CFO)</strong>
              <p>Gravação de logs inalteráveis a cada evolução clínica e receita gerada.</p>
            </div>
            <label className={styles.switch}>
              <input 
                type="checkbox" 
                checked={securitySettings.auditLogs} 
                onChange={(e) => setSecuritySettings({ ...securitySettings, auditLogs: e.target.checked })} 
              />
              <span className={styles.slider} />
            </label>
          </div>

          <div className={styles.securityItem}>
            <div>
              <strong>Logout Automático por Inatividade</strong>
              <p>Desconectar sessões abertas na recepção após 12 horas sem uso.</p>
            </div>
            <label className={styles.switch}>
              <input 
                type="checkbox" 
                checked={securitySettings.autoLogout} 
                onChange={(e) => setSecuritySettings({ ...securitySettings, autoLogout: e.target.checked })} 
              />
              <span className={styles.slider} />
            </label>
          </div>

          <div className={styles.securityItem}>
            <div>
              <strong>Autenticação em Duas Etapas (MFA)</strong>
              <p>Exigir confirmação por código para administradores ao acessar relatórios financeiros.</p>
            </div>
            <label className={styles.switch}>
              <input 
                type="checkbox" 
                checked={securitySettings.mfaRequired} 
                onChange={(e) => setSecuritySettings({ ...securitySettings, mfaRequired: e.target.checked })} 
              />
              <span className={styles.slider} />
            </label>
          </div>
        </div>
      )}

      {/* ─── MODAL 1: CADASTRAR FUNCIONÁRIO ─── */}
      {isNewUserModalOpen && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modalCard}>
            <div className={styles.modalHeader}>
              <div className={styles.headerTitle}>
                <UserCheck size={18} color="#06b6d4" />
                <h2>Cadastrar Novo Funcionário</h2>
              </div>
              <button type="button" onClick={() => setIsNewUserModalOpen(false)} className={styles.btnClose}>✕</button>
            </div>

            <form onSubmit={handleCreateUser} className={styles.modalForm}>
              <div className={styles.formGroup}>
                <label>Nome Completo*</label>
                <input 
                  type="text" 
                  required 
                  placeholder="Ex: Dra. Juliana Meireles"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className={styles.inputFieldPlain} 
                />
              </div>

              <div className={styles.formGroup}>
                <label>E-mail de Login*</label>
                <input 
                  type="email" 
                  required 
                  placeholder="juliana@odontoflow.com"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className={styles.inputFieldPlain} 
                />
              </div>

              <div className={styles.twoCols}>
                <div className={styles.formGroup}>
                  <label>Senha Provisória*</label>
                  <input 
                    type="password" 
                    required 
                    placeholder="Mínimo 6 dígitos"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    className={styles.inputFieldPlain} 
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Cargo / Perfil*</label>
                  <select 
                    value={formRole}
                    onChange={(e: any) => setFormRole(e.target.value)}
                    className={styles.inputFieldPlain}
                  >
                    <option value="DENTIST">Dentista</option>
                    <option value="RECEPTIONIST">Secretária / Recepção</option>
                    <option value="ADMIN">Administrador Geral</option>
                  </select>
                </div>
              </div>

              {formRole === 'DENTIST' && (
                <div className={styles.formGroup}>
                  <label>Registro CRO*</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="Ex: CE-99881"
                    value={formCro}
                    onChange={(e) => setFormCro(e.target.value)}
                    className={styles.inputFieldPlain} 
                  />
                </div>
              )}

              <div className={styles.modalFooter}>
                <button type="button" onClick={() => setIsNewUserModalOpen(false)} className={styles.btnCancel}>Cancelar</button>
                <button type="submit" disabled={saving} className={styles.btnSave}>
                  {saving ? <Loader2 size={16} className={styles.spinner} /> : <Plus size={16} />}
                  <span>Cadastrar</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: EDITAR FUNCIONÁRIO ─── */}
      {isEditUserModalOpen && selectedUser && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modalCard}>
            <div className={styles.modalHeader}>
              <div className={styles.headerTitle}>
                <Edit size={18} color="#06b6d4" />
                <h2>Editar Funcionário</h2>
              </div>
              <button type="button" onClick={() => setIsEditUserModalOpen(false)} className={styles.btnClose}>✕</button>
            </div>

            <form onSubmit={handleUpdateUser} className={styles.modalForm}>
              <div className={styles.formGroup}>
                <label>Nome Completo*</label>
                <input 
                  type="text" 
                  required 
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className={styles.inputFieldPlain} 
                />
              </div>

              <div className={styles.formGroup}>
                <label>E-mail*</label>
                <input 
                  type="email" 
                  required 
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className={styles.inputFieldPlain} 
                />
              </div>

              <div className={styles.twoCols}>
                <div className={styles.formGroup}>
                  <label>Cargo / Perfil*</label>
                  <select 
                    value={formRole}
                    onChange={(e: any) => setFormRole(e.target.value)}
                    className={styles.inputFieldPlain}
                  >
                    <option value="DENTIST">Dentista</option>
                    <option value="RECEPTIONIST">Secretária / Recepção</option>
                    <option value="ADMIN">Administrador Geral</option>
                  </select>
                </div>

                {formRole === 'DENTIST' && (
                  <div className={styles.formGroup}>
                    <label>CRO</label>
                    <input 
                      type="text" 
                      value={formCro}
                      onChange={(e) => setFormCro(e.target.value)}
                      className={styles.inputFieldPlain} 
                    />
                  </div>
                )}
              </div>

              <div className={styles.modalFooter}>
                <button type="button" onClick={() => setIsEditUserModalOpen(false)} className={styles.btnCancel}>Cancelar</button>
                <button type="submit" disabled={saving} className={styles.btnSave}>
                  {saving ? <Loader2 size={16} className={styles.spinner} /> : <Save size={16} />}
                  <span>Salvar Alterações</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 3: REDEFINIR SENHA ─── */}
      {isResetPasswordModalOpen && selectedUser && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modalCard} style={{ maxWidth: '420px' }}>
            <div className={styles.modalHeader}>
              <div className={styles.headerTitle}>
                <KeyRound size={18} color="#0891b2" />
                <h2>Redefinir Senha</h2>
              </div>
              <button type="button" onClick={() => setIsResetPasswordModalOpen(false)} className={styles.btnClose}>✕</button>
            </div>

            <form onSubmit={handleResetPassword} className={styles.modalForm}>
              <p style={{ fontSize: '13px', color: '#64748b' }}>
                Defina uma nova senha de acesso para <strong>{selectedUser.name}</strong>.
              </p>

              <div className={styles.formGroup}>
                <label>Nova Senha*</label>
                <input 
                  type="password" 
                  required 
                  minLength={6}
                  placeholder="Mínimo 6 caracteres"
                  value={newPasswordValue}
                  onChange={(e) => setNewPasswordValue(e.target.value)}
                  className={styles.inputFieldPlain} 
                />
              </div>

              <div className={styles.modalFooter}>
                <button type="button" onClick={() => setIsResetPasswordModalOpen(false)} className={styles.btnCancel}>Cancelar</button>
                <button type="submit" disabled={saving || !newPasswordValue} className={styles.btnSave}>
                  {saving ? <Loader2 size={16} className={styles.spinner} /> : <Lock size={16} />}
                  <span>Atualizar Senha</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}