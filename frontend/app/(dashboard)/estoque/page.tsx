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
  TrendingDown,
  Building2,
  Search,
  Phone,
  Mail,
  History,
  X,
  Edit2,
  RefreshCw,
  UserCheck,
  DollarSign,
  Trash2,
  Save,
  Info
} from 'lucide-react'
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

  // Modal Edição Única
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [isEditingModalOpen, setIsEditingModalOpen] = useState(false)
  const [savingEdit, setSavingEdit] = useState(false)

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
        setExpiring([])
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

  const topUsedProducts = products
    .filter((p) => p.usageCount && p.usageCount > 0)
    .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
    .slice(0, 5)

  function formatDate(dt?: string) {
    if (!dt) return '—'
    return new Date(dt).toLocaleDateString('pt-BR')
  }

  function formatCurrency(val?: number) {
    if (val === undefined || val === null) return '—'
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  function getStockTextClass(status: string) {
    if (status === 'CRITICO') return styles.qtyTextCritico
    if (status === 'BAIXO') return styles.qtyTextBaixo
    return styles.qtyTextOk
  }

  function getAlertLabel(p: Product) {
    const status = getComputedStatus(p)
    if (status === 'CRITICO' || status === 'BAIXO') {
      return { label: 'COMPRAR URGENTE', cls: styles.alertCritico, isAlert: true }
    }
    return { label: 'OK', cls: styles.alertOk, isAlert: false }
  }

  function getConversionPreview(product: Product) {
    const cost = Number(product.costPrice || 0)
    const pkgCount = Number(product.itemsPerPackage || 1)
    if (cost <= 0 || pkgCount <= 0) return null

    if (product.unit === 'CX') {
      return `R$ ${(cost / pkgCount).toFixed(2)} por unidade individual (${pkgCount} un/cx)`
    }
    if (product.unit === 'UN' && pkgCount > 1) {
      return `R$ ${(cost / pkgCount).toFixed(2)} por grama/ml (${pkgCount} g/ml por seringa)`
    }
    return null
  }

  return (
    <div className={styles.page}>
      
      {/* ─── KPIS / CARDS DE MÉTRICAS ─── */}
      <div className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <div className={styles.metricIconBg}>
              <Box size={20} color="#06b6d4" />
            </div>
          </div>
          <p className={styles.metricLabel}>TOTAL DE ITENS</p>
          <p className={styles.metricValue}>{products.length}</p>
          <p className={styles.metricSub}>Insumos cadastrados na clínica</p>
        </div>

        <div className={`${styles.metricCard} ${totalCritico > 0 ? styles.metricCardAlert : ''}`}>
          <div className={styles.metricHeader}>
            <div className={styles.metricIconBgAlert}>
              <AlertTriangle size={20} color="#dc2626" />
            </div>
          </div>
          <p className={styles.metricLabel}>ITENS CRÍTICOS</p>
          <p className={`${styles.metricValue} ${styles.metricCritico}`}>{totalCritico}</p>
          <p className={styles.metricSub}>Abaixo do estoque mínimo</p>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <div className={styles.metricIconBgSuccess}>
              <CheckCircle2 size={20} color="#16a34a" />
            </div>
          </div>
          <p className={styles.metricLabel}>EM ESTOQUE</p>
          <p className={`${styles.metricValue} ${styles.metricOk}`}>{totalOk}</p>
          <p className={styles.metricSub}>Saldos regulares e normais</p>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <div className={styles.metricIconBgSuccess} style={{ backgroundColor: '#f0fdf4' }}>
              <DollarSign size={20} color="#16a34a" />
            </div>
          </div>
          <p className={styles.metricLabel}>VALOR EM ESTOQUE</p>
          <p className={styles.metricValue} style={{ fontSize: '24px', color: '#16a34a' }}>
            {formatCurrency(totalStockValue)}
          </p>
          <p className={styles.metricSub}>Custo total imobilizado</p>
        </div>
      </div>

      {/* ─── GRÁFICO DE SAÍDAS (OPCIONAL) ─── */}
      {topUsedProducts.length > 0 && mainTab === 'products' && (
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <div className={styles.chartTitleRow}>
              <div className={styles.titleIconBg}>
                <BarChart3 size={20} color="var(--primary, #0284c7)" />
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
                      {item.usageCount} {item.unit || 'unidades'} consumidas
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

      {/* ─── CARD PRINCIPAL DE ESTOQUE ─── */}
      <div className={styles.agendaCard}>
        <div className={styles.agendaHeader}>
          <div>
            <h2 className={styles.agendaTitle}>Gestão de Estoque & Insumos</h2>
            <p className={styles.agendaSub}>Gerencie o consumo, reposição, lote e o custo total de insumos em tempo real</p>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              type="button" 
              className={styles.iconBtn} 
              onClick={() => { loadStockData(); loadSuppliers(); }}
              title="Recarregar Dados"
            >
              <RefreshCw size={16} />
            </button>

            {mainTab === 'products' ? (
              <button 
                type="button"
                className={styles.newBtn} 
                onClick={() => setIsManagementModalOpen(true)}
              >
                <Plus size={16} />
                <span>Gerenciar Estoque</span>
              </button>
            ) : (
              <button 
                type="button"
                className={styles.newBtn} 
                onClick={() => setIsSupplierModalOpen(true)}
              >
                <Plus size={16} />
                <span>Novo Fornecedor</span>
              </button>
            )}
          </div>
        </div>

        {/* ─── CONTROLES & FILTROS SUPERIORES ─── */}
        <div className={styles.controlsBar}>
          <div className={styles.navTabsGroup}>
            <button 
              type="button"
              className={`${styles.navTab} ${mainTab === 'products' ? styles.navTabActive : ''}`} 
              onClick={() => { setMainTab('products'); setSearchTerm(''); }}
            >
              <Package size={14} style={{ marginRight: '6px' }} />
              Materiais & Produtos
            </button>
            <button 
              type="button"
              className={`${styles.navTab} ${mainTab === 'suppliers' ? styles.navTabActive : ''}`} 
              onClick={() => { setMainTab('suppliers'); setSearchTerm(''); }}
            >
              <Building2 size={14} style={{ marginRight: '6px' }} />
              Fornecedores
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
                Vencendo ({expiring.length})
              </button>
            </div>
          )}

          <div className={styles.searchBox}>
            <Search size={16} color="#94a3b8" />
            <input 
              type="text" 
              placeholder={mainTab === 'products' ? 'Buscar por produto, lote...' : 'Buscar por fornecedor, CNPJ...'}
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
              <span>Carregando estoque...</span>
            </div>
          ) : (
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>NOME DO MATERIAL</th>
                    <th>LOTE / CÓDIGO</th>
                    <th>PREÇO DE CUSTO</th>
                    <th>QUANTIDADE ATUAL</th>
                    <th>ESTOQUE MÍNIMO</th>
                    <th>VALIDADE</th>
                    <th>ALERTA</th>
                    <th style={{ textAlign: 'right' }}>AÇÕES</th>
                  </tr>
                </thead>
                <tbody>
                  {displayed.length === 0 ? (
                    <tr>
                      <td colSpan={8} className={styles.empty}>
                        Nenhum produto encontrado.
                      </td>
                    </tr>
                  ) : (
                    displayed.map((p) => {
                      const alert = getAlertLabel(p)
                      const computedStatus = getComputedStatus(p)
                      const lotDisplay = p.lotNumber || p.batchNumber

                      return (
                        <tr key={p.id}>
                          <td>
                            <div style={{ fontWeight: 600, color: '#0f172a' }}>{p.name}</div>
                            {p.itemsPerPackage && p.itemsPerPackage > 1 && (
                              <div style={{ fontSize: '11px', color: '#0284c7', marginTop: '2px', fontWeight: 500 }}>
                                📦 Rendimento: {p.itemsPerPackage} {p.unit === 'CX' ? 'un/cx' : 'g/ml por embalagem'}
                              </div>
                            )}
                          </td>

                          <td>
                            {lotDisplay ? (
                              <span style={{ fontFamily: 'monospace', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontWeight: 600, color: '#334155', fontSize: '12px' }}>
                                {lotDisplay}
                              </span>
                            ) : '—'}
                          </td>

                          {/* 🟢 FORMATADO COMO DINHEIRO REAL */}
                          <td style={{ fontWeight: 700, color: '#0f172a', fontSize: '13px' }}>
                            {formatCurrency(p.costPrice)}
                          </td>

                          {/* 🟢 QUANTIDADE SEM FUNDO (APENAS COR NO TEXTO) */}
                          <td>
                            <span className={`${styles.qtyTextOnly} ${getStockTextClass(computedStatus)}`}>
                              {p.quantity} {p.unit || 'UN'}
                            </span>
                          </td>

                          <td style={{ color: '#64748b', fontSize: '13px' }}>
                            Min. {p.minQuantity} {p.unit || 'UN'}
                          </td>

                          <td style={{ color: '#64748b', fontSize: '13px' }}>
                            {formatDate(p.expiryDate)}
                          </td>

                          <td>
                            <span className={`${styles.alertBadge} ${alert.cls}`}>
                              {alert.isAlert && <AlertTriangle size={12} />}
                              <span>{alert.label}</span>
                            </span>
                          </td>

                          <td style={{ textAlign: 'right' }}>
                            <button
                              type="button"
                              onClick={() => handleOpenEditProduct(p)}
                              className={styles.iconBtn}
                              style={{ border: 'none', background: 'transparent' }}
                              title="Editar Produto"
                            >
                              <Edit2 size={16} />
                            </button>
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
                    <th>RAZÃO SOCIAL / NOME</th>
                    <th>CNPJ / CPF</th>
                    <th>VENDEDOR / CONTATO</th>
                    <th>CONTATO / WHATSAPP</th>
                    <th>E-MAIL</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSuppliers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className={styles.empty}>
                        Nenhum fornecedor cadastrado.
                      </td>
                    </tr>
                  ) : (
                    filteredSuppliers.map((sup) => (
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
                            <UserCheck size={14} color="#0284c7" />
                            {sup.contact || '—'}
                          </span>
                        </td>
                        <td style={{ fontSize: '13px', color: '#334155' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Phone size={14} color="#0284c7" /> 
                            {sup.phone || '—'}
                          </span>
                        </td>
                        <td style={{ fontSize: '13px', color: '#334155' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Mail size={14} color="#64748b" /> 
                            {sup.email || '—'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {/* ─── MODAL DE EDIÇÃO ÚNICA ─── */}
      {isEditingModalOpen && editingProduct && (
        <div className={styles.modalOverlay} onClick={() => setIsEditingModalOpen(false)}>
          <div className={styles.detailsModalCard} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
            <div className={styles.detailsHeader}>
              <div className={styles.titleIconBg}>
                <Edit2 size={18} color="var(--primary, #0284c7)" />
              </div>
              <div>
                <h3 className={styles.detailsTitle}>Editar Produto</h3>
                <p className={styles.chartSub}>Ajuste os dados cadastrais, lote e rendimento de fracionamento</p>
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
                    {editingProduct.unit === 'CX' ? 'Custo da Caixa (R$)' : 'Custo Compra (R$)'}
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
                    style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
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
                <div className={styles.formGroup} style={{ backgroundColor: '#f0f9ff', padding: '10px 12px', borderRadius: '8px', border: '1px solid #bae6fd' }}>
                  <label style={{ color: '#0284c7', fontWeight: 600 }}>
                    {editingProduct.unit === 'CX' ? 'Qtd. de Unidades por Caixa *' : 'Rendimento / Conteúdo Total (g ou ml por seringa/pote)'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder={editingProduct.unit === 'CX' ? 'Ex: 100 luvas' : 'Ex: 4 (para seringa de 4g de resina)'}
                    value={editingProduct.itemsPerPackage || (editingProduct.unit === 'CX' ? 100 : 1)}
                    onChange={(e) => setEditingProduct({ ...editingProduct, itemsPerPackage: Number(e.target.value) })}
                    style={{ borderColor: '#0284c7', marginTop: '4px' }}
                  />
                  {getConversionPreview(editingProduct) && (
                    <span style={{ fontSize: '11px', color: '#0369a1', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Info size={12} /> Custo fracionado na Ficha Técnica: <strong>{getConversionPreview(editingProduct)}</strong>
                    </span>
                  )}
                </div>
              )}

              <div className={styles.formTwoCols}>
                <div className={styles.formGroup}>
                  <label>Estoque Mínimo</label>
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
                <label>Fornecedor</label>
                <select
                  value={editingProduct.supplierId || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, supplierId: e.target.value })}
                  style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', width: '100%' }}
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
                <div className={styles.movementsSection} style={{ marginTop: '12px' }}>
                  <div className={styles.movementsHeader}>
                    <History size={14} color="var(--primary, #0284c7)" />
                    <h4 style={{ fontSize: '12px' }}>Últimas Movimentações</h4>
                  </div>
                  <div className={styles.movementsList} style={{ maxHeight: '120px', overflowY: 'auto' }}>
                    {editingProduct.stockMovements.slice(0, 3).map((mov) => (
                      <div key={mov.id} className={styles.movementItem} style={{ padding: '6px 8px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 600 }}>
                          {mov.type === 'ENTRY' || mov.type === 'IN' ? '+ Entrada' : '- Saída'}: {Math.abs(mov.quantity)} {editingProduct.unit}
                        </span>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>
                          {new Date(mov.createdAt).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className={styles.formActions} style={{ justifyContent: 'space-between', marginTop: '20px' }}>
                <div>
                  {editingProduct.quantity === 0 && (
                    <button
                      type="button"
                      onClick={() => handleDeleteProduct(editingProduct.id, editingProduct.name)}
                      className={styles.btnSecondary}
                      style={{ color: '#ef4444', backgroundColor: '#fef2f2', borderColor: '#fecaca' }}
                    >
                      <Trash2 size={14} style={{ marginRight: '4px', display: 'inline' }} />
                      Excluir Produto
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
                    className={styles.newBtn}
                    disabled={savingEdit}
                  >
                    {savingEdit ? (
                      <Loader2 size={16} className={styles.spinner} />
                    ) : (
                      <>
                        <Save size={14} style={{ marginRight: '4px', display: 'inline' }} />
                        <span>Salvar Alterações</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL FORNECEDOR ─── */}
      {isSupplierModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsSupplierModalOpen(false)}>
          <div className={styles.supplierModalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.detailsHeader}>
              <Building2 size={20} color="var(--primary, #0284c7)" />
              <h3 className={styles.detailsTitle}>Novo Fornecedor</h3>
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
                  placeholder="Ex: Dental Cremer"
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
                    placeholder="Ex: João Vendedor"
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
                  <label>E-mail</label>
                  <input
                    type="email"
                    placeholder="contato@dental.com"
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
                  className={styles.newBtn}
                  disabled={savingSupplier}
                >
                  {savingSupplier ? <Loader2 size={16} className={styles.spinner} /> : 'Salvar Fornecedor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL GERENCIAR ESTOQUE ─── */}
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