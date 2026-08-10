'use client'

import React, { useState, useEffect, useRef } from 'react'
import {
  X,
  Plus,
  Minus,
  Trash2,
  UploadCloud,
  Download,
  Box,
  Loader2,
  Search,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
} from 'lucide-react'
import api from '@/lib/api'
import styles from './modal.module.css'

export interface StockProductInput {
  id: string
  name: string
  lotNumber: string
  quantity: number
  minQuantity: number
  unit: string
  costPrice?: string
  itemsPerPackage?: number
  expirationDate: string
  supplierId: string
  observation: string
}

interface ProductDb {
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
  supplierId?: string
}

interface SupplierDb {
  id: string
  name: string
}

interface StockManagementModalProps {
  isOpen: boolean
  onClose: () => void
  onSaveProducts?: (products: StockProductInput[]) => void
  onSuccess?: () => void
  planType?: 'BASIC' | 'PREMIUM'
}

const UNIT_OPTIONS = [
  { value: 'UN', label: 'un (Unidade / Seringa)' },
  { value: 'ML', label: 'ml (Mililitro)' },
  { value: 'MG', label: 'mg (Miligrama)' },
  { value: 'G', label: 'g (Grama)' },
  { value: 'L', label: 'L (Litro)' },
  { value: 'CX', label: 'cx (Caixa / Embalagem)' },
]

const REASONS_INCREASE = [
  'Compra / Reposição de Estoque',
  'Ajuste de Contagem (Inventário)',
  'Devolução de Paciente / Fornecedor',
  'Outro Motivo',
]

const REASONS_DECREASE = [
  'Uso Clínico (Não lançado)',
  'Produto Vencido / Descartado',
  'Avaria / Perda / Quebra',
  'Ajuste de Contagem (Inventário)',
  'Outro Motivo',
]

