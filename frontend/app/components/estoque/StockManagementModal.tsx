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
} from 'lucide-react'
import api from '@/lib/api'
import styles from './modal.module.css'

export interface StockProductInput {
  id: string
  name: string
  quantity: number
  minQuantity: number
  expirationDate: string
  observation: string
}

interface ProductDb {
  id: string
  name: string
  quantity: number
  minQuantity: number
  expiryDate?: string
  supplierId?: string
}

interface StockManagementModalProps {
  isOpen: boolean
  onClose: () => void
  onSaveProducts?: (products: StockProductInput[]) => void
  onSuccess?: () => void
}

type TabType = 'adjust' | 'create' | 'import'

export function StockManagementModal({
  isOpen,
  onClose,
  onSaveProducts,
  onSuccess,
}: StockManagementModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('adjust')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingProducts, setIsLoadingProducts] = useState(false)

  // ─── ESTADOS DA ABA 1: ALTERAR QUANTIDADE ───
  const [dbProducts, setDbProducts] = useState<ProductDb[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [adjustments, setAdjustments] = useState<Record<string, number>>({})

  // ─── ESTADOS DA ABA 2: CADASTRAR NOVO PRODUTO ───
  const [products, setProducts] = useState<StockProductInput[]>([
    {
      id: String(Date.now()),
      name: '',
      quantity: 1,
      minQuantity: 1,
      expirationDate: '',
      observation: '',
    },
  ])

  // ─── ESTADOS E REFS DA ABA 3: IMPORTAR PLANILHA ───
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  useEffect(() => {
    if (isOpen && activeTab === 'adjust') {
      loadDbProducts()
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
      console.error('Erro ao carregar produtos para ajuste:', err)
    } finally {
      setIsLoadingProducts(false)
    }
  }

  if (!isOpen) return null

  // ─── HANDLERS DA ABA 1 ───
  const handleQuantityChange = (id: string, delta: number) => {
    setAdjustments((prev) => {
      const current = prev[id] ?? 0
      const updated = Math.max(0, current + delta)
      return { ...prev, [id]: updated }
    })
  }

  const handleQuantityInput = (id: string, val: number) => {
    setAdjustments((prev) => ({
      ...prev,
      [id]: Math.max(0, val),
    }))
  }

  const handleSaveAdjustments = async () => {
    setIsSubmitting(true)
    try {
      const changedProducts = dbProducts.filter(
        (p) => adjustments[p.id] !== undefined && adjustments[p.id] !== p.quantity
      )

      if (changedProducts.length === 0) {
        onClose()
        return
      }

      try {
        await Promise.all(
          changedProducts.map((p) => {
            const newQty = Number(adjustments[p.id])
            return api.patch(`/products/${p.id}/stock`, { quantity: newQty })
          })
        )
      } catch (err: any) {
        if (err.response?.status === 404) {
          await Promise.all(
            changedProducts.map((p) => {
              const newQty = Number(adjustments[p.id])
              return api.put(`/products/${p.id}`, {
                name: p.name,
                quantity: newQty,
                minQuantity: p.minQuantity,
                supplierId: p.supplierId || null,
                expiryDate: p.expiryDate ? new Date(p.expiryDate).toISOString() : null,
              })
            })
          )
        } else {
          throw err
        }
      }

      if (onSuccess) {
        onSuccess()
      } else {
        window.location.reload()
      }
      onClose()
    } catch (err: any) {
      console.error('Erro ao atualizar estoque:', err)
      alert(
        `Erro (${err.response?.status || 500}): ${
          err.response?.data?.message || 'Falha ao atualizar quantidade do produto.'
        }`
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  // ─── HANDLERS DA ABA 2 ───
  const handleProductChange = (
    index: number,
    field: keyof StockProductInput,
    value: any
  ) => {
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
        quantity: 1,
        minQuantity: 1,
        expirationDate: '',
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
          const payload = {
            name: p.name,
            quantity: Number(p.quantity),
            minQuantity: Number(p.minQuantity),
            expiryDate: p.expirationDate ? new Date(p.expirationDate).toISOString() : null,
            observation: p.observation || null,
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
          quantity: 1,
          minQuantity: 1,
          expirationDate: '',
          observation: '',
        },
      ])
      onClose()
    } catch (err) {
      console.error('Erro ao cadastrar produtos no banco:', err)
      alert('Ocorreu um erro ao salvar os produtos no banco de dados.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // ─── HANDLERS DA ABA 3 (IMPORTAR PLANILHA) ───
  const handleDropzoneClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
    }
  }

 // ─── ABA 3: GERAR PLANILHA COM PONTO E VÍRGULA (FORMATO EXCEL BRASIL) ───
  const handleDownloadTemplate = (e: React.MouseEvent) => {
    e.preventDefault()

    // Usando ponto e vírgula (;) para o Excel abrir em colunas nativamente
    const csvHeader = 'nome;quantidade;quantidade_minima;validade;observacoes\n'
    const csvRows = [
      'Anestésico Tubete;50;10;2026-12-31;Lote 8842A',
      'Caixa de Luvas P;20;5;2027-05-15;Marca Supermax',
      'Resina Fotopolimerizável A2;8;2;;Lote Especial',
    ].join('\n')

    const csvContent = '\uFEFF' + csvHeader + csvRows
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', 'modelo_importacao_odontoflow.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // ─── LEITURA HÍBRIDA (SUPORTA VÍRGULA E PONTO E VÍRGULA) ───
  const handleImportSubmit = async () => {
    if (!selectedFile) {
      alert('Por favor, selecione um arquivo de planilha (.csv) primeiro.')
      return
    }

    setIsSubmitting(true)
    try {
      const text = await selectedFile.text()
      const lines = text.split('\n').filter((line) => line.trim() !== '')

      if (lines.length <= 1) {
        alert('A planilha parece estar vazia ou contém apenas o cabeçalho.')
        return
      }

      // Identifica se o divisor da primeira linha é ';' ou ','
      const delimiter = lines[0].includes(';') ? ';' : ','
      const dataRows = lines.slice(1)

      const parsedProducts = dataRows
        .map((row) => {
          const cols = row.split(delimiter).map((c) => c.trim().replace(/^"|"$/g, ''))
          return {
            name: cols[0] || '',
            quantity: Number(cols[1]) || 0,
            minQuantity: Number(cols[2]) || 0,
            expiryDate: cols[3] ? new Date(cols[3]).toISOString() : null,
            observation: cols[4] || null,
          }
        })
        .filter((p) => p.name !== '')

      if (parsedProducts.length === 0) {
        alert('Nenhum dado válido encontrado na planilha.')
        return
      }

      await Promise.all(
        parsedProducts.map((payload) => api.post('/products', payload))
      )

      if (onSuccess) onSuccess()
      setSelectedFile(null)
      onClose()
    } catch (err) {
      console.error('Erro ao processar planilha:', err)
      alert('Erro ao importar produtos da planilha. Verifique o formato do arquivo.')
    } finally {
      setIsSubmitting(false)
    }
  }
  const filteredDbProducts = dbProducts.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <button onClick={onClose} className={styles.closeBtn} type="button" disabled={isSubmitting}>
          <X size={20} />
        </button>

        {/* NAVEGAÇÃO DE ABAS */}
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

        {/* ─── ABA 1: ALTERAR QUANTIDADE ─── */}
        {activeTab === 'adjust' && (
          <div className={styles.tabContent}>
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
                <span>Carregando produtos do estoque...</span>
              </div>
            ) : filteredDbProducts.length === 0 ? (
              <div className={styles.emptyTabState}>
                <div className={styles.iconCircle}>
                  <Box size={32} color="var(--primary)" />
                </div>
                <h3 className={styles.emptyTitle}>Nenhum produto encontrado</h3>
                <p className={styles.emptyDesc}>
                  Cadastre novos itens na aba "Cadastrar novo produto" para poder ajustar os saldos.
                </p>
              </div>
            ) : (
              <div className={styles.adjustListScroll}>
                {filteredDbProducts.map((item) => {
                  const currentQty = adjustments[item.id] ?? item.quantity
                  const hasChanged = currentQty !== item.quantity

                  return (
                    <div key={item.id} className={styles.adjustRow}>
                      <div className={styles.productMeta}>
                        <span className={styles.productName}>{item.name}</span>
                        <span className={styles.productSub}>
                          Estoque Mínimo: {item.minQuantity} un.
                        </span>
                      </div>

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

                      {hasChanged && <span className={styles.changedBadge}>Alterado</span>}
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
                onClick={handleSaveAdjustments}
                className={styles.btnPrimaryModal}
                disabled={isSubmitting || dbProducts.length === 0}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className={styles.spinner} />
                    <span>Salvar alterações...</span>
                  </>
                ) : (
                  <span>Salvar quantidades</span>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ─── ABA 2: CADASTRAR NOVO PRODUTO ─── */}
        {activeTab === 'create' && (
          <form onSubmit={handleSubmitCreate}>
            <div className={styles.formListScroll}>
              {products.map((item, index) => (
                <div key={item.id} className={styles.formRow}>
                  <div className={styles.col4}>
                    {index === 0 && <label className={styles.label}>Nome do produto</label>}
                    <input
                      type="text"
                      placeholder="Ex: Resina Fotopolimerizável A2"
                      value={item.name}
                      onChange={(e) => handleProductChange(index, 'name', e.target.value)}
                      className={styles.input}
                      required
                    />
                  </div>

                  <div className={styles.col2}>
                    {index === 0 && <label className={styles.label}>Em estoque</label>}
                    <input
                      type="number"
                      min="0"
                      value={item.quantity}
                      onChange={(e) =>
                        handleProductChange(index, 'quantity', Number(e.target.value))
                      }
                      className={`${styles.input} ${styles.textCenter}`}
                    />
                  </div>

                  <div className={styles.col2}>
                    {index === 0 && <label className={styles.label}>Qtd. mínima</label>}
                    <input
                      type="number"
                      min="0"
                      value={item.minQuantity}
                      onChange={(e) =>
                        handleProductChange(index, 'minQuantity', Number(e.target.value))
                      }
                      className={`${styles.input} ${styles.textCenter}`}
                    />
                  </div>

                  <div className={styles.col2}>
                    {index === 0 && <label className={styles.label}>Validade</label>}
                    <input
                      type="date"
                      value={item.expirationDate}
                      onChange={(e) =>
                        handleProductChange(index, 'expirationDate', e.target.value)
                      }
                      className={`${styles.input} ${styles.inputDate}`}
                    />
                  </div>

                  <div className={styles.col2Flex}>
                    <div className={styles.flex1}>
                      {index === 0 && <label className={styles.label}>Lote / Obs.</label>}
                      <input
                        type="text"
                        placeholder="Ex: Lote 123"
                        value={item.observation}
                        onChange={(e) =>
                          handleProductChange(index, 'observation', e.target.value)
                        }
                        className={styles.input}
                      />
                    </div>
                    {products.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(index)}
                        className={`${styles.removeRowBtn} ${index === 0 ? styles.withMargin : ''}`}
                        title="Remover linha"
                        disabled={isSubmitting}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
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
              accept=".csv,.xlsx,.xls"
              style={{ display: 'none' }}
            />

            <div className={styles.importHeader}>
              <h3 className={styles.importTitle}>Importe seus produtos a partir de uma planilha</h3>
              <p className={styles.importSub}>
                Envie um arquivo Excel (.xlsx) ou CSV com os dados dos seus produtos.
              </p>
            </div>

            <div
              className={styles.dropzone}
              onClick={handleDropzoneClick}
              style={{ cursor: 'pointer' }}
            >
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
                  <span className={styles.dropzoneSub}>xlsx, xls ou csv</span>
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
              <p><strong>quantidade</strong> — quantidade em estoque (obrigatório)</p>
              <p><strong>quantidade_minima</strong> — quantidade mínima para alerta (obrigatório)</p>
              <p><strong>validade</strong> — data de validade (AAAA-MM-DD)</p>
              <p><strong>observacoes</strong> — observações sobre o produto / Lote</p>
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