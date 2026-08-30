'use client'

import { useEffect, useState, useMemo } from 'react'
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
  Activity, 
  Stethoscope,
  ClipboardList,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import styles from './layout.module.css'
import { ModalProvider, useModal } from '@/app/components/ModalContext'
import Logo from ".././../public/logo.svg"
import Image from 'next/image'

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

function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<any>(null)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const { openNovoAgendamento } = useModal()

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

    // Carrega preferência de sidebar recolhida do localStorage
    const savedCollapsed = localStorage.getItem('odontoflow_sidebar_collapsed')
    if (savedCollapsed === 'true') {
      setIsCollapsed(true)
    }
  }, [router])

  const toggleSidebar = () => {
    const nextState = !isCollapsed
    setIsCollapsed(nextState)
    localStorage.setItem('odontoflow_sidebar_collapsed', String(nextState))
  }

  const today = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
  const todayFormatted = today.charAt(0).toUpperCase() + today.slice(1)

  // Acha o título da página atual
  const allNavItems = useMemo(() => NAV_GROGROUPS_FLAT(NAV_GROUPS), [])
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
        
        {/* Logo */}
        <div className={styles.sidebarLogo}>
          <div className={styles.logoIcon}>
            <Image src={Logo} alt="Logo" width={24} height={24} />
          </div>
          {!isCollapsed && (
            <div className={styles.logoTextWrapper}>
              <div className={styles.logoName}>OdontoFlow</div>
              <div className={styles.logoSub}>GESTÃO CLÍNICA</div>
            </div>
          )}
        </div>

        {/* Navegação Agrupada por Módulos */}
        <nav className={styles.nav}>
          {NAV_GROUPS.map((group) => {
            // Filtra itens com restrição administrativa
            const visibleItems = group.items.filter(
              (item) => !item.adminOnly || user?.role === 'ADMIN'
            )

            if (visibleItems.length === 0) return null

            return (
              <div key={group.label} className={styles.navGroup}>
                {!isCollapsed && (
                  <p className={styles.navGroupLabel}>{group.label}</p>
                )}
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

        {/* Botão de Recolher Sidebar */}
        <button 
          type="button" 
          onClick={toggleSidebar} 
          className={styles.btnToggleSidebar}
          title={isCollapsed ? "Expandir menu" : "Recolher menu"}
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          {!isCollapsed && <span>Recolher menu</span>}
        </button>

        {/* Footer do Usuário */}
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
              Clínica Sorriso Feliz <span className={styles.mvpBadge}>MVP</span>
            </div>
            <h1 className={styles.pageTitle}>{pageTitle}</h1>
          </div>
          
          <div className={styles.headerRight}>
            <span className={styles.headerDate}>{todayFormatted}</span>
            
            <div className={styles.headerSearch}>
              <Search size={16} className={styles.searchIcon} />
              <input 
                placeholder="Buscar paciente, procedimento..." 
                className={styles.searchInput} 
              />
            </div>
            
            <button className={styles.notifBtn} aria-label="Notificações">
              <Bell size={18} />
            </button>
            
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

function NAV_GROGROUPS_FLAT(groups: NavGroup[]) {
  return groups.flatMap((g) => g.items)
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ModalProvider>
      <DashboardShell>{children}</DashboardShell>
    </ModalProvider>
  )
}