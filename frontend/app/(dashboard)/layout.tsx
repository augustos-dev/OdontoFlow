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
  X,
  Menu, // 👈 Adicione aqui
  FileText,
  Activity,
  Coins,
  ArrowDownLeft,
  Truck,
  Lock,
  Sparkles
} from 'lucide-react'
import styles from './layout.module.css'
import { ModalProvider, useModal } from '@/app/components/ModalContext'
import ToothLogo from '../../public/Toothlogo.svg'
import Image from 'next/image'
import api from '@/lib/api'
import { usePlanAccess } from '../../src/hooks/usePlanAccess'
import { TenantPlan } from '@/lib/planAccess'

type UserRole = 'ADMIN' | 'DENTIST' | 'SECRETARY'

interface NavItem {
  href: string
  label: string
  icon: any
  roles?: UserRole[]
  minPlan?: TenantPlan       // 🔒 Nível mínimo de assinatura exigido
  badgeText?: string         // 🏷️ Texto descritivo da tag (ex: 'PRO', 'ENTERPRISE')
}

interface NavGroup {
  label: string
  roles?: UserRole[]
  items: NavItem[]
}

// 🛡️ Matriz de Navegação com RBAC por Perfis e Proteção de Planos
const NAV_GROUPS: NavGroup[] = [
  {
    label: 'VISÃO GERAL',
    roles: ['ADMIN', 'SECRETARY'],
    items: [
      { href: '/', label: 'Dashboard Geral', icon: LayoutDashboard, roles: ['ADMIN', 'SECRETARY'], minPlan: 'BASIC' },
    ],
  },
  {
    label: 'ATENDIMENTO CLÍNICO',
    roles: ['ADMIN', 'DENTIST'],
    items: [
      { href: '/consultorio', label: 'Meu Consultório', icon: Activity, roles: ['DENTIST', 'ADMIN'], minPlan: 'BASIC' },
    ],
  },
  {
    label: 'OPERAÇÃO CLÍNICA',
    roles: ['ADMIN', 'DENTIST', 'SECRETARY'],
    items: [
      { href: '/agenda', label: 'Agenda Integrada', icon: Calendar, roles: ['ADMIN', 'DENTIST', 'SECRETARY'], minPlan: 'BASIC' },
      { href: '/pacientes', label: 'Pacientes & Prontuários', icon: Users, roles: ['ADMIN', 'DENTIST', 'SECRETARY'], minPlan: 'BASIC' },
      { href: '/tratamentos', label: 'Planos & Orçamentos', icon: ClipboardList, roles: ['ADMIN', 'DENTIST', 'SECRETARY'], minPlan: 'BASIC' },
      { href: '/procedimentos', label: 'Tabela de Procedimentos', icon: Stethoscope, roles: ['ADMIN', 'DENTIST'], minPlan: 'BASIC' },
    ],
  },
  {
    label: 'GESTÃO & ESTOQUE',
    roles: ['ADMIN', 'DENTIST', 'SECRETARY'],
    items: [
      { href: '/estoque', label: 'Estoque & Insumos', icon: Package, roles: ['ADMIN', 'SECRETARY'], minPlan: 'BASIC' },
      // 🔒 Módulos Financeiros Avançados: Exigem plano PREMIUM ou superior
      { href: '/financeiro', label: 'Financeiro & DRE', icon: CreditCard, roles: ['ADMIN'], minPlan: 'PREMIUM', badgeText: 'PRO' },
      { href: '/gestao-de-titulos', label: 'Gestão de Títulos', icon: ArrowDownLeft, roles: ['ADMIN', 'SECRETARY'], minPlan: 'PREMIUM', badgeText: 'PRO' },
      { href: '/comissoes', label: 'Comissões & Repasses', icon: Coins, roles: ['ADMIN', 'DENTIST'], minPlan: 'PREMIUM', badgeText: 'PRO' },
    ],
  },
  {
    label: 'SISTEMA',
    roles: ['ADMIN'],
    items: [
      { href: '/configuracoes', label: 'Configurações & Visual', icon: Settings, roles: ['ADMIN'], minPlan: 'BASIC' },
    ],
  },
]

