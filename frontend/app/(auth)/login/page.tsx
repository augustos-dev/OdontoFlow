'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  Loader2, 
  CheckCircle2, 
  Activity, 
  ShieldCheck, 
  Sparkles,
  User,
  ArrowRight
} from 'lucide-react'
import api from '@/lib/api'
import styles from './login.module.css'
import Image from 'next/image'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setErrorMessage('')
    setLoading(true)

    try {
      const response = await api.post('/auth/login', {
        email: email.trim(),
        password
      })

      const { token, user } = response.data

      // Armazena tokens e dados de sessão
      localStorage.setItem('odontoflow_token', token)
      localStorage.setItem('odontoflow_user', JSON.stringify(user))
      
      // Cookie para middleware de rotas (se aplicável)
      document.cookie = `odontoflow_token=${token}; path=/; max-age=604800; SameSite=Lax`

      router.push('/')
    } catch (err: any) {
      console.error('Erro de autenticação:', err)
      const message = err.response?.data?.message || 'E-mail ou senha incorretos. Tente novamente.'
      setErrorMessage(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className={styles.wrapper}>
      {/* ─── LADO ESQUERDO: SHOWCASE ENTERPRISE ─── */}
      <section className={styles.brandSide}>
        <div className={styles.glowOverlay} />

       
        {/* Topo: Brand Minimalista */}
        <div className={styles.brandTop}>
          <div className={styles.logoBadge}>
            <div className={styles.logoTooth}>
              <Image
                src="/logo.svg"
                alt="OdontoFlow Logo"
                width={32}
                height={32}
                priority
              />
            </div>
            <div className={styles.logoTitleBlock}>
              <span className={styles.logoTitle}>OdontoFlow</span>
              <span className={styles.logoSubtitle}>PLATAFORMA CLÍNICA 2026</span>
            </div>
          </div>
        </div>

        {/* Conteúdo Central */}
        <div className={styles.brandContent}>
          <div className={styles.awardBadge}>
            <Sparkles size={14} color="#06b6d4" />
            <span>ECOSSISTEMA ODONTOLÓGICO INTELIGENTE</span>
          </div>

          <h1 className={styles.mainHeading}>
            Gestão clínica de <span>alta precisão</span> para consultórios modernos.
          </h1>

          <p className={styles.mainDescription}>
            Conecte recepção, prontuário digital com odontograma, controle automatizado de insumos e saúde financeira em uma única infraestrutura segura.
          </p>

          <div className={styles.featuresList}>
            <div className={styles.featureItem}>
              <div className={styles.checkIcon}>
                <CheckCircle2 size={16} />
              </div>
              <p>Baixa automática de materiais vinculada a procedimentos clínicos</p>
            </div>

            <div className={styles.featureItem}>
              <div className={styles.checkIcon}>
                <CheckCircle2 size={16} />
              </div>
              <p>Controle financeiro com conciliação e vínculo de fornecedores</p>
            </div>

            <div className={styles.featureItem}>
              <div className={styles.checkIcon}>
                <CheckCircle2 size={16} />
              </div>
              <p>Segurança multi-tenant em nuvem em conformidade com a LGPD</p>
            </div>
          </div>
        </div>

        {/* Card Flutuante de Métrica (Efeito Sankhya) */}
        <div className={styles.kpiFloatCard}>
          <div className={styles.kpiFloatIcon}>
            <Activity size={20} color="#06b6d4" />
          </div>
          <div>
            <span className={styles.kpiFloatTitle}>Produtividade & Conformidade</span>
            <p className={styles.kpiFloatSub}>Redução de até 40% em perdas de insumos cirúrgicos</p>
          </div>
        </div>
      </section>

      {/* ─── LADO DIREITO: FORMULÁRIO DE AUTENTICAÇÃO ─── */}
      <section className={styles.formSide}>
        <div className={styles.loginCard}>
          {/* Avatar de Boas-Vindas */}
          <div className={styles.userAvatarContainer}>
            <div className={styles.userAvatar}>
              <User size={28} color="#0891b2" />
            </div>
          </div>

          <div className={styles.cardHeader}>
            <h2 className={styles.welcomeTitle}>Bem-vindo(a)</h2>
            <p className={styles.welcomeSub}>Identifique-se com suas credenciais de acesso</p>
          </div>

          {errorMessage && (
            <div className={styles.errorAlert} role="alert">
              <ShieldCheck size={16} className={styles.errorIcon} />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className={styles.form}>
            {/* Campo E-mail */}
            <div className={styles.inputGroup}>
              <label htmlFor="email">E-mail corporativo</label>
              <div className={styles.inputWrapper}>
                <Mail size={18} className={styles.fieldIcon} />
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="exemplo@odontoflow.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={styles.inputField}
                />
              </div>
            </div>

            {/* Campo Senha */}
            <div className={styles.inputGroup}>
              <div className={styles.labelRow}>
                <label htmlFor="password">Senha</label>
                <a 
                  href="#" 
                  onClick={(e) => { e.preventDefault(); alert('Contate o administrador da clínica para redefinir sua credencial.') }}
                  className={styles.forgotLink}
                >
                  Esqueci minha senha
                </a>
              </div>
              <div className={styles.inputWrapper}>
                <Lock size={18} className={styles.fieldIcon} />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={styles.inputField}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={styles.togglePasswordBtn}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Botão de Submissão */}
            <button
              type="submit"
              disabled={loading}
              className={styles.submitButton}
            >
              {loading ? (
                <>
                  <Loader2 size={18} className={styles.spinner} />
                  <span>Validando credenciais...</span>
                </>
              ) : (
                <>
                  <span>Prosseguir</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Rodapé Interno do Card */}
          <div className={styles.cardFooter}>
            <ShieldCheck size={14} color="#16a34a" />
            <span>Ambiente Criptografado de Ponta a Ponta</span>
          </div>
        </div>

        {/* Rodapé da Página */}
        <footer className={styles.pageFooter}>
          <span>OdontoFlow SaaS</span>
          <span className={styles.footerDot}>•</span>
          <span>Suporte Técnico</span>
          <span className={styles.footerDot}>•</span>
          <span>Versão 1.4.2</span>
        </footer>
      </section>
    </main>
  )
}