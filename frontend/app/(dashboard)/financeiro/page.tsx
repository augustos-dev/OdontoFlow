// app/(dashboard)/financeiro/page.tsx
'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'
import styles from './financeiro.module.css'

interface Transaction {
  id: string
  type: 'RECEITA' | 'DESPESA'
  amount: string
  paymentMethod: string
  description?: string
  category?: string
  paidAt: string
  appointment?: {
    id: string
    dateTime: string
    patient: { id: string; name: string }
  }
}

const PAYMENT_LABEL: Record<string, string> = {
  PIX: 'Pix',
  CREDITO: 'Cartão de Crédito',
  DEBITO: 'Cartão de Débito',
  DINHEIRO: 'Dinheiro',
  CONVENIO: 'Convênio',
}

export default function FinanceiroPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [report, setReport] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'RECEITA' | 'DESPESA'>('all')

  const now = new Date()
  const startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const endDate = now.toISOString().slice(0, 10)

  useEffect(() => {
    async function load() {
      try {
        const [txRes, reportRes] = await Promise.all([
          api.get('/transactions?limit=50&page=1'),
          api.get(`/transactions/report?startDate=${startDate}&endDate=${endDate}`),
        ])
        setTransactions(txRes.data.data)
        setReport(reportRes.data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [startDate, endDate])

  function formatCurrency(value: number | string) {
    return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  function formatTime(dt: string) {
    return new Date(dt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }

  function formatDateRelative(dt: string) {
    const d = new Date(dt)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)

    if (d.toDateString() === today.toDateString()) return formatTime(dt)
    if (d.toDateString() === yesterday.toDateString()) return 'Ontem'
    return d.toLocaleDateString('pt-BR')
  }

  const displayed = filter === 'all'
    ? transactions
    : transactions.filter((t) => t.type === filter)

  return (
    <div className={styles.page}>
      <div className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <p className={styles.metricLabel}>RECEITA DO DIA</p>
          <p className={styles.metricValue}>{formatCurrency(report?.summary.todayRevenue ?? 0)}</p>
        </div>
        <div className={styles.metricCard}>
          <p className={styles.metricLabel}>RECEITA DA SEMANA</p>
          <p className={styles.metricValue}>{formatCurrency(report?.summary.weekRevenue ?? 0)}</p>
        </div>
        <div className={styles.metricCard}>
          <p className={styles.metricLabel}>RECEITA DO MÊS</p>
          <p className={styles.metricValue}>{formatCurrency(report?.summary.totalReceitas ?? 0)}</p>
        </div>
        <div className={styles.metricCard}>
          <p className={styles.metricLabel}>LUCRO DO MÊS</p>
          <p className={`${styles.metricValue} ${(report?.summary.lucro ?? 0) >= 0 ? styles.lucroPositivo : styles.lucroNegativo}`}>
            {formatCurrency(report?.summary.lucro ?? 0)}
          </p>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Transações Recentes</h2>
          <div className={styles.tabs}>
            <button className={`${styles.tab} ${filter === 'all' ? styles.tabActive : ''}`} onClick={() => setFilter('all')}>Todas</button>
            <button className={`${styles.tab} ${filter === 'RECEITA' ? styles.tabActive : ''}`} onClick={() => setFilter('RECEITA')}>Receitas</button>
            <button className={`${styles.tab} ${filter === 'DESPESA' ? styles.tabActive : ''}`} onClick={() => setFilter('DESPESA')}>Despesas</button>
          </div>
        </div>

        {loading ? (
          <div className={styles.loading}>Carregando transações...</div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>PACIENTE / DESCRIÇÃO</th>
                <th>CATEGORIA</th>
                <th>MÉTODO</th>
                <th>VALOR</th>
                <th>QUANDO</th>
              </tr>
            </thead>
            <tbody>
              {displayed.length === 0 && (
                <tr><td colSpan={5} className={styles.empty}>Nenhuma transação encontrada</td></tr>
              )}
              {displayed.map((t) => (
                <tr key={t.id} className={styles.row}>
                  <td className={styles.nameCell}>
                    {t.appointment?.patient.name ?? t.description ?? '—'}
                  </td>
                  <td className={styles.category}>{t.category ?? '—'}</td>
                  <td className={styles.method}>{PAYMENT_LABEL[t.paymentMethod] ?? t.paymentMethod}</td>
                  <td>
                    <span className={`${styles.amount} ${t.type === 'RECEITA' ? styles.receita : styles.despesa}`}>
                      {t.type === 'DESPESA' ? '- ' : ''}{formatCurrency(t.amount)}
                    </span>
                  </td>
                  <td className={styles.when}>{formatDateRelative(t.paidAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}