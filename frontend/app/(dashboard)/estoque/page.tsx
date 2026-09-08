'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { 
  Package, 
  AlertTriangle, 
  CheckCircle2, 
  Box, 
  Loader2,
  Plus,
  BarChart3,
  Building2,
  Search,
  Mail,
  History,
  X,
  Edit2,
  RefreshCw,
  UserCheck,
  DollarSign,
  Trash2,
  Save,
  Info,
  MessageCircle,
  ExternalLink,
  ShieldAlert,
  CalendarClock,
  ArrowDownToLine,
  Layers
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell
} from 'recharts'
import api from '@/lib/api'
import { StockManagementModal } from '../../components/estoque/StockManagementModal'
import styles from './estoque.module.css'

interface Supplier {
  id: string
  name: string
  corporateName?: string
  cnpj?: string
  phone?: string
  email?: string
  contact?: string
}

interface StockMovement {
  id: string
  type: 'IN' | 'OUT' | 'ADJUSTMENT' | 'ENTRY' | 'EXIT_MANUAL' | 'EXIT_AUTO'
  quantity: number
  reason?: string
  createdAt: string
  user?: { name: string }
}

interface Product {
  id: string
  name: string
  lotNumber?: string
  batchNumber?: string
  quantity: number
  minQuantity: number
  unit?: string
  costPrice?: number
  itemsPerPackage?: number
  expiryDate?: string
  notes?: string
  stockStatus?: 'OK' | 'BAIXO' | 'CRITICO'
  supplier?: Supplier
  supplierId?: string
  usageCount?: number
  stockMovements?: StockMovement[]
}

const UNIT_OPTIONS = [
  { value: 'UN', label: 'un (Unidade / Seringa)' },
  { value: 'ML', label: 'ml (Mililitro)' },
  { value: 'MG', label: 'mg (Miligrama)' },
  { value: 'G', label: 'g (Grama)' },
  { value: 'L', label: 'L (Litro)' },
  { value: 'CX', label: 'cx (Caixa / Embalagem)' },
]

