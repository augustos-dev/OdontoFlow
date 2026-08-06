'use client'

import { useEffect, useState, useCallback } from 'react'
import { 
  Package, 
  AlertTriangle, 
  CheckCircle2, 
  Box, 
  Loader2,
  Plus,
  BarChart3,
  TrendingDown
} from 'lucide-react'
import api from '@/lib/api'
import { StockManagementModal, StockProductInput } from '../../components/estoque/StockManagementModal'
import styles from './estoque.module.css'

interface Product {
  id: string
  name: string
  quantity: number
  minQuantity: number
  expiryDate?: string
  stockStatus?: 'OK' | 'BAIXO' | 'CRITICO'
  supplier?: { id: string; name: string }
  usageCount?: number
}

export default function EstoquePage() {
  const [products, setProducts] = useState<Product[]>([])
  const [lowStock, setLowStock] = useState<Product[]>([])
  const [expiring, setExpiring] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'all' | 'critical' | 'expiring'>('all')
  
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Função central para buscar estoque com tratamento de resiliência por rota
  const loadStockData = useCallback(async () => {
    setLoading(true)
    try {
      // 1. Busca a lista principal
      const allRes = await api.get('/products?limit=100')
      const fetchedProducts: Product[] = allRes.data.data || allRes.data || []
      
      // Mapeia o stockStatus caso não venha calculado do backend
      const mappedProducts = fetchedProducts.map((p) => {
        const isCritical = p.quantity <= p.minQuantity
        return {
          ...p,
          stockStatus: p.stockStatus || (isCritical ? 'CRITICO' : 'OK'),
        }
      })
      
      setProducts(mappedProducts)

      // 2. Busca endpoints auxiliares de forma segura (não bloqueia a tela se falharem)
      try {
        const lowRes = await api.get('/products/low-stock')
        setLowStock(lowRes.data || [])
      } catch (err) {
        // Fallback local caso o endpoint retorne 404
        setLowStock(mappedProducts.filter((p) => p.quantity <= p.minQuantity))
      }

      try {
        const expRes = await api.get('/products/expiring')
        setExpiring(expRes.data || [])
      } catch (err) {
        setExpiring([])
      }

    } catch (err) {
      console.error('Erro ao carregar lista principal de estoque:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadStockData()
  }, [loadStockData])

  const handleSaveNewProducts = (newProducts: StockProductInput[]) => {
    const formatted: Product[] = newProducts.map((p) => ({
      id: p.id,
      name: p.name,
      quantity: p.quantity,
      minQuantity: p.minQuantity,
      expiryDate: p.expirationDate,
      stockStatus: p.quantity <= p.minQuantity ? 'CRITICO' : 'OK',
      usageCount: 0,
    }))

    setProducts((prev) => [...formatted, ...prev])
  }

  const getComputedStatus = (p: Product) => {
    if (p.stockStatus) return p.stockStatus
    return p.quantity <= p.minQuantity ? 'CRITICO' : 'OK'
  }

  const displayed = tab === 'all' ? products : tab === 'critical' ? lowStock : expiring
  const totalOk = products.filter((p) => getComputedStatus(p) === 'OK').length
  const totalCritico = products.filter((p) => {
    const status = getComputedStatus(p)
    return status === 'CRITICO' || status === 'BAIXO'
  }).length

  const topUsedProducts = products
    .filter((p) => p.usageCount && p.usageCount > 0)
    .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
    .slice(0, 5)

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
    const status = getComputedStatus(p)
    if (status === 'CRITICO' || status === 'BAIXO') {
      return { label: 'COMPRAR URGENTE', cls: styles.alertCritico, isAlert: true }
    }
    return { label: 'OK', cls: styles.alertOk, isAlert: false }
  }

  return (
    <div className={styles.page}>
      
      {/* ─── Ações de Topo ─── */}
      <div className={styles.topActionBar}>
        <p className={styles.pageSubtitle}>
          Gerencie o consumo e reposição de materiais da clínica em tempo real
        </p>
        <button 
          type="button"
          className={styles.btnPrimary} 
          onClick={() => setIsModalOpen(true)}
        >
          <Plus size={16} />
          <span>Gerenciar estoque</span>
        </button>
      </div>

      {/* ─── Cards de Métricas ─── */}
      <div className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <div className={styles.metricIconBg}>
              <Box size={20} color="var(--primary)" />
            </div>
          </div>
          <p className={styles.metricLabel}>TOTAL DE ITENS</p>
          <p className={styles.metricValue}>{products.length}</p>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <div className={styles.metricIconBgAlert}>
              <AlertTriangle size={20} color="#dc2626" />
            </div>
          </div>
          <p className={styles.metricLabel}>ITENS CRÍTICOS</p>
          <p className={`${styles.metricValue} ${styles.metricCritico}`}>{totalCritico}</p>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <div className={styles.metricIconBgSuccess}>
              <CheckCircle2 size={20} color="#16a34a" />
            </div>
          </div>
          <p className={styles.metricLabel}>EM ESTOQUE</p>
          <p className={`${styles.metricValue} ${styles.metricOk}`}>{totalOk}</p>
        </div>
      </div>

      {/* ─── Seção do Gráfico de Consumo ─── */}
      {topUsedProducts.length > 0 && (
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <div className={styles.chartTitleRow}>
              <div className={styles.titleIconBg}>
                <BarChart3 size={20} color="var(--primary)" />
              </div>
              <div>
                <h3 className={styles.chartTitle}>Materiais Mais Utilizados (Mês Atual)</h3>
                <p className={styles.chartSub}>Insumos com maior volume de saída nos atendimentos</p>
              </div>
            </div>
          </div>

          <div className={styles.chartBarsContainer}>
            {topUsedProducts.map((item) => {
              const maxUsage = topUsedProducts[0].usageCount || 1
              const percentage = Math.min(100, Math.round(((item.usageCount || 0) / maxUsage) * 100))

              return (
                <div key={item.id} className={styles.chartBarRow}>
                  <div className={styles.chartBarInfo}>
                    <span className={styles.chartBarName}>{item.name}</span>
                    <span className={styles.chartBarUsage}>
                      <TrendingDown size={14} className={styles.usageIcon} />
                      {item.usageCount} unidades consumidas
                    </span>
                  </div>
                  <div className={styles.barTrack}>
                    <div 
                      className={styles.barFill} 
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ─── Tabela Principal de Produtos ─── */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.cardTitleRow}>
            <div className={styles.titleIconBg}>
              <Package size={20} color="var(--primary)" />
            </div>
            <div>
              <h2 className={styles.cardTitle}>Controle de Estoque</h2>
              <p className={styles.cardSub}>Materiais monitorados em tempo real</p>
            </div>
          </div>
          <div className={styles.tabs}>
            <button 
              type="button"
              className={`${styles.tab} ${tab === 'all' ? styles.tabActive : ''}`} 
              onClick={() => setTab('all')}
            >
              Todos
            </button>
            <button 
              type="button"
              className={`${styles.tab} ${tab === 'critical' ? styles.tabActive : ''}`} 
              onClick={() => setTab('critical')}
            >
              Críticos ({lowStock.length})
            </button>
            <button 
              type="button"
              className={`${styles.tab} ${tab === 'expiring' ? styles.tabActive : ''}`} 
              onClick={() => setTab('expiring')}
            >
              Vencendo ({expiring.length})
            </button>
          </div>
        </div>

        {loading ? (
          <div className={styles.loading}>
            <Loader2 size={24} className={styles.spinner} />
            <span>Carregando estoque...</span>
          </div>
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
                <tr>
                  <td colSpan={5} className={styles.empty}>
                    Nenhum produto encontrado
                  </td>
                </tr>
              )}
              {displayed.map((p) => {
                const alert = getAlertLabel(p)
                const computedStatus = getComputedStatus(p)
                return (
                  <tr key={p.id} className={styles.row}>
                    <td className={styles.productName}>{p.name}</td>
                    <td>
                      <span className={`${styles.qtyBadge} ${getStockClass(computedStatus)}`}>
                        {p.quantity}
                      </span>
                    </td>
                    <td className={styles.minQty}>Min. {p.minQuantity}</td>
                    <td className={styles.expiry}>{formatDate(p.expiryDate)}</td>
                    <td>
                      <span className={`${styles.alertBadge} ${alert.cls}`}>
                        {alert.isAlert && <AlertTriangle size={12} />}
                        <span>{alert.label}</span>
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal de Gerenciamento em Abas */}
      <StockManagementModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaveProducts={handleSaveNewProducts}
        onSuccess={loadStockData}
      />
    </div>
  )
}