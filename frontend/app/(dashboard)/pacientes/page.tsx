// app/(dashboard)/pacientes/page.tsx
'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'
import styles from './pacientes.module.css'
import NovoPacienteModal from '../../components/NovoPacienteModal'
import { useRouter } from 'next/navigation'

interface Patient {
  id: string
  name: string
  phone: string
  email?: string
  cpf?: string
  birthDate?: string
  gender: string
  createdAt: string
}

export default function PacientesPage() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const router = useRouter()

  async function load() {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' })
      if (search) params.set('name', search)
      const { data } = await api.get(`/patients?${params}`)
      setPatients(data.data)
      setTotal(data.meta.total)
      setTotalPages(data.meta.totalPages)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(load, 300)
    return () => clearTimeout(timer)
  }, [search, page])

  function getInitials(name: string) {
    return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()
  }

  function formatDate(dt?: string) {
    if (!dt) return '—'
    return new Date(dt).toLocaleDateString('pt-BR')
  }

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <span>🔍</span>
          <input
            className={styles.searchInput}
            placeholder="Buscar por nome ou CPF..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          />
        </div>
        <button className={styles.newBtn} onClick={() => setModalOpen(true)}>
          + Novo Paciente
        </button>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Lista de Pacientes</h2>
          <p className={styles.cardSub}>{total} pacientes ativos</p>
        </div>

        {loading ? (
          <div className={styles.loading}>Carregando pacientes...</div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>NOME</th>
                <th>TELEFONE</th>
                <th>CPF</th>
                <th>CADASTRO</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {patients.length === 0 && (
                <tr>
                  <td colSpan={5} className={styles.empty}>Nenhum paciente encontrado</td>
                </tr>
              )}
              {patients.map((p) => (
                <tr key={p.id} className={styles.row}
                onClick={() => router.push(`/pacientes/${p.id}`)}
                style={{cursor: 'pointer'}}>
                  <td>
                    <div className={styles.nameCell}>
                      <div className={styles.avatar}>{getInitials(p.name)}</div>
                      <span className={styles.patientName}>{p.name}</span>
                    </div>
                  </td>
                  <td className={styles.phone}>{p.phone}</td>
                  <td className={styles.cpf}>{p.cpf ?? '—'}</td>
                  <td className={styles.date}>{formatDate(p.createdAt)}</td>
                  <td><span className={styles.statusBadge}>Ativo</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {totalPages > 1 && (
          <div className={styles.pagination}>
            <button
              className={styles.pageBtn}
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >‹ Anterior</button>
            <span className={styles.pageInfo}>Página {page} de {totalPages}</span>
            <button
              className={styles.pageBtn}
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
            >Próxima ›</button>
          </div>
        )}
      </div>

      {/* ─── Modal fora de tudo ─── */}
      <NovoPacienteModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => {
          setModalOpen(false)
          setPage(1)
          setSearch('')
          load()
        }}
      />
    </div>
  )
}