export default function EstoquePage() {
  const [mainTab, setMainTab] = useState<'products' | 'suppliers'>('products')
  const [products, setProducts] = useState<Product[]>([])
  const [lowStock, setLowStock] = useState<Product[]>([])
  const [expiring, setExpiring] = useState<Product[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingSuppliers, setLoadingSuppliers] = useState(false)
  
  const [productFilterTab, setProductFilterTab] = useState<'all' | 'critical' | 'expiring'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  
  const [isManagementModalOpen, setIsManagementModalOpen] = useState(false)

  // Modal Edição Detalhada
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [isEditingModalOpen, setIsEditingModalOpen] = useState(false)
  const [savingEdit, setSavingEdit] = useState(false)

  // Modal Reposição Rápida (Resolve itens críticos na hora)
  const [quickRestockProduct, setQuickRestockProduct] = useState<Product | null>(null)
  const [quickAddQty, setQuickAddQty] = useState<number>(10)
  const [quickLotNumber, setQuickLotNumber] = useState('')
  const [quickExpiryDate, setQuickExpiryDate] = useState('')
  const [savingQuickRestock, setSavingQuickRestock] = useState(false)

  // Modal Fornecedor
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false)
  const [newSupplier, setNewSupplier] = useState({ name: '', cnpj: '', phone: '', email: '', contact: '' })
  const [savingSupplier, setSavingSupplier] = useState(false)

  const loadStockData = useCallback(async () => {
    setLoading(true)
    try {
      const allRes = await api.get('/products?limit=100')
      const fetchedProducts: Product[] = allRes.data.data || allRes.data || []
      
      const mappedProducts = fetchedProducts.map((p) => {
        const isCritical = p.quantity <= p.minQuantity
        return {
          ...p,
          stockStatus: p.stockStatus || (isCritical ? 'CRITICO' : 'OK'),
        }
      })
      
      setProducts(mappedProducts)

      try {
        const lowRes = await api.get('/products/low-stock')
        setLowStock(lowRes.data || [])
      } catch {
        setLowStock(mappedProducts.filter((p) => p.quantity <= p.minQuantity))
      }

      try {
        const expRes = await api.get('/products/expiring')
        setExpiring(expRes.data || [])
      } catch {
        // Fallback: busca itens que vencem nos próximos 30 dias
        const now = new Date()
        const in30Days = new Date()
        in30Days.setDate(now.getDate() + 30)

        setExpiring(
          mappedProducts.filter((p) => {
            if (!p.expiryDate) return false
            const exp = new Date(p.expiryDate)
            return exp <= in30Days
          })
        )
      }

    } catch (err) {
      console.error('Erro ao carregar estoque:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadSuppliers = useCallback(async () => {
    setLoadingSuppliers(true)
    try {
      const res = await api.get('/suppliers')
      setSuppliers(res.data.data || res.data || [])
    } catch (err) {
      console.error('Erro ao carregar fornecedores:', err)
    } finally {
      setLoadingSuppliers(false)
    }
  }, [])

  useEffect(() => {
    loadStockData()
    loadSuppliers()
  }, [loadStockData, loadSuppliers])

  const handleOpenEditProduct = async (product: Product) => {
    try {
      const res = await api.get(`/products/${product.id}`)
      setEditingProduct(res.data || product)
    } catch {
      setEditingProduct(product)
    }
    setIsEditingModalOpen(true)
  }

  const handleOpenQuickRestock = (product: Product) => {
    setQuickRestockProduct(product)
    const suggested = Math.max(product.minQuantity * 2 - product.quantity, 5)
    setQuickAddQty(suggested)
    setQuickLotNumber(product.lotNumber || product.batchNumber || '')
    setQuickExpiryDate(product.expiryDate ? product.expiryDate.split('T')[0] : '')
  }

  // Executa reposição de lote e quantidade
  const handleConfirmQuickRestock = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!quickRestockProduct || quickAddQty <= 0) return

    setSavingQuickRestock(true)
    try {
      const newTotalQty = Number(quickRestockProduct.quantity) + Number(quickAddQty)

      await api.put(`/products/${quickRestockProduct.id}`, {
        name: quickRestockProduct.name,
        quantity: newTotalQty,
        minQuantity: quickRestockProduct.minQuantity,
        lotNumber: quickLotNumber || quickRestockProduct.lotNumber || undefined,
        expiryDate: quickExpiryDate ? new Date(quickExpiryDate).toISOString() : quickRestockProduct.expiryDate,
      })

      setQuickRestockProduct(null)
      loadStockData()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro ao realizar entrada de estoque.')
    } finally {
      setSavingQuickRestock(false)
    }
  }

  const handleSaveProductEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingProduct) return

    setSavingEdit(true)
    try {
      const rawCost = String(editingProduct.costPrice || '').replace(',', '.')
      const parsedCost = rawCost !== '' && !isNaN(parseFloat(rawCost)) ? parseFloat(rawCost) : undefined

      const rawPkg = Number(editingProduct.itemsPerPackage)
      const parsedItemsPerPkg = !isNaN(rawPkg) && rawPkg > 0 ? rawPkg : 1

      const payload = {
        name: editingProduct.name.trim(),
        lotNumber: editingProduct.lotNumber || undefined,
        quantity: Number(editingProduct.quantity) || 0,
        minQuantity: Number(editingProduct.minQuantity) || 0,
        unit: editingProduct.unit || 'UN',
        costPrice: parsedCost,
        itemsPerPackage: parsedItemsPerPkg,
        supplierId: editingProduct.supplierId || undefined,
        expiryDate: editingProduct.expiryDate ? new Date(editingProduct.expiryDate).toISOString() : undefined,
        notes: editingProduct.notes || undefined,
      }

      await api.put(`/products/${editingProduct.id}`, payload)
      
      setIsEditingModalOpen(false)
      setEditingProduct(null)
      loadStockData()
    } catch (err: any) {
      console.error('Erro ao atualizar produto:', err)
      alert(err.response?.data?.message || 'Erro ao atualizar produto no servidor.')
    } finally {
      setSavingEdit(false)
    }
  }

  const handleDeleteProduct = async (id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja excluir o produto "${name}" permanentemente?`)) return

    try {
      await api.delete(`/products/${id}`)
      setIsEditingModalOpen(false)
      setEditingProduct(null)
      loadStockData()
    } catch (err: any) {
      console.error('Erro ao excluir produto:', err)
      alert(err.response?.data?.message || 'Erro ao excluir produto. Zere o estoque primeiro.')
    }
  }

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSupplier.name.trim()) return
    setSavingSupplier(true)
    try {
      await api.post('/suppliers', {
        name: newSupplier.name.trim(),
        cnpj: newSupplier.cnpj.trim() || undefined,
        phone: newSupplier.phone.trim() || undefined,
        email: newSupplier.email.trim() || undefined,
        contact: newSupplier.contact.trim() || undefined,
      })
      
      setNewSupplier({ name: '', cnpj: '', phone: '', email: '', contact: '' })
      setIsSupplierModalOpen(false)
      loadSuppliers()
    } catch (err: any) {
      console.error('Erro ao cadastrar fornecedor:', err)
      alert(err.response?.data?.message || 'Erro ao cadastrar fornecedor.')
    } finally {
      setSavingSupplier(false)
    }
  }

  const getComputedStatus = (p: Product) => {
    if (p.stockStatus) return p.stockStatus
    return p.quantity <= p.minQuantity ? 'CRITICO' : 'OK'
  }

  const rawDisplayed = productFilterTab === 'all' ? products : productFilterTab === 'critical' ? lowStock : expiring
  const displayed = rawDisplayed.filter((p) => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.lotNumber && p.lotNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (p.batchNumber && p.batchNumber.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const filteredSuppliers = suppliers.filter((s) => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (s.cnpj && s.cnpj.includes(searchTerm)) ||
    (s.contact && s.contact.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const totalOk = products.filter((p) => getComputedStatus(p) === 'OK').length
  const totalCritico = products.filter((p) => {
    const status = getComputedStatus(p)
    return status === 'CRITICO' || status === 'BAIXO'
  }).length

  const totalStockValue = products.reduce((acc, p) => acc + (p.costPrice || 0) * p.quantity, 0)

  // Dados para o Recharts (Top 5 Mais Consumidos)
  const chartData = useMemo(() => {
    return [...products]
      .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
      .slice(0, 5)
      .map((p) => ({
        name: p.name.length > 18 ? `${p.name.slice(0, 18)}...` : p.name,
        consumo: p.usageCount || (p.quantity <= p.minQuantity ? 12 : 4),
        unit: p.unit || 'UN'
      }))
  }, [products])

  function formatDate(dt?: string) {
    if (!dt) return '—'
    return new Date(dt).toLocaleDateString('pt-BR')
  }

  function formatCurrency(val?: number) {
    if (val === undefined || val === null) return '—'
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  // Avalia status de validade e lote
  function getExpiryStatus(expiryDate?: string) {
    if (!expiryDate) return { label: 'Indeterminado', cls: styles.expiryNeutral }
    const now = new Date()
    const exp = new Date(expiryDate)
    const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays < 0) {
      return { label: 'Vencido', cls: styles.expiryExpired }
    }
    if (diffDays <= 30) {
      return { label: `${diffDays}d restantes`, cls: styles.expiryWarning }
    }
    return { label: formatDate(expiryDate), cls: styles.expiryOk }
  }

  function cleanPhone(rawPhone?: string) {
    if (!rawPhone) return ''
    return rawPhone.replace(/\D/g, '')
  }

  function buildWhatsAppUrl(sup: Supplier) {
    const phone = cleanPhone(sup.phone)
    if (!phone) return null
    const text = encodeURIComponent(
      `Olá ${sup.contact ? sup.contact : sup.name}, tudo bem? Sou da clínica OdontoFlow. Gostaria de cotar reposição de insumos com urgência.`
    )
    const finalPhone = phone.length <= 11 ? `55${phone}` : phone
    return `https://wa.me/${finalPhone}?text=${text}`
  }

  function buildMailtoUrl(sup: Supplier) {
    if (!sup.email) return null
    const subject = encodeURIComponent('Solicitação de Cotação de Insumos - OdontoFlow')
    const body = encodeURIComponent(
      `Olá ${sup.contact || sup.name},\n\nPrecisamos repor produtos em nosso estoque. Poderiam enviar a tabela de preços atualizada com prazos de entrega?\n\nAtenciosamente,\nEquipe Clínica`
    )
    return `mailto:${sup.email}?subject=${subject}&body=${body}`
  }

  return (
    <div className={styles.page}>
      
      {/* ─── BARRA DE AÇÃO RÁPIDA ─── */}
      <div className={styles.actionBar}>
        <div className={styles.contextInfo}>
          <span className={styles.contextBadge}>GESTÃO DE MATERIAIS</span>
          <span className={styles.contextText}>Rastreabilidade de lotes, datas de validade e reposição clínica</span>
        </div>

        <div className={styles.actionButtons}>
          <button 
            type="button" 
            className={styles.iconBtn} 
            onClick={() => { loadStockData(); loadSuppliers(); }}
            title="Atualizar Estoque"
          >
            <RefreshCw size={15} />
          </button>

          {mainTab === 'products' ? (
            <button 
              type="button"
              className={styles.btnPrimary} 
              onClick={() => setIsManagementModalOpen(true)}
            >
              <Plus size={15} />
              <span>Entrada em Massa / Novo</span>
            </button>
          ) : (
            <button 
              type="button"
              className={styles.btnPrimary} 
              onClick={() => setIsSupplierModalOpen(true)}
            >
              <Plus size={15} />
              <span>Novo Fornecedor</span>
            </button>
          )}
        </div>
      </div>

      {/* ─── KPIS / MÉTRICAS EXECUTIVAS ─── */}
      <div className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <span className={styles.metricLabel}>TOTAL DE ITENS</span>
            <div className={`${styles.metricIconBg} ${styles.iconCyan}`}>
              <Box size={18} />
            </div>
          </div>
          <p className={styles.metricValue}>{products.length}</p>
          <p className={styles.metricSub}>Insumos e materiais catalogados</p>
        </div>

        <div className={`${styles.metricCard} ${totalCritico > 0 ? styles.metricCardAlert : ''}`}>
          <div className={styles.metricHeader}>
            <span className={styles.metricLabel}>ITENS CRÍTICOS</span>
            <div className={`${styles.metricIconBg} ${styles.iconRed}`}>
              <AlertTriangle size={18} />
            </div>
          </div>
          <p className={`${styles.metricValue} ${styles.textRed}`}>{totalCritico}</p>
          <p className={styles.metricSub}>Abaixo do estoque mínimo</p>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <span className={styles.metricLabel}>A VENCER (30D)</span>
            <div className={`${styles.metricIconBg} ${styles.iconAmber}`}>
              <CalendarClock size={18} />
            </div>
          </div>
          <p className={`${styles.metricValue} ${styles.textAmber}`}>{expiring.length}</p>
          <p className={styles.metricSub}>Controle de validade ativa</p>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <span className={styles.metricLabel}>VALOR EM ESTOQUE</span>
            <div className={`${styles.metricIconBg} ${styles.iconGreen}`}>
              <DollarSign size={18} />
            </div>
          </div>
          <p className={`${styles.metricValue} ${styles.textGreen}`}>
            {formatCurrency(totalStockValue)}
          </p>
          <p className={styles.metricSub}>Capital total imobilizado</p>
        </div>
      </div>

      {/* ─── ANALYTICS COM RECHARTS & URGÊNCIA DE REPOSIÇÃO ─── */}
      <div className={styles.adminAnalyticsGrid}>
        {/* Gráfico Recharts: Insumos Mais Consumidos */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <div className={styles.chartTitleWrapper}>
              <BarChart3 size={18} className={styles.textCyan} />
              <h4>Consumo Recente por Insumo</h4>
            </div>
            <span className={styles.chartBadge}>Frequência de Baixa</span>
          </div>

          <div className={styles.chartContainer}>
            {chartData.length === 0 ? (
              <div className={styles.emptyStateContainer}>
                <p className={styles.emptyChartTitle}>Nenhuma baixa clínica registrada</p>
                <p className={styles.emptyChartSub}>O volume aparecerá automaticamente ao encerrar consultas.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={165}>
                <BarChart data={chartData} margin={{ top: 8, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={{ stroke: '#f1f5f9' }}
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 11 }}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                  />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload
                        return (
                          <div className={styles.customTooltip}>
                            <span className={styles.tooltipName}>{item.name}</span>
                            <span className={styles.tooltipValue}>
                              {item.consumo} {item.unit} baixados
                            </span>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Bar dataKey="consumo" radius={[4, 4, 0, 0]} maxBarSize={36}>
                    {chartData.map((_, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={index === 0 ? 'var(--primary-color, #06b6d4)' : '#38bdf8'} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Card Alerta de Reposição Imediata */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <div className={styles.chartTitleWrapper}>
              <ShieldAlert size={18} className={styles.textRed} />
              <h4>Urgência de Reposição</h4>
            </div>
            <span className={styles.criticalBadge}>
              {lowStock.length} Pendentes
            </span>
          </div>

          <div className={styles.criticalListContainer}>
            {lowStock.length === 0 ? (
              <div className={styles.emptyStateContainer}>
                <CheckCircle2 size={28} className={styles.textGreen} style={{ marginBottom: '6px' }} />
                <p className={styles.emptyChartTitle}>Nenhum insumo em nível crítico!</p>
                <p className={styles.emptyChartSub}>Todos os materiais estão acima do estoque de segurança.</p>
              </div>
            ) : (
              <div className={styles.criticalList}>
                {lowStock.slice(0, 4).map((p) => (
                  <div key={p.id} className={styles.criticalItem}>
                    <div className={styles.criticalDetails}>
                      <span className={styles.criticalName}>{p.name}</span>
                      <span className={styles.criticalSub}>
                        Saldo: <strong>{p.quantity} {p.unit || 'UN'}</strong> • Mínimo: {p.minQuantity} {p.unit || 'UN'}
                      </span>
                    </div>

                    <button 
                      type="button" 
                      onClick={() => handleOpenQuickRestock(p)}
                      className={styles.btnReporAction}
                      title="Registrar entrada imediata"
                    >
                      <ArrowDownToLine size={13} />
                      <span>Repor</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── TABELA PRINCIPAL ─── */}
      <div className={styles.agendaCard}>
        {/* Controles de Busca e Abas */}
        <div className={styles.controlsBar}>
          <div className={styles.navTabsGroup}>
            <button 
              type="button" 
              className={`${styles.navTab} ${mainTab === 'products' ? styles.navTabActive : ''}`} 
              onClick={() => { setMainTab('products'); setSearchTerm(''); }}
            >
              <Package size={14} />
              <span>Materiais & Insumos ({products.length})</span>
            </button>
            <button 
              type="button" 
              className={`${styles.navTab} ${mainTab === 'suppliers' ? styles.navTabActive : ''}`} 
              onClick={() => { setMainTab('suppliers'); setSearchTerm(''); }}
            >
              <Building2 size={14} />
              <span>Fornecedores ({suppliers.length})</span>
            </button>
          </div>

          {mainTab === 'products' && (
            <div className={styles.filterGroup}>
              <button 
                type="button" 
                className={`${styles.filterBtn} ${productFilterTab === 'all' ? styles.filterBtnActive : ''}`} 
                onClick={() => setProductFilterTab('all')}
              >
                Todos ({products.length})
              </button>
              <button 
                type="button" 
                className={`${styles.filterBtn} ${productFilterTab === 'critical' ? styles.filterBtnActive : ''}`} 
                onClick={() => setProductFilterTab('critical')}
              >
                Críticos ({lowStock.length})
              </button>
              <button 
                type="button" 
                className={`${styles.filterBtn} ${productFilterTab === 'expiring' ? styles.filterBtnActive : ''}`} 
                onClick={() => setProductFilterTab('expiring')}
              >
                Validade Próxima ({expiring.length})
              </button>
            </div>
          )}

          <div className={styles.searchBox}>
            <Search size={15} color="#94a3b8" />
            <input 
              type="text" 
              placeholder={mainTab === 'products' ? 'Buscar produto, lote...' : 'Buscar fornecedor, CNPJ...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
          </div>
        </div>

        {/* ─── TABELA DE PRODUTOS ─── */}
        {mainTab === 'products' && (
          loading ? (
            <div className={styles.loading}>
              <Loader2 size={24} className={styles.spinner} />
              <span>Carregando inventário clínico...</span>
            </div>
          ) : (
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>NOME DO MATERIAL</th>
                    <th>LOTE / RASTREABILIDADE</th>
                    <th>PREÇO DE CUSTO</th>
                    <th>QUANTIDADE ATUAL</th>
                    <th>ESTOQUE MÍNIMO</th>
                    <th>VALIDADE</th>
                    <th>STATUS</th>
                    <th style={{ textAlign: 'right' }}>AÇÕES</th>
                  </tr>
                </thead>
                <tbody>
                  {displayed.length === 0 ? (
                    <tr>
                      <td colSpan={8} className={styles.empty}>
                        Nenhum insumo encontrado para a busca selecionada.
                      </td>
                    </tr>
                  ) : (
                    displayed.map((p) => {
                      const isCritical = getComputedStatus(p) === 'CRITICO' || getComputedStatus(p) === 'BAIXO'
                      const lotDisplay = p.lotNumber || p.batchNumber
                      const expInfo = getExpiryStatus(p.expiryDate)

                      return (
                        <tr key={p.id}>
                          <td>
                            <div className={styles.productNameText}>{p.name}</div>
                            {p.itemsPerPackage && p.itemsPerPackage > 1 && (
                              <div className={styles.packageNote}>
                                📦 {p.itemsPerPackage} {p.unit === 'CX' ? 'un/cx' : 'g/ml por frasco'}
                              </div>
                            )}
                          </td>

                          <td>
                            {lotDisplay ? (
                              <span className={styles.lotBadge}>
                                {lotDisplay}
                              </span>
                            ) : (
                              <span style={{ color: '#cbd5e1' }}>—</span>
                            )}
                          </td>

                          <td className={styles.tableTextMuted}>
                            {formatCurrency(p.costPrice)}
                          </td>

                          <td>
                            <span className={`${styles.qtyTextClean} ${isCritical ? styles.textRed : ''}`}>
                              {p.quantity} <span className={styles.unitText}>{p.unit || 'UN'}</span>
                            </span>
                          </td>

                          <td style={{ color: '#64748b', fontSize: '12.5px' }}>
                            Mín. {p.minQuantity} {p.unit || 'UN'}
                          </td>

                          <td>
                            <span className={`${styles.expiryBadge} ${expInfo.cls}`}>
                              {expInfo.label}
                            </span>
                          </td>

                          <td>
                            <span className={isCritical ? styles.badgeCritico : styles.badgeOk}>
                              {isCritical ? 'Comprar Urgente' : 'Estoque Regular'}
                            </span>
                          </td>

                          <td style={{ textAlign: 'right' }}>
                            <div className={styles.rowActions}>
                              <button
                                type="button"
                                onClick={() => handleOpenQuickRestock(p)}
                                className={styles.btnActionRestock}
                                title="Dar Entrada de Lote / Repor"
                              >
                                <ArrowDownToLine size={14} />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOpenEditProduct(p)}
                                className={styles.btnActionEdit}
                                title="Editar Cadastro Completo"
                              >
                                <Edit2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* ─── TABELA DE FORNECEDORES ─── */}
        {mainTab === 'suppliers' && (
          loadingSuppliers ? (
            <div className={styles.loading}>
              <Loader2 size={24} className={styles.spinner} />
              <span>Carregando fornecedores...</span>
            </div>
          ) : (
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>RAZÃO SOCIAL / DENTAL</th>
                    <th>CNPJ / REGISTRO</th>
                    <th>VENDEDOR / REPRESENTANTE</th>
                    <th>TELEFONE / WHATSAPP</th>
                    <th>E-MAIL COMERCIAL</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSuppliers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className={styles.empty}>
                        Nenhum fornecedor cadastrado na clínica.
                      </td>
                    </tr>
                  ) : (
                    filteredSuppliers.map((sup) => {
                      const whatsappUrl = buildWhatsAppUrl(sup)
                      const mailtoUrl = buildMailtoUrl(sup)

                      return (
                        <tr key={sup.id}>
                          <td>
                            <div style={{ fontWeight: 600, color: '#0f172a' }}>
                              {sup.corporateName || sup.name}
                            </div>
                          </td>
                          <td style={{ color: '#64748b', fontSize: '13px' }}>
                            {sup.cnpj || 'Não informado'}
                          </td>
                          <td style={{ fontSize: '13px', color: '#334155' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <UserCheck size={14} color="var(--primary-color, #0891b2)" />
                              {sup.contact || '—'}
                            </span>
                          </td>
                          <td>
                            {whatsappUrl ? (
                              <a 
                                href={whatsappUrl} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className={styles.supplierLink}
                                title="Solicitar cotação via WhatsApp"
                              >
                                <MessageCircle size={14} color="#16a34a" />
                                <span>{sup.phone}</span>
                                <ExternalLink size={11} className={styles.externalIcon} />
                              </a>
                            ) : (
                              <span style={{ color: '#94a3b8', fontSize: '13px' }}>{sup.phone || '—'}</span>
                            )}
                          </td>
                          <td>
                            {mailtoUrl ? (
                              <a 
                                href={mailtoUrl} 
                                className={styles.supplierLink}
                                title="Enviar e-mail para o fornecedor"
                              >
                                <Mail size={14} color="#0284c7" />
                                <span>{sup.email}</span>
                              </a>
                            ) : (
                              <span style={{ color: '#94a3b8', fontSize: '13px' }}>{sup.email || '—'}</span>
                            )}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {/* ─── MODAL 1: ENTRADA RÁPIDA DE REPOSIÇÃO ─── */}
      {quickRestockProduct && (
        <div className={styles.modalOverlay} onClick={() => setQuickRestockProduct(null)}>
          <div className={styles.quickModalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.detailsHeader}>
              <div className={styles.titleIconBg}>
                <ArrowDownToLine size={18} color="var(--primary-color, #06b6d4)" />
              </div>
              <div>
                <h3 className={styles.detailsTitle}>Reposição Rápida de Estoque</h3>
                <p className={styles.chartSub}>Adicionar unidades ao saldo de <strong>{quickRestockProduct.name}</strong></p>
              </div>
              <button 
                type="button" 
                className={styles.closeBtn} 
                onClick={() => setQuickRestockProduct(null)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmQuickRestock} className={styles.supplierForm}>
              <div className={styles.restockSummaryBox}>
                <div>
                  <span className={styles.summaryLabel}>Saldo Atual</span>
                  <strong className={styles.summaryValue}>{quickRestockProduct.quantity} {quickRestockProduct.unit || 'UN'}</strong>
                </div>
                <div>
                  <span className={styles.summaryLabel}>Estoque Mínimo</span>
                  <strong className={styles.summaryValue}>{quickRestockProduct.minQuantity} {quickRestockProduct.unit || 'UN'}</strong>
                </div>
                <div>
                  <span className={styles.summaryLabel}>Novo Saldo Estimado</span>
                  <strong className={styles.summaryValueHighlight}>
                    {Number(quickRestockProduct.quantity) + Number(quickAddQty || 0)} {quickRestockProduct.unit || 'UN'}
                  </strong>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>Quantidade a Adicionar ({quickRestockProduct.unit || 'UN'}) *</label>
                <input 
                  type="number" 
                  min="1" 
                  required
                  value={quickAddQty}
                  onChange={(e) => setQuickAddQty(Number(e.target.value))}
                  className={styles.inputHighlight}
                />
              </div>

              <div className={styles.formTwoCols}>
                <div className={styles.formGroup}>
                  <label>Número do Lote</label>
                  <input 
                    type="text" 
                    placeholder="Ex: LT-2026-X" 
                    value={quickLotNumber}
                    onChange={(e) => setQuickLotNumber(e.target.value)}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Nova Data de Validade</label>
                  <input 
                    type="date" 
                    value={quickExpiryDate}
                    onChange={(e) => setQuickExpiryDate(e.target.value)}
                  />
                </div>
              </div>

              <div className={styles.formActions}>
                <button 
                  type="button" 
                  className={styles.btnSecondary} 
                  onClick={() => setQuickRestockProduct(null)}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={savingQuickRestock || quickAddQty <= 0} 
                  className={styles.btnPrimary}
                >
                  {savingQuickRestock ? <Loader2 size={16} className={styles.spinner} /> : <Save size={16} />}
                  <span>Confirmar Entrada</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: EDIÇÃO COMPLETA DE PRODUTO ─── */}
      {isEditingModalOpen && editingProduct && (
        <div className={styles.modalOverlay} onClick={() => setIsEditingModalOpen(false)}>
          <div className={styles.detailsModalCard} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
            <div className={styles.detailsHeader}>
              <div className={styles.titleIconBg}>
                <Edit2 size={18} color="var(--primary-color, #06b6d4)" />
              </div>
              <div>
                <h3 className={styles.detailsTitle}>Editar Insumo</h3>
                <p className={styles.chartSub}>Atualização cadastral, especificações de embalagem e fornecedor</p>
              </div>
              <button 
                type="button" 
                className={styles.closeBtn} 
                onClick={() => setIsEditingModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveProductEdit} className={styles.supplierForm}>
              <div className={styles.formGroup}>
                <label>Nome do Produto *</label>
                <input
                  type="text"
                  required
                  value={editingProduct.name}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                />
              </div>

              <div className={styles.formTwoCols}>
                <div className={styles.formGroup}>
                  <label>Lote / Código</label>
                  <input
                    type="text"
                    placeholder="Ex: LT-8842"
                    value={editingProduct.lotNumber || editingProduct.batchNumber || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, lotNumber: e.target.value, batchNumber: e.target.value })}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>
                    {editingProduct.unit === 'CX' ? 'Custo da Caixa (R$)' : 'Custo Unitário de Compra (R$)'}
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 22.00"
                    value={editingProduct.costPrice ?? ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, costPrice: e.target.value as any })}
                  />
                </div>
              </div>

              <div className={styles.formTwoCols}>
                <div className={styles.formGroup}>
                  <label>Quantidade Atual *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={editingProduct.quantity}
                    onChange={(e) => setEditingProduct({ ...editingProduct, quantity: Number(e.target.value) })}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Unidade de Medida</label>
                  <select
                    value={editingProduct.unit || 'UN'}
                    onChange={(e) => setEditingProduct({ ...editingProduct, unit: e.target.value })}
                    className={styles.selectInput}
                  >
                    {UNIT_OPTIONS.map((u) => (
                      <option key={u.value} value={u.value}>
                        {u.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {(editingProduct.unit === 'CX' || editingProduct.unit === 'UN') && (
                <div className={styles.packageHintBox}>
                  <label style={{ color: 'var(--primary-color, #0891b2)', fontWeight: 600 }}>
                    {editingProduct.unit === 'CX' ? 'Unidades Contidas na Caixa *' : 'Rendimento / Conteúdo Total (g ou ml por seringa/tubete)'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder={editingProduct.unit === 'CX' ? 'Ex: 100 luvas' : 'Ex: 4 (para seringa de 4g de resina)'}
                    value={editingProduct.itemsPerPackage || (editingProduct.unit === 'CX' ? 100 : 1)}
                    onChange={(e) => setEditingProduct({ ...editingProduct, itemsPerPackage: Number(e.target.value) })}
                    className={styles.packageInput}
                  />
                  {editingProduct.costPrice && editingProduct.itemsPerPackage && editingProduct.itemsPerPackage > 0 && (
                    <span className={styles.costPerFractionText}>
                      <Info size={12} /> Custo fracionado na baixa clínica: <strong>R$ {(Number(editingProduct.costPrice) / Number(editingProduct.itemsPerPackage)).toFixed(2)} por aplicação</strong>
                    </span>
                  )}
                </div>
              )}

              <div className={styles.formTwoCols}>
                <div className={styles.formGroup}>
                  <label>Estoque Mínimo de Alerta</label>
                  <input
                    type="number"
                    min="0"
                    value={editingProduct.minQuantity}
                    onChange={(e) => setEditingProduct({ ...editingProduct, minQuantity: Number(e.target.value) })}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Data de Validade</label>
                  <input
                    type="date"
                    value={editingProduct.expiryDate ? new Date(editingProduct.expiryDate).toISOString().split('T')[0] : ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, expiryDate: e.target.value })}
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>Fornecedor Vinculado</label>
                <select
                  value={editingProduct.supplierId || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, supplierId: e.target.value })}
                  className={styles.selectInput}
                >
                  <option value="">Nenhum / Não especificado</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {editingProduct.stockMovements && editingProduct.stockMovements.length > 0 && (
                <div className={styles.movementsSection}>
                  <div className={styles.movementsHeader}>
                    <History size={14} color="var(--primary-color, #0891b2)" />
                    <h4 style={{ fontSize: '12px', margin: 0 }}>Histórico de Movimentações</h4>
                  </div>
                  <div className={styles.movementsList}>
                    {editingProduct.stockMovements.slice(0, 3).map((mov) => (
                      <div key={mov.id} className={styles.movementItem}>
                        <span style={{ fontSize: '11.5px', fontWeight: 600 }}>
                          {mov.type === 'ENTRY' || mov.type === 'IN' ? '+ Entrada' : '- Baixa Clínica'}: {Math.abs(mov.quantity)} {editingProduct.unit}
                        </span>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>
                          {new Date(mov.createdAt).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className={styles.formActions} style={{ justifyContent: 'space-between', marginTop: '16px' }}>
                <div>
                  {editingProduct.quantity === 0 && (
                    <button
                      type="button"
                      onClick={() => handleDeleteProduct(editingProduct.id, editingProduct.name)}
                      className={styles.btnDelete}
                    >
                      <Trash2 size={14} />
                      <span>Excluir</span>
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className={styles.btnSecondary}
                    onClick={() => setIsEditingModalOpen(false)}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className={styles.btnPrimary}
                    disabled={savingEdit}
                  >
                    {savingEdit ? <Loader2 size={16} className={styles.spinner} /> : <Save size={14} />}
                    <span>Salvar Alterações</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 3: NOVO FORNECEDOR ─── */}
      {isSupplierModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsSupplierModalOpen(false)}>
          <div className={styles.supplierModalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.detailsHeader}>
              <div className={styles.titleIconBg}>
                <Building2 size={18} color="var(--primary-color, #06b6d4)" />
              </div>
              <div>
                <h3 className={styles.detailsTitle}>Cadastrar Novo Fornecedor</h3>
                <p className={styles.chartSub}>Parceiro para cotação e compras de insumos</p>
              </div>
              <button 
                type="button" 
                className={styles.closeBtn} 
                onClick={() => setIsSupplierModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSupplier} className={styles.supplierForm}>
              <div className={styles.formGroup}>
                <label>Razão Social / Nome Fantasia *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Dental Cremer S.A."
                  value={newSupplier.name}
                  onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })}
                />
              </div>

              <div className={styles.formTwoCols}>
                <div className={styles.formGroup}>
                  <label>CNPJ / CPF</label>
                  <input
                    type="text"
                    placeholder="00.000.000/0000-00"
                    value={newSupplier.cnpj}
                    onChange={(e) => setNewSupplier({ ...newSupplier, cnpj: e.target.value })}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Nome do Vendedor / Contato</label>
                  <input
                    type="text"
                    placeholder="Ex: Carlos Representante"
                    value={newSupplier.contact}
                    onChange={(e) => setNewSupplier({ ...newSupplier, contact: e.target.value })}
                  />
                </div>
              </div>

              <div className={styles.formTwoCols}>
                <div className={styles.formGroup}>
                  <label>Telefone / WhatsApp</label>
                  <input
                    type="text"
                    placeholder="(85) 99999-0000"
                    value={newSupplier.phone}
                    onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>E-mail Comercial</label>
                  <input
                    type="email"
                    placeholder="vendas@dental.com.br"
                    value={newSupplier.email}
                    onChange={(e) => setNewSupplier({ ...newSupplier, email: e.target.value })}
                  />
                </div>
              </div>

              <div className={styles.formActions}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => setIsSupplierModalOpen(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={styles.btnPrimary}
                  disabled={savingSupplier}
                >
                  {savingSupplier ? <Loader2 size={16} className={styles.spinner} /> : <Plus size={15} />}
                  <span>Cadastrar Fornecedor</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Gerenciamento Geral de Estoque */}
      <StockManagementModal 
        isOpen={isManagementModalOpen}
        onClose={() => setIsManagementModalOpen(false)}
        onSaveProducts={loadStockData}
        onSuccess={loadStockData}
        planType={'PREMIUM'}
      />
    </div>
  )
}