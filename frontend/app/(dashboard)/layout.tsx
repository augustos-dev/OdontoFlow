'use client'

import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
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
  CheckCircle2,
  AlertTriangle,
  Info,
  Loader2,
  X,
  Activity,
  Coins,
  ArrowDownLeft,
  Truck,
  Lock,
  Sparkles,
  Menu
} from 'lucide-react'
import styles from './layout.module.css'
import { ModalProvider, useModal } from '@/app/components/ModalContext'
import api from '@/lib/api'
import { usePlanAccess } from '../../src/hooks/usePlanAccess'
import { TenantPlan } from '@/lib/planAccess'

type UserRole = 'ADMIN' | 'DENTIST' | 'SECRETARY'

interface NavItem {
  href: string
  label: string
  icon: any
  roles?: UserRole[]
  minPlan?: TenantPlan
  badgeText?: string
}

interface NavGroup {
  label: string
  roles?: UserRole[]
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'VISÃO GERAL',
    roles: ['ADMIN', 'SECRETARY'],
    items: [
      { href: '/', label: 'Dashboard geral', icon: LayoutDashboard, roles: ['ADMIN', 'SECRETARY'], minPlan: 'BASIC' },
    ],
  },
  {
    label: 'ATENDIMENTO CLÍNICO',
    roles: ['ADMIN', 'DENTIST'],
    items: [
      { href: '/consultorio', label: 'Meu consultório', icon: Activity, roles: ['DENTIST', 'ADMIN'], minPlan: 'BASIC' },
    ],
  },
  {
    label: 'OPERAÇÃO CLÍNICA',
    roles: ['ADMIN', 'DENTIST', 'SECRETARY'],
    items: [
      { href: '/agenda', label: 'Agenda integrada', icon: Calendar, roles: ['ADMIN', 'DENTIST', 'SECRETARY'], minPlan: 'BASIC' },
      { href: '/pacientes', label: 'Pacientes & prontuários', icon: Users, roles: ['ADMIN', 'DENTIST', 'SECRETARY'], minPlan: 'BASIC' },
      { href: '/tratamentos', label: 'Planos & orçamentos', icon: ClipboardList, roles: ['ADMIN', 'DENTIST', 'SECRETARY'], minPlan: 'BASIC' },
      { href: '/procedimentos', label: 'Procedimentos', icon: Stethoscope, roles: ['ADMIN', 'DENTIST'], minPlan: 'BASIC' },
    ],
  },
  {
    label: 'GESTÃO & ESTOQUE',
    roles: ['ADMIN', 'DENTIST', 'SECRETARY'],
    items: [
      { href: '/estoque', label: 'Estoque & insumos', icon: Package, roles: ['ADMIN', 'SECRETARY'], minPlan: 'BASIC' },
      { href: '/financeiro', label: 'Financeiro & DRE', icon: CreditCard, roles: ['ADMIN'], minPlan: 'PREMIUM', badgeText: 'PRO' },
      { href: '/gestao-de-titulos', label: 'Gestão de títulos', icon: ArrowDownLeft, roles: ['ADMIN', 'SECRETARY'], minPlan: 'PREMIUM', badgeText: 'PRO' },
      { href: '/comissoes', label: 'Comissões & repasses', icon: Coins, roles: ['ADMIN', 'DENTIST'], minPlan: 'PREMIUM', badgeText: 'PRO' },
    ],
  },
  {
    label: 'SISTEMA',
    roles: ['ADMIN'],
    items: [
      { href: '/configuracoes', label: 'Configurações & visual', icon: Settings, roles: ['ADMIN'], minPlan: 'BASIC' },
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
  type: 'PATIENT' | 'PROCEDURE' | 'PLAN' | 'SUPPLIER'
  title: string
  subtitle: string
  link: string
}

interface NotificationItem {
  id: string
  title: string
  description: string
  time: string
  type: 'warning' | 'info' | 'success' | 'commission'
  read: boolean
  targetPath?: string
}

function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { openNovoAgendamento } = useModal()
  const { plan: userPlan, hasMinPlan } = usePlanAccess()

  const [user, setUser] = useState<any>(null)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Upgrade Modal State
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [upgradeMessage, setUpgradeMessage] = useState('')

  // White-Label State
  const [clinicVisual, setClinicVisual] = useState<ClinicVisualState>({
    name: 'Clínica OdontoFlow',
    primaryColor: '#0082c9',
    accentColor: '#006fae',
    fontFamily: 'Inter',
    logoUrl: null,
  })

  // Global Search State
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Real-Time Notifications State
  const [isNotifOpen, setIsNotifOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loadingNotifs, setLoadingNotifs] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)

  const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications])

  function getRelativeTime(dateStr: string) {
    try {
      const diffMs = new Date().getTime() - new Date(dateStr).getTime()
      const diffMins = Math.floor(diffMs / (1000 * 60))
      if (diffMins < 1) return 'Agora mesmo'
      if (diffMins < 60) return `Há ${diffMins} min`
      const diffHours = Math.floor(diffMins / 60)
      if (diffHours < 24) return `Há ${diffHours} h`
      return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
    } catch {
      return 'Recente'
    }
  }

  // Consulta Notificações em Tempo Real
  const loadDynamicNotifications = useCallback(async () => {
    try {
      setLoadingNotifs(true)
      const todayStr = new Date().toISOString().slice(0, 10)

      const [stockRes, apptRes, transRes, commRes, payablesRes] = await Promise.allSettled([
        api.get('/products/low-stock').catch(() => api.get('/products?limit=50')),
        api.get(`/appointments?date=${todayStr}&limit=15`),
        api.get('/transactions?type=RECEITA&limit=5'),
        api.get('/commissions?status=PENDING&limit=10'),
        api.get('/transactions?type=DESPESA&limit=50'),
      ])

      const generatedNotifs: NotificationItem[] = []
      const readNotifIds = JSON.parse(localStorage.getItem('odontoflow_read_notifs') || '[]')

      // 1. Estoque Crítico
      if (stockRes.status === 'fulfilled') {
        const rawStock = stockRes.value.data?.data || stockRes.value.data || []
        const lowItems = Array.isArray(rawStock)
          ? rawStock.filter((p: any) => p.quantity <= p.minQuantity).slice(0, 3)
          : []

        lowItems.forEach((p: any) => {
          const id = `stock-${p.id}`
          generatedNotifs.push({
            id,
            title: 'Estoque Crítico',
            description: `${p.name} com apenas ${p.quantity} ${p.unit || 'un'} disponíveis (mín: ${p.minQuantity}).`,
            time: 'Alerta Ativo',
            type: 'warning',
            read: readNotifIds.includes(id),
            targetPath: '/estoque',
          })
        })
      }

      // 2. Consultas do Dia
      if (apptRes.status === 'fulfilled') {
        const rawAppts = apptRes.value.data?.data || apptRes.value.data || []
        const activeAppts = Array.isArray(rawAppts)
          ? rawAppts.filter((a: any) => a.status === 'CONFIRMADO' || a.status === 'EM_ANDAMENTO').slice(0, 2)
          : []

        activeAppts.forEach((a: any) => {
          const id = `appt-${a.id}`
          const timeFormatted = new Date(a.dateTime || a.scheduledAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
          generatedNotifs.push({
            id,
            title: a.status === 'CONFIRMADO' ? 'Consulta Confirmada' : 'Em Atendimento',
            description: `${a.patient?.name || 'Paciente'} às ${timeFormatted} na ${a.room ? a.room.replace('_', ' ') : 'SALA 1'}.`,
            time: getRelativeTime(a.dateTime || a.scheduledAt),
            type: 'info',
            read: readNotifIds.includes(id),
            targetPath: user?.role === 'DENTIST' ? '/consultorio' : '/agenda',
          })
        })
      }

      // 3. Faturamento
      if (transRes.status === 'fulfilled' && user?.role === 'ADMIN' && hasMinPlan('PREMIUM')) {
        const rawTrans = transRes.value.data?.data || transRes.value.data || []
        const recentTrans = Array.isArray(rawTrans) ? rawTrans.slice(0, 2) : []

        recentTrans.forEach((t: any) => {
          const id = `trans-${t.id}`
          const valFormatted = Number(t.amount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
          generatedNotifs.push({
            id,
            title: 'Faturamento Recebido',
            description: `${valFormatted} registrado via ${t.paymentMethod || 'PIX'}.`,
            time: getRelativeTime(t.createdAt || t.paidAt || new Date().toISOString()),
            type: 'success',
            read: readNotifIds.includes(id),
            targetPath: '/financeiro',
          })
        })
      }

      // 4. Contas a Pagar / Títulos
      if (payablesRes.status === 'fulfilled' && hasMinPlan('PREMIUM')) {
        const rawDespesas = payablesRes.value.data?.data || payablesRes.value.data || []
        const overdueDespesas = Array.isArray(rawDespesas)
          ? rawDespesas.filter((d: any) => !d.reconciled && new Date(d.date) < new Date(todayStr))
          : []

        if (overdueDespesas.length > 0) {
          const totalOverdue = overdueDespesas.reduce((acc: number, cur: any) => acc + (Number(cur.amount) || 0), 0)
          const valFormatted = totalOverdue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
          const id = `payable-overdue-${todayStr}`

          generatedNotifs.push({
            id,
            title: 'Contas a Pagar Vencidas',
            description: `${overdueDespesas.length} conta(s) em atraso totalizando ${valFormatted}.`,
            time: 'Atrasado',
            type: 'warning',
            read: readNotifIds.includes(id),
            targetPath: '/gestao-de-titulos',
          })
        }
      }

      setNotifications(generatedNotifs)
    } catch (err) {
      console.error('Erro ao buscar notificações:', err)
    } finally {
      setLoadingNotifs(false)
    }
  }, [user?.role, hasMinPlan])

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

  const fetchClinicCustomization = useCallback(async () => {
    try {
      const res = await api.get('/clinics')
      const clinicList = Array.isArray(res.data) ? res.data : res.data?.data || []
      const current = clinicList[0]

      if (!current) return

      let visual: ClinicVisualState = {
        name: current.name || 'Clínica OdontoFlow',
        primaryColor: '#0082c9',
        accentColor: '#006fae',
        fontFamily: 'Inter',
        logoUrl: current.logoUrl || null,
      }

      if (hasMinPlan('PREMIUM')) {
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
      }

      setClinicVisual(visual)
      applyThemeVariables(visual)
    } catch (err) {
      console.error('Falha ao sincronizar identidade visual:', err)
    }
  }, [applyThemeVariables, hasMinPlan])

  useEffect(() => {
    const token = localStorage.getItem('odontoflow_token') || localStorage.getItem('@odontoflow:token')
    const stored = localStorage.getItem('odontoflow_user') || localStorage.getItem('@odontoflow:user')

    if (!token) {
      router.push('/login')
      return
    }

    let parsedUser: any = null
    if (stored) {
      try {
        parsedUser = JSON.parse(stored)
        setUser(parsedUser)
      } catch (e) {
        console.error('Erro ao ler dados da sessão:', e)
      }
    }

    // RBAC & Route Guard
    if (parsedUser) {
      const currentRole: UserRole = parsedUser.role || 'SECRETARY'

      if (currentRole === 'DENTIST') {
        if (pathname === '/financeiro' || pathname === '/configuracoes' || pathname === '/gestao-de-titulos') {
          router.replace('/consultorio')
          return
        }
      } else if (currentRole === 'SECRETARY') {
        if (pathname === '/financeiro' || pathname === '/configuracoes' || pathname === '/consultorio' || pathname === '/comissoes') {
          router.replace('/agenda')
          return
        }
      }

      const isTryingRestrictedPlanRoute = 
        pathname === '/financeiro' || 
        pathname === '/gestao-de-titulos' || 
        pathname === '/comissoes'

      if (isTryingRestrictedPlanRoute && !hasMinPlan('PREMIUM')) {
        router.replace('/agenda')
        return
      }
    }

    const savedCollapsed = localStorage.getItem('odontoflow_sidebar_collapsed')
    if (savedCollapsed === 'true') setIsCollapsed(true)

    fetchClinicCustomization()
    loadDynamicNotifications()

    const notifInterval = setInterval(loadDynamicNotifications, 120000)

    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false)
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false)
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        searchInputRef.current?.focus()
        setIsSearchOpen(true)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      clearInterval(notifInterval)
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [router, pathname, fetchClinicCustomization, loadDynamicNotifications, hasMinPlan])

  // Pesquisa Global
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

        const [patientsRes, proceduresRes, plansRes] = await Promise.all([
          api.get(`/patients?name=${encodeURIComponent(searchQuery)}&limit=3`).catch(() => ({ data: [] })),
          api.get(`/procedures?name=${encodeURIComponent(searchQuery)}&limit=3`).catch(() => ({ data: [] })),
          api.get(`/treatment-plans?limit=10`).catch(() => ({ data: [] })),
        ])

        const patientItems: SearchResultItem[] = (patientsRes.data?.data || patientsRes.data || []).map((p: any) => ({
          id: p.id,
          type: 'PATIENT' as const,
          title: p.name,
          subtitle: `Paciente • ${p.phone || 'Sem telefone'}`,
          link: `/pacientes`,
        }))

        const procedureItems: SearchResultItem[] = (proceduresRes.data?.data || proceduresRes.data || []).map((pr: any) => ({
          id: pr.id,
          type: 'PROCEDURE' as const,
          title: pr.name,
          subtitle: `Procedimento • R$ ${Number(pr.basePrice || 0).toFixed(2)}`,
          link: `/procedimentos`,
        }))

        setSearchResults([...patientItems, ...procedureItems])
      } catch (err) {
        console.error('Erro na pesquisa:', err)
      } finally {
        setIsSearching(false)
      }
    }, 280)

    return () => clearTimeout(timer)
  }, [searchQuery])

  function handleSelectSearchResult(link: string) {
    setIsSearchOpen(false)
    setSearchQuery('')
    router.push(link)
  }

  function markAllNotificationsAsRead() {
    const allIds = notifications.map(n => n.id)
    localStorage.setItem('odontoflow_read_notifs', JSON.stringify(allIds))
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  function handleNotificationClick(notif: NotificationItem) {
    const readNotifIds = JSON.parse(localStorage.getItem('odontoflow_read_notifs') || '[]')
    if (!readNotifIds.includes(notif.id)) {
      readNotifIds.push(notif.id)
      localStorage.setItem('odontoflow_read_notifs', JSON.stringify(readNotifIds))
    }
    setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n))
    setIsNotifOpen(false)

    if (notif.targetPath) {
      router.push(notif.targetPath)
    }
  }

  function toggleSidebar() {
    const nextState = !isCollapsed
    setIsCollapsed(nextState)
    localStorage.setItem('odontoflow_sidebar_collapsed', String(nextState))
  }

  function handlePlanRestrictedClick(itemLabel: string, minPlan: TenantPlan) {
    const planName = minPlan === 'ENTERPRISE' ? 'Plano Enterprise' : 'Plano Clínico Pro'
    setUpgradeMessage(`O módulo "${itemLabel}" é exclusivo para assinantes do ${planName}. Faça o upgrade para desbloquear conciliações e relatórios analíticos.`)
    setShowUpgradeModal(true)
  }

  function handleLogout() {
    localStorage.removeItem('odontoflow_token')
    localStorage.removeItem('odontoflow_user')
    localStorage.removeItem('@odontoflow:token')
    localStorage.removeItem('@odontoflow:user')
    router.push('/login')
  }

  const userRole: UserRole = user?.role || 'SECRETARY'
  const userDisplayName = user?.name || 'Dra. Ana Costa'

  return (
    <div 
      className={`${styles.shell} ${isCollapsed ? styles.collapsedShell : ''}`}
      style={{
        '--primary-color': clinicVisual.primaryColor,
        '--primary-accent': clinicVisual.accentColor,
        '--app-font': clinicVisual.fontFamily,
      } as React.CSSProperties}
    >
      {/* ─── MENU LATERAL / SIDEBAR ─── */}
      <aside className={`${styles.sidebar} ${isCollapsed ? styles.sidebarCollapsed : ''} ${isMobileMenuOpen ? styles.mobileSidebarOpen : ''}`}>
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
              <Image src="/logo.svg" alt="OdontoFlow" width={26} height={26} priority />
            )}
          </div>
          {!isCollapsed && (
            <div className={styles.logoTextWrapper}>
              <span className={styles.logoName}>OdontoFlow</span>
              <span className={styles.logoSub}>{clinicVisual.name.toUpperCase()}</span>
            </div>
          )}
          {isMobileMenuOpen && (
            <button 
              type="button" 
              onClick={() => setIsMobileMenuOpen(false)}
              className={styles.closeMobileMenuBtn}
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Links Filtrados com RBAC e Trava de Planos */}
        <nav className={styles.nav}>
          {NAV_GROUPS.map((group) => {
            if (group.roles && !group.roles.includes(userRole)) return null

            const visibleItems = group.items.filter(
              (item) => !item.roles || item.roles.includes(userRole)
            )

            if (visibleItems.length === 0) return null

            return (
              <div key={group.label} className={styles.navGroup}>
                {!isCollapsed && <p className={styles.navGroupLabel}>{group.label}</p>}
                {isCollapsed && <div className={styles.navGroupDivider} />}

                {visibleItems.map((item) => {
                  const IconComponent = item.icon
                  const isActive = pathname === item.href
                  const isPlanLocked = item.minPlan ? !hasMinPlan(item.minPlan) : false

                  if (isPlanLocked) {
                    return (
                      <button
                        key={item.href}
                        type="button"
                        onClick={() => handlePlanRestrictedClick(item.label, item.minPlan!)}
                        className={`${styles.navItem} ${styles.navItemLocked}`}
                        title={isCollapsed ? `${item.label} (${item.badgeText || 'Bloqueado'})` : undefined}
                      >
                        <IconComponent size={18} className={styles.navIcon} />
                        {!isCollapsed && (
                          <div className={styles.navItemLockedContent}>
                            <span>{item.label}</span>
                            <span className={styles.planLockBadge}>
                              <Lock size={10} style={{ marginRight: 3 }} />
                              {item.badgeText || 'PRO'}
                            </span>
                          </div>
                        )}
                      </button>
                    )
                  }

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
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

        {/* Botão de Colapsar (Desktop / Tablet) */}
        <button 
          type="button" 
          onClick={toggleSidebar} 
          className={styles.btnToggleSidebar}
          title={isCollapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          {!isCollapsed && <span>Recolher menu</span>}
        </button>

        {/* Rodapé da Sidebar (Card de Perfil do Figma) */}
        <div className={styles.sidebarFooterCard}>
          <div className={styles.footerProfileLeft}>
            <div className={styles.userAvatarInitials}>
              {userDisplayName.slice(0, 2).toUpperCase()}
            </div>
            {!isCollapsed && (
              <div className={styles.footerProfileInfo}>
                <strong className={styles.footerUserName}>{userDisplayName}</strong>
                <span className={styles.footerUserRole}>
                  {userRole} • {userPlan}
                </span>
                <span className={styles.footerProtectedText}>Dados protegidos • LGPD</span>
              </div>
            )}
          </div>
          <button 
            type="button" 
            onClick={handleLogout} 
            className={styles.btnLogoutIcon}
            title="Sair do sistema"
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* ─── CONTEÚDO PRINCIPAL & HEADER ─── */}
      <div className={styles.main}>
        {/* HEADER SUPERIOR DO FIGMA */}
        <header className={styles.header}>
          <div className={styles.headerLeftArea}>
            <button 
              type="button" 
              onClick={() => setIsMobileMenuOpen(true)}
              className={styles.btnOpenMobileDrawer}
              aria-label="Abrir menu"
            >
              <Menu size={20} />
            </button>
            <div className={styles.headerClinicContext}>
              <span>{clinicVisual.name}</span>
              <span className={styles.contextSeparator}>/</span>
              <span className={styles.contextActiveTag}>Ambiente seguro</span>
            </div>
          </div>

          <div className={styles.headerRightArea}>
            {/* Campo de Pesquisa com Atalho ⌘ K */}
            <div className={styles.searchWrapper} ref={searchRef}>
              <div className={styles.headerSearchBox}>
                {isSearching ? (
                  <Loader2 size={15} className={styles.searchSpinner} />
                ) : (
                  <Search size={15} className={styles.searchIcon} />
                )}
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => { if (searchQuery.trim()) setIsSearchOpen(true) }}
                  placeholder="Buscar pacientes, agenda..."
                  className={styles.searchInput}
                />
                <kbd className={styles.searchKbd}>⌘ K</kbd>
                {searchQuery && (
                  <button 
                    type="button" 
                    onClick={() => { setSearchQuery(''); setIsSearchOpen(false) }}
                    className={styles.btnClearSearch}
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Resultados da Pesquisa */}
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
                            {item.type === 'PATIENT' ? <User size={14} /> : <Stethoscope size={14} />}
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

            {/* Status Sincronizado */}
            <div className={styles.syncStatusHeader}>
              <span className={styles.greenPulseDot} />
              <span>Sincronizado</span>
            </div>

            {/* Notificações em Tempo Real */}
            <div className={styles.notifWrapper} ref={notifRef}>
              <button 
                type="button"
                className={`${styles.notifBtn} ${isNotifOpen ? styles.notifBtnActive : ''}`} 
                onClick={() => {
                  setIsNotifOpen(!isNotifOpen)
                  if (!isNotifOpen) loadDynamicNotifications()
                }}
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
                    {loadingNotifs && notifications.length === 0 ? (
                      <div className={styles.emptyNotif}>
                        <Loader2 size={16} className={styles.searchSpinner} />
                        <span>Carregando notificações...</span>
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className={styles.emptyNotif}>
                        <span>Nenhuma notificação recente de momento.</span>
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div 
                          key={n.id} 
                          onClick={() => handleNotificationClick(n)}
                          className={`${styles.notifItem} ${!n.read ? styles.notifItemUnread : ''}`}
                        >
                          <div className={`${styles.notifIcon} ${styles[`notif_${n.type}`]}`}>
                            {n.type === 'warning' && <AlertTriangle size={14} />}
                            {n.type === 'info' && <Info size={14} />}
                            {n.type === 'success' && <CheckCircle2 size={14} />}
                            {n.type === 'commission' && <Coins size={14} />}
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

            {/* Badges de Cargo e Plano */}
            <div className={styles.userRoleBadgePill}>
              <span>{userRole} • {userPlan}</span>
            </div>

            {/* Botão Novo Agendamento */}
            <button 
              type="button" 
              onClick={openNovoAgendamento} 
              className={styles.btnPrimaryAction}
            >
              <Plus size={16} />
              <span>Novo Agendamento</span>
            </button>
          </div>
        </header>

        {/* Conteúdo Dinâmico das Telas */}
        <main className={styles.content}>{children}</main>
      </div>

      {/* ─── MODAL DE UPGRADE DE PLANO ─── */}
      {showUpgradeModal && (
        <div className={styles.upgradeModalOverlay}>
          <div className={styles.upgradeModalCard}>
            <div className={styles.upgradeModalIcon}>
              <Sparkles size={28} />
            </div>
            <h3 className={styles.upgradeModalTitle}>Recurso Exclusivo</h3>
            <p className={styles.upgradeModalText}>{upgradeMessage}</p>

            <div className={styles.upgradeModalActions}>
              <button 
                type="button" 
                onClick={() => setShowUpgradeModal(false)}
                className={styles.upgradeModalBtnSecondary}
              >
                Voltar
              </button>
              <button 
                type="button" 
                onClick={() => {
                  setShowUpgradeModal(false)
                  router.push('/configuracoes?tab=assinatura')
                }}
                className={styles.upgradeModalBtnPrimary}
              >
                Ver Planos & Upgrade
              </button>
            </div>
          </div>
        </div>
      )}
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