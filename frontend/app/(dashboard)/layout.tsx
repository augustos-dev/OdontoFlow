'use client'

import { useEffect, useState } from 'react'
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
  Stethoscope
} from 'lucide-react'
import styles from './layout.module.css'
import { ModalProvider, useModal } from '@/app/components/ModalContext'

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/agenda', label: 'Agenda', icon: Calendar },
  { href: '/pacientes', label: 'Pacientes', icon: Users },
  { href: '/estoque', label: 'Estoque', icon: Package },
  { href: '/financeiro', label: 'Financeiro', icon: CreditCard },
  { href: '/procedimentos', label: 'Procedimentos', icon: Stethoscope},
  { href: '/configuracoes', label: 'Configurações', icon: Settings },
]

// ─── Componente interno que usa o contexto ────────────────────
function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<any>(null)
  const { openNovoAgendamento } = useModal()

  useEffect(() => {
    const token = localStorage.getItem('odontoflow_token')
    const stored = localStorage.getItem('odontoflow_user')
    if (!token) {
      router.push('/login')
      return
    }
    if (stored) setUser(JSON.parse(stored))
  }, [router])

  const today = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  const todayFormatted = today.charAt(0).toUpperCase() + today.slice(1)
  const pageTitle = navItems.find((n) => n.href === pathname)?.label ?? 'OdontoFlow'
  const initials = user?.name
    ? user.name.split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase()
    : 'U'

  function handleLogout() {
    localStorage.removeItem('odontoflow_token')
    localStorage.removeItem('odontoflow_user')
    router.push('/login')
  }

  return (
    <div className={styles.shell}>
      {/* ─── Sidebar ─── */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarLogo}>
          <div className={styles.logoIcon}>
            <Activity size={22} color="#fff" />
          </div>
          <div>
            <div className={styles.logoName}>OdontoFlow</div>
            <div className={styles.logoSub}>GESTÃO CLÍNICA</div>
          </div>
        </div>

        <nav className={styles.nav}>
          <p className={styles.navLabel}>MENU PRINCIPAL</p>
          {navItems.map((item) => {
            const IconComponent = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
              >
                <IconComponent size={18} className={styles.navIcon} />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.avatar}>{initials}</div>
          <div className={styles.userInfo}>
            <div className={styles.userName}>{user?.name ?? 'Usuário'}</div>
            <div className={styles.userRole}>
              {user?.role === 'ADMIN' ? 'Administrador' : user?.role === 'DENTIST' ? 'Dentista' : 'Secretária'}
            </div>
          </div>
          <button className={styles.logoutBtn} onClick={handleLogout} title="Sair" aria-label="Sair">
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* ─── Main ─── */}
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
              <input placeholder="Buscar paciente, procedimento..." className={styles.searchInput} />
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

// ─── Layout principal ─────────────────────────────────────────
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ModalProvider>
      <DashboardShell>{children}</DashboardShell>
    </ModalProvider>
  )
}