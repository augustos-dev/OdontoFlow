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
  Building,
  Filter,
  Trash2
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts'
import api from '@/lib/api'
import styles from './financeiro.module.css'

interface Transaction {
  id: string
  type: 'RECEITA' | 'DESPESA'
  amount: number
  paymentMethod: string
  category?: string | null
  description?: string | null
  supplierId?: string | null
  paidAt: string
  supplier?: { id: string; name: string } | null
  appointment?: { id: string; patient: { name: string } } | null
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

export default function FinanceiroPage() {
  const [user, setUser] = useState<any>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [plans, setPlans] = useState<TreatmentPlan[]>([])
  const [activeTab, setActiveTab] = useState<'caixa' | 'planos'>('caixa')
  
  // Filtros
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'RECEITA' | 'DESPESA'>('ALL')
  const [selectedSupplierFilter, setSelectedSupplierFilter] = useState<string>('ALL')
  const [loading, setLoading] = useState(true)

  // Modal Principal
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalType, setModalType] = useState<'RECEITA' | 'DESPESA'>('DESPESA')
  const [saving, setSaving] = useState(false)

  // Modal de Fornecedor
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

    setSaving(true)
    try {
      await api.post('/transactions', {
        type: modalType,
        amount: numericAmount,
        category,
        description,
        paymentMethod,
        supplierId: modalType === 'DESPESA' && selectedSupplierId ? selectedSupplierId : undefined,
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

  async function handleDeleteTransaction(id: string) {
    if (!window.confirm('Deseja realmente remover esta transação?')) return
    try {
      await api.delete(`/transactions/${id}`)
      loadData()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Falha ao deletar transação.')
    }
  }

  function formatCurrency(val: number) {
    return Number(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
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

  // Dados consolidados para o Gráfico de Barras do Recharts (Entradas vs Saídas por dia)
  const chartTimelineData = useMemo(() => {
    const daysMap = new Map<string, { date: string; formattedDate: string; receitas: number; despesas: number }>()
    
    // Inicializa últimos 7 dias
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateKey = d.toISOString().slice(0, 10)
      const [, m, day] = dateKey.split('-')
      daysMap.set(dateKey, { date: dateKey, formattedDate: `${day}/${m}`, receitas: 0, despesas: 0 })
    }

    transactions.forEach(t => {
      const key = t.paidAt.slice(0, 10)
      if (daysMap.has(key)) {
        const entry = daysMap.get(key)!
        if (t.type === 'RECEITA') {
          entry.receitas += Number(t.amount) || 0
        } else {
          entry.despesas += Number(t.amount) || 0
        }
      }
    })

    return Array.from(daysMap.values())
  }, [transactions])

  // Filtragem
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchType = typeFilter === 'ALL' || t.type === typeFilter
      const matchSupplier = selectedSupplierFilter === 'ALL' || t.supplierId === selectedSupplierFilter
      return matchType && matchSupplier
    })
  }, [transactions, typeFilter, selectedSupplierFilter])

  const isAdmin = user?.role === 'ADMIN'

