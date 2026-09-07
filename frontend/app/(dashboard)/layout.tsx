'use client'

import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  Package, 
  CreditCard, 
  Settings, 
  LogOut, 
  Search, 
  Bell, 
  Plus, 
  Stethoscope,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  User,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Info,
  Loader2,
  X
} from 'lucide-react'
import styles from './layout.module.css'
import { ModalProvider, useModal } from '@/app/components/ModalContext'
import Logo from '../../public/logo.svg'
import Image from 'next/image'
import api from '@/lib/api'

interface NavGroup {
  label: string
  items: {
    href: string
    label: string
    icon: any
    adminOnly?: boolean
  }[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'VISÃO GERAL',
    items: [
      { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'OPERAÇÃO CLÍNICA',
    items: [
      { href: '/agenda', label: 'Agenda', icon: Calendar },
      { href: '/pacientes', label: 'Pacientes', icon: Users },
      { href: '/tratamentos', label: 'Planos & Tratamentos', icon: ClipboardList },
      { href: '/procedimentos', label: 'Procedimentos', icon: Stethoscope },
    ],
  },
  {
    label: 'GESTÃO & ESTOQUE',
    items: [
      { href: '/estoque', label: 'Estoque & Insumos', icon: Package },
      { href: '/financeiro', label: 'Financeiro & Caixa', icon: CreditCard, adminOnly: true },
    ],
  },
  {
    label: 'SISTEMA',
    items: [
      { href: '/configuracoes', label: 'Configurações', icon: Settings, adminOnly: true },
    ],
  },
]

interface ClinicVisualState {
  name: string
  primaryColor: string
  accentColor: string
  fontFamily: string
  logoUrl?: string | null
}

interface SearchResultItem {
  id: string
  type: 'PATIENT' | 'PROCEDURE' | 'APPOINTMENT'
  title: string
  subtitle: string
  link: string
}

interface NotificationItem {
  id: string
  title: string
  description: string
  time: string
  type: 'warning' | 'info' | 'success'
  read: boolean
}

function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<any>(null)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const { openNovoAgendamento } = useModal()

  // Estado da Clínica (White-Label)
  const [clinicVisual, setClinicVisual] = useState<ClinicVisualState>({
    name: 'Clínica OdontoFlow',
    primaryColor: '#06b6d4',
    accentColor: '#0891b2',
    fontFamily: 'Inter',
    logoUrl: null,
  })

  // ─── Busca Global ───
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  // ─── Notificações ───
  const [isNotifOpen, setIsNotifOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: '1',
      title: 'Estoque Crítico',
      description: 'Anestésico Lidocaína com apenas 2 frascos disponíveis.',
      time: 'Há 15 min',
      type: 'warning',
      read: false,
    },
    {
      id: '2',
      title: 'Consulta Próxima',
      description: 'Francisca Edileuza confirmada para as 17:00.',
      time: 'Há 45 min',
      type: 'info',
      read: false,
    },
    {
      id: '3',
      title: 'Pagamento Recebido',
      description: 'PIX de R$ 122,00 registrado com sucesso.',
      time: 'Há 2 horas',
      type: 'success',
      read: true,
    }
  ])
  const notifRef = useRef<HTMLDivElement>(null)

  const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications])

  // Aplica variáveis CSS globais
  const applyThemeVariables = useCallback((theme: ClinicVisualState) => {
    if (typeof document === 'undefined') return
    const root = document.documentElement
    if (theme.primaryColor) root.style.setProperty('--primary-color', theme.primaryColor)
    if (theme.accentColor) root.style.setProperty('--primary-accent', theme.accentColor)
    if (theme.fontFamily) {
      root.style.setProperty('--app-font', theme.fontFamily)
      document.body.style.fontFamily = `"${theme.fontFamily}", sans-serif`
    }
  }, [])

  // Sincroniza dados da clínica
  const fetchClinicCustomization = useCallback(async () => {
    try {
      const res = await api.get('/clinics')
      const clinicList = Array.isArray(res.data) ? res.data : res.data?.data || []
      const current = clinicList[0]

      if (!current) return

      let visual: ClinicVisualState = {
        name: current.name || 'Minha Clínica',
        primaryColor: '#06b6d4',
        accentColor: '#0891b2',
        fontFamily: 'Inter',
        logoUrl: current.logoUrl || null,
      }

      const customRes = await api.get(`/clinics/${current.id}/customization`).catch(() => null)
      if (customRes?.data) {
        visual = {
          name: customRes.data.clinicName || current.name,
          primaryColor: customRes.data.primaryColor || visual.primaryColor,
          accentColor: customRes.data.accentColor || visual.accentColor,
          fontFamily: customRes.data.fontFamily || visual.fontFamily,
          logoUrl: customRes.data.customLogoUrl || visual.logoUrl,
        }
      }

      setClinicVisual(visual)
      applyThemeVariables(visual)
    } catch (err) {
      console.error('Falha ao sincronizar tema da clínica:', err)
    }
  }, [applyThemeVariables])

  useEffect(() => {
    const token = localStorage.getItem('odontoflow_token') || localStorage.getItem('@odontoflow:token')
    const stored = localStorage.getItem('odontoflow_user') || localStorage.getItem('@odontoflow:user')

    if (!token) {
      router.push('/login')
      return
    }

    if (stored) {
      try {
        setUser(JSON.parse(stored))
      } catch (e) {
        console.error('Erro ao ler usuário:', e)
      }
    }

    const savedCollapsed = localStorage.getItem('odontoflow_sidebar_collapsed')
    if (savedCollapsed === 'true') setIsCollapsed(true)

    fetchClinicCustomization()

    const handleThemeUpdate = () => fetchClinicCustomization()
    window.addEventListener('clinic_customization_updated', handleThemeUpdate)

    // Listener para fechar dropdowns ao clicar fora
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false)
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      window.removeEventListener('clinic_customization_updated', handleThemeUpdate)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [router, fetchClinicCustomization])

  // Busca global com Debounce de 300ms
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      setIsSearchOpen(false)
      return
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearching(true)
        setIsSearchOpen(true)

        // Busca paralela em pacientes e procedimentos
        const [patientsRes, proceduresRes] = await Promise.all([
          api.get(`/patients?name=${encodeURIComponent(searchQuery)}&limit=4`).catch(() => ({ data: [] })),
          api.get(`/procedures?name=${encodeURIComponent(searchQuery)}&limit=4`).catch(() => ({ data: [] })),
        ])

        const patientItems = (patientsRes.data?.data || patientsRes.data || []).map((p: any) => ({
          id: p.id,
          type: 'PATIENT' as const,
          title: p.name,
          subtitle: `CPF: ${p.cpf || 'Não informado'} • Tel: ${p.phone || 'S/ telefone'}`,
          link: `/pacientes/${p.id}`,
        }))

        const procedureItems = (proceduresRes.data?.data || proceduresRes.data || []).map((pr: any) => ({
          id: pr.id,
          type: 'PROCEDURE' as const,
          title: pr.name,
          subtitle: `Categoria: ${pr.category || 'Geral'} • R$ ${Number(pr.basePrice || 0).toFixed(2)}`,
          link: `/procedimentos`,
        }))

        setSearchResults([...patientItems, ...procedureItems])
      } catch (err) {
        console.error('Erro na pesquisa global:', err)
      } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  function handleSelectSearchResult(link: string) {
    setIsSearchOpen(false)
    setSearchQuery('')
    router.push(link)
  }

  function markAllNotificationsAsRead() {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  function toggleSidebar() {
    const nextState = !isCollapsed
    setIsCollapsed(nextState)
    localStorage.setItem('odontoflow_sidebar_collapsed', String(nextState))
  }

  const today = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
  const todayFormatted = today.charAt(0).toUpperCase() + today.slice(1)

  const allNavItems = useMemo(() => NAV_GROUPS.flatMap((g) => g.items), [])
  const pageTitle = allNavItems.find((n) => n.href === pathname)?.label ?? 'OdontoFlow'

  const initials = user?.name
    ? user.name.split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase()
    : 'U'

  function handleLogout() {
    localStorage.removeItem('odontoflow_token')
    localStorage.removeItem('odontoflow_user')
    localStorage.removeItem('@odontoflow:token')
    localStorage.removeItem('@odontoflow:user')
    router.push('/login')
  }

  return (
    <div className={`${styles.shell} ${isCollapsed ? styles.collapsedShell : ''}`}>
      {/* ─── Sidebar ─── */}
      <aside className={`${styles.sidebar} ${isCollapsed ? styles.sidebarCollapsed : ''}`}>
        <div className={styles.sidebarLogo}>
          <div className={styles.logoIcon}>
            {clinicVisual.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img 
                src={clinicVisual.logoUrl} 
                alt="Logo da Clínica" 
                className={styles.customClinicLogo}
              />
            ) : (
              <Image src={Logo} alt="Logo" width={24} height={24} />
            )}
          </div>
          {!isCollapsed && (
            <div className={styles.logoTextWrapper}>
              <div className={styles.logoName}>OdontoFlow</div>
              <div className={styles.logoSub}>GESTÃO CLÍNICA</div>
            </div>
          )}
        </div>

        <nav className={styles.nav}>
          {NAV_GROUPS.map((group) => {
            const visibleItems = group.items.filter(
              (item) => !item.adminOnly || user?.role === 'ADMIN'
            )

            if (visibleItems.length === 0) return null

            return (
              <div key={group.label} className={styles.navGroup}>
                {!isCollapsed && <p className={styles.navGroupLabel}>{group.label}</p>}
                {isCollapsed && <div className={styles.navGroupDivider} />}

                {visibleItems.map((item) => {
                  const IconComponent = item.icon
                  const isActive = pathname === item.href

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
                      title={isCollapsed ? item.label : undefined}
                    >
                      <IconComponent size={18} className={styles.navIcon} />
                      {!isCollapsed && <span>{item.label}</span>}
                    </Link>
                  )
                })}
              </div>
            )
          })}
        </nav>

        <button 
          type="button" 
          onClick={toggleSidebar} 
          className={styles.btnToggleSidebar}
          title={isCollapsed ? "Expandir menu" : "Recolher menu"}
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          {!isCollapsed && <span>Recolher menu</span>}
        </button>

        <div className={styles.sidebarFooter}>
          <div className={styles.avatar}>{initials}</div>
          {!isCollapsed && (
            <div className={styles.userInfo}>
              <div className={styles.userName}>{user?.name ?? 'Usuário'}</div>
              <div className={styles.userRole}>
                {user?.role === 'ADMIN' ? 'Administrador' : user?.role === 'DENTIST' ? 'Dentista' : 'Secretária'}
              </div>
            </div>
          )}
          <button 
            className={styles.logoutBtn} 
            onClick={handleLogout} 
            title="Sair do sistema" 
            aria-label="Sair"
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* ─── Conteúdo Principal ─── */}
      <div className={styles.main}>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.clinicName}>
              <span>{clinicVisual.name}</span>
              <span className={styles.mvpBadge}>MVP</span>
            </div>
            <h1 className={styles.pageTitle}>{pageTitle}</h1>
          </div>
          
          <div className={styles.headerRight}>
            <span className={styles.headerDate}>{todayFormatted}</span>
            
            {/* ─── Campo de Busca Global Funcional ─── */}
            <div className={styles.searchWrapper} ref={searchRef}>
              <div className={styles.headerSearch}>
                {isSearching ? (
                  <Loader2 size={16} className={styles.searchSpinner} />
                ) : (
                  <Search size={16} className={styles.searchIcon} />
                )}
                <input 
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => { if (searchQuery.trim()) setIsSearchOpen(true) }}
                  placeholder="Buscar paciente, procedimento..." 
                  className={styles.searchInput} 
                />
                {searchQuery && (
                  <button 
                    type="button" 
                    onClick={() => { setSearchQuery(''); setIsSearchOpen(false) }}
                    className={styles.btnClearSearch}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Dropdown de Resultados da Busca */}
              {isSearchOpen && (
                <div className={styles.searchDropdown}>
                  {searchResults.length === 0 ? (
                    <div className={styles.emptySearch}>
                      <span>{isSearching ? 'Buscando registros...' : 'Nenhum resultado encontrado.'}</span>
                    </div>
                  ) : (
                    <div className={styles.searchList}>
                      {searchResults.map((item) => (
                        <div 
                          key={`${item.type}-${item.id}`}
                          onClick={() => handleSelectSearchResult(item.link)}
                          className={styles.searchItem}
                        >
                          <div className={item.type === 'PATIENT' ? styles.searchItemIconPatient : styles.searchItemIconProc}>
                            {item.type === 'PATIENT' ? <User size={15} /> : <Stethoscope size={15} />}
                          </div>
                          <div className={styles.searchItemInfo}>
                            <span className={styles.searchItemTitle}>{item.title}</span>
                            <span className={styles.searchItemSubtitle}>{item.subtitle}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* ─── Central de Notificações Funcional ─── */}
            <div className={styles.notifWrapper} ref={notifRef}>
              <button 
                className={`${styles.notifBtn} ${isNotifOpen ? styles.notifBtnActive : ''}`} 
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                aria-label="Notificações"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className={styles.notifBadge}>{unreadCount}</span>
                )}
              </button>

              {isNotifOpen && (
                <div className={styles.notifDropdown}>
                  <div className={styles.notifHeader}>
                    <div className={styles.notifTitleGroup}>
                      <span className={styles.notifTitle}>Notificações</span>
                      {unreadCount > 0 && (
                        <span className={styles.unreadCounter}>{unreadCount} novas</span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button 
                        type="button"
                        onClick={markAllNotificationsAsRead}
                        className={styles.btnMarkRead}
                      >
                        Marcar lidas
                      </button>
                    )}
                  </div>

                  <div className={styles.notifList}>
                    {notifications.length === 0 ? (
                      <div className={styles.emptyNotif}>
                        <span>Nenhuma notificação recente.</span>
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div 
                          key={n.id} 
                          className={`${styles.notifItem} ${!n.read ? styles.notifItemUnread : ''}`}
                        >
                          <div className={`${styles.notifIcon} ${styles[`notif_${n.type}`]}`}>
                            {n.type === 'warning' && <AlertTriangle size={14} />}
                            {n.type === 'info' && <Info size={14} />}
                            {n.type === 'success' && <CheckCircle2 size={14} />}
                          </div>
                          <div className={styles.notifContent}>
                            <div className={styles.notifTop}>
                              <strong className={styles.notifItemTitle}>{n.title}</strong>
                              <span className={styles.notifTime}>{n.time}</span>
                            </div>
                            <p className={styles.notifDesc}>{n.description}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            
            {/* Botão de Agendamento */}
            <button className={styles.newAppointmentBtn} onClick={openNovoAgendamento}>
              <Plus size={16} />
              <span>Novo Agendamento</span>
            </button>
          </div>
        </header>

        <main className={styles.content}>{children}</main>
      </div>
    </div>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ModalProvider>
      <DashboardShell>{children}</DashboardShell>
    </ModalProvider>
  )
}