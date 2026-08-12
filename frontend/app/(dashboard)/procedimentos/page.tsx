'use client'

import { useEffect, useState } from 'react'
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
  Tag
} from 'lucide-react'
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
}

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

  const totalProcedures = procedures.length
  const proceduresWithRecipe = procedures.filter((p) => (p.procedureProducts?.length || 0) > 0).length
  const proceduresWithoutRecipe = totalProcedures - proceduresWithRecipe

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

  // 🧮 CUSTO FRACIONADO IGUAL AO MODAL DA FICHA TÉCNICA
  function calculateItemCost(item: ProcedureProduct) {
    const rawCost = item.product?.costPrice !== undefined && item.product?.costPrice !== null
      ? parseFloat(String(item.product.costPrice))
      : (item.product?.unitPrice ? parseFloat(String(item.product.unitPrice)) : 0)

    if (isNaN(rawCost) || rawCost <= 0) return 0

    const productStockUnit = item.product?.unit || 'UN'
    const recipeUnit = item.unit || 'UN'
    const qty = Number(item.quantity) || 0
    const itemsPerPackage = Number(item.product?.itemsPerPackage) || 1

    // 1. Caixa para Unidade
    if (productStockUnit === 'CX' && recipeUnit === 'UN') {
      const divisor = itemsPerPackage > 0 ? itemsPerPackage : 100
      return (rawCost / divisor) * qty
    }

    // 2. Unidade/Seringa para Gramas ou ML
    if (productStockUnit === 'UN' && (recipeUnit === 'G' || recipeUnit === 'ML') && itemsPerPackage > 1) {
      return (rawCost / itemsPerPackage) * qty
    }

    // 3. Litros para ML
    if (productStockUnit === 'L' && recipeUnit === 'ML') {
      return (rawCost / 1000) * qty
    }

    // 4. Grama para MG
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

  if (loading) {
    return (
      <div className={styles.loading}>
        <Loader2 size={24} className={styles.spinner} />
        <span>Carregando catálogo de procedimentos e ficha técnica...</span>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      {/* ─── KPIS METRICS ─── */}
      <div className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <div className={styles.metricIconHeader}>
            <div className={styles.metricIconBg}>
              <Stethoscope size={20} color="#06b6d4" />
            </div>
          </div>
          <p className={styles.metricLabel}>TOTAL DE PROCEDIMENTOS</p>
          <p className={styles.metricValue}>{totalProcedures}</p>
          <p className={styles.metricSub}>Procedimentos ativos na clínica</p>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricIconHeader}>
            <div className={styles.metricIconBg}>
              <Boxes size={20} color="#16a34a" />
            </div>
          </div>
          <p className={styles.metricLabel}>COM FICHA TÉCNICA</p>
          <p className={styles.metricValue}>{proceduresWithRecipe}</p>
          <p className={styles.metricSub}>Exit Inteligente Habilitado</p>
        </div>

        <div className={`${styles.metricCard} ${proceduresWithoutRecipe > 0 ? styles.metricCardAlert : ''}`}>
          <div className={styles.metricIconHeader}>
            <div className={styles.metricIconBgAlert}>
              <Layers size={20} color="#dc2626" />
            </div>
          </div>
          <p className={styles.metricLabel}>PENDENTE DE INSUMOS</p>
          <p className={styles.metricValue}>{proceduresWithoutRecipe}</p>
          <p className={styles.metricSub}>Sem baixa automática de estoque</p>
        </div>
      </div>

      {/* ─── MAIN CARD ─── */}
      <div className={styles.agendaCard}>
        <div className={styles.agendaHeader}>
          <div>
            <h2 className={styles.agendaTitle}>Catálogo de Procedimentos</h2>
            <p className={styles.agendaSub}>Gerencie precificação, duração de agendamento e a ficha técnica do estoque</p>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button className={styles.iconBtn} onClick={loadProcedures} title="Atualizar">
              <RefreshCw size={16} />
            </button>

            <button
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

        {/* CONTROLES & FILTROS */}
        <div className={styles.controlsBar}>
          <div className={styles.filterGroup}>
            <button
              onClick={() => setSelectedFilter('ALL')}
              className={`${styles.filterBtn} ${selectedFilter === 'ALL' ? styles.filterBtnActive : ''}`}
            >
              Todos ({totalProcedures})
            </button>
            <button
              onClick={() => setSelectedFilter('WITH_RECIPE')}
              className={`${styles.filterBtn} ${selectedFilter === 'WITH_RECIPE' ? styles.filterBtnActive : ''}`}
            >
              Com Ficha ({proceduresWithRecipe})
            </button>
            <button
              onClick={() => setSelectedFilter('WITHOUT_RECIPE')}
              className={`${styles.filterBtn} ${selectedFilter === 'WITHOUT_RECIPE' ? styles.filterBtnActive : ''}`}
            >
              Sem Ficha ({proceduresWithoutRecipe})
            </button>
          </div>

          <div className={styles.searchBox}>
            <Search size={16} color="#94a3b8" />
            <input
              placeholder="Buscar por nome, código ou especialidade..."
              className={styles.searchInput}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* TABELA COMPLETA & ORGANIZADA */}
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>PROCEDIMENTO / CATEGORIA</th>
                <th>CÓDIGO</th>
                <th>DURAÇÃO</th>
                <th>PREÇO VENDA</th>
                <th>CUSTO INSUMOS</th>
                <th>MARGEM ESTIMADA</th>
                <th>FICHA TÉCNICA</th>
                <th style={{ textAlign: 'right' }}>AÇÕES</th>
              </tr>
            </thead>
            <tbody>
              {filteredProcedures.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
                    Nenhum procedimento encontrado.
                  </td>
                </tr>
              ) : (
                filteredProcedures.map((proc) => {
                  const hasProducts = (proc.procedureProducts?.length || 0) > 0
                  const cost = calculateProcedureCost(proc)
                  const margin = proc.basePrice - cost

                  return (
                    <tr key={proc.id}>
                      <td>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{proc.name}</div>
                        <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                          <Tag size={11} color="#94a3b8" />
                          {proc.category || 'Dentística / Estética'}
                        </div>
                      </td>

                      <td style={{ color: '#64748b', fontSize: '13px' }}>
                        {proc.code ? <span style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>{proc.code}</span> : '—'}
                      </td>

                      <td style={{ color: '#475569', fontSize: '13px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={13} color="#94a3b8" />
                          <span>{proc.durationMin || 30} min</span>
                        </div>
                      </td>

                      <td style={{ fontWeight: 700, color: '#0f172a' }}>
                        {formatCurrency(proc.basePrice)}
                      </td>

                      <td style={{ color: cost > 0 ? '#dc2626' : '#94a3b8', fontWeight: 600 }}>
                        {cost > 0 ? formatCurrency(cost) : 'R$ 0,00'}
                      </td>

                      <td style={{ fontWeight: 700, color: margin >= 0 ? '#16a34a' : '#dc2626' }}>
                        {cost > 0 ? formatCurrency(margin) : '—'}
                      </td>

                      <td>
                        <button
                          onClick={() => {
                            setSelectedProcedureForProducts(proc)
                            setIsProductsModalOpen(true)
                          }}
                          className={`${styles.badgeBtn} ${hasProducts ? styles.badgeGreen : styles.badgeAmber}`}
                        >
                          📦 {hasProducts ? `${proc.procedureProducts?.length} insumo(s)` : '+ Configurar Ficha'}
                        </button>
                      </td>

                      <td style={{ textAlign: 'right' }}>
                        <button
                          onClick={() => {
                            setEditingProcedure(proc)
                            setIsProcedureModalOpen(true)
                          }}
                          className={styles.iconBtn}
                          style={{ border: 'none', background: 'transparent' }}
                          title="Editar Procedimento"
                        >
                          <Edit size={16} />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
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