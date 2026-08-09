'use client'

import { useState, useEffect } from 'react'
import { X, Plus, Trash2, Boxes, Info } from 'lucide-react'
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
  { value: 'UN', label: 'un' },
  { value: 'ML', label: 'ml' },
  { value: 'MG', label: 'mg' },
  { value: 'G', label: 'g' },
  { value: 'L', label: 'L' },
  { value: 'CX', label: 'cx' },
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

  // 🟢 Carrega produtos reais do Estoque + Ficha Técnica existente
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

  // 🧠 Modal Inteligente: Seta a unidade padrão do produto automaticamente ao selecionar
  const handleSelectProduct = (productId: string) => {
    setSelectedProductId(productId)
    const prod = availableProducts.find((p) => p.id === productId)
    if (prod) {
      if (prod.unit) setSelectedUnit(prod.unit)
    }
  }

  // 🧠 Parsing para suportar '0,5' ou '0.5' e converter para Float
  const handleAddItem = () => {
    const sanitizedVal = quantityInput.replace(',', '.')
    const parsedQty = parseFloat(sanitizedVal)

    if (!selectedProductId || isNaN(parsedQty) || parsedQty <= 0) {
      alert('Informe uma quantidade válida. Ex: 0,5 ou 1.8')
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

  // 🧮 Cálculo de Custo Estimado e Margem
  const totalCost = items.reduce((acc, item) => {
    const cost = item.product?.costPrice || item.product?.unitPrice || 0
    return acc + cost * Number(item.quantity)
  }, 0)

  const salePrice = Number(procedure.basePrice || 0)
  const profitMargin = salePrice > 0 ? salePrice - totalCost : 0

  const handleSave = async () => {
    setSaving(true)
    try {
      const formattedItems = items.map((item) => ({
        productId: item.productId || item.product?.id,
        quantity: Number(item.quantity), // 🟢 Garante Float para o Prisma
        unit: item.unit || 'UN',
      }))

      await api.post(`/procedures/${procedure.id}/products`, {
        items: formattedItems,
        products: formattedItems,
      })

      onSuccess()
      onClose()
    } catch (err: any) {
      console.error('Erro ao salvar Ficha Técnica:', err)
      const errorMsg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Erro ao salvar a Ficha Técnica. Verifique os logs do Backend.'
      alert(errorMsg)
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
          {/* Painel de Precificação Inteligente */}
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

          {/* Form com Auto-Select & Input Fracionado */}
          <div className={styles.formRowCustom} style={{ gridTemplateColumns: '1fr 80px 70px auto' }}>
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
                    {p.name} ({p.quantity} {p.unit || 'UN'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={styles.label}>Qtd</label>
              <input
                type="text"
                placeholder="0.5"
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

          {/* Lista de Insumos com Renderização de Quantidade Fracionada */}
          <div className={styles.itemList}>
            {items.length === 0 ? (
              <p className={styles.emptyText}>Nenhum insumo vinculado a este procedimento.</p>
            ) : (
              items.map((item, idx) => (
                <div key={idx} className={styles.itemCard}>
                  <span className={styles.itemName}>
                    <Boxes size={15} color="#64748b" />
                    {item.product?.name || 'Insumo'}
                  </span>
                  <div className={styles.itemActions}>
                    <span className={styles.qtyBadge}>
                      {item.quantity} {item.unit || item.product?.unit || 'un'}
                    </span>
                    <button type="button" onClick={() => handleRemoveItem(idx)} className={styles.deleteBtn} title="Remover">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))
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