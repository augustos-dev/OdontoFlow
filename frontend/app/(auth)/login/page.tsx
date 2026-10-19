'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { 
  Lock, 
  Eye, 
  EyeOff, 
  Loader2, 
  CheckCircle2, 
  ShieldCheck, 
  Check,
  ArrowRight
} from 'lucide-react'
import api from '@/lib/api'
import styles from './login.module.css'

// 🖼️ CAMINHO DA LOGO: Altere o caminho ou o arquivo facilmente aqui
const LOGO_SRC = '/logo.svg'
const LOGO_ALT = 'OdontoFlow Logo'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
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
        password,
      })

      const { token, user } = response.data

      // Armazenamento de sessão e token
      localStorage.setItem('odontoflow_token', token)
      localStorage.setItem('odontoflow_user', JSON.stringify(user))
      
      // Cookie de autenticação para middlewares
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
      {/* ─── SHOWCASE LATERAL (DESKTOP / TABLET / MOBILE) ─── */}
      <section className={styles.brandSide}>
        <div className={styles.brandInner}>
          {/* Logo */}
          <div className={styles.logoRow}>
            <div className={styles.logoImageWrap}>
              <Image
                src={LOGO_SRC}
                alt={LOGO_ALT}
                width={36}
                height={36}
                priority
                className={styles.logoImg}
              />
            </div>
            <span className={styles.logoBrandName}>OdontoFlow</span>
          </div>

          <div className={styles.brandMainContent}>
            <span className={styles.eyebrowTag}>ECOSSISTEMA ODONTOLÓGICO INTELIGENTE</span>

            <h1 className={styles.mainHeading}>
              Gestão clínica de alta precisão para consultórios modernos
            </h1>

            <p className={styles.mainSubtitle}>
              Mais tempo para cuidar. Mais clareza para decidir. Toda a sua operação em um só lugar.
            </p>

            <ul className={styles.featuresList}>
              <li>
                <CheckCircle2 size={18} className={styles.featureCheckIcon} />
                <span>Prontuário inteligente e cuidado conectado</span>
              </li>
              <li>
                <CheckCircle2 size={18} className={styles.featureCheckIcon} />
                <span>Controle financeiro com visão de resultado</span>
              </li>
              <li>
                <CheckCircle2 size={18} className={styles.featureCheckIcon} />
                <span>Segurança e rastreabilidade em cada registro</span>
              </li>
            </ul>

            {/* Card LGPD & Auditoria */}
            <div className={styles.securityCard}>
              <div className={styles.securityCardHeader}>
                <ShieldCheck size={18} className={styles.securityCardIcon} />
                <strong>Seu cuidado merece uma base segura.</strong>
              </div>
              <p className={styles.securityCardText}>
                Dados criptografados, acesso por perfil e trilha de auditoria para sua equipe trabalhar com confiança.
              </p>
              <div className={styles.securityPills}>
                <span className={styles.pillTag}>LGPD</span>
                <span className={styles.pillTag}>ACESSO SEGURO</span>
              </div>
            </div>
          </div>

          <footer className={styles.brandFooter}>
            <span>OdontoFlow © 2026 • Tecnologia a serviço do cuidado</span>
          </footer>
        </div>
      </section>

      {/* ─── FORMULÁRIO DE LOGIN ─── */}
      <section className={styles.formSide}>
        <div className={styles.formContainer}>
          <div className={styles.portalTag}>
            <Lock size={13} className={styles.portalTagIcon} />
            <span>PORTAL DA CLÍNICA</span>
          </div>

          <div className={styles.formHeader}>
            <h2 className={styles.welcomeTitle}>Bem-vindo(a)</h2>
            <p className={styles.welcomeSub}>Identifique-se com suas credenciais de acesso</p>
          </div>

          {errorMessage && (
            <div className={styles.errorAlert} role="alert">
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className={styles.form}>
            {/* Campo E-mail */}
            <div className={styles.fieldGroup}>
              <label htmlFor="email" className={styles.fieldLabel}>E-mail corporativo</label>
              <div className={styles.inputWrap}>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="ana.costa@odontoflow.com.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={styles.textInput}
                />
              </div>
            </div>

            {/* Campo Senha */}
            <div className={styles.fieldGroup}>
              <label htmlFor="password" className={styles.fieldLabel}>Senha</label>
              <div className={styles.inputWrap}>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={styles.textInput}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={styles.btnTogglePass}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Opções de Sessão e Recuperação */}
            <div className={styles.optionsRow}>
              <label className={styles.rememberCheckbox}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span className={styles.customCheck}>
                  {rememberMe && <Check size={12} strokeWidth={3} />}
                </span>
                <span>Manter conectado</span>
              </label>

              <button
                type="button"
                onClick={() => alert('Contate o administrador da clínica para redefinir sua credencial.')}
                className={styles.linkForgot}
              >
                Esqueci minha senha
              </button>
            </div>

            {/* Botão de Login Dinâmico */}
            <button
              type="submit"
              disabled={loading}
              className={`${styles.submitBtn} ${loading ? styles.submitBtnLoading : ''}`}
            >
              {loading ? (
                <>
                  <Loader2 size={18} className={styles.spinner} />
                  <span>Validando credenciais...</span>
                </>
              ) : (
                <>
                  <span>Prosseguir</span>
                  <ArrowRight size={17} />
                </>
              )}
            </button>

            {loading && (
              <span className={styles.verifyingNotice}>
                Verificando seu acesso ao ambiente da clínica...
              </span>
            )}
          </form>

          <div className={styles.divider} />

          <div className={styles.supportHelpBox}>
            <span>Precisa de ajuda? Fale com o administrador da sua clínica.</span>
          </div>

          <div className={styles.safeConnectionRow}>
            <ShieldCheck size={14} className={styles.safeIcon} />
            <span>Conexão protegida • Dados criptografados</span>
          </div>
        </div>
      </section>
    </main>
  )
}