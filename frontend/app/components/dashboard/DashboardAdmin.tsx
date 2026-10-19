'use client'

import React, { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  Sun,
  Plus,
  Loader2,
  Calendar,
  AlertTriangle,
  FileText,
  UserCheck,
  TrendingUp,
  Clock,
  CheckCircle2,
  Lock,
  ChevronRight,
  ShieldCheck,
  Package,
  Activity,
  ArrowRight
} from 'lucide-react'
import api from '@/lib/api'
import { usePlanAccess } from '../../../src/hooks/usePlanAccess'
import { useModal } from '@/app/components/ModalContext'
import styles from './dashboardAdmin.module.css'

interface DashboardMetricData {
  activePatients: number
  activePatientsTrend: string
  monthAppointments: number
  monthAppointmentsPeriod: string
  monthRevenue: number
  monthRevenueSub: string
  netProfit: number
  netProfitSub: string
  criticalStockCount: number
  unpaidBillsCount: number
  dentistProductivity: number
  chairOccupancyRate: number
}

interface TaskItem {
  id: string
  title: string
  completed: boolean
  dueDate?: string
  priority?: 'LOW' | 'MEDIUM' | 'HIGH'
}

interface RecentActivity {
  id: string
  type: 'PRONTUARIO' | 'PACIENTE' | 'ATENDIMENTO'
  title: string
  description: string
  timeAgo: string
}

