'use client'

import { useEffect, useState } from 'react'
import { Stethoscope, Clock, TrendingUp, AlertTriangle, Loader2 } from 'lucide-react'
import api from '@/lib/api'
import styles from './DashboardRecepcao.module.css'

export function DashboardRecepcao() {
  const [summary, setSummary] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadRecepcaoData() {
      try {
        setLoading(true)
        const res = await api.get('/dashboard/summary')
        setSummary(res.data)
      } catch (err) {
        console.error('Erro ao carregar dashboard da recepção:', err)
      } finally {
        setLoading(false)
      }
    }

    loadRecepcaoData()
  }, [])

  if (loading) {
    return (
      <div className={styles.loading}>
        <Loader2 size={24} className={styles.spinner} />
        <span>Carregando agenda e recepção...</span>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.metricsGrid}>
        <div className={styles.card}>
          <div className={styles.metricIconBg}><Stethoscope size={18} color="#06b6d4" /></div>
          <span className={styles.metricLabel}>ATENDIMENTOS HOJE</span>
          <span className={styles.metricValue}>{summary?.appointments.today ?? 0}</span>
          <span className={styles.metricSub}>agendamentos no dia</span>
        </div>

        <div className={styles.card}>
          <div className={styles.metricIconBg}><Clock size={18} color="#0284c7" /></div>
          <span className={styles.metricLabel}>FILA DE ESPERA</span>
          <span className={styles.metricValue}>0</span>
          <span className={styles.metricSub}>Pacientes aguardando</span>
        </div>

        <div className={styles.card}>
          <div className={styles.metricIconBg}><TrendingUp size={18} color="#16a34a" /></div>
          <span className={styles.metricLabel}>RECEITA DO DIA</span>
          <span className={styles.metricValue}>
            {Number(summary?.financial.todayRevenue ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </span>
          <span className={styles.metricSub}>receita de hoje</span>
        </div>

        <div className={styles.card}>
          <div className={styles.metricIconBg} style={{ background: '#fee2e2' }}>
            <AlertTriangle size={18} color="#dc2626" />
          </div>
          <span className={styles.metricLabel}>INSUMOS CRÍTICOS</span>
          <span className={`${styles.metricValue} ${styles.alertText}`}>
            {summary?.inventory.lowStockCount ?? 0}
          </span>
          <span className={styles.metricSub}>Reposição necessária</span>
        </div>
      </div>

      <div className={styles.mainGrid}>
        <div className={styles.agendaCard}>
          <div className={styles.agendaHeader}>
            <div>
              <h3>Agenda do Dia</h3>
              <p>Clique em um agendamento para ver detalhes</p>
            </div>
            <div className={styles.statusLegend}>
              <span><span className={styles.dotConfirmado} /> Confirmado</span>
              <span><span className={styles.dotAtend} /> Em Atend.</span>
              <span><span className={styles.dotFinalizado} /> Finalizado</span>
            </div>
          </div>

          <div className={styles.roomsGrid}>
            <div className={styles.roomCol}>
              <h4>SALA 1</h4>
              <div className={styles.roomEmpty}>Sem agendamentos no momento</div>
            </div>
            <div className={styles.roomCol}>
              <h4>SALA 2</h4>
              <div className={styles.roomEmpty}>Sem agendamentos no momento</div>
            </div>
          </div>
        </div>

        <div className={styles.sidebarCards}>
          <div className={styles.cardSide}>
            <h4>Resumo da Recepção</h4>
            <p className={styles.emptyText}>Nenhum atendimento pendente hoje.</p>
          </div>
          <div className={styles.cardSide}>
            <div className={styles.sideHeader}>
              <h4>Fila de Espera</h4>
              <span className={styles.counterBadge}>0</span>
            </div>
            <p className={styles.emptyText}>Nenhum paciente na fila.</p>
          </div>
        </div>
      </div>
    </div>
  )
}