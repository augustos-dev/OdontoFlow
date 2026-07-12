// app/(dashboard)/layout.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import styles from './layout.module.css'
import { ModalProvider } from '@/app/components/ModalContext'
import { useModal } from '@/app/components/ModalContext'

const navItems = [
  { href: '/', label: 'Dashboard', icon: '⊞' },
  { href: '/agenda', label: 'Agenda', icon: '📅' },
  { href: '/pacientes', label: 'Pacientes', icon: '👤' },
  { href: '/estoque', label: 'Estoque', icon: '📦' },
  { href: '/financeiro', label: 'Financeiro', icon: '💳' },
  { href: '/configuracoes', label: 'Configurações', icon: '⚙️' },
]

// ─── Componente interno que usa o contexto ────────────────────
function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<any>(null)
  const { openNovoAgendamento } = useModal() // ← agora está DENTRO do Provider

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
          <div className={styles.logoIcon}>🦷</div>
          <div>
            <div className={styles.logoName}>OdontoFlow</div>
            <div className={styles.logoSub}>GESTÃO CLÍNICA</div>
          </div>
        </div>

        <nav className={styles.nav}>
          <p className={styles.navLabel}>MENU PRINCIPAL</p>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navItem} ${pathname === item.href ? styles.navItemActive : ''}`}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.avatar}>{initials}</div>
          <div className={styles.userInfo}>
            <div className={styles.userName}>{user?.name ?? 'Usuário'}</div>
            <div className={styles.userRole}>
              {user?.role === 'ADMIN' ? 'Administrador' : user?.role === 'DENTIST' ? 'Dentista' : 'Secretária'}
            </div>
          </div>
          <button className={styles.logoutBtn} onClick={handleLogout} title="Sair">⏻</button>
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
              <span>🔍</span>
              <input placeholder="Buscar paciente, procedimento..." className={styles.searchInput} />
            </div>
            <button className={styles.notifBtn}>🔔</button>
            <button className={styles.newAppointmentBtn} onClick={openNovoAgendamento}>
              + Novo Agendamento
            </button>
          </div>
        </header>

        <main className={styles.content}>{children}</main>
      </div>
    </div>
  )
}

// ─── Layout principal — só envolve com o Provider ─────────────
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ModalProvider>
      <DashboardShell>{children}</DashboardShell>
    </ModalProvider>
  )
}