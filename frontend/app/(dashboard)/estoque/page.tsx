// app/(dashboard)/estoque/page.tsx
'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'
import styles from './estoque.module.css'

interface Product {
  id: string
  name: string
  quantity: number
  minQuantity: number
  expiryDate?: string
  stockStatus: 'OK' | 'BAIXO' | 'CRITICO'
  supplier?: { id: string; name: string }
}

export default function EstoquePage() {
  const [products, setProducts] = useState<Product[]>([])
  const [lowStock, setLowStock] = useState<Product[]>([])
  const [expiring, setExpiring] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'all' | 'critical' | 'expiring'>('all')

  useEffect(() => {
    async function load() {
      try {
        const [allRes, lowRes, expRes] = await Promise.all([
          api.get('/products?limit=100'),
          api.get('/products/low-stock'),
          api.get('/products/expiring'),
        ])
        setProducts(allRes.data.data)
        setLowStock(lowRes.data)
        setExpiring(expRes.data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const displayed = tab === 'all' ? products : tab === 'critical' ? lowStock : expiring

  const totalOk = products.filter((p) => p.stockStatus === 'OK').length
  const totalCritico = products.filter((p) => p.stockStatus === 'CRITICO' || p.stockStatus === 'BAIXO').length

  function formatDate(dt?: string) {
    if (!dt) return '—'
    return new Date(dt).toLocaleDateString('pt-BR')
  }

  function getStockClass(status: string) {
    if (status === 'CRITICO') return styles.critico
    if (status === 'BAIXO') return styles.baixo
    return styles.ok
  }

  function getAlertLabel(p: Product) {
    if (p.stockStatus === 'CRITICO') return { label: 'COMPRAR URGENTE', cls: styles.alertCritico }
    if (p.stockStatus === 'BAIXO') return { label: 'COMPRAR URGENTE', cls: styles.alertCritico }
    return { label: 'OK', cls: styles.alertOk }
  }

  return (
    <div className={styles.page}>
      <div className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <p className={styles.metricLabel}>TOTAL DE ITENS</p>
          <p className={styles.metricValue}>{products.length}</p>
        </div>
        <div className={styles.metricCard}>
          <p className={styles.metricLabel}>ITENS CRÍTICOS</p>
          <p className={`${styles.metricValue} ${styles.metricCritico}`}>{totalCritico}</p>
        </div>
        <div className={styles.metricCard}>
          <p className={styles.metricLabel}>EM ESTOQUE</p>
          <p className={`${styles.metricValue} ${styles.metricOk}`}>{totalOk}</p>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.cardTitleRow}>
            <div className={styles.cardIcon}>📦</div>
            <div>
              <h2 className={styles.cardTitle}>Controle de Estoque</h2>
              <p className={styles.cardSub}>Materiais monitorados em tempo real</p>
            </div>
          </div>
          <div className={styles.tabs}>
            <button className={`${styles.tab} ${tab === 'all' ? styles.tabActive : ''}`} onClick={() => setTab('all')}>
              Todos
            </button>
            <button className={`${styles.tab} ${tab === 'critical' ? styles.tabActive : ''}`} onClick={() => setTab('critical')}>
              Críticos ({lowStock.length})
            </button>
            <button className={`${styles.tab} ${tab === 'expiring' ? styles.tabActive : ''}`} onClick={() => setTab('expiring')}>
              Vencendo ({expiring.length})
            </button>
          </div>
        </div>

        {loading ? (
          <div className={styles.loading}>Carregando estoque...</div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>NOME DO MATERIAL</th>
                <th>QUANTIDADE ATUAL</th>
                <th>ESTOQUE MÍNIMO</th>
                <th>VALIDADE</th>
                <th>ALERTA</th>
              </tr>
            </thead>
            <tbody>
              {displayed.length === 0 && (
                <tr><td colSpan={5} className={styles.empty}>Nenhum produto encontrado</td></tr>
              )}
              {displayed.map((p) => {
                const alert = getAlertLabel(p)
                return (
                  <tr key={p.id} className={styles.row}>
                    <td className={styles.productName}>{p.name}</td>
                    <td>
                      <span className={`${styles.qtyBadge} ${getStockClass(p.stockStatus)}`}>
                        {p.quantity}
                      </span>
                    </td>
                    <td className={styles.minQty}>Min. {p.minQuantity}</td>
                    <td className={styles.expiry}>{formatDate(p.expiryDate)}</td>
                    <td>
                      <span className={`${styles.alertBadge} ${alert.cls}`}>
                        {alert.label !== 'OK' && '⚠ '}{alert.label}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}