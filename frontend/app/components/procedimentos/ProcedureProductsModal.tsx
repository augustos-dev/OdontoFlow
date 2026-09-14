'use client'

import { useState, useEffect } from 'react'
import { X, Plus, Trash2, Boxes, AlertCircle, TrendingUp, DollarSign, Loader2, Sparkles } from 'lucide-react'
import api from '@/lib/api'
import styles from './modal.module.css'

interface ProcedureProductsModalProps {
  isOpen: boolean
  onClose: () => void
  procedure: {
    id: string
    name: string
    basePrice?: number
    procedureProducts?: any[]
  }
  onSuccess: () => void
  primaryColor?: string
  accentColor?: string
}

const UNIT_OPTIONS = [
  { value: 'UN', label: 'un (Unidade/Tubo)' },
  { value: 'ML', label: 'ml (Mililitro)' },
  { value: 'MG', label: 'mg (Miligrama)' },
  { value: 'G', label: 'g (Grama)' },
  { value: 'CX', label: 'cx (Caixa Inteira)' },
]

export default function ProcedureProductsModal({
  isOpen,
  onClose,
  procedure,
  onSuccess,
  primaryColor = '#06b6d4',
  accentColor = '#0891b2',
}: ProcedureProductsModalProps) {
  const [availableProducts, setAvailableProducts] = useState<any[]>([])
  const [selectedProductId, setSelectedProductId] = useState('')
  const [quantityInput, setQuantityInput] = useState<string>('1')
  const [selectedUnit, setSelectedUnit] = useState<string>('UN')
  const [items, setItems] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [loadingProducts, setLoadingProducts] = useState(true)

  useEffect(() => {
    async function loadInitialData() {
      try {
        setLoadingProducts(true)
        const [productsRes, recipeRes] = await Promise.allSettled([
          api.get('/products?limit=100'),
          api.get(`/procedures/${procedure.id}/products`),
        ])

        if (productsRes.status === 'fulfilled') {
          const pData = productsRes.value.data
          setAvailableProducts(pData.data || pData || [])
        }

        if (recipeRes.status === 'fulfilled') {
          const rData = recipeRes.value.data
          const initialItems = rData.data || rData || procedure.procedureProducts || []
          setItems(initialItems)
        } else {
          setItems(procedure.procedureProducts || [])
        }
      } catch (err) {
        console.error('Erro ao carregar Ficha Técnica:', err)
      } finally {
        setLoadingProducts(false)
      }
    }

    if (procedure?.id && isOpen) {
      loadInitialData()
    }
  }, [procedure, isOpen])

  const handleSelectProduct = (productId: string) => {
    setSelectedProductId(productId)
    const prod = availableProducts.find((p) => p.id === productId)
    if (prod) {
      if (prod.unit === 'CX') {
        setSelectedUnit('UN')
      } else if (prod.unit) {
        setSelectedUnit(prod.unit)
      }
    }
  }

  const handleAddItem = () => {
    const sanitizedVal = quantityInput.replace(',', '.')
    const parsedQty = parseFloat(sanitizedVal)

    if (!selectedProductId || isNaN(parsedQty) || parsedQty <= 0) {
      alert('Informe uma quantidade válida.')
      return
    }

    const productObj = availableProducts.find((p) => p.id === selectedProductId)
    if (!productObj) return

    if (items.some((i) => (i.productId || i.product?.id) === selectedProductId)) {
      alert('Este produto já está adicionado na ficha técnica.')
      return
    }

    setItems((prev) => [
      ...prev,
      {
        productId: selectedProductId,
        quantity: parsedQty,
        unit: selectedUnit,
        product: productObj,
      },
    ])

    setSelectedProductId('')
    setQuantityInput('1')
    setSelectedUnit('UN')
  }

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  // Cálculo proporcional inteligente de custo
  function calculateItemCost(item: any) {
    const rawCost =
      item.product?.costPrice !== undefined && item.product?.costPrice !== null
        ? parseFloat(String(item.product.costPrice))
        : item.product?.unitPrice
        ? parseFloat(String(item.product.unitPrice))
        : 0

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

  const totalCost = items.reduce((acc, item) => acc + calculateItemCost(item), 0)
  const salePrice = Number(procedure.basePrice || 0)
  const profitMargin = salePrice > 0 ? salePrice - totalCost : 0
  const marginPercent = salePrice > 0 ? ((profitMargin / salePrice) * 100).toFixed(0) : '0'

  const handleSave = async () => {
    setSaving(true)
    try {
      const formattedItems = items.map((item) => ({
        productId: item.productId || item.product?.id,
        quantity: Number(item.quantity),
        unit: item.unit || item.product?.unit || 'UN',
      }))

      await api.post(`/procedures/${procedure.id}/products`, {
        items: formattedItems,
      })

      onSuccess()
      onClose()
    } catch (err: any) {
      console.error('Erro ao salvar Ficha Técnica:', err)
      alert(err.response?.data?.message || 'Erro ao salvar a Ficha Técnica.')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div 
      className={styles.overlay}
      style={{
        '--brand-primary': primaryColor,
        '--brand-accent': accentColor,
      } as React.CSSProperties}
    >
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <div className={styles.headerIconWrapper}>
              <Boxes size={18} className={styles.headerIcon} />
            </div>
            <div>
              <h2 className={styles.title}>Ficha Técnica (Exit Inteligente de Estoque)</h2>
              <p className={styles.subtitle}>{procedure.name}</p>
            </div>
          </div>
          <button onClick={onClose} className={styles.closeBtn} type="button" title="Fechar">
            <X size={18} />
          </button>
        </div>

        <div className={styles.body}>
          {/* Card Duplo de Rentabilidade */}
          <div className={styles.kpiProfitContainer}>
            <div className={styles.kpiProfitCard}>
              <span className={styles.kpiProfitLabel}>CUSTO TOTAL DE INSUMOS</span>
              <p className={`${styles.kpiProfitVal} ${totalCost > 0 ? styles.valRed : styles.valMuted}`}>
                R$ {totalCost.toFixed(2)}
              </p>
              <small className={styles.kpiProfitSub}>Débito automático no estoque por sessão</small>
            </div>

            <div className={styles.kpiProfitCard}>
              <div className={styles.kpiProfitRow}>
                <span className={styles.kpiProfitLabel}>MARGEM LÍQUIDA ESTIMADA</span>
                <span className={styles.kpiBadgePercent}>{marginPercent}%</span>
              </div>
              <p className={`${styles.kpiProfitVal} ${profitMargin >= 0 ? styles.valGreen : styles.valRed}`}>
                R$ {profitMargin.toFixed(2)}
              </p>
              <small className={styles.kpiProfitSub}>Preço de Venda: R$ {salePrice.toFixed(2)}</small>
            </div>
          </div>

          {/* Seletor de Insumos */}
          <div className={styles.formRowCustom}>
            <div className={styles.selectProductCol}>
              <label className={styles.label}>Insumo / Material do Estoque</label>
              <select
                value={selectedProductId}
                onChange={(e) => handleSelectProduct(e.target.value)}
                className={styles.select}
                disabled={loadingProducts}
              >
                <option value="">
                  {loadingProducts ? 'Carregando estoque da unidade...' : 'Selecione um insumo...'}
                </option>
                {availableProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.quantity} {p.unit || 'UN'}) - R$ {Number(p.costPrice || p.unitPrice || 0).toFixed(2)}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.inputQtyCol}>
              <label className={styles.label}>Qtd</label>
              <input
                type="text"
                placeholder="1"
                value={quantityInput}
                onChange={(e) => setQuantityInput(e.target.value)}
                className={styles.input}
              />
            </div>

            <div className={styles.selectUnitCol}>
              <label className={styles.label}>Unidade</label>
              <select
                value={selectedUnit}
                onChange={(e) => setSelectedUnit(e.target.value)}
                className={styles.select}
              >
                {UNIT_OPTIONS.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.btnAddCol}>
              <button 
                type="button" 
                onClick={handleAddItem} 
                className={styles.btnPrimarySm} 
                title="Adicionar à ficha"
              >
                <Plus size={16} />
                <span>Adicionar</span>
              </button>
            </div>
          </div>

          {/* Lista de Insumos da Ficha */}
          <div className={styles.itemList}>
            {items.length === 0 ? (
              <div className={styles.emptyStateContainer}>
                <Boxes size={32} className={styles.emptyStateIcon} />
                <p className={styles.emptyText}>Nenhum insumo vinculado a este procedimento ainda.</p>
                <small>Selecione um produto acima para automatizar o controle de estoque.</small>
              </div>
            ) : (
              items.map((item, idx) => {
                const itemCost = calculateItemCost(item)
                const isConverted =
                  (item.product?.unit === 'CX' && item.unit === 'UN') ||
                  (item.product?.unit === 'UN' && (item.unit === 'G' || item.unit === 'ML'))

                return (
                  <div key={idx} className={styles.itemCard}>
                    <div className={styles.itemInfoGroup}>
                      <span className={styles.itemName}>
                        <Boxes size={15} className={styles.itemIconBox} />
                        {item.product?.name || 'Insumo'}
                      </span>
                      {isConverted && (
                        <span className={styles.convertedNotice}>
                          <AlertCircle size={10} /> Custo fracionado proporcional
                        </span>
                      )}
                    </div>

                    <div className={styles.itemActions}>
                      <span className={styles.itemCostVal}>
                        + R$ {itemCost.toFixed(2)}
                      </span>
                      <span className={styles.qtyBadge}>
                        {item.quantity} {item.unit || 'UN'}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className={styles.deleteBtn}
                        title="Remover insumo"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        <div className={styles.footer}>
          <button type="button" onClick={onClose} className={styles.btnSecondary}>
            Cancelar
          </button>
          <button type="button" onClick={handleSave} disabled={saving} className={styles.btnPrimary}>
            {saving ? (
              <>
                <Loader2 size={15} className={styles.spinner} />
                <span>Salvando Ficha...</span>
              </>
            ) : (
              <span>Salvar Ficha Técnica</span>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}