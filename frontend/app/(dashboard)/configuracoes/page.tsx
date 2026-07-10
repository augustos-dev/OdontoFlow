// app/(dashboard)/configuracoes/page.tsx

export default function ConfiguracoesPage() {
  return (
    <div style={{
      background: 'var(--bg-card)',
      borderRadius: 'var(--radius-lg)',
      padding: '80px 24px',
      textAlign: 'center',
      boxShadow: 'var(--shadow-sm)',
    }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🚧</div>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
        Configurações
      </h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
        Esta seção é parte do roadmap do MVP. Em breve com funcionalidades completas.
      </p>
    </div>
  )
}