// Mapeamento de Títulos no Cabeçalho (Header)
const ROUTE_PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard Geral',
  '/consultorio': 'Meu Consultório',
  '/agenda': 'Agenda Integrada',
  '/pacientes': 'Pacientes & Prontuários',
  '/tratamentos': 'Planos & Orçamentos',
  '/procedimentos': 'Tabela de Procedimentos',
  '/estoque': 'Estoque & Insumos',
  '/financeiro': 'Financeiro & DRE',
  '/gestao-de-titulos': 'Gestão de Títulos (Pagar & Receber)',
  '/comissoes': 'Comissões & Repasses',
  '/configuracoes': 'Configurações & Visual',
}

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
  const [user, setUser] = useState<any>(null)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const { openNovoAgendamento } = useModal()

  // 🛡️ Hook centralizado de planos
  const { plan: userPlan, hasMinPlan } = usePlanAccess()

  // Estado do Modal de Bloqueio de Plano
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [upgradeMessage, setUpgradeMessage] = useState('')

  // Estado da Clínica (White-Label)
  const [clinicVisual, setClinicVisual] = useState<ClinicVisualState>({
    name: 'Clínica OdontoFlow',
    primaryColor: '#06b6d4',
    accentColor: '#0891b2',
    fontFamily: 'Inter',
    logoUrl: null,
  })

  // Pesquisa Global
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  // Notificações
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

      // 2. Agendamentos do Dia
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

      // 3. Faturamento Recebido (Apenas ADMIN com plano compatível)
      if (transRes.status === 'fulfilled' && user?.role === 'ADMIN' && hasMinPlan('PREMIUM')) {
        const rawTrans = transRes.value.data?.data || transRes.value.data || []
        const recentTrans = Array.isArray(rawTrans) ? rawTrans.slice(0, 2) : []

        recentTrans.forEach((t: any) => {
          const id = `trans-${t.id}`
          const valFormatted = Number(t.amount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
          generatedNotifs.push({
            id,
            title: 'Faturamento Recebido',
            description: `${valFormatted} registrado via ${t.paymentMethod || 'PIX'} (${t.description || 'Consulta'}).`,
            time: getRelativeTime(t.createdAt || t.paidAt || new Date().toISOString()),
            type: 'success',
            read: readNotifIds.includes(id),
            targetPath: '/financeiro',
          })
        })
      }

      // 4. Gestão de Títulos (Contas a Pagar / Boletos Vencidos - Exige Premium)
      if (payablesRes.status === 'fulfilled' && (user?.role === 'ADMIN' || user?.role === 'SECRETARY') && hasMinPlan('PREMIUM')) {
        const rawDespesas = payablesRes.value.data?.data || payablesRes.value.data || []
        const despesas = Array.isArray(rawDespesas) ? rawDespesas : []

        const pendingDespesas = despesas.filter((d: any) => !d.reconciled && (!d.paidAt || new Date(d.date) >= new Date(todayStr)))
        const overdueDespesas = despesas.filter((d: any) => !d.reconciled && new Date(d.date) < new Date(todayStr))

        if (overdueDespesas.length > 0) {
          const totalOverdue = overdueDespesas.reduce((acc: number, cur: any) => acc + (Number(cur.amount) || 0), 0)
          const valFormatted = totalOverdue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
          const id = `payable-overdue-${todayStr}-${overdueDespesas.length}`

          generatedNotifs.push({
            id,
            title: 'Contas a Pagar Vencidas',
            description: `${overdueDespesas.length} boleto(s) em atraso somando ${valFormatted}.`,
            time: 'Atrasado',
            type: 'warning',
            read: readNotifIds.includes(id),
            targetPath: '/gestao-de-titulos',
          })
        } else if (pendingDespesas.length > 0) {
          const totalPending = pendingDespesas.reduce((acc: number, cur: any) => acc + (Number(cur.amount) || 0), 0)
          const valFormatted = totalPending.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
          const id = `payable-pending-${todayStr}-${pendingDespesas.length}`

          generatedNotifs.push({
            id,
            title: 'Títulos a Pagar no Mês',
            description: `${pendingDespesas.length} conta(s) somando ${valFormatted} aguardando liquidação.`,
            time: 'A Vencer',
            type: 'info',
            read: readNotifIds.includes(id),
            targetPath: '/gestao-de-titulos',
          })
        }
      }

      // 5. Repasses de Comissões Pendentes (Exige Premium)
      if (commRes.status === 'fulfilled' && (user?.role === 'ADMIN' || user?.role === 'DENTIST') && hasMinPlan('PREMIUM')) {
        const rawComms = commRes.value.data?.data || commRes.value.data || []
        const list = Array.isArray(rawComms) ? rawComms : []

        const pendingComms = user?.role === 'DENTIST'
          ? list.filter((c: any) => c.dentistId === user.id)
          : list

        if (pendingComms.length > 0) {
          const totalPending = pendingComms.reduce((acc: number, cur: any) => acc + (Number(cur.commissionAmount) || 0), 0)
          const valFormatted = totalPending.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
          const id = `comm-pending-${todayStr}-${pendingComms.length}`

          generatedNotifs.push({
            id,
            title: user?.role === 'DENTIST' ? 'Comissões a Receber' : 'Repasses a Liquidar',
            description: user?.role === 'DENTIST'
              ? `Possui ${valFormatted} acumulado em ${pendingComms.length} procedimento(s) a receber.`
              : `${pendingComms.length} comissão(ões) pendente(s) totalizando ${valFormatted} prontas para baixa.`,
            time: 'Hoje',
            type: 'commission',
            read: readNotifIds.includes(id),
            targetPath: '/comissoes',
          })
        }
      }

      setNotifications(generatedNotifs)
    } catch (err) {
      console.error('Erro ao consultar notificações:', err)
    } finally {
      setLoadingNotifs(false)
    }
  }, [user?.role, user?.id, hasMinPlan])

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
        name: current.name || 'Minha Clínica',
        primaryColor: '#06b6d4',
        accentColor: '#0891b2',
        fontFamily: 'Inter',
        logoUrl: current.logoUrl || null,
      }

      // Customização visual avançada a partir do plano PREMIUM
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
      console.error('Falha ao sincronizar tema da clínica:', err)
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
        console.error('Erro ao ler utilizador:', e)
      }
    }

    // 🛡️ Guarda Dupla de Rotas no Cliente: RBAC por Perfil + Trava de Planos
    if (parsedUser) {
      const currentRole: UserRole = parsedUser.role || 'SECRETARY'

      // 1. Validação por Cargo (RBAC)
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

      // 2. Validação por Plano de Assinatura
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

    const handleThemeUpdate = () => fetchClinicCustomization()
    window.addEventListener('clinic_customization_updated', handleThemeUpdate)

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
      clearInterval(notifInterval)
      window.removeEventListener('clinic_customization_updated', handleThemeUpdate)
      document.removeEventListener('mousedown', handleClickOutside)
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

        const [patientsRes, proceduresRes, plansRes, suppliersRes] = await Promise.all([
          api.get(`/patients?name=${encodeURIComponent(searchQuery)}&limit=3`).catch(() => ({ data: [] })),
          api.get(`/procedures?name=${encodeURIComponent(searchQuery)}&limit=3`).catch(() => ({ data: [] })),
          api.get(`/treatment-plans?limit=20`).catch(() => ({ data: [] })),
          api.get(`/suppliers?limit=10`).catch(() => ({ data: [] })),
        ])

        const patientItems: SearchResultItem[] = (patientsRes.data?.data || patientsRes.data || []).map((p: any) => ({
          id: p.id,
          type: 'PATIENT' as const,
          title: p.name,
          subtitle: `Paciente • Tel: ${p.phone || 'S/ telefone'}`,
          link: `/pacientes`,
        }))

        const procedureItems: SearchResultItem[] = (proceduresRes.data?.data || proceduresRes.data || []).map((pr: any) => ({
          id: pr.id,
          type: 'PROCEDURE' as const,
          title: pr.name,
          subtitle: `Procedimento • R$ ${Number(pr.basePrice || 0).toFixed(2)}`,
          link: `/procedimentos`,
        }))

        const planList = Array.isArray(plansRes.data) ? plansRes.data : plansRes.data?.data || []
        const queryLower = searchQuery.toLowerCase()
        const planItems: SearchResultItem[] = planList
          .filter((pl: any) => 
            (pl.title && pl.title.toLowerCase().includes(queryLower)) ||
            (pl.patient?.name && pl.patient.name.toLowerCase().includes(queryLower))
          )
          .slice(0, 3)
          .map((pl: any) => ({
            id: pl.id,
            type: 'PLAN' as const,
            title: pl.title,
            subtitle: `Plano • ${pl.patient?.name || 'Paciente'} (R$ ${Number(pl.totalAmount || 0).toFixed(2)})`,
            link: `/tratamentos`,
          }))

        const supplierList = Array.isArray(suppliersRes.data) ? suppliersRes.data : suppliersRes.data?.data || []
        const supplierItems: SearchResultItem[] = supplierList
          .filter((s: any) => s.name && s.name.toLowerCase().includes(queryLower))
          .slice(0, 2)
          .map((s: any) => ({
            id: s.id,
            type: 'SUPPLIER' as const,
            title: s.name,
            subtitle: `Fornecedor Dental ${s.cnpj ? `• CNPJ: ${s.cnpj}` : ''}`,
            link: `/gestao-de-titulos`,
          }))

        setSearchResults([...patientItems, ...procedureItems, ...planItems, ...supplierItems])
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
    setUpgradeMessage(`O módulo "${itemLabel}" é exclusivo para assinantes do ${planName}. Faça o upgrade para desbloquear relatórios, conciliação e comissões automáticas.`)
    setShowUpgradeModal(true)
  }

  const today = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
  const todayFormatted = today.charAt(0).toUpperCase() + today.slice(1)

  const pageTitle = ROUTE_PAGE_TITLES[pathname] ?? 'OdontoFlow'

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

  const userRole: UserRole = user?.role || 'SECRETARY'
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const searchInputRef = useRef<HTMLInputElement>(null)
  const userDisplayName = user?.name || 'Usuário'

  return (
    <div 
      className={`${styles.shell} ${isCollapsed ? styles.collapsedShell : ''}`}
      style={{
        '--primary-color': clinicVisual.primaryColor,
        '--primary-accent': clinicVisual.accentColor,
        '--app-font': clinicVisual.fontFamily,
      } as React.CSSProperties}
    >
      {/* ─── Menu Lateral (Sidebar) com RBAC e Trava de Planos ─── */}
      {/* Backdrop transparente/escuro para fechar o menu no celular ao tocar fora */}
      {isMobileMenuOpen && (
        <div 
          className={styles.sidebarBackdrop} 
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ─── MENU LATERAL / ASIDE RESPONSIVO ─── */}
      <aside 
        className={`
          ${styles.sidebar} 
          ${isCollapsed ? styles.sidebarCollapsed : ''} 
          ${isMobileMenuOpen ? styles.mobileSidebarOpen : ''}
        `}
      >
        {/* Topo da Sidebar: Logo & Ícone */}
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
              <Image src={ToothLogo} alt="OdontoFlow" width={26} height={26} priority />
            )}
          </div>

          <div className={styles.logoTextWrapper}>
            <span className={styles.logoName}>OdontoFlow</span>
            <span className={styles.logoSub}>{clinicVisual.name.toUpperCase()}</span>
          </div>

          {/* Botão de Fechar Exclusivo para Mobile */}
          <button 
            type="button" 
            onClick={() => setIsMobileMenuOpen(false)}
            className={styles.closeMobileMenuBtn}
            aria-label="Fechar menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Links de navegação com RBAC e Trava de Plano */}
        <nav className={styles.nav}>
          {NAV_GROUPS.map((group) => {
            if (group.roles && !group.roles.includes(userRole)) return null

            const visibleItems = group.items.filter(
              (item) => !item.roles || item.roles.includes(userRole)
            )

            if (visibleItems.length === 0) return null

            return (
              <div key={group.label} className={styles.navGroup}>
                <p className={styles.navGroupLabel}>{group.label}</p>
                <div className={styles.navGroupDivider} />

                {visibleItems.map((item) => {
                  const IconComponent = item.icon
                  const isActive = pathname === item.href
                  const isPlanLocked = item.minPlan ? !hasMinPlan(item.minPlan) : false

                  if (isPlanLocked) {
                    return (
                      <button
                        key={item.href}
                        type="button"
                        onClick={() => {
                          setIsMobileMenuOpen(false)
                          handlePlanRestrictedClick(item.label, item.minPlan!)
                        }}
                        className={`${styles.navItem} ${styles.navItemLocked}`}
                        title={item.label}
                      >
                        <IconComponent size={19} className={styles.navIcon} />
                        <div className={styles.navItemLockedContent}>
                          <span className={styles.navItemText}>{item.label}</span>
                          <span className={styles.planLockBadge}>
                            <Lock size={10} style={{ marginRight: 3 }} />
                            {item.badgeText || 'PRO'}
                          </span>
                        </div>
                      </button>
                    )
                  }

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
                      title={item.label}
                    >
                      <IconComponent size={19} className={styles.navIcon} />
                      <span className={styles.navItemText}>{item.label}</span>
                    </Link>
                  )
                })}
              </div>
            )
          })}
        </nav>

        {/* Botão de Toggle da Sidebar (visível apenas no Desktop) */}
        <button 
          type="button" 
          onClick={toggleSidebar} 
          className={styles.btnToggleSidebar}
          title={isCollapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          <span className={styles.toggleBtnText}>Recolher menu</span>
        </button>

        {/* Rodapé: Avatar e Iniciais (Card estilizado) */}
        <div className={styles.sidebarFooterCard}>
          <div className={styles.footerProfileLeft}>
            <div className={styles.userAvatarInitials} title={userDisplayName}>
              {userDisplayName.slice(0, 2).toUpperCase()}
            </div>
            <div className={styles.footerProfileInfo}>
              <strong className={styles.footerUserName}>{userDisplayName}</strong>
              <div className={styles.footerBadgeRow}>
                <span className={styles.footerRolePill}>{userRole}</span>
                <span className={styles.footerPlanPill}>{userPlan}</span>
              </div>
            </div>
          </div>

          <button 
            type="button" 
            onClick={handleLogout} 
            className={styles.btnLogoutIcon}
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
          {/* Lado Esquerdo: Breadcrumb minimalista conforme Figma */}
          <div className={styles.headerLeft}>
            <button 
              type="button" 
              onClick={() => setIsMobileMenuOpen(true)}
              className={styles.btnOpenMobileDrawer}
              aria-label="Abrir menu"
            >
              <Menu size={20} />
            </button>
            <div className={styles.headerBreadcrumb}>
              <span className={styles.headerClinicName}>{clinicVisual.name}</span>
              <span className={styles.headerDivider}>/</span>
              <span className={styles.headerContext}>Ambiente seguro</span>
            </div>
          </div>
          
          {/* Lado Direito: Busca minimalista com atalho, Sincronizado e Sino */}
          <div className={styles.headerRight}>
            {/* Campo de Pesquisa Global */}
            <div className={styles.searchWrapper} ref={searchRef}>
              <div className={styles.headerSearch}>
                {isSearching ? (
                  <Loader2 size={14} className={styles.searchSpinner} />
                ) : (
                  <Search size={14} className={styles.searchIcon} />
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
                    <X size={12} />
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

            {/* Status Sincronizado do Figma */}
            <div className={styles.syncStatusBadge}>
              <span className={styles.syncGreenDot} />
              <span>Sincronizado</span>
            </div>
            
            {/* Notificações Dinâmicas */}
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
          </div>
        </header>

        <main className={styles.content}>{children}</main>
      </div>

      {/* ─── Modal de Upgrade de Plano ─── */}
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