  return (
    <div className={styles.container}>
      {/* ─── Top Bar Executiva ─── */}
      <div className={styles.actionBar}>
        <div className={styles.contextInfo}>
          <span className={styles.contextBadge}>MÓDULO FINANCEIRO</span>
          <span className={styles.contextText}>Fluxo de caixa, conciliação e despesas com fornecedores</span>
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

      {/* ─── 4 KPIs Executivos ─── */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiLabel}>RECEITA TOTAL</span>
            <div className={`${styles.kpiIconWrapper} ${styles.iconCyan}`}>
              <DollarSign size={18} />
            </div>
          </div>
          <h3 className={styles.kpiValue}>{formatCurrency(totalReceitas)}</h3>
          <span className={styles.kpiSubGreen}>Entradas brutas</span>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiLabel}>DESPESAS TOTAIS</span>
            <div className={`${styles.kpiIconWrapper} ${styles.iconRed}`}>
              <TrendingUp size={18} style={{ transform: 'rotate(180deg)' }} />
            </div>
          </div>
          <h3 className={`${styles.kpiValue} ${styles.textRed}`}>{formatCurrency(totalDespesas)}</h3>
          <span className={styles.kpiSubText}>Custos e compras operacionais</span>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiLabel}>LUCRO LÍQUIDO</span>
            <div className={`${styles.kpiIconWrapper} ${styles.iconGreen}`}>
              <Clock size={18} />
            </div>
          </div>
          <h3 className={`${styles.kpiValue} ${saldoLiquido >= 0 ? styles.textGreen : styles.textRed}`}>
            {formatCurrency(saldoLiquido)}
          </h3>
          <span className={saldoLiquido >= 0 ? styles.kpiSubGreen : styles.kpiSubRed}>
            Resultado consolidado
          </span>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiLabel}>TICKET MÉDIO</span>
            <div className={`${styles.kpiIconWrapper} ${styles.iconSlate}`}>
              <BarChart3 size={18} />
            </div>
          </div>
          <h3 className={styles.kpiValue}>{formatCurrency(ticketMedio)}</h3>
          <span className={styles.kpiSubText}>Média por procedimento</span>
        </div>
      </div>

      {/* ─── Comparativo com Recharts (Receitas vs Despesas) ─── */}
      <div className={styles.chartCard}>
        <div className={styles.cardHeader}>
          <div>
            <h3 className={styles.cardTitle}>Comparativo de Fluxo: Receitas x Despesas</h3>
            <p className={styles.cardSubtitle}>Volume diário movimentado nos últimos 7 dias</p>
          </div>
          <span className={styles.unitPill}>R$ Reais</span>
        </div>

        <div className={styles.chartContainer}>
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={chartTimelineData} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="formattedDate" 
                axisLine={{ stroke: '#f1f5f9' }}
                tickLine={false} 
                tick={{ fill: '#94a3b8', fontSize: 11 }}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickFormatter={(val) => `${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                width={40}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className={styles.customTooltip}>
                        <span className={styles.tooltipHeader}>{payload[0].payload.formattedDate}</span>
                        <div className={styles.tooltipRow}>
                          <span className={styles.dotCyan} />
                          <span>Receita: {formatCurrency(Number(payload[0].value))}</span>
                        </div>
                        <div className={styles.tooltipRow}>
                          <span className={styles.dotRed} />
                          <span>Despesa: {formatCurrency(Number(payload[1].value))}</span>
                        </div>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Legend 
                wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                formatter={(val) => val === 'receitas' ? 'Receitas (Entradas)' : 'Despesas (Saídas)'}
              />
              <Bar dataKey="receitas" fill="#06b6d4" radius={[4, 4, 0, 0]} maxBarSize={32} />
              <Bar dataKey="despesas" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

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

      {/* ─── Extrato de Caixa & Filtros ─── */}
      {activeTab === 'caixa' ? (
        <div className={styles.tableCard}>
          <div className={styles.tableToolbar}>
            <h3 className={styles.tableHeading}>Extrato de Transações Recentes</h3>
            
            <div className={styles.toolbarFilters}>
              {/* Filtro de Fornecedores */}
              {suppliers.length > 0 && (
                <div className={styles.selectWrapper}>
                  <Building size={13} className={styles.selectIcon} />
                  <select 
                    value={selectedSupplierFilter} 
                    onChange={(e) => setSelectedSupplierFilter(e.target.value)}
                    className={styles.supplierSelectFilter}
                  >
                    <option value="ALL">Todos os Fornecedores</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Botões de Filtro: Tipo */}
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
          </div>

          {loading ? (
            <div className={styles.loadingWrapper}>
              <Loader2 size={24} className={styles.spinner} />
              <span>Carregando dados financeiros...</span>
            </div>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>DESCRIÇÃO / FORNECEDOR</th>
                    <th>CATEGORIA</th>
                    <th>MÉTODO</th>
                    <th>VALOR</th>
                    <th>DATA</th>
                    {isAdmin && <th style={{ textAlign: 'center' }}>AÇÃO</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={isAdmin ? 6 : 5} className={styles.emptyTableState}>
                        Nenhuma movimentação financeira encontrada com os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map(t => {
                      const isRec = t.type === 'RECEITA'
                      return (
                        <tr key={t.id} className={styles.tableRow}>
                          <td className={styles.descCell}>
                            <div className={isRec ? styles.iconIn : styles.iconOut}>
                              {isRec ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />}
                            </div>
                            <div className={styles.descGroup}>
                              <span className={styles.boldText}>{t.description || 'Lançamento sem descrição'}</span>
                              {t.supplier && (
                                <span className={styles.supplierBadge}>
                                  <Building size={11} /> {t.supplier.name}
                                </span>
                              )}
                              {t.appointment?.patient && (
                                <span className={styles.patientBadge}>
                                  Paciente: {t.appointment.patient.name}
                                </span>
                              )}
                            </div>
                          </td>
                          <td>{t.category || 'Geral'}</td>
                          <td>{getMethodLabel(normalizePaymentMethod(t.paymentMethod))}</td>
                          <td className={isRec ? styles.valueRec : styles.valueDesp}>
                            {isRec ? `+ ${formatCurrency(Number(t.amount))}` : `- ${formatCurrency(Number(t.amount))}`}
                          </td>
                          <td className={styles.dateCell}>
                            {new Date(t.paidAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} • {new Date(t.paidAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                          </td>
                          {isAdmin && (
                            <td style={{ textAlign: 'center' }}>
                              <button 
                                type="button" 
                                onClick={() => handleDeleteTransaction(t.id)} 
                                className={styles.btnDeleteRow}
                                title="Remover transação"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          )}
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Aba de Planos de Tratamento */
        <div className={styles.tableCard}>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>PACIENTE</th>
                  <th>TÍTULO DO PLANO</th>
                  <th>STATUS</th>
                  <th>VALOR TOTAL</th>
                  <th style={{ textAlign: 'right' }}>INTEGRAÇÃO</th>
                </tr>
              </thead>
              <tbody>
                {plans.length === 0 ? (
                  <tr>
                    <td colSpan={5} className={styles.emptyTableState}>
                      Nenhum plano de tratamento cadastrado.
                    </td>
                  </tr>
                ) : (
                  plans.map(p => (
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
                  ))
                )}
              </tbody>
            </table>
          </div>
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
              {/* Seleção de Fornecedor exclusivo para Despesa */}
              {modalType === 'DESPESA' && (
                <div className={styles.formGroup}>
                  <div className={styles.labelRowWithAction}>
                    <label>Fornecedor Vinculado</label>
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
                        setDescription(`Compra: ${sup.name}`)
                      }
                    }}
                    className={styles.input}
                  >
                    <option value="">Nenhum (Despesa interna / avulsa)</option>
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
                  placeholder={modalType === 'RECEITA' ? 'Ex: Pagamento Consulta Avulsa' : 'Ex: Compra de Luvas e Anestésicos'}
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
                    <option value="CREDITO">Cartão de Crédito</option>
                    <option value="DEBITO">Cartão de Débito</option>
                    <option value="DINHEIRO">Dinheiro</option>
                    <option value="CONVENIO">Convênio</option>
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
                <h3>Cadastrar Fornecedor</h3>
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
                  placeholder="Ex: Carlos (85) 99999-9999"
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
                  <span>Cadastrar</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}