export function StockManagementModal({
  isOpen,
  onClose,
  onSaveProducts,
  onSuccess,
  planType = 'BASIC',
}: StockManagementModalProps) {
  const [activeTab, setActiveTab] = useState<'adjust' | 'create' | 'import'>('adjust')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingProducts, setIsLoadingProducts] = useState(false)

  // ─── ABA 1 ───
  const [dbProducts, setDbProducts] = useState<ProductDb[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [adjustments, setAdjustments] = useState<Record<string, number>>({})

  const [showReasonsStep, setShowReasonsStep] = useState(false)
  const [reasonsMap, setReasonsMap] = useState<Record<string, string>>({})

  // ─── ABA 2 ───
  const [suppliers, setSuppliers] = useState<SupplierDb[]>([])
  const [products, setProducts] = useState<StockProductInput[]>([
    {
      id: String(Date.now()),
      name: '',
      lotNumber: '',
      quantity: 1,
      minQuantity: 1,
      unit: 'UN',
      costPrice: '',
      itemsPerPackage: 100,
      expirationDate: '',
      supplierId: '',
      observation: '',
    },
  ])

  // ─── ABA 3 ───
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  useEffect(() => {
    if (isOpen) {
      if (activeTab === 'adjust') {
        loadDbProducts()
        setShowReasonsStep(false)
      } else if (activeTab === 'create') {
        loadSuppliers()
      }
    }
  }, [isOpen, activeTab])

  async function loadDbProducts() {
    setIsLoadingProducts(true)
    try {
      const response = await api.get('/products?limit=100')
      const fetched: ProductDb[] = response.data.data || response.data || []
      setDbProducts(fetched)

      const initialMap: Record<string, number> = {}
      fetched.forEach((p) => {
        initialMap[p.id] = p.quantity
      })
      setAdjustments(initialMap)
    } catch (err) {
      console.error('Erro ao carregar produtos:', err)
    } finally {
      setIsLoadingProducts(false)
    }
  }

  async function loadSuppliers() {
    try {
      const response = await api.get('/suppliers')
      const fetched = response.data.data || response.data || []
      setSuppliers(fetched)
    } catch (err) {
      console.error('Erro ao carregar fornecedores:', err)
    }
  }

  if (!isOpen) return null

  const handleQuantityChange = (id: string, delta: number) => {
    setAdjustments((prev) => {
      const current = prev[id] ?? 0
      return { ...prev, [id]: Math.max(0, current + delta) }
    })
  }

  const handleQuantityInput = (id: string, val: number) => {
    setAdjustments((prev) => ({ ...prev, [id]: Math.max(0, val) }))
  }

  const handleDeleteProduct = async (id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja excluir o produto "${name}" permanentemente?`)) return
    
    setIsSubmitting(true)
    try {
      await api.delete(`/products/${id}`)
      setDbProducts((prev) => prev.filter((p) => p.id !== id))
      if (onSuccess) onSuccess()
    } catch (err: any) {
      console.error('Erro ao deletar produto:', err)
      alert(err.response?.data?.message || 'Erro ao excluir produto. Verifique suas permissões.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const changedProducts = dbProducts.filter(
    (p) => adjustments[p.id] !== undefined && adjustments[p.id] !== p.quantity
  )

  const handlePreSave = () => {
    if (changedProducts.length === 0) {
      onClose()
      return
    }

    if (planType === 'PREMIUM') {
      const initialReasons: Record<string, string> = {}
      changedProducts.forEach((p) => {
        const delta = adjustments[p.id] - p.quantity
        initialReasons[p.id] = delta > 0 ? REASONS_INCREASE[0] : REASONS_DECREASE[0]
      })
      setReasonsMap(initialReasons)
      setShowReasonsStep(true)
    } else {
      executeSaveAdjustments()
    }
  }

  const executeSaveAdjustments = async () => {
    setIsSubmitting(true)
    try {
      await Promise.all(
        changedProducts.map((p) => {
          const newQty = Number(adjustments[p.id])
          const delta = newQty - p.quantity
          const reason =
            planType === 'PREMIUM'
              ? reasonsMap[p.id] || (delta > 0 ? 'Entrada manual' : 'Saída manual')
              : 'Ajuste manual de saldo'

          return api.patch(`/products/${p.id}/stock`, {
            quantity: delta,
            reason: reason,
          })
        })
      )

      if (onSuccess) onSuccess()
      else window.location.reload()
      onClose()
    } catch (err: any) {
      console.error('Erro ao atualizar estoque:', err)
      alert(`Erro: ${err.response?.data?.message || 'Falha ao atualizar quantidade.'}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleProductChange = (index: number, field: keyof StockProductInput, value: any) => {
    const updated = [...products]
    updated[index] = { ...updated[index], [field]: value }
    setProducts(updated)
  }

  const handleAddRow = () => {
    setProducts((prev) => [
      ...prev,
      {
        id: String(Date.now() + Math.random()),
        name: '',
        lotNumber: '',
        quantity: 1,
        minQuantity: 1,
        unit: 'UN',
        costPrice: '',
        itemsPerPackage: 100,
        expirationDate: '',
        supplierId: '',
        observation: '',
      },
    ])
  }

  const handleRemoveRow = (index: number) => {
    if (products.length === 1) return
    setProducts((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmitCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    const validProducts = products.filter((p) => p.name.trim() !== '')

    if (validProducts.length === 0) {
      alert('Preencha ao menos o nome de um produto.')
      return
    }

    setIsSubmitting(true)

    try {
      await Promise.all(
        validProducts.map(async (p) => {
          const parsedCost = p.costPrice ? parseFloat(p.costPrice.replace(',', '.')) : undefined

          const payload = {
            name: p.name.trim(),
            quantity: Number(p.quantity),
            minQuantity: Number(p.minQuantity),
            unit: p.unit || 'UN',
            costPrice: isNaN(parsedCost as number) ? undefined : parsedCost,
            itemsPerPackage: Number(p.itemsPerPackage || 1), // 🟢 Suporte universal
            supplierId: p.supplierId ? p.supplierId : undefined,
            lotNumber: p.lotNumber.trim() ? p.lotNumber.trim() : undefined,
            expiryDate: p.expirationDate ? new Date(p.expirationDate).toISOString() : undefined,
            notes: p.observation.trim() ? p.observation.trim() : undefined,
          }

          await api.post('/products', payload)
        })
      )

      if (onSaveProducts) onSaveProducts(validProducts)
      if (onSuccess) onSuccess()

      setProducts([
        {
          id: String(Date.now()),
          name: '',
          lotNumber: '',
          quantity: 1,
          minQuantity: 1,
          unit: 'UN',
          costPrice: '',
          itemsPerPackage: 100,
          expirationDate: '',
          supplierId: '',
          observation: '',
        },
      ])
      onClose()
    } catch (err: any) {
      console.error('Erro ao cadastrar produtos:', err)
      alert(`Erro ao cadastrar produtos: ${err.response?.data?.message || 'Falha no servidor.'}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDropzoneClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) setSelectedFile(file)
  }

  const handleDownloadTemplate = (e: React.MouseEvent) => {
    e.preventDefault()
    const csvHeader = 'nome;lote;quantidade;quantidade_minima;unidade;preco_custo;qtd_por_caixa;validade;observacoes\n'
    const csvRows = [
      'Caixa de Luvas Azul;LT-8842;10;2;CX;22.00;100;2026-12-31;100 luvas por caixa',
      'Resina Fotopolimerizável A2;LT-9910;5;1;UN;80.00;4;2027-05-15;Seringa com 4g',
    ].join('\n')

    const csvContent = '\uFEFF' + csvHeader + csvRows
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', 'modelo_importacao_estoque.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleImportSubmit = async () => {
    if (!selectedFile) {
      alert('Selecione um arquivo .csv primeiro.')
      return
    }

    setIsSubmitting(true)
    try {
      const text = await selectedFile.text()
      const lines = text.split('\n').filter((line) => line.trim() !== '')

      if (lines.length <= 1) {
        alert('A planilha parece estar vazia.')
        return
      }

      const delimiter = lines[0].includes(';') ? ';' : ','
      const dataRows = lines.slice(1)

      const parsedProducts = dataRows
        .map((row) => {
          const cols = row.split(delimiter).map((c) => c.trim().replace(/^"|"$/g, ''))
          const parsedCost = cols[5] ? parseFloat(cols[5].replace(',', '.')) : undefined
          const parsedItemsPerPkg = cols[6] ? Number(cols[6]) : 1

          return {
            name: cols[0] || '',
            lotNumber: cols[1] || undefined,
            quantity: Number(cols[2]) || 0,
            minQuantity: Number(cols[3]) || 0,
            unit: cols[4] || 'UN',
            costPrice: isNaN(parsedCost as number) ? undefined : parsedCost,
            itemsPerPackage: isNaN(parsedItemsPerPkg) ? 1 : parsedItemsPerPkg,
            expiryDate: cols[7] ? new Date(cols[7]).toISOString() : undefined,
            notes: cols[8] || undefined,
          }
        })
        .filter((p) => p.name !== '')

      await Promise.all(parsedProducts.map((payload) => api.post('/products', payload)))

      if (onSuccess) onSuccess()
      setSelectedFile(null)
      onClose()
    } catch (err) {
      console.error('Erro ao importar planilha:', err)
      alert('Erro ao importar planilha. Verifique o formato do arquivo.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <button onClick={onClose} className={styles.closeBtn} type="button" disabled={isSubmitting}>
          <X size={20} />
        </button>

        {!showReasonsStep && (
          <div className={styles.tabNav}>
            <button
              type="button"
              onClick={() => setActiveTab('adjust')}
              className={`${styles.tabBtn} ${activeTab === 'adjust' ? styles.tabActive : ''}`}
            >
              Alterar quantidade
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('create')}
              className={`${styles.tabBtn} ${activeTab === 'create' ? styles.tabActive : ''}`}
            >
              Cadastrar novo produto
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('import')}
              className={`${styles.tabBtn} ${activeTab === 'import' ? styles.tabActive : ''}`}
            >
              Importar planilha
            </button>
          </div>
        )}

        {/* ─── ABA 1: ALTERAR QUANTIDADE ─── */}
        {activeTab === 'adjust' && (
          <div className={styles.tabContent}>
            {!showReasonsStep ? (
              <>
                <div className={styles.searchBox}>
                  <Search size={16} className={styles.searchIcon} />
                  <input
                    type="text"
                    placeholder="Buscar produto cadastrado..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={styles.searchInput}
                  />
                </div>

                {isLoadingProducts ? (
                  <div className={styles.loadingState}>
                    <Loader2 size={24} className={styles.spinner} />
                    <span>Carregando produtos...</span>
                  </div>
                ) : dbProducts.length === 0 ? (
                  <div className={styles.emptyTabState}>
                    <div className={styles.iconCircle}>
                      <Box size={32} color="var(--primary, #0284c7)" />
                    </div>
                    <h3 className={styles.emptyTitle}>Nenhum produto encontrado</h3>
                    <p className={styles.emptyDesc}>
                      Cadastre novos itens na aba "Cadastrar novo produto" para ajustar os saldos.
                    </p>
                  </div>
                ) : (
                  <div className={styles.adjustListScroll}>
                    {dbProducts
                      .filter((p) => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
                      .map((item) => {
                        const currentQty = adjustments[item.id] ?? item.quantity
                        const hasChanged = currentQty !== item.quantity
                        const isZeroed = item.quantity === 0 && currentQty === 0

                        return (
                          <div key={item.id} className={styles.adjustRow}>
                            <div className={styles.productMeta}>
                              <span className={styles.productName}>{item.name}</span>
                              <span className={styles.productSub}>
                                Lote: {item.lotNumber || item.batchNumber || '—'} | Min: {item.minQuantity} {item.unit || 'un.'}
                                {item.itemsPerPackage && item.itemsPerPackage > 1 && (
                                  <strong style={{ color: '#0284c7', marginLeft: '6px' }}>
                                    ({item.itemsPerPackage} {item.unit === 'CX' ? 'un/cx' : 'g/ml por frasco'})
                                  </strong>
                                )}
                              </span>
                            </div>

                            <div className={styles.counterWrapper}>
                              <div className={styles.counterControl}>
                                <button
                                  type="button"
                                  className={styles.counterBtn}
                                  onClick={() => handleQuantityChange(item.id, -1)}
                                  disabled={currentQty <= 0}
                                >
                                  <Minus size={14} />
                                </button>
                                <input
                                  type="number"
                                  min="0"
                                  value={currentQty}
                                  onChange={(e) => handleQuantityInput(item.id, Number(e.target.value))}
                                  className={styles.counterInput}
                                />
                                <button
                                  type="button"
                                  className={styles.counterBtn}
                                  onClick={() => handleQuantityChange(item.id, 1)}
                                >
                                  <Plus size={14} />
                                </button>
                              </div>

                              <div className={styles.badgeSlot} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                {hasChanged && <span className={styles.changedBadge}>Alterado</span>}
                                {isZeroed && !hasChanged && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteProduct(item.id, item.name)}
                                    title="Excluir produto permanentemente"
                                    disabled={isSubmitting}
                                    style={{
                                      background: 'transparent',
                                      border: 'none',
                                      color: '#ef4444',
                                      cursor: 'pointer',
                                      padding: '4px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center'
                                    }}
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                  </div>
                )}

                <div className={styles.modalFooter}>
                  <button type="button" onClick={onClose} className={styles.btnSecondary} disabled={isSubmitting}>
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handlePreSave}
                    className={styles.btnPrimaryModal}
                    disabled={isSubmitting || dbProducts.length === 0}
                  >
                    <span>Salvar quantidades</span>
                  </button>
                </div>
              </>
            ) : (
              <div className={styles.reasonsStepContainer}>
                <div className={styles.reasonsHeader}>
                  <div className={styles.premiumBadgeHeader}>
                    <Sparkles size={14} /> <span>Recurso Premium</span>
                  </div>
                  <h3>Justificativa de Movimentação</h3>
                  <p>Selecione o motivo da alteração para rastreabilidade nos relatórios.</p>
                </div>

                <div className={styles.adjustListScroll}>
                  {changedProducts.map((p) => {
                    const newQty = adjustments[p.id]
                    const delta = newQty - p.quantity
                    const isIncrease = delta > 0

                    return (
                      <div key={p.id} className={styles.reasonRow}>
                        <div className={styles.reasonMeta}>
                          <span className={styles.productName}>{p.name}</span>
                          <span className={isIncrease ? styles.deltaPositive : styles.deltaNegative}>
                            {isIncrease ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                            {isIncrease ? `+${delta}` : `${delta}`} {p.unit || 'un.'} (Novo total: {newQty})
                          </span>
                        </div>

                        <select
                          value={reasonsMap[p.id] || ''}
                          onChange={(e) => setReasonsMap((prev) => ({ ...prev, [p.id]: e.target.value }))}
                          className={styles.reasonSelect}
                        >
                          {(isIncrease ? REASONS_INCREASE : REASONS_DECREASE).map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </div>
                    )
                  })}
                </div>

                <div className={styles.modalFooter}>
                  <button
                    type="button"
                    onClick={() => setShowReasonsStep(false)}
                    className={styles.btnSecondary}
                    disabled={isSubmitting}
                  >
                    Voltar
                  </button>
                  <button
                    type="button"
                    onClick={executeSaveAdjustments}
                    className={styles.btnPrimaryModal}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={16} className={styles.spinner} />
                        <span>Confirmando...</span>
                      </>
                    ) : (
                      <span>Confirmar e Salvar</span>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── ABA 2: CADASTRAR NOVO PRODUTO ─── */}
        {activeTab === 'create' && (
          <form onSubmit={handleSubmitCreate}>
            <div className={styles.cardsContainerScroll}>
              {products.map((item, index) => {
                const needsConversionField = item.unit === 'CX' || item.unit === 'UN'

                return (
                  <div key={item.id} className={styles.productCardBlock}>
                    <div className={styles.cardHeader}>
                      <span className={styles.cardTitle}>Item #{index + 1}</span>
                      {products.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(index)}
                          className={styles.cardRemoveBtn}
                          title="Remover este produto"
                          disabled={isSubmitting}
                        >
                          <Trash2 size={15} />
                          <span>Remover</span>
                        </button>
                      )}
                    </div>

                    <div className={styles.cardGrid}>
                      <div className={styles.colSpan8}>
                        <label className={styles.label}>Nome do Produto *</label>
                        <input
                          type="text"
                          placeholder="Ex: Caixa de Luvas Azul / Resina A2 4g"
                          value={item.name}
                          onChange={(e) => handleProductChange(index, 'name', e.target.value)}
                          className={styles.input}
                          required
                        />
                      </div>

                      <div className={styles.colSpan4}>
                        <label className={styles.label}>Lote / Código</label>
                        <input
                          type="text"
                          placeholder="Ex: LT-8842"
                          value={item.lotNumber}
                          onChange={(e) => handleProductChange(index, 'lotNumber', e.target.value)}
                          className={styles.input}
                        />
                      </div>

                      <div className={styles.colSpan3}>
                        <label className={styles.label}>Qtd. Inicial *</label>
                        <input
                          type="number"
                          min="0"
                          value={item.quantity}
                          onChange={(e) => handleProductChange(index, 'quantity', Number(e.target.value))}
                          className={styles.input}
                        />
                      </div>

                      <div className={styles.colSpan3}>
                        <label className={styles.label}>Unidade</label>
                        <select
                          value={item.unit}
                          onChange={(e) => handleProductChange(index, 'unit', e.target.value)}
                          className={styles.select}
                        >
                          {UNIT_OPTIONS.map((u) => (
                            <option key={u.value} value={u.value}>
                              {u.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className={styles.colSpan3}>
                        <label className={styles.label}>Custo Compra (R$)</label>
                        <input
                          type="text"
                          placeholder="Ex: 22.00"
                          value={item.costPrice}
                          onChange={(e) => handleProductChange(index, 'costPrice', e.target.value)}
                          className={styles.input}
                        />
                      </div>

                      {/* 🟢 CAMPO DE FRACIONAMENTO UNIVERSAL */}
                      {needsConversionField ? (
                        <div className={styles.colSpan3}>
                          <label className={styles.label} style={{ color: '#0284c7', fontWeight: 600 }}>
                            {item.unit === 'CX' ? 'Unidades / Caixa *' : 'Conteúdo Total (g / ml)'}
                          </label>
                          <input
                            type="number"
                            min="1"
                            placeholder={item.unit === 'CX' ? 'Ex: 100' : 'Ex: 4 (para 4g)'}
                            value={item.itemsPerPackage || (item.unit === 'CX' ? 100 : 1)}
                            onChange={(e) => handleProductChange(index, 'itemsPerPackage', Number(e.target.value))}
                            className={styles.input}
                            style={{ borderColor: '#0284c7', backgroundColor: '#f0f9ff' }}
                          />
                        </div>
                      ) : (
                        <div className={styles.colSpan3}>
                          <label className={styles.label}>Estoque Mínimo</label>
                          <input
                            type="number"
                            min="0"
                            value={item.minQuantity}
                            onChange={(e) => handleProductChange(index, 'minQuantity', Number(e.target.value))}
                            className={styles.input}
                          />
                        </div>
                      )}

                      {needsConversionField && (
                        <div className={styles.colSpan4}>
                          <label className={styles.label}>Estoque Mínimo</label>
                          <input
                            type="number"
                            min="0"
                            value={item.minQuantity}
                            onChange={(e) => handleProductChange(index, 'minQuantity', Number(e.target.value))}
                            className={styles.input}
                          />
                        </div>
                      )}

                      <div className={needsConversionField ? styles.colSpan4 : styles.colSpan6}>
                        <label className={styles.label}>Fornecedor</label>
                        <select
                          value={item.supplierId}
                          onChange={(e) => handleProductChange(index, 'supplierId', e.target.value)}
                          className={styles.select}
                        >
                          <option value="">Nenhum / Não especificado</option>
                          {suppliers.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className={needsConversionField ? styles.colSpan4 : styles.colSpan6}>
                        <label className={styles.label}>Data de Validade</label>
                        <input
                          type="date"
                          value={item.expirationDate}
                          onChange={(e) => handleProductChange(index, 'expirationDate', e.target.value)}
                          className={styles.input}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <button
              type="button"
              onClick={handleAddRow}
              className={styles.addAnotherBtn}
              disabled={isSubmitting}
            >
              <Plus size={16} />
              <span>Adicionar outro produto</span>
            </button>

            <div className={styles.modalFooter}>
              <button type="button" onClick={onClose} className={styles.btnSecondary} disabled={isSubmitting}>
                Cancelar
              </button>
              <button type="submit" className={styles.btnPrimaryModal} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className={styles.spinner} />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <span>Cadastrar produto(s)</span>
                )}
              </button>
            </div>
          </form>
        )}

        {/* ─── ABA 3: IMPORTAR PLANILHA ─── */}
        {activeTab === 'import' && (
          <div className={styles.importContainer}>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".csv"
              style={{ display: 'none' }}
            />

            <div className={styles.importHeader}>
              <h3 className={styles.importTitle}>Importe seus produtos via planilha</h3>
              <p className={styles.importSub}>Envie um arquivo CSV com os dados do seu estoque.</p>
            </div>

            <div className={styles.dropzone} onClick={handleDropzoneClick}>
              {selectedFile ? (
                <>
                  <FileText size={32} className={styles.dropzoneIcon} />
                  <p className={styles.dropzoneText}>{selectedFile.name}</p>
                  <span className={styles.dropzoneSub}>Clique para alterar o arquivo</span>
                </>
              ) : (
                <>
                  <UploadCloud size={32} className={styles.dropzoneIcon} />
                  <p className={styles.dropzoneText}>Clique para selecionar sua planilha</p>
                  <span className={styles.dropzoneSub}>Apenas arquivos .csv</span>
                </>
              )}
            </div>

            <div className={styles.downloadWrapper}>
              <a href="#" onClick={handleDownloadTemplate} className={styles.downloadLink}>
                <Download size={14} />
                Baixar planilha de exemplo (.csv)
              </a>
            </div>

            <div className={styles.instructionsBox}>
              <p className={styles.instructionsTitle}>Colunas da planilha:</p>
              <p><strong>nome</strong> — nome do produto (obrigatório)</p>
              <p><strong>lote</strong> — código/número do lote</p>
              <p><strong>quantidade</strong> — quantidade inicial em estoque</p>
              <p><strong>quantidade_minima</strong> — estoque mínimo para alertas</p>
              <p><strong>unidade</strong> — UN, ML, MG, G, L, CX (opcional)</p>
              <p><strong>preco_custo</strong> — valor de compra ex: 22.00 (opcional)</p>
              <p><strong>qtd_por_caixa</strong> — número de itens ou gramas por embalagem (opcional)</p>
              <p><strong>validade</strong> — AAAA-MM-DD</p>
            </div>

            <div className={styles.modalFooter}>
              <button type="button" onClick={onClose} className={styles.btnSecondary} disabled={isSubmitting}>
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleImportSubmit}
                className={styles.btnPrimaryModal}
                disabled={isSubmitting || !selectedFile}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className={styles.spinner} />
                    <span>Importando...</span>
                  </>
                ) : (
                  <span>Importar produtos</span>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}