'use client'

import { useEffect, useState, useMemo } from 'react'
import { 
  Stethoscope, 
  Boxes, 
  Layers, 
  Plus, 
  Search, 
  Edit, 
  Loader2, 
  RefreshCw,
  Clock,
  Tag,
  PieChart as PieChartIcon,
  Sparkles,
  TrendingUp
} from 'lucide-react'
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip
} from 'recharts'
import api from '@/lib/api'
import styles from './page.module.css'
import ProcedureModal from '../../components/procedimentos/ProcedureModal'
import ProcedureProductsModal from '../../components/procedimentos/ProcedureProductsModal'

interface ProcedureProduct {
  id: string
  quantity: number
  unit?: string
  product: {
    id: string
    name: string
    unit?: string
    costPrice?: number
    unitPrice?: number
    itemsPerPackage?: number
  }
}

interface Procedure {
  id: string
  name: string
  code?: string
  basePrice: number
  durationMin?: number
  category?: string
  procedureProducts?: ProcedureProduct[]
  executionCount?: number
}

const PIE_COLORS = ['#06b6d4', '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899']

export default function ProcedimentosPage() {
  const [procedures, setProcedures] = useState<Procedure[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'WITH_RECIPE' | 'WITHOUT_RECIPE'>('ALL')

  const [isProcedureModalOpen, setIsProcedureModalOpen] = useState(false)
  const [editingProcedure, setEditingProcedure] = useState<Procedure | null>(null)

  const [isProductsModalOpen, setIsProductsModalOpen] = useState(false)
  const [selectedProcedureForProducts, setSelectedProcedureForProducts] = useState<Procedure | null>(null)

  async function loadProcedures() {
    setLoading(true)
    try {
      const res = await api.get('/procedures')
      setProcedures(res.data.data || res.data || [])
    } catch (err) {
      console.error('Erro ao carregar procedimentos do banco:', err)
      setProcedures([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProcedures()
  }, [])

  // 🧮 CÁLCULO DE CUSTO DE INSUMO FRACIONADO
  function calculateItemCost(item: ProcedureProduct) {
    const rawCost = item.product?.costPrice !== undefined && item.product?.costPrice !== null
      ? parseFloat(String(item.product.costPrice))
      : (item.product?.unitPrice ? parseFloat(String(item.product.unitPrice)) : 0)

    if (isNaN(rawCost) || rawCost <= 0) return 0

    const productStockUnit = item.product?.unit || 'UN'
    const recipeUnit = item.unit || 'UN'
    const qty = Number(item.quantity) || 0
    const itemsPerPackage = Number(item.product?.itemsPerPackage) || 1

    if (productStockUnit === 'CX' && recipeUnit === 'UN') {
      const divisor = itemsPerPackage > 0 ? itemsPerPackage : 100
      return (rawCost / divisor) * qty
    }

    if (productStockUnit === 'UN' && (recipeUnit === 'G' || recipeUnit === 'ML') && itemsPerPackage > 1) {
      return (rawCost / itemsPerPackage) * qty
    }

    if (productStockUnit === 'L' && recipeUnit === 'ML') {
      return (rawCost / 1000) * qty
    }

    if (productStockUnit === 'G' && recipeUnit === 'MG') {
      return (rawCost / 1000) * qty
    }

    return rawCost * qty
  }

  function calculateProcedureCost(proc: Procedure) {
    if (!proc.procedureProducts || proc.procedureProducts.length === 0) return 0
    return proc.procedureProducts.reduce((acc, item) => {
      return acc + calculateItemCost(item)
    }, 0)
  }

  const totalProcedures = procedures.length
  const proceduresWithRecipe = procedures.filter((p) => (p.procedureProducts?.length || 0) > 0).length
  const proceduresWithoutRecipe = totalProcedures - proceduresWithRecipe

  // Margem média da clínica
  const financialMetrics = useMemo(() => {
    if (procedures.length === 0) return { avgTicket: 0, avgMarginPercent: 0 }
    
    let totalSale = 0
    let totalCost = 0

    procedures.forEach((p) => {
      totalSale += Number(p.basePrice || 0)
      totalCost += calculateProcedureCost(p)
    })

    const avgTicket = totalSale / procedures.length
    const totalProfit = totalSale - totalCost
    const avgMarginPercent = totalSale > 0 ? Math.round((totalProfit / totalSale) * 100) : 0

    return { avgTicket, avgMarginPercent }
  }, [procedures])

  // Agrupamento para Donut Chart (Mais Representativos / Lucrativos)
  const pieData = useMemo(() => {
    return procedures
      .map((p) => {
        const cost = calculateProcedureCost(p)
        const profit = Number(p.basePrice || 0) - cost
        return {
          name: p.name,
          value: Number(p.basePrice || 0),
          profit: profit > 0 ? profit : 0,
        }
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
  }, [procedures])

  const totalCatalogValue = useMemo(() => {
    return pieData.reduce((acc, curr) => acc + curr.value, 0)
  }, [pieData])

  const filteredProcedures = procedures.filter((proc) => {
    const matchesSearch =
      proc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (proc.code && proc.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (proc.category && proc.category.toLowerCase().includes(searchTerm.toLowerCase()))

    if (selectedFilter === 'WITH_RECIPE') return matchesSearch && (proc.procedureProducts?.length || 0) > 0
    if (selectedFilter === 'WITHOUT_RECIPE') return matchesSearch && (proc.procedureProducts?.length || 0) === 0
    return matchesSearch
  })

  function formatCurrency(value: number) {
    return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  return (
    <div className={styles.page}>
      {/* ─── Header da Página ─── */}
      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderInfo}>
          <span className={styles.headerTag}>ODONTOFLOW • CATÁLOGO & PRECIFICAÇÃO</span>
          <p className={styles.pageSubtitle}>
            Tabela de preços, controle de margem por insumos e parametrização do Exit Inteligente de estoque.
          </p>
        </div>

        <div className={styles.headerActions}>
          <button className={styles.iconBtn} onClick={loadProcedures} title="Sincronizar Procedimentos">
            <RefreshCw size={15} />
          </button>
          <button
            type="button"
            className={styles.newBtn}
            onClick={() => {
              setEditingProcedure(null)
              setIsProcedureModalOpen(true)
            }}
          >
            <Plus size={16} />
            <span>Novo Procedimento</span>
          </button>
        </div>
      </div>

      {/* ─── KPIS METRICS ─── */}
      <div className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <span className={styles.metricLabel}>TOTAL DE PROCEDIMENTOS</span>
            <div className={`${styles.metricIconBg} ${styles.iconCyan}`}>
              <Stethoscope size={18} />
            </div>
          </div>
          <p className={styles.metricValue}>{totalProcedures}</p>
          <p className={styles.metricSub}>Procedimentos ativos no catálogo</p>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <span className={styles.metricLabel}>COM FICHA TÉCNICA</span>
            <div className={`${styles.metricIconBg} ${styles.iconGreen}`}>
              <Boxes size={18} />
            </div>
          </div>
          <p className={`${styles.metricValue} ${styles.textGreen}`}>{proceduresWithRecipe}</p>
          <p className={styles.metricSub}>Baixa inteligente de estoque ativa</p>
        </div>

        <div className={`${styles.metricCard} ${proceduresWithoutRecipe > 0 ? styles.metricCardAlert : ''}`}>
          <div className={styles.metricHeader}>
            <span className={styles.metricLabel}>PENDENTE DE INSUMOS</span>
            <div className={`${styles.metricIconBg} ${styles.iconRed}`}>
              <Layers size={18} />
            </div>
          </div>
          <p className={`${styles.metricValue} ${styles.textRed}`}>{proceduresWithoutRecipe}</p>
          <p className={styles.metricSub}>Sem automatização de materiais</p>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <span className={styles.metricLabel}>MARGEM MÉDIA ESTIMADA</span>
            <div className={`${styles.metricIconBg} ${styles.iconSlate}`}>
              <TrendingUp size={18} />
            </div>
          </div>
          <p className={`${styles.metricValue} ${styles.textCyan}`}>{financialMetrics.avgMarginPercent}%</p>
          <p className={styles.metricSub}>Rentabilidade bruta dos serviços</p>
        </div>
      </div>

      {/* ─── GRID ANALÍTICO (DONUT CHART & PERFORMANCE) ─── */}
      <div className={styles.analyticsGrid}>
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <div className={styles.chartTitleWrapper}>
              <PieChartIcon size={18} className={styles.textCyan} />
              <h4>Representatividade por Procedimento</h4>
            </div>
            <span className={styles.chartBadge}>Tabela de Venda</span>
          </div>

          <div className={styles.pieContainer}>
            {pieData.length === 0 ? (
              <div className={styles.emptyStateContainer}>
                <p className={styles.emptyChartTitle}>Nenhum procedimento catalogado</p>
                <p className={styles.emptyChartSub}>Cadastre novos serviços para visualizar a curva de preços.</p>
              </div>
            ) : (
              <div className={styles.pieContent}>
                <div className={styles.chartWrapper}>
                  <ResponsiveContainer width="100%" height={190}>
                    <PieChart>
                      <Tooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload
                            return (
                              <div className={styles.customTooltip}>
                                <span className={styles.tooltipName}>{data.name}</span>
                                <span className={styles.tooltipValue}>{formatCurrency(data.value)} (Lucro: {formatCurrency(data.profit)})</span>
                              </div>
                            )
                          }
                          return null
                        }}
                      />
                      <Pie
                        data={pieData}
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {pieData.map((_, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={index === 0 ? 'var(--primary-color, #06b6d4)' : PIE_COLORS[index % PIE_COLORS.length]} 
                          />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  
                  <div className={styles.donutCenter}>
                    <strong>{totalProcedures}</strong>
                    <span>Serviços</span>
                  </div>
                </div>

                <div className={styles.legendList}>
                  {pieData.map((item, idx) => {
                    const percent = totalCatalogValue > 0 ? Math.round((item.value / totalCatalogValue) * 100) : 0
                    const color = idx === 0 ? 'var(--primary-color, #06b6d4)' : PIE_COLORS[idx % PIE_COLORS.length]

                    return (
                      <div key={item.name} className={styles.legendItem}>
                        <div className={styles.legendLeft}>
                          <span className={styles.legendDot} style={{ background: color }} />
                          <span className={styles.legendName} title={item.name}>{item.name}</span>
                        </div>
                        <span className={styles.legendPercent}>{percent}%</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className={styles.conversionCard}>
          <div className={styles.conversionHeader}>
            <div className={styles.conversionIconBg}>
              <Sparkles size={20} />
            </div>
            <div>
              <h4 className={styles.conversionTitle}>Gestão de Markup Clínico</h4>
              <p className={styles.conversionSub}>Equilíbrio de custos e receitas</p>
            </div>
          </div>

          <div className={styles.conversionStats}>
            <div className={styles.statBox}>
              <span className={styles.statLabel}>Ticket Médio da Tabela</span>
              <strong className={styles.statValue}>{formatCurrency(financialMetrics.avgTicket)}</strong>
            </div>
            <div className={styles.statBox}>
              <span className={styles.statLabel}>Automação de Baixa</span>
              <strong className={styles.statValue}>
                {totalProcedures > 0 ? Math.round((proceduresWithRecipe / totalProcedures) * 100) : 0}%
              </strong>
            </div>
          </div>

          <div className={styles.progressContainer}>
            <div className={styles.progressTop}>
              <span>Cobertura de Ficha Técnica</span>
              <strong>{proceduresWithRecipe} de {totalProcedures} com baixa</strong>
            </div>
            <div className={styles.progressTrack}>
              <div 
                className={styles.progressBar} 
                style={{ width: `${totalProcedures > 0 ? (proceduresWithRecipe / totalProcedures) * 100 : 0}%` }} 
              />
            </div>
          </div>
        </div>
      </div>

      {/* ─── CARD PRINCIPAL DA TABELA ─── */}
      <div className={styles.agendaCard}>
        <div className={styles.controlsBar}>
          <div className={styles.filterGroup}>
            <button
              type="button"
              onClick={() => setSelectedFilter('ALL')}
              className={`${styles.filterBtn} ${selectedFilter === 'ALL' ? styles.filterBtnActive : ''}`}
            >
              Todos ({totalProcedures})
            </button>
            <button
              type="button"
              onClick={() => setSelectedFilter('WITH_RECIPE')}
              className={`${styles.filterBtn} ${selectedFilter === 'WITH_RECIPE' ? styles.filterBtnActive : ''}`}
            >
              Com Ficha ({proceduresWithRecipe})
            </button>
            <button
              type="button"
              onClick={() => setSelectedFilter('WITHOUT_RECIPE')}
              className={`${styles.filterBtn} ${selectedFilter === 'WITHOUT_RECIPE' ? styles.filterBtnActive : ''}`}
            >
              Sem Ficha ({proceduresWithoutRecipe})
            </button>
          </div>

          <div className={styles.searchBox}>
            <Search size={15} color="#94a3b8" />
            <input
              placeholder="Buscar procedimento, código ou especialidade..."
              className={styles.searchInput}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className={styles.loading}>
            <Loader2 size={24} className={styles.spinner} />
            <span>Carregando catálogo clínico...</span>
          </div>
        ) : (
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: '28%' }}>PROCEDIMENTO / CATEGORIA</th>
                  <th style={{ width: '10%' }}>CÓDIGO</th>
                  <th style={{ width: '12%' }}>DURAÇÃO</th>
                  <th style={{ width: '13%' }}>PREÇO VENDA</th>
                  <th style={{ width: '13%' }}>CUSTO INSUMOS</th>
                  <th style={{ width: '13%' }}>MARGEM ESTIMADA</th>
                  <th style={{ width: '13%' }}>FICHA TÉCNICA</th>
                  <th style={{ width: '5%', textAlign: 'right' }}>AÇÕES</th>
                </tr>
              </thead>
              <tbody>
                {filteredProcedures.length === 0 ? (
                  <tr>
                    <td colSpan={8} className={styles.empty}>
                      Nenhum procedimento encontrado.
                    </td>
                  </tr>
                ) : (
                  filteredProcedures.map((proc) => {
                    const hasProducts = (proc.procedureProducts?.length || 0) > 0
                    const cost = calculateProcedureCost(proc)
                    const margin = Number(proc.basePrice || 0) - cost

                    return (
                      <tr key={proc.id} className={styles.row}>
                        <td>
                          <div className={styles.procName}>{proc.name}</div>
                          <div className={styles.procCategory}>
                            <Tag size={11} color="#94a3b8" />
                            <span>{proc.category || 'Dentística / Clínica Geral'}</span>
                          </div>
                        </td>

                        <td>
                          {proc.code ? (
                            <span className={styles.codeBadge}>{proc.code}</span>
                          ) : (
                            <span style={{ color: '#cbd5e1' }}>—</span>
                          )}
                        </td>

                        <td style={{ color: '#64748b', fontSize: '13px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <Clock size={13} color="#94a3b8" />
                            <span>{proc.durationMin || 30} min</span>
                          </div>
                        </td>

                        <td className={styles.salePriceCell}>
                          {formatCurrency(proc.basePrice)}
                        </td>

                        <td className={cost > 0 ? styles.costActive : styles.costMuted}>
                          {cost > 0 ? formatCurrency(cost) : 'R$ 0,00'}
                        </td>

                        <td className={margin >= 0 ? styles.marginPositive : styles.marginNegative}>
                          {cost > 0 ? formatCurrency(margin) : '—'}
                        </td>

                        <td>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedProcedureForProducts(proc)
                              setIsProductsModalOpen(true)
                            }}
                            className={`${styles.badgeBtn} ${hasProducts ? styles.badgeGreen : styles.badgeAmber}`}
                            title="Configurar baixa de insumos"
                          >
                            📦 {hasProducts ? `${proc.procedureProducts?.length} insumo(s)` : '+ Configurar'}
                          </button>
                        </td>

                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingProcedure(proc)
                              setIsProcedureModalOpen(true)
                            }}
                            className={styles.actionBtn}
                            title="Editar Procedimento"
                          >
                            <Edit size={14} />
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isProcedureModalOpen && (
        <ProcedureModal
          isOpen={isProcedureModalOpen}
          onClose={() => setIsProcedureModalOpen(false)}
          procedure={editingProcedure}
          onSuccess={loadProcedures}
        />
      )}

      {isProductsModalOpen && selectedProcedureForProducts && (
        <ProcedureProductsModal
          isOpen={isProductsModalOpen}
          onClose={() => setIsProductsModalOpen(false)}
          procedure={selectedProcedureForProducts}
          onSuccess={loadProcedures}
        />
      )}
    </div>
  )
}