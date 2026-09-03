'use client'

import { useEffect, useState, useMemo } from 'react'
import { 
  DollarSign, 
  TrendingUp, 
  Clock, 
  Plus, 
  Minus, 
  CreditCard, 
  ArrowUpRight, 
  ArrowDownRight, 
  FileText, 
  Loader2, 
  BarChart3,
  X,
  Receipt,
  Truck,
  Building
} from 'lucide-react'
import api from '@/lib/api'
import styles from './financeiro.module.css'

interface Transaction {
  id: string
  type: 'RECEITA' | 'DESPESA'
  amount: number
  paymentMethod: string
  category: string
  description: string
  paidAt: string
}

interface Supplier {
  id: string
  name: string
  cnpj?: string
  contact?: string
}

interface TreatmentPlan {
  id: string
  title: string
  totalAmount: number
  status: string
  patient: { name: string }
}

const EXPENSE_CATEGORIES = [
  'Insumos & Dental',
  'Aluguel & Condomínio',
  'Folha & Pró-labore',
  'Energia & Água',
  'Software & Marketing',
  'Manutenção & Outros'
]

const INCOME_CATEGORIES = [
  'Consulta / Procedimento',
  'Plano de Tratamento',
  'Ortodontia (Mensalidade)',
  'Outras Receitas'
]

function normalizePaymentMethod(method: string): string {
  const m = (method || '').toUpperCase()
  if (m.includes('PIX')) return 'PIX'
  if (m.includes('CREDIT') || m.includes('CRÉDITO') || m.includes('CREDITO')) return 'CREDIT_CARD'
  if (m.includes('DEBIT') || m.includes('DÉBITO') || m.includes('DEBITO')) return 'DEBIT_CARD'
  if (m.includes('DINHEIRO') || m.includes('CASH')) return 'CASH'
  if (m.includes('CONVENIO') || m.includes('CONVÊNIO')) return 'CONVENIO'
  return 'OUTROS'
}

function getMethodLabel(methodKey: string): string {
  const map: Record<string, string> = {
    PIX: 'Pix',
    CREDIT_CARD: 'Cartão de Crédito',
    DEBIT_CARD: 'Cartão de Débito',
    CASH: 'Dinheiro',
    CONVENIO: 'Convênio Odontológico',
    OUTROS: 'Outros'
  }
  return map[methodKey] || methodKey
}

function getMethodColor(methodKey: string): string {
  const map: Record<string, string> = {
    PIX: '#06b6d4',
    CREDIT_CARD: '#3b82f6',
    DEBIT_CARD: '#8b5cf6',
    CASH: '#10b981',
    CONVENIO: '#f59e0b',
    OUTROS: '#94a3b8'
  }
  return map[methodKey] || '#06b6d4'
}