export function DashboardAdmin() {
  const { openNovoAgendamento } = useModal()
  const { plan, hasMinPlan, isBasic } = usePlanAccess()

  const [loading, setLoading] = useState(true)
  const [userName, setUserName] = useState('Dra. Ana')
  const [clinicTitle, setClinicTitle] = useState('Clínica OdontoFlow')

  const [metrics, setMetrics] = useState<DashboardMetricData>({
    activePatients: 4,
    activePatientsTrend: '+1 paciente em outubro',
    monthAppointments: 1,
    monthAppointmentsPeriod: '01–17 out 2026',
    monthRevenue: 0.0,
    monthRevenueSub: 'Outubro • Sem recebimentos',
    netProfit: 0.0,
    netProfitSub: 'Regime de caixa • Outubro',
    criticalStockCount: 2,
    unpaidBillsCount: 3,
    dentistProductivity: 0.0,
    chairOccupancyRate: 88,
  })

  const [tasks, setTasks] = useState<TaskItem[]>([
    { id: '1', title: 'Revisar orçamento de Francisca', completed: false },
    { id: '2', title: 'Confirmar agenda de segunda-feira', completed: false },
    { id: '3', title: 'Conferir validade dos insumos', completed: false },
  ])

  const [activities] = useState<RecentActivity[]>([
    {
      id: 'act-1',
      type: 'PRONTUARIO',
      title: 'Prontuário atualizado',
      description: 'Francisca Edileuza • Dra. Ana Costa',
      timeAgo: 'Há 12 min',
    },
    {
      id: 'act-2',
      type: 'PACIENTE',
      title: 'Novo paciente cadastrado',
      description: 'Pedro Henrique Almeida • Recepção',
      timeAgo: 'Há 1 dia',
    },
    {
      id: 'act-3',
      type: 'ATENDIMENTO',
      title: 'Atendimento finalizado',
      description: 'Francisca Edileuza • Avaliação clínica',
      timeAgo: '16 out, 14:40',
    },
  ])

  // Consulta dados reais do Swagger (/tasks, /clinics, /auth/me)
  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true)

      // Identifica o utilizador e a clínica no localStorage
      const storedUser = localStorage.getItem('odontoflow_user') || localStorage.getItem('@odontoflow:user')
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser)
          if (parsed.name) setUserName(parsed.name)
          if (parsed.clinic?.name) setClinicTitle(parsed.clinic.name)
        } catch {}
      }

      // Executa chamadas paralelas aos endpoints do Swagger
      const [tasksRes, stockRes, clinicRes] = await Promise.allSettled([
        api.get('/tasks'),
        api.get('/products/low-stock'),
        api.get('/clinics'),
      ])

      // 1. Tarefas clínicas (/tasks)
      if (tasksRes.status === 'fulfilled' && tasksRes.value.data) {
        const rawTasks = tasksRes.value.data?.data || tasksRes.value.data || []
        if (Array.isArray(rawTasks) && rawTasks.length > 0) {
          setTasks(
            rawTasks.slice(0, 3).map((t: any) => ({
              id: t.id,
              title: t.title || t.description,
              completed: Boolean(t.completed || t.status === 'COMPLETED'),
            }))
          )
        }
      }

      // 2. Estoque crítico (/products/low-stock)
      if (stockRes.status === 'fulfilled') {
        const rawStock = stockRes.value.data?.data || stockRes.value.data || []
        if (Array.isArray(rawStock)) {
          setMetrics((prev) => ({
            ...prev,
            criticalStockCount: rawStock.length,
          }))
        }
      }

      // 3. Informações da clínica (/clinics)
      if (clinicRes.status === 'fulfilled') {
        const rawClinics = Array.isArray(clinicRes.value.data)
          ? clinicRes.value.data
          : clinicRes.value.data?.data || []
        if (rawClinics[0]?.name) {
          setClinicTitle(rawClinics[0].name)
        }
      }
    } catch (err) {
      console.error('Erro ao consolidar visão geral do dashboard:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  // Alterna status de tarefa via PATCH /tasks/{id}
  async function handleToggleTask(taskId: string, currentStatus: boolean) {
    const nextStatus = !currentStatus
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, completed: nextStatus } : t))
    )

    try {
      await api.patch(`/tasks/${taskId}`, {
        completed: nextStatus,
        status: nextStatus ? 'COMPLETED' : 'PENDING',
      })
    } catch (err) {
      console.error('Falha ao atualizar tarefa:', err)
      // Reverte em caso de erro de rede
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, completed: currentStatus } : t))
      )
    }
  }

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <Loader2 size={32} className={styles.spinner} />
        <span>Sincronizando operação clínica em tempo real...</span>
      </div>
    )
  }

  return (
    <div className={styles.dashboardWrapper}>
      {/* ─── TOPO INFORMATIVO E HEADER OPERACIONAL ─── */}
      <div className={styles.topContextBar}>
        <div className={styles.clinicBreadcrumb}>
          <span>{clinicTitle}</span>
          <span className={styles.bcSep}>/</span>
          <span className={styles.bcActive}>Ambiente seguro</span>
        </div>
        <div className={styles.statusSyncRow}>
          <span className={styles.greenPulseDot} />
          <span>Sincronizado • Dados protegidos</span>
        </div>
      </div>

      <div className={styles.mainHeaderRow}>
        <div>
          <span className={styles.eyebrowCategory}>GESTÃO CLÍNICA</span>
          <h1 className={styles.screenTitle}>Dashboard geral</h1>
          <p className={styles.screenSub}>Sua clínica, em tempo real.</p>
        </div>

        <div className={styles.headerRightActions}>
          <button
            type="button"
            onClick={openNovoAgendamento}
            className={styles.btnNewAppointment}
          >
            <Plus size={16} />
            <span>Novo Agendamento</span>
          </button>
        </div>
      </div>

      {/* ─── BANNER DE BOAS-VINDAS ─── */}
      <div className={styles.greetingBanner}>
        <div className={styles.greetingLeft}>
          <div className={styles.greetingSunIcon}>
            <Sun size={20} />
          </div>
          <div>
            <strong className={styles.greetingTitle}>Bom dia, {userName}.</strong>
            <p className={styles.greetingSubtitle}>
              Sua clínica está pronta para mais um dia de cuidado.
            </p>
          </div>
        </div>
        <div className={styles.greetingDateBadge}>
          {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}
        </div>
      </div>

      {/* ─── CARDS DE MÉTRICAS (GRID 4x1) ─── */}
      <section className={styles.metricGrid}>
        {/* Pacientes Ativos */}
        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>Pacientes Ativos</span>
          <strong className={styles.metricValue}>{metrics.activePatients}</strong>
          <span className={styles.metricTrendPositive}>{metrics.activePatientsTrend}</span>
        </div>

        {/* Atendimentos no Mês */}
        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>Atendimentos no Mês</span>
          <strong className={styles.metricValue}>{metrics.monthAppointments}</strong>
          <span className={styles.metricPeriodLabel}>{metrics.monthAppointmentsPeriod}</span>
        </div>

        {/* Faturamento Mensal (Trava de Plano para Básico) */}
        <div className={styles.metricCard}>
          <div className={styles.metricHeaderFlex}>
            <span className={styles.metricLabel}>Faturamento Mensal</span>
            {isBasic && <span className={styles.planLockPill}><Lock size={10} /> PRO</span>}
          </div>
          <strong className={styles.metricValue}>
            {isBasic
              ? '••••••'
              : metrics.monthRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </strong>
          <span className={styles.metricSubInfo}>
            {isBasic ? 'Exclusivo Plano Clínico Pro' : metrics.monthRevenueSub}
          </span>
        </div>

        {/* Lucro Líquido (Trava de Plano para Básico) */}
        <div className={styles.metricCard}>
          <div className={styles.metricHeaderFlex}>
            <span className={styles.metricLabel}>Lucro Líquido</span>
            {isBasic && <span className={styles.planLockPill}><Lock size={10} /> PRO</span>}
          </div>
          <strong className={styles.metricValue}>
            {isBasic
              ? '••••••'
              : metrics.netProfit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </strong>
          <span className={styles.metricSubInfo}>
            {isBasic ? 'Exclusivo Plano Clínico Pro' : metrics.netProfitSub}
          </span>
        </div>
      </section>

      {/* ─── CORPO PRINCIPAL: 2 COLUNAS (GRÁFICO + WIDGETS) ─── */}
      <div className={styles.contentLayoutGrid}>
        {/* COLUNA ESQUERDA: Fluxo Diário e Atividades Recentes */}
        <div className={styles.leftMainColumn}>
          {/* Card: Fluxo de Receita Diária */}
          <div className={styles.chartPanelCard}>
            <div className={styles.chartPanelHeader}>
              <div>
                <h3 className={styles.panelTitle}>Fluxo de Receita Diária</h3>
                <span className={styles.panelSubtitle}>Outubro 2026 • Regime de caixa</span>
              </div>
              <div className={styles.revenuePillsRow}>
                <span className={styles.revPillActive}>
                  Receita {metrics.monthRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
                <span className={styles.revPillInactive}>Sem lançamentos</span>
              </div>
            </div>

            {/* Linhas de Grade e Gráfico Vetorial Suave */}
            <div className={styles.chartVisualWrapper}>
              <div className={styles.chartAxisLabels}>
                <span>R$ 100</span>
                <span>R$ 50</span>
                <span>R$ 0</span>
              </div>

              <div className={styles.svgArea}>
                <svg viewBox="0 0 500 120" className={styles.chartSvg} preserveAspectRatio="none">
                  <line x1="0" y1="20" x2="500" y2="20" stroke="#f1f5f9" strokeDasharray="3 3" />
                  <line x1="0" y1="65" x2="500" y2="65" stroke="#f1f5f9" strokeDasharray="3 3" />
                  <line x1="0" y1="110" x2="500" y2="110" stroke="#e2e8f0" />
                  {/* Linha de Tendência */}
                  <path
                    d="M 0 110 L 70 110 L 150 108 L 260 108 L 380 110 L 500 110"
                    fill="none"
                    stroke="#0082c9"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            </div>

            <div className={styles.chartXLabels}>
              <span>01 out</span>
              <span>08 out</span>
              <span>17 out</span>
              <span>24 out</span>
              <span>31 out</span>
            </div>

            <div className={styles.mobileSwipeNotice}>
              <span>↔ Deslize para explorar o período</span>
            </div>
          </div>

          {/* Card: Atividade Recente */}
          <div className={styles.recentActivityCard}>
            <div className={styles.cardSectionHeader}>
              <h3 className={styles.panelTitle}>Atividade recente</h3>
              <span className={styles.panelSubtitle}>Acompanhe o que acontece na sua clínica</span>
            </div>

            <div className={styles.activityList}>
              {activities.map((act) => (
                <div key={act.id} className={styles.activityItem}>
                  <div className={styles.activityIconWrap}>
                    {act.type === 'PRONTUARIO' && <FileText size={16} />}
                    {act.type === 'PACIENTE' && <UserCheck size={16} />}
                    {act.type === 'ATENDIMENTO' && <Calendar size={16} />}
                  </div>
                  <div className={styles.activityInfo}>
                    <strong className={styles.activityTitle}>{act.title}</strong>
                    <span className={styles.activityDesc}>{act.description}</span>
                    <span className={styles.activityTime}>{act.timeAgo}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* COLUNA DIREITA: Tarefas, Alertas de Operação e Produtividade */}
        <aside className={styles.rightSidebarColumn}>
          {/* Widget 1: Tarefas Clínicas (/tasks) */}
          <div className={styles.sideWidgetCard}>
            <div className={styles.cardSectionHeader}>
              <h3 className={styles.panelTitle}>Tarefas</h3>
              <span className={styles.panelSubtitle}>Prioridades da sua equipe</span>
            </div>

            <ul className={styles.dashboardTaskList}>
              {tasks.map((task) => (
                <li key={task.id} className={task.completed ? styles.taskItemDone : styles.taskItemPending}>
                  <label className={styles.taskCheckboxLabel}>
                    <input
                      type="checkbox"
                      checked={task.completed}
                      onChange={() => handleToggleTask(task.id, task.completed)}
                    />
                    <span className={styles.taskCustomBox}>
                      {task.completed && <CheckCircle2 size={13} />}
                    </span>
                    <span className={styles.taskTitleText}>{task.title}</span>
                  </label>
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={() => alert('Todas as tarefas sincronizadas no Swagger.')}
              className={styles.btnWidgetOutline}
            >
              Ver todas as tarefas
            </button>
          </div>

          {/* Widget 2: Atenção à Operação (Estoque Crítico & Contas) */}
          <div className={styles.sideWidgetCard}>
            <div className={styles.cardSectionHeader}>
              <h3 className={styles.panelTitle}>Atenção à operação</h3>
            </div>

            <div className={styles.operationAlertsList}>
              <Link href="/estoque" className={styles.alertRow}>
                <div className={styles.alertRowLeft}>
                  <Package size={16} className={styles.alertIconAmber} />
                  <span>Estoque Crítico</span>
                </div>
                <span className={styles.pillAlertAmber}>{metrics.criticalStockCount} itens</span>
              </Link>

              <Link href={hasMinPlan('PREMIUM') ? '/financeiro' : '#'} className={styles.alertRow}>
                <div className={styles.alertRowLeft}>
                  <AlertTriangle size={16} className={styles.alertIconRed} />
                  <span>Contas não pagas</span>
                </div>
                <span className={styles.pillAlertRed}>{metrics.unpaidBillsCount} itens</span>
              </Link>
            </div>
          </div>

          {/* Widget 3: Produtividade no Mocho */}
          <div className={styles.sideWidgetCard}>
            <div className={styles.cardSectionHeader}>
              <h3 className={styles.panelTitle}>Produtividade no Mocho</h3>
              <span className={styles.panelSubtitle}>Outubro • Capacidade estimada</span>
            </div>

            <div className={styles.mochoStatBox}>
              <strong className={styles.mochoNumber}>
                {metrics.dentistProductivity.toFixed(1)} pac/dia
              </strong>
              <div className={styles.occupancyHeaderRow}>
                <span>{metrics.chairOccupancyRate}% ocupação estimada</span>
              </div>

              <div className={styles.progressBarTrack}>
                <div
                  className={styles.progressBarFill}
                  style={{ width: `${metrics.chairOccupancyRate}%` }}
                />
              </div>

              <small className={styles.occupancyDisclaimer}>
                Projeção da grade • Não representa atendimentos concluídos.
              </small>
            </div>
          </div>
        </aside>
      </div>

      <footer className={styles.dashboardFooter}>
        <span>OdontoFlow © 2026 • Ambiente seguro</span>
      </footer>
    </div>
  )
}