'use client'

import { useState, useEffect } from 'react'
import { X, Plus, Trash2, Boxes, AlertCircle } from 'lucide-react'
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
}

const UNIT_OPTIONS = [
  { value: 'UN', label: 'un (Unidade/Par)' },
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

    if (procedure.id) {
      loadInitialData()
    }
  }, [procedure])

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
      alert('Este produto já está na ficha técnica.')
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

  // 🧮 Custo com suporte universal a Caixas (CX), Líquidos (ML/L) e Massas (G/MG)
  function calculateItemCost(item: any) {
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

    // 2. Unidade/Seringa para Gramas ou ML (Ex: resina 4g)
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

  const totalCost = items.reduce((acc, item) => acc + calculateItemCost(item), 0)
  const salePrice = Number(procedure.basePrice || 0)
  const profitMargin = salePrice > 0 ? salePrice - totalCost : 0

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
    <div className={styles.overlay}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>Ficha Técnica (Exit Inteligente)</h2>
            <p className={styles.subtitle}>{procedure.name}</p>
          </div>
          <button onClick={onClose} className={styles.closeBtn} type="button">
            <X size={18} />
          </button>
        </div>

        <div className={styles.body}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>CUSTO DOS INSUMOS</span>
              <p style={{ fontSize: '16px', fontWeight: 700, color: totalCost > 0 ? '#dc2626' : '#64748b', margin: '2px 0 0 0' }}>
                R$ {totalCost.toFixed(2)}
              </p>
            </div>
            <div>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>LUCRO ESTIMADO</span>
              <p style={{ fontSize: '16px', fontWeight: 700, color: profitMargin >= 0 ? '#16a34a' : '#dc2626', margin: '2px 0 0 0' }}>
                R$ {profitMargin.toFixed(2)}
              </p>
            </div>
          </div>

          <div className={styles.formRowCustom} style={{ gridTemplateColumns: '1fr 80px 100px auto' }}>
            <div>
              <label className={styles.label}>Insumo do Estoque</label>
              <select
                value={selectedProductId}
                onChange={(e) => handleSelectProduct(e.target.value)}
                className={styles.select}
                disabled={loadingProducts}
              >
                <option value="">
                  {loadingProducts ? 'Carregando estoque...' : 'Selecione um produto...'}
                </option>
                {availableProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.quantity} {p.unit || 'UN'}) - R$ {Number(p.costPrice || 0).toFixed(2)}/{p.unit || 'UN'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={styles.label}>Qtd</label>
              <input
                type="text"
                placeholder="2"
                value={quantityInput}
                onChange={(e) => setQuantityInput(e.target.value)}
                className={styles.input}
              />
            </div>

            <div>
              <label className={styles.label}>Unid</label>
              <select
                value={selectedUnit}
                onChange={(e) => setSelectedUnit(e.target.value)}
                className={styles.select}
              >
                {UNIT_OPTIONS.map((u) => (
                  <option key={u.value} value={u.value}>{u.label}</option>
                ))}
              </select>
            </div>

            <div>
              <button type="button" onClick={handleAddItem} className={styles.btnPrimarySm} title="Adicionar Insumo">
                <Plus size={16} />
              </button>
            </div>
          </div>

          <div className={styles.itemList}>
            {items.length === 0 ? (
              <p className={styles.emptyText}>Nenhum insumo vinculado a este procedimento.</p>
            ) : (
              items.map((item, idx) => {
                const itemCost = calculateItemCost(item)
                const isConverted = (item.product?.unit === 'CX' && item.unit === 'UN') ||
                  (item.product?.unit === 'UN' && (item.unit === 'G' || item.unit === 'ML'))

                return (
                  <div key={idx} className={styles.itemCard}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span className={styles.itemName}>
                        <Boxes size={15} color="#64748b" />
                        {item.product?.name || 'Insumo'}
                      </span>
                      {isConverted && (
                        <span style={{ fontSize: '10px', color: '#0284c7', display: 'flex', alignItems: 'center', gap: '3px', marginLeft: '20px' }}>
                          <AlertCircle size={10} /> Custo fracionado proporcional
                        </span>
                      )}
                    </div>

                    <div className={styles.itemActions}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#dc2626' }}>
                        + R$ {itemCost.toFixed(2)}
                      </span>
                      <span className={styles.qtyBadge}>
                        {item.quantity} {item.unit || 'UN'}
                      </span>
                      <button type="button" onClick={() => handleRemoveItem(idx)} className={styles.deleteBtn} title="Remover">
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
            {saving ? 'Salvando...' : 'Salvar Ficha'}
          </button>
        </div>
      </div>
    </div>
  )
}