export default function FinanceiroPage() {
  const [user, setUser] = useState<any>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [plans, setPlans] = useState<TreatmentPlan[]>([])
  const [activeTab, setActiveTab] = useState<'caixa' | 'planos'>('caixa')
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'RECEITA' | 'DESPESA'>('ALL')
  const [loading, setLoading] = useState(true)

  // Modal Principal (Receita / Despesa)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalType, setModalType] = useState<'RECEITA' | 'DESPESA'>('DESPESA')
  const [saving, setSaving] = useState(false)

  // Modal de Cadastro Rápido de Fornecedor
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false)
  const [newSupplierName, setNewSupplierName] = useState('')
  const [newSupplierCnpj, setNewSupplierCnpj] = useState('')
  const [newSupplierContact, setNewSupplierContact] = useState('')

  // Form Fields
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('PIX')
  const [selectedSupplierId, setSelectedSupplierId] = useState('')

  useEffect(() => {
    const stored = localStorage.getItem('odontoflow_user') || localStorage.getItem('@odontoflow:user')
    if (stored) {
      try { setUser(JSON.parse(stored)) } catch (e) {}
    }
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      const [transRes, plansRes, suppliersRes] = await Promise.all([
        api.get('/transactions').catch(() => ({ data: [] })),
        api.get('/treatment-plans').catch(() => ({ data: [] })),
        api.get('/suppliers').catch(() => ({ data: [] }))
      ])

      const transData = Array.isArray(transRes.data) ? transRes.data : transRes.data.data || []
      const plansData = Array.isArray(plansRes.data) ? plansRes.data : plansRes.data.data || []
      const suppliersData = Array.isArray(suppliersRes.data) ? suppliersRes.data : suppliersRes.data.data || []

      setTransactions(transData)
      setPlans(plansData)
      setSuppliers(suppliersData)
    } catch (err) {
      console.error('Erro ao buscar dados financeiros:', err)
    } finally {
      setLoading(false)
    }
  }

  function openCreateModal(type: 'RECEITA' | 'DESPESA') {
    setModalType(type)
    setCategory(type === 'DESPESA' ? EXPENSE_CATEGORIES[0] : INCOME_CATEGORIES[0])
    setDescription('')
    setAmount('')
    setPaymentMethod('PIX')
    setSelectedSupplierId('')
    setIsModalOpen(true)
  }

  async function handleQuickCreateSupplier(e: React.FormEvent) {
    e.preventDefault()
    if (!newSupplierName.trim()) return

    try {
      const res = await api.post('/suppliers', {
        name: newSupplierName,
        cnpj: newSupplierCnpj || undefined,
        contact: newSupplierContact || undefined
      })
      const created = res.data
      setSuppliers(prev => [created, ...prev])
      setSelectedSupplierId(created.id)
      setIsSupplierModalOpen(false)
      setNewSupplierName('')
      setNewSupplierCnpj('')
      setNewSupplierContact('')
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro ao cadastrar fornecedor.')
    }
  }

  async function handleSaveTransaction(e: React.FormEvent) {
    e.preventDefault()
    const numericAmount = parseFloat(amount.replace(/\./g, '').replace(',', '.'))
    if (isNaN(numericAmount) || numericAmount <= 0) {
      alert('Informe um valor válido.')
      return
    }

    // Prefixa fornecedor na descrição se for despesa vinculada
    let finalDescription = description
    if (modalType === 'DESPESA' && selectedSupplierId) {
      const sup = suppliers.find(s => s.id === selectedSupplierId)
      if (sup && !description.includes(sup.name)) {
        finalDescription = `[${sup.name}] ${description}`
      }
    }

    setSaving(true)
    try {
      await api.post('/transactions', {
        type: modalType,
        amount: numericAmount,
        category,
        description: finalDescription,
        paymentMethod,
        supplierId: selectedSupplierId || undefined,
        paidAt: new Date().toISOString(),
      })

      setIsModalOpen(false)
      loadData()
    } catch (err: any) {
      console.error('Erro ao registrar transação:', err)
      alert(err.response?.data?.message || 'Erro ao registrar transação.')
    } finally {
      setSaving(false)
    }
  }

  // Cálculos de KPIs
  const { totalReceitas, totalDespesas, saldoLiquido, ticketMedio } = useMemo(() => {
    let rec = 0
    let desp = 0
    let recCount = 0

    transactions.forEach(t => {
      const val = Number(t.amount) || 0
      if (t.type === 'RECEITA') {
        rec += val
        recCount += 1
      } else {
        desp += val
      }
    })

    return {
      totalReceitas: rec,
      totalDespesas: desp,
      saldoLiquido: rec - desp,
      ticketMedio: recCount > 0 ? rec / recCount : 0
    }
  }, [transactions])

  // Analytics: Formas de Entrada (Sem duplicidade)
  const paymentDistribution = useMemo(() => {
    const counts: Record<string, number> = {}
    let total = 0

    transactions.filter(t => t.type === 'RECEITA').forEach(t => {
      const val = Number(t.amount) || 0
      const norm = normalizePaymentMethod(t.paymentMethod)
      counts[norm] = (counts[norm] || 0) + val
      total += val
    })

    const activeMethods = Object.entries(counts)
      .filter(([_, val]) => val > 0)
      .sort((a, b) => b[1] - a[1])

    return { activeMethods, total }
  }, [transactions])

  // Analytics: Despesas por Categoria
  const expensesByCategory = useMemo(() => {
    const map: Record<string, number> = {}
    transactions.filter(t => t.type === 'DESPESA').forEach(t => {
      const val = Number(t.amount) || 0
      map[t.category] = (map[t.category] || 0) + val
    })

    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [transactions])

  const filteredTransactions = useMemo(() => {
    if (typeFilter === 'ALL') return transactions
    return transactions.filter(t => t.type === typeFilter)
  }, [transactions, typeFilter])

  function formatCurrency(val: number) {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  const isAdmin = user?.role === 'ADMIN'

  return (
    <div className={styles.container}>
      {/* ─── Ações Rápidas do Topo ─── */}
      <div className={styles.actionBar}>
        <div className={styles.contextInfo}>
          <span className={styles.contextBadge}>Operação de Caixa</span>
          <span className={styles.contextText}>Mapeamento de custos operacionais e fornecedores</span>
        </div>

        <div className={styles.actionButtons}>
          <button 
            type="button" 
            onClick={() => openCreateModal('DESPESA')} 
            className={styles.btnExpense}
          >
            <Minus size={15} />
            <span>Lançar Despesa</span>
          </button>

          <button 
            type="button" 
            onClick={() => openCreateModal('RECEITA')} 
            className={styles.btnRevenue}
          >
            <Plus size={15} />
            <span>Lançar Receita</span>
          </button>
        </div>
      </div>

      {/* ─── 4 KPIs Estruturados ─── */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiIconWrapper} style={{ background: '#ecfeff', color: '#0891b2' }}>
            <DollarSign size={20} />
          </div>
          <span className={styles.kpiLabel}>RECEITA TOTAL</span>
          <h3 className={styles.kpiValue} style={{ color: '#0f172a' }}>{formatCurrency(totalReceitas)}</h3>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIconWrapper} style={{ background: '#fee2e2', color: '#ef4444' }}>
            <TrendingUp size={20} style={{ transform: 'rotate(180deg)' }} />
          </div>
          <span className={styles.kpiLabel}>DESPESAS TOTAIS</span>
          <h3 className={styles.kpiValue} style={{ color: '#ef4444' }}>{formatCurrency(totalDespesas)}</h3>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIconWrapper} style={{ background: '#dcfce7', color: '#16a34a' }}>
            <Clock size={20} />
          </div>
          <span className={styles.kpiLabel}>LUCRO LÍQUIDO</span>
          <h3 className={styles.kpiValue} style={{ color: '#16a34a' }}>{formatCurrency(saldoLiquido)}</h3>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIconWrapper} style={{ background: '#f8fafc', color: '#64748b' }}>
            <BarChart3 size={20} />
          </div>
          <span className={styles.kpiLabel}>TICKET MÉDIO</span>
          <h3 className={styles.kpiValue} style={{ color: '#0f172a' }}>{formatCurrency(ticketMedio)}</h3>
        </div>
      </div>

      {/* ─── Painéis Analíticos Exclusivos ADMIN ─── */}
      {isAdmin && (
        <div className={styles.adminAnalyticsGrid}>
          {/* Métodos de Pagamento */}
          <div className={styles.chartCard}>
            <div className={styles.chartHeader}>
              <div className={styles.chartTitleWrapper}>
                <CreditCard size={18} color="#06b6d4" />
                <h4>Formas de Entrada de Receita</h4>
              </div>
              <span className={styles.chartBadge}>Admin Only</span>
            </div>

            <div className={styles.chartContent}>
              {paymentDistribution.activeMethods.length === 0 ? (
                <div className={styles.emptyStateContainer}>
                  <p className={styles.emptyChartTitle}>Nenhuma receita registrada</p>
                  <p className={styles.emptyChartSub}>Receitas aprovadas ou lançadas aparecerão aqui.</p>
                </div>
              ) : (
                paymentDistribution.activeMethods.map(([methodKey, val]) => {
                  const percent = paymentDistribution.total > 0 ? (val / paymentDistribution.total) * 100 : 0
                  return (
                    <div key={methodKey} className={styles.barItem}>
                      <div className={styles.barLabelGroup}>
                        <span className={styles.barName}>{getMethodLabel(methodKey)}</span>
                        <span className={styles.barAmount}>{formatCurrency(val)} ({percent.toFixed(1)}%)</span>
                      </div>
                      <div className={styles.barTrack}>
                        <div 
                          className={styles.barFill} 
                          style={{ width: `${percent}%`, background: getMethodColor(methodKey) }} 
                        />
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Composição das Despesas */}
          <div className={styles.chartCard}>
            <div className={styles.chartHeader}>
              <div className={styles.chartTitleWrapper}>
                <Receipt size={18} color="#ef4444" />
                <h4>Composição das Despesas</h4>
              </div>
              <span className={styles.chartBadge}>Admin Only</span>
            </div>

            <div className={styles.chartContent}>
              {expensesByCategory.length === 0 ? (
                <div className={styles.emptyStateContainer}>
                  <p className={styles.emptyChartTitle}>Nenhuma despesa operacional lançada</p>
                  <p className={styles.emptyChartSub}>Vincule despesas com fornecedores no botão "Lançar Despesa".</p>
                </div>
              ) : (
                expensesByCategory.map(([cat, val]) => {
                  const percent = totalDespesas > 0 ? (val / totalDespesas) * 100 : 0
                  return (
                    <div key={cat} className={styles.barItem}>
                      <div className={styles.barLabelGroup}>
                        <span className={styles.barName}>{cat}</span>
                        <span className={styles.barAmount}>{formatCurrency(val)} ({percent.toFixed(1)}%)</span>
                      </div>
                      <div className={styles.barTrack}>
                        <div className={styles.barFill} style={{ width: `${percent}%`, background: '#ef4444' }} />
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Navegação de Abas ─── */}
      <div className={styles.tabNav}>
        <button 
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'caixa' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('caixa')}
        >
          <DollarSign size={16} />
          <span>Caixa & Transações ({transactions.length})</span>
        </button>

        <button 
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'planos' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('planos')}
        >
          <FileText size={16} />
          <span>Planos de Tratamento ({plans.length})</span>
        </button>
      </div>

      {/* ─── Tabelas de Dados ─── */}
      {activeTab === 'caixa' ? (
        <div className={styles.tableCard}>
          <div className={styles.tableToolbar}>
            <h3 className={styles.tableHeading}>Extrato de Transações Recentes</h3>
            
            <div className={styles.filterButtonGroup}>
              <button 
                type="button" 
                className={`${styles.filterBtn} ${typeFilter === 'ALL' ? styles.filterBtnActive : ''}`}
                onClick={() => setTypeFilter('ALL')}
              >
                Todas
              </button>
              <button 
                type="button" 
                className={`${styles.filterBtn} ${typeFilter === 'RECEITA' ? styles.filterBtnActive : ''}`}
                onClick={() => setTypeFilter('RECEITA')}
              >
                Receitas
              </button>
              <button 
                type="button" 
                className={`${styles.filterBtn} ${typeFilter === 'DESPESA' ? styles.filterBtnActive : ''}`}
                onClick={() => setTypeFilter('DESPESA')}
              >
                Despesas
              </button>
            </div>
          </div>

          {loading ? (
            <div className={styles.loadingWrapper}>
              <Loader2 size={24} className={styles.spinner} />
              <span>Carregando dados financeiros...</span>
            </div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>DESCRIÇÃO / FORNECEDOR</th>
                  <th>CATEGORIA</th>
                  <th>MÉTODO</th>
                  <th>VALOR</th>
                  <th>DATA</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map(t => {
                  const isRec = t.type === 'RECEITA'
                  return (
                    <tr key={t.id} className={styles.tableRow}>
                      <td className={styles.descCell}>
                        <div className={isRec ? styles.iconIn : styles.iconOut}>
                          {isRec ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />}
                        </div>
                        <span className={styles.boldText}>{t.description}</span>
                      </td>
                      <td>{t.category}</td>
                      <td>{getMethodLabel(normalizePaymentMethod(t.paymentMethod))}</td>
                      <td className={isRec ? styles.valueRec : styles.valueDesp}>
                        {isRec ? `+ ${formatCurrency(Number(t.amount))}` : `- ${formatCurrency(Number(t.amount))}`}
                      </td>
                      <td className={styles.dateCell}>
                        {new Date(t.paidAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <div className={styles.tableCard}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>PACIENTE</th>
                <th>TÍTULO DO PLANO</th>
                <th>STATUS</th>
                <th>VALOR TOTAL</th>
                <th style={{ textAlign: 'right' }}>AÇÃO FINANCEIRA</th>
              </tr>
            </thead>
            <tbody>
              {plans.map(p => (
                <tr key={p.id} className={styles.tableRow}>
                  <td className={styles.boldText}>{p.patient?.name}</td>
                  <td>{p.title}</td>
                  <td>
                    <span className={styles.statusBadge}>{p.status}</span>
                  </td>
                  <td className={styles.boldText}>{formatCurrency(Number(p.totalAmount))}</td>
                  <td style={{ textAlign: 'right', color: '#16a34a', fontWeight: 600 }}>
                    Integrado ao Caixa
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── Modal de Lançamento Manual (Receita / Despesa) ─── */}
      {isModalOpen && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modalCard}>
            <div className={styles.modalHeader}>
              <div className={styles.modalHeaderTitle}>
                {modalType === 'RECEITA' ? (
                  <ArrowUpRight size={18} color="#16a34a" />
                ) : (
                  <ArrowDownRight size={18} color="#ef4444" />
                )}
                <h3>{modalType === 'RECEITA' ? 'Lançar Receita Manual' : 'Lançar Despesa Operacional'}</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className={styles.btnClose}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveTransaction} className={styles.modalForm}>
              {/* Vínculo de Fornecedor exclusivo para Despesa */}
              {modalType === 'DESPESA' && (
                <div className={styles.formGroup}>
                  <div className={styles.labelRowWithAction}>
                    <label>Fornecedor / Credor Vinculado</label>
                    <button 
                      type="button" 
                      onClick={() => setIsSupplierModalOpen(true)}
                      className={styles.btnQuickLink}
                    >
                      <Plus size={12} /> Novo Fornecedor
                    </button>
                  </div>
                  <select 
                    value={selectedSupplierId} 
                    onChange={(e) => {
                      const id = e.target.value
                      setSelectedSupplierId(id)
                      const sup = suppliers.find(s => s.id === id)
                      if (sup && !description) {
                        setDescription(`Compra/Serviço: ${sup.name}`)
                      }
                    }}
                    className={styles.input}
                  >
                    <option value="">Nenhum (Despesa interna/avulsa)</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name} {s.cnpj ? `(${s.cnpj})` : ''}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className={styles.formGroup}>
                <label>Descrição do Lançamento*</label>
                <input 
                  type="text" 
                  required 
                  placeholder={modalType === 'RECEITA' ? 'Ex: Pagamento Avulso / Avaliação' : 'Ex: Reposição de Resinas e Brocas'}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className={styles.input} 
                />
              </div>

              <div className={styles.twoCols}>
                <div className={styles.formGroup}>
                  <label>Valor (R$)*</label>
                  <input 
                    type="number" 
                    step="0.01"
                    required 
                    placeholder="0,00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className={styles.input} 
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Forma de Pagamento*</label>
                  <select 
                    value={paymentMethod} 
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className={styles.input}
                  >
                    <option value="PIX">Pix</option>
                    <option value="CREDIT_CARD">Cartão de Crédito</option>
                    <option value="DEBIT_CARD">Cartão de Débito</option>
                    <option value="CASH">Dinheiro</option>
                  </select>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>Categoria Contábil*</label>
                <select 
                  value={category} 
                  onChange={(e) => setCategory(e.target.value)}
                  className={styles.input}
                >
                  {(modalType === 'DESPESA' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className={styles.modalFooter}>
                <button type="button" onClick={() => setIsModalOpen(false)} className={styles.btnCancel}>
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={saving} 
                  className={modalType === 'RECEITA' ? styles.btnSaveIncome : styles.btnSaveExpense}
                >
                  {saving ? <Loader2 size={16} className={styles.spinner} /> : <Plus size={16} />}
                  <span>{modalType === 'RECEITA' ? 'Salvar Receita' : 'Salvar Despesa'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Modal Rápido: Cadastrar Fornecedor ─── */}
      {isSupplierModalOpen && (
        <div className={styles.modalBackdrop} style={{ zIndex: 10000 }}>
          <div className={styles.modalCard} style={{ maxWidth: '420px' }}>
            <div className={styles.modalHeader}>
              <div className={styles.modalHeaderTitle}>
                <Building size={18} color="#06b6d4" />
                <h3>Cadastrar Novo Fornecedor</h3>
              </div>
              <button onClick={() => setIsSupplierModalOpen(false)} className={styles.btnClose}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleQuickCreateSupplier} className={styles.modalForm}>
              <div className={styles.formGroup}>
                <label>Nome do Fornecedor / Dental*</label>
                <input 
                  type="text" 
                  required 
                  placeholder="Ex: Dental Cremer S.A."
                  value={newSupplierName}
                  onChange={(e) => setNewSupplierName(e.target.value)}
                  className={styles.input} 
                />
              </div>

              <div className={styles.formGroup}>
                <label>CNPJ</label>
                <input 
                  type="text" 
                  placeholder="00.000.000/0000-00"
                  value={newSupplierCnpj}
                  onChange={(e) => setNewSupplierCnpj(e.target.value)}
                  className={styles.input} 
                />
              </div>

              <div className={styles.formGroup}>
                <label>Contato / Vendedor</label>
                <input 
                  type="text" 
                  placeholder="Ex: Carlos Representante"
                  value={newSupplierContact}
                  onChange={(e) => setNewSupplierContact(e.target.value)}
                  className={styles.input} 
                />
              </div>

              <div className={styles.modalFooter}>
                <button type="button" onClick={() => setIsSupplierModalOpen(false)} className={styles.btnCancel}>
                  Voltar
                </button>
                <button type="submit" className={styles.btnSaveIncome} style={{ background: '#06b6d4' }}>
                  <Plus size={15} />
                  <span>Cadastrar Fornecedor</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}