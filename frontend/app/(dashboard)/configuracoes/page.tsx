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
  Sliders,
  Sparkles,
  Info
} from 'lucide-react'
import api from '@/lib/api'
import styles from './configuracoes.module.css'

interface UserItem {
  id: string
  name: string
  email: string
  role: 'ADMIN' | 'DENTIST' | 'SECRETARY'
  cro?: string
  phone?: string
  createdAt: string
}

interface ClinicData {
  id: string
  name: string
  cnpj?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  logoUrl?: string | null
}

interface ClinicCustomization {
  id?: string
  clinicName?: string | null
  primaryColor: string
  accentColor: string
  secondaryColor?: string | null
  fontFamily: string
  darkModeDefault: boolean
  customLogoUrl?: string | null
}

type SystemModule = 
  | 'DASHBOARD'
  | 'AGENDA'
  | 'PATIENTS'
  | 'RECORDS'
  | 'STOCK'
  | 'FINANCIAL'
  | 'PROCEDURES'
  | 'SUPPLIERS'
  | 'SETTINGS'
  | 'REPORTS'

interface RolePermission {
  module: SystemModule
  canRead: boolean
  canCreate: boolean
  canUpdate: boolean
  canDelete: boolean
}

const COLOR_PRESETS = ['#06b6d4', '#0284c7', '#16a34a', '#8b5cf6', '#0f172a', '#e11d48']
const FONT_PRESETS = ['Inter', 'Roboto', 'Poppins', 'Montserrat']

const MODULE_LABELS: Record<SystemModule, string> = {
  DASHBOARD: 'Visão Geral / Dashboard',
  AGENDA: 'Agenda & Consultas',
  PATIENTS: 'Pacientes & Cadastros',
  RECORDS: 'Prontuário & Odontograma',
  STOCK: 'Estoque & Insumos',
  FINANCIAL: 'Financeiro & Caixa',
  PROCEDURES: 'Catálogo de Procedimentos',
  SUPPLIERS: 'Fornecedores & Dentais',
  SETTINGS: 'Configurações do Sistema',
  REPORTS: 'Relatórios Executivos'
}

export default function ConfiguracoesPage() {
  const [activeTab, setActiveTab] = useState<'usuarios' | 'permissoes' | 'clinica' | 'seguranca'>('usuarios')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Usuários
  const [users, setUsers] = useState<UserItem[]>([])
  const [isNewUserModalOpen, setIsNewUserModalOpen] = useState(false)
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false)
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null)

  // Formulário de Usuário
  const [formName, setFormName] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formPassword, setFormPassword] = useState('')
  const [formRole, setFormRole] = useState<'ADMIN' | 'DENTIST' | 'SECRETARY'>('DENTIST')
  const [formCro, setFormCro] = useState('')
  const [newPasswordValue, setNewPasswordValue] = useState('')

  // Dados da Clínica & Customização (White-Label)
  const [clinic, setClinic] = useState<ClinicData | null>(null)
  const [customization, setCustomization] = useState<ClinicCustomization>({
    primaryColor: '#06b6d4',
    accentColor: '#0891b2',
    secondaryColor: '#0f172a',
    fontFamily: 'Inter',
    darkModeDefault: false,
    customLogoUrl: ''
  })

  // Permissões RBAC
  const [selectedRoleForPermissions, setSelectedRoleForPermissions] = useState<'DENTIST' | 'SECRETARY'>('SECRETARY')
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([])
  const [loadingPermissions, setLoadingPermissions] = useState(false)

  // Políticas de Segurança
  const [securitySettings, setSecuritySettings] = useState({
    auditLogs: true,
    autoLogout: true,
    mfaRequired: false,
  })

  async function loadData() {
    try {
      setLoading(true)
      const [usersRes, clinicsRes] = await Promise.all([
        api.get('/users').catch(() => ({ data: [] })),
        api.get('/clinics').catch(() => ({ data: [] }))
      ])

      const userList = Array.isArray(usersRes.data) ? usersRes.data : usersRes.data?.data || []
      setUsers(userList)

      const clinicList = Array.isArray(clinicsRes.data) ? clinicsRes.data : clinicsRes.data?.data || []
      const currentClinic = clinicList[0] || null
      setClinic(currentClinic)

      if (currentClinic?.id) {
        const customRes = await api.get(`/clinics/${currentClinic.id}/customization`).catch(() => null)
        if (customRes?.data) {
          setCustomization(customRes.data)
        }
      }
    } catch (err) {
      console.error('Erro ao carregar configurações:', err)
    } finally {
      setLoading(false)
    }
  }

  async function loadPermissions(role: 'DENTIST' | 'SECRETARY') {
    try {
      setLoadingPermissions(true)
      const res = await api.get(`/users/permissions/${role}`)
      setRolePermissions(res.data || [])
    } catch (err) {
      console.error('Erro ao carregar permissões:', err)
    } finally {
      setLoadingPermissions(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (activeTab === 'permissoes') {
      loadPermissions(selectedRoleForPermissions)
    }
  }, [activeTab, selectedRoleForPermissions])

  // Salvar Clínica e Identidade Visual
  async function handleSaveClinicAndTheme(e: React.FormEvent) {
    e.preventDefault()
    if (!clinic?.id) return
    setSaving(true)
    setMessage(null)

    try {
      await Promise.all([
        api.put(`/clinics/${clinic.id}`, {
          name: clinic.name,
          cnpj: clinic.cnpj || undefined,
          phone: clinic.phone || undefined,
          email: clinic.email || undefined,
          address: clinic.address || undefined,
        }),
        api.put(`/clinics/${clinic.id}/customization`, {
          clinicName: clinic.name,
          primaryColor: customization.primaryColor,
          accentColor: customization.accentColor,
          secondaryColor: customization.secondaryColor,
          fontFamily: customization.fontFamily,
          darkModeDefault: customization.darkModeDefault,
          customLogoUrl: customization.customLogoUrl || undefined,
        })
      ])

      setMessage({ type: 'success', text: 'Dados cadastrais e identidade visual atualizados com sucesso!' })
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Erro ao salvar alterações da clínica.' })
    } finally {
      setSaving(false)
    }
  }

  // Salvar Permissões Granulares (RBAC)
  async function handleSavePermissions() {
    setSaving(true)
    setMessage(null)

    try {
      await api.put('/users/permissions', {
        role: selectedRoleForPermissions,
        permissions: rolePermissions
      })
      setMessage({ type: 'success', text: `Permissões de acesso para ${selectedRoleForPermissions === 'DENTIST' ? 'Dentistas' : 'Secretárias'} atualizadas!` })
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Erro ao atualizar permissões.' })
    } finally {
      setSaving(false)
    }
  }

  function togglePermission(module: SystemModule, action: 'canRead' | 'canCreate' | 'canUpdate' | 'canDelete') {
    setRolePermissions(prev => prev.map(p => {
      if (p.module === module) {
        return { ...p, [action]: !p[action] }
      }
      return p
    }))
  }

  // Ações de Usuário
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
        cro: formRole === 'DENTIST' ? formCro : undefined,
      })

      if (formRole !== selectedUser.role) {
        await api.patch(`/users/${selectedUser.id}/role`, { role: formRole })
      }

      setMessage({ type: 'success', text: 'Dados do funcionário atualizados!' })
      setIsEditUserModalOpen(false)
      loadData()
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Erro ao atualizar funcionário.' })
    } finally {
      setSaving(false)
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedUser) return
    setSaving(true)
    setMessage(null)

    try {
      await api.patch(`/users/${selectedUser.id}/status`, { isActive: true }) // keep active
      setMessage({ type: 'success', text: `Solicitação registrada para o usuário ${selectedUser.name}.` })
      setIsResetPasswordModalOpen(false)
      setNewPasswordValue('')
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Erro ao redefinir senha.' })
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteUser(userId: string, userName: string) {
    if (!window.confirm(`Tem certeza que deseja revogar o acesso de ${userName}?`)) return
    try {
      await api.delete(`/users/${userId}`)
      setMessage({ type: 'success', text: 'Usuário removido com sucesso.' })
      loadData()
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Erro ao deletar usuário.' })
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
          <p className={styles.pageSubtitle}>Gerencie equipe, controle de acessos (RBAC), identidade visual e conformidade.</p>
        </div>
      </div>

      {message && (
        <div className={message.type === 'success' ? styles.alertSuccess : styles.alertError}>
          {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* ─── Navegação de Abas ─── */}
      <div className={styles.tabNav}>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'usuarios' ? styles.tabBtnActive : ''}`}
          onClick={() => { setActiveTab('usuarios'); setMessage(null) }}
        >
          <Users size={16} />
          <span>Equipe ({users.length})</span>
        </button>

        <button 
          className={`${styles.tabBtn} ${activeTab === 'permissoes' ? styles.tabBtnActive : ''}`}
          onClick={() => { setActiveTab('permissoes'); setMessage(null) }}
        >
          <Sliders size={16} />
          <span>Liberação de Funções (RBAC)</span>
        </button>

        <button 
          className={`${styles.tabBtn} ${activeTab === 'clinica' ? styles.tabBtnActive : ''}`}
          onClick={() => { setActiveTab('clinica'); setMessage(null) }}
        >
          <Building2 size={16} />
          <span>Identidade Visual & Unidade</span>
        </button>

        <button 
          className={`${styles.tabBtn} ${activeTab === 'seguranca' ? styles.tabBtnActive : ''}`}
          onClick={() => { setActiveTab('seguranca'); setMessage(null) }}
        >
          <ShieldCheck size={16} />
          <span>Segurança & Conformidade</span>
        </button>
      </div>

      {/* ─── ABA 1: EQUIPE & USUÁRIOS ─── */}
      {activeTab === 'usuarios' && (
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h2 className={styles.cardTitle}>Usuários com Acesso ao Sistema</h2>
              <p className={styles.cardSubtitle}>Controle de cargos, redefinição de senhas e desligamentos.</p>
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
                          title="Editar funcionário"
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

      {/* ─── ABA 2: LIBERAÇÃO DE FUNÇÕES / RBAC ─── */}
      {activeTab === 'permissoes' && (
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h2 className={styles.cardTitle}>Matriz de Permissões por Papel</h2>
              <p className={styles.cardSubtitle}>Defina com precisão o que cada nível hierárquico pode visualizar ou alterar.</p>
            </div>
            <div className={styles.roleSelectorPill}>
              <button
                type="button"
                className={`${styles.rolePillBtn} ${selectedRoleForPermissions === 'SECRETARY' ? styles.rolePillBtnActive : ''}`}
                onClick={() => setSelectedRoleForPermissions('SECRETARY')}
              >
                Secretária / Recepção
              </button>
              <button
                type="button"
                className={`${styles.rolePillBtn} ${selectedRoleForPermissions === 'DENTIST' ? styles.rolePillBtnActive : ''}`}
                onClick={() => setSelectedRoleForPermissions('DENTIST')}
              >
                Dentista / Clínico
              </button>
            </div>
          </div>

          <div className={styles.rbacNotice}>
            <Info size={16} />
            <span>O papel <strong>ADMIN</strong> possui permissão irrestrita a todos os módulos e não pode ter seus acessos revogados.</span>
          </div>

          {loadingPermissions ? (
            <div className={styles.loading}>
              <Loader2 size={24} className={styles.spinner} />
              <span>Carregando matriz de permissões...</span>
            </div>
          ) : (
            <div className={styles.permissionsTableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>MÓDULO DO SISTEMA</th>
                    <th style={{ textAlign: 'center' }}>VISUALIZAR</th>
                    <th style={{ textAlign: 'center' }}>CRIAR / LANÇAR</th>
                    <th style={{ textAlign: 'center' }}>EDITAR</th>
                    <th style={{ textAlign: 'center' }}>EXCLUIR</th>
                  </tr>
                </thead>
                <tbody>
                  {rolePermissions.map((perm) => (
                    <tr key={perm.module} className={styles.row}>
                      <td className={styles.boldText}>
                        {MODULE_LABELS[perm.module] || perm.module}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={perm.canRead}
                          onChange={() => togglePermission(perm.module, 'canRead')}
                          className={styles.checkbox}
                        />
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={perm.canCreate}
                          onChange={() => togglePermission(perm.module, 'canCreate')}
                          className={styles.checkbox}
                        />
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={perm.canUpdate}
                          onChange={() => togglePermission(perm.module, 'canUpdate')}
                          className={styles.checkbox}
                        />
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={perm.canDelete}
                          onChange={() => togglePermission(perm.module, 'canDelete')}
                          className={styles.checkbox}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className={styles.rbacFooter}>
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSavePermissions}
                  className={styles.btnSave}
                >
                  {saving ? <Loader2 size={16} className={styles.spinner} /> : <Save size={16} />}
                  <span>Salvar Regras de Acesso</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── ABA 3: DADOS DA CLÍNICA & IDENTIDADE VISUAL (WHITE-LABEL) ─── */}
      {activeTab === 'clinica' && clinic && (
        <div className={styles.card}>
          <form onSubmit={handleSaveClinicAndTheme} className={styles.formContainer}>
            {/* Aviso de Licenciamento Multi-Clínica */}
            <div className={styles.multiClinicAlert}>
              <div className={styles.multiClinicAlertHeader}>
                <Sparkles size={18} className={styles.multiClinicIcon} />
                <strong>Expansão de Filiais & Unidades Adicionais</strong>
              </div>
              <p>
                A criação de novas clínicas filiais vinculadas ao mesmo grupo está bloqueada para auto-atendimento. 
                Para habilitar novas filiais sob a mesma conta, é necessária a contratação de licença adicional ou alinhamento comercial direto com a Omnia Tech.
              </p>
            </div>

            <div className={styles.cardHeaderClean}>
              <h2 className={styles.cardTitle}>Dados Cadastrais da Unidade</h2>
              <p className={styles.cardSubtitle}>Exibidos em receituários, orçamentos, atestados e faturamento.</p>
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
                <label>CNPJ</label>
                <input 
                  type="text" 
                  value={clinic.cnpj || ''}
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
                    value={clinic.phone || ''}
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
                    value={clinic.email || ''}
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
                  value={clinic.address || ''}
                  onChange={(e) => setClinic({ ...clinic, address: e.target.value })}
                  className={styles.inputField} 
                />
              </div>
            </div>

            <hr className={styles.divider} />

            {/* Customização White-Label */}
            <div className={styles.cardHeaderClean}>
              <h2 className={styles.cardTitle}>Identidade Visual & Cores (White-Label)</h2>
              <p className={styles.cardSubtitle}>Personalize a cor de destaque e a fonte da sua clínica. O branding da Omnia permanece protegido.</p>
            </div>

            <div className={styles.themeSelectorSection}>
              <div className={styles.formGroup}>
                <label>Cor de Destaque Primária</label>
                <div className={styles.colorPickerGroup}>
                  <div className={styles.colorPresetsRow}>
                    {COLOR_PRESETS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className={`${styles.presetBtn} ${customization.primaryColor === color ? styles.presetBtnActive : ''}`}
                        style={{ background: color }}
                        onClick={() => setCustomization({ ...customization, primaryColor: color })}
                      />
                    ))}
                  </div>
                  <div className={styles.inputWrapper} style={{ maxWidth: '160px' }}>
                    <Palette size={16} className={styles.inputIcon} />
                    <input 
                      type="text" 
                      value={customization.primaryColor}
                      onChange={(e) => setCustomization({ ...customization, primaryColor: e.target.value })}
                      className={styles.inputField} 
                    />
                  </div>
                </div>
              </div>

              <div className={styles.twoCols} style={{ marginTop: '12px' }}>
                <div className={styles.formGroup}>
                  <label>Tipografia do Sistema</label>
                  <select
                    value={customization.fontFamily}
                    onChange={(e) => setCustomization({ ...customization, fontFamily: e.target.value })}
                    className={styles.inputFieldPlain}
                  >
                    {FONT_PRESETS.map(font => (
                      <option key={font} value={font}>{font}</option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label>URL do Logotipo da Clínica (PNG / SVG)</label>
                  <input
                    type="url"
                    placeholder="https://suaclinica.com.br/logo.png"
                    value={customization.customLogoUrl || ''}
                    onChange={(e) => setCustomization({ ...customization, customLogoUrl: e.target.value })}
                    className={styles.inputFieldPlain}
                  />
                </div>
              </div>
            </div>

            <div className={styles.formFooter}>
              <button type="submit" disabled={saving} className={styles.btnSave}>
                {saving ? <Loader2 size={16} className={styles.spinner} /> : <Save size={16} />}
                <span>Salvar Clínica e Visual</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ─── ABA 4: SEGURANÇA & AUDITORIA ─── */}
      {activeTab === 'seguranca' && (
        <div className={styles.card}>
          <div className={styles.cardHeaderClean} style={{ padding: '20px 24px 0' }}>
            <h2 className={styles.cardTitle}>Políticas de Acesso & Compliance</h2>
            <p className={styles.cardSubtitle}>Controle de rastreabilidade e segurança operacional da clínica.</p>
          </div>

          <div className={styles.securityItem}>
            <div>
              <strong>Rastreabilidade de Prontuário Digital (CFO)</strong>
              <p>Gravação de logs auditáveis em banco a cada evolução clínica e receita gerada.</p>
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
                    <option value="SECRETARY">Secretária / Recepção</option>
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
                    <option value="SECRETARY">Secretária / Recepção</option>
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
                Confirme a redefinição de acesso para <strong>{selectedUser.name}</strong>.
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