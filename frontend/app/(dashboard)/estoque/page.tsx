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
  Calendar,
  X,
  ExternalLink,
  RefreshCw,
  UserCheck
} from 'lucide-react'
import api from '@/lib/api'
import { StockManagementModal, StockProductInput } from '../../components/estoque/StockManagementModal'
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

interface ProductDetails {
  id: string
  name: string
  batchNumber?: string
  quantity: number
  minQuantity: number
  expirationDate?: string
  supplier?: Supplier
  stockMovements?: StockMovement[]
}

interface Product {
  id: string
  name: string
  batchNumber?: string
  quantity: number
  minQuantity: number
  expiryDate?: string
  stockStatus?: 'OK' | 'BAIXO' | 'CRITICO'
  supplier?: Supplier
  usageCount?: number
}

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
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Visão Detalhada do Produto
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null)
  const [productDetails, setProductDetails] = useState<ProductDetails | null>(null)
  const [loadingDetails, setLoadingDetails] = useState(false)

  // Cadastro Rápido de Fornecedor (Com o campo `contact` tipado no estado inicial)
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false)
  const [newSupplier, setNewSupplier] = useState({ 
    name: '', 
    cnpj: '', 
    phone: '', 
    email: '', 
    contact: '' 
  })
  const [savingSupplier, setSavingSupplier] = useState(false)

  // ─── CARREGAR ESTOQUE ───
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

  // ─── CARREGAR FORNECEDORES (Consome GET /api/suppliers) ───
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

  // ─── BUSCAR DETALHES DO PRODUTO (Consome GET /api/products/:id/details) ───
  const handleOpenProductDetails = async (productId: string) => {
    setSelectedProductId(productId)
    setLoadingDetails(true)
    try {
      const res = await api.get(`/products/${productId}/details`)
      setProductDetails(res.data)
    } catch {
      const fallbackProd = products.find((p) => p.id === productId)
      if (fallbackProd) {
        setProductDetails({
          id: fallbackProd.id,
          name: fallbackProd.name,
          batchNumber: fallbackProd.batchNumber,
          quantity: fallbackProd.quantity,
          minQuantity: fallbackProd.minQuantity,
          expirationDate: fallbackProd.expiryDate,
          supplier: fallbackProd.supplier,
          stockMovements: [],
        })
      }
    } finally {
      setLoadingDetails(false)
    }
  }

  // ─── SALVAR NOVO FORNECEDOR (Consome POST /api/suppliers) ───
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

  const handleSaveNewProducts = (newProducts: StockProductInput[]) => {
    loadStockData()
  }

  const getComputedStatus = (p: Product) => {
    if (p.stockStatus) return p.stockStatus
    return p.quantity <= p.minQuantity ? 'CRITICO' : 'OK'
  }

  const rawDisplayed = productFilterTab === 'all' ? products : productFilterTab === 'critical' ? lowStock : expiring
  const displayed = rawDisplayed.filter((p) => p.name.toLowerCase().includes(searchTerm.toLowerCase()))

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
          Gerencie o consumo, reposição e a rede de fornecedores da clínica em tempo real
        </p>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            type="button" 
            className={styles.btnSecondary} 
            onClick={() => { loadStockData(); loadSuppliers(); }}
            title="Recarregar Dados"
            style={{ padding: '8px 12px' }}
          >
            <RefreshCw size={14} />
          </button>

          {mainTab === 'products' ? (
            <button 
              type="button"
              className={styles.btnPrimary} 
              onClick={() => setIsModalOpen(true)}
            >
              <Plus size={16} />
              <span>Gerenciar estoque</span>
            </button>
          ) : (
            <button 
              type="button"
              className={styles.btnPrimary} 
              onClick={() => setIsSupplierModalOpen(true)}
            >
              <Plus size={16} />
              <span>Novo Fornecedor</span>
            </button>
          )}
        </div>
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

      {/* ─── Gráfico de Saídas ─── */}
      {topUsedProducts.length > 0 && mainTab === 'products' && (
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

      {/* ─── Card Principal / Tabela ─── */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            
            {/* Abas Principais (Materiais / Fornecedores) */}
            <div className={styles.tabs}>
              <button 
                type="button"
                className={`${styles.tab} ${mainTab === 'products' ? styles.tabActive : ''}`} 
                onClick={() => { setMainTab('products'); setSearchTerm(''); }}
              >
                <Package size={13} style={{ marginRight: '4px', display: 'inline' }} />
                Materiais & Produtos
              </button>
              <button 
                type="button"
                className={`${styles.tab} ${mainTab === 'suppliers' ? styles.tabActive : ''}`} 
                onClick={() => { setMainTab('suppliers'); setSearchTerm(''); }}
              >
                <Building2 size={13} style={{ marginRight: '4px', display: 'inline' }} />
                Fornecedores
              </button>
            </div>

            {/* Busca Rápida */}
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                type="text" 
                placeholder={mainTab === 'products' ? 'Buscar produto...' : 'Buscar fornecedor ou contato...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  paddingLeft: '30px',
                  paddingRight: '12px',
                  paddingTop: '6px',
                  paddingBottom: '6px',
                  fontSize: '12px',
                  border: '1px solid var(--border, #e2e8f0)',
                  borderRadius: 'var(--radius-sm, 8px)',
                  outline: 'none',
                  background: '#f8fafc',
                  width: '220px'
                }}
              />
            </div>
          </div>

          {/* Filtros Secundários de Produtos */}
          {mainTab === 'products' && (
            <div className={styles.tabs}>
              <button 
                type="button"
                className={`${styles.tab} ${productFilterTab === 'all' ? styles.tabActive : ''}`} 
                onClick={() => setProductFilterTab('all')}
              >
                Todos
              </button>
              <button 
                type="button"
                className={`${styles.tab} ${productFilterTab === 'critical' ? styles.tabActive : ''}`} 
                onClick={() => setProductFilterTab('critical')}
              >
                Críticos ({lowStock.length})
              </button>
              <button 
                type="button"
                className={`${styles.tab} ${productFilterTab === 'expiring' ? styles.tabActive : ''}`} 
                onClick={() => setProductFilterTab('expiring')}
              >
                Vencendo ({expiring.length})
              </button>
            </div>
          )}
        </div>

        {/* ─── TABELA DE PRODUTOS ─── */}
        {mainTab === 'products' && (
          loading ? (
            <div className={styles.loading}>
              <Loader2 size={24} className={styles.spinner} />
              <span>Carregando estoque...</span>
            </div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>NOME DO MATERIAL</th>
                  <th>LOTE / CÓDIGO</th>
                  <th>QUANTIDADE ATUAL</th>
                  <th>ESTOQUE MÍNIMO</th>
                  <th>VALIDADE</th>
                  <th>ALERTA</th>
                </tr>
              </thead>
              <tbody>
                {displayed.length === 0 && (
                  <tr>
                    <td colSpan={6} className={styles.empty}>
                      Nenhum produto encontrado
                    </td>
                  </tr>
                )}
                {displayed.map((p) => {
                  const alert = getAlertLabel(p)
                  const computedStatus = getComputedStatus(p)
                  return (
                    <tr 
                      key={p.id} 
                      className={styles.row}
                      onClick={() => handleOpenProductDetails(p.id)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td className={styles.productName}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>{p.name}</span>
                          <ExternalLink size={12} color="#0284c7" />
                        </div>
                      </td>
                      <td className={styles.minQty}>
                        {p.batchNumber ? (
                          <span style={{ fontFamily: 'monospace', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                            {p.batchNumber}
                          </span>
                        ) : '—'}
                      </td>
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
                {filteredSuppliers.length === 0 && (
                  <tr>
                    <td colSpan={5} className={styles.empty}>
                      Nenhum fornecedor cadastrado.
                    </td>
                  </tr>
                )}
                {filteredSuppliers.map((sup) => (
                  <tr key={sup.id} className={styles.row}>
                    <td className={styles.productName}>
                      {sup.corporateName || sup.name}
                    </td>
                    <td className={styles.minQty}>{sup.cnpj || 'Não informado'}</td>
                    <td style={{ fontSize: '12px', color: '#334155' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <UserCheck size={12} color="#0284c7" />
                        {sup.contact || '—'}
                      </span>
                    </td>
                    <td style={{ fontSize: '12px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Phone size={12} color="#0284c7" /> {sup.phone || '—'}
                      </span>
                    </td>
                    <td style={{ fontSize: '12px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Mail size={12} color="#64748b" /> {sup.email || '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}
      </div>

      {/* ─── MODAL VISÃO DETALHADA DO PRODUTO ─── */}
      {selectedProductId && (
        <div className={styles.modalOverlay} onClick={() => setSelectedProductId(null)}>
          <div className={styles.detailsModalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.detailsHeader}>
              <div className={styles.titleIconBg}>
                <Package size={20} color="var(--primary)" />
              </div>
              <div>
                <h3 className={styles.detailsTitle}>{productDetails?.name || 'Detalhes do Material'}</h3>
                <p className={styles.chartSub}>
                  Lote: {productDetails?.batchNumber || 'Não informado'}
                </p>
              </div>
              <button 
                type="button" 
                className={styles.closeBtn} 
                onClick={() => setSelectedProductId(null)}
              >
                <X size={18} />
              </button>
            </div>

            {loadingDetails ? (
              <div className={styles.loading}>
                <Loader2 size={24} className={styles.spinner} />
                <span>Buscando histórico do produto...</span>
              </div>
            ) : (
              <div className={styles.detailsBody}>
                
                {/* Cards Rápidos */}
                <div className={styles.detailsInfoGrid}>
                  <div className={styles.infoBox}>
                    <span className={styles.infoBoxLabel}>Estoque Atual</span>
                    <span className={styles.infoBoxValue}>{productDetails?.quantity || 0}</span>
                  </div>
                  <div className={styles.infoBox}>
                    <span className={styles.infoBoxLabel}>Estoque Mínimo</span>
                    <span className={styles.infoBoxValue}>Min. {productDetails?.minQuantity || 0}</span>
                  </div>
                  <div className={styles.infoBox}>
                    <span className={styles.infoBoxLabel}>Validade</span>
                    <span className={styles.infoBoxValue}>{formatDate(productDetails?.expirationDate)}</span>
                  </div>
                </div>

                {/* Card do Fornecedor */}
                {productDetails?.supplier && (
                  <div className={styles.supplierCardBox}>
                    <div className={styles.supplierCardHeader}>
                      <Building2 size={16} color="var(--primary)" />
                      <span className={styles.supplierCardTitle}>Fornecedor Responsável</span>
                    </div>
                    <p className={styles.supplierName}>{productDetails.supplier.name}</p>
                    <div className={styles.supplierContactsRow}>
                      {productDetails.supplier.contact && (
                        <span><UserCheck size={12} /> {productDetails.supplier.contact}</span>
                      )}
                      {productDetails.supplier.phone && (
                        <span><Phone size={12} /> {productDetails.supplier.phone}</span>
                      )}
                      {productDetails.supplier.email && (
                        <span><Mail size={12} /> {productDetails.supplier.email}</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Histórico de Entradas e Saídas */}
                <div className={styles.movementsSection}>
                  <div className={styles.movementsHeader}>
                    <History size={16} color="var(--primary)" />
                    <h4>Últimas Movimentações</h4>
                  </div>

                  {!productDetails?.stockMovements || productDetails.stockMovements.length === 0 ? (
                    <p className={styles.emptyMovements}>Nenhuma movimentação registrada recentemente.</p>
                  ) : (
                    <div className={styles.movementsList}>
                      {productDetails.stockMovements.map((mov) => {
                        const isEntry = mov.type === 'IN' || mov.type === 'ENTRY'
                        return (
                          <div key={mov.id} className={styles.movementItem}>
                            <div className={styles.movLeft}>
                              <span className={`${styles.movBadge} ${isEntry ? styles.movIn : styles.movOut}`}>
                                {isEntry ? '+ Entrada' : '- Saída'}
                              </span>
                              <span className={styles.movQty}>{Math.abs(mov.quantity)} un.</span>
                            </div>
                            <div className={styles.movRight}>
                              <span className={styles.movUser}>{mov.user?.name || 'Sistema'}</span>
                              <span className={styles.movDate}>
                                <Calendar size={11} />
                                {new Date(mov.createdAt).toLocaleString('pt-BR')}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── MODAL NOVO FORNECEDOR ─── */}
      {isSupplierModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsSupplierModalOpen(false)}>
          <div className={styles.supplierModalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.detailsHeader}>
              <Building2 size={20} color="var(--primary)" />
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
                  className={styles.btnPrimary}
                  disabled={savingSupplier}
                >
                  {savingSupplier ? <Loader2 size={16} className={styles.spinner} /> : 'Salvar Fornecedor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Gerenciamento em Abas Existente */}
      <StockManagementModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaveProducts={handleSaveNewProducts}
        onSuccess={loadStockData}
      />
    </div>
  )
}