'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { 
  CheckCircle2, 
  Building2, 
  User, 
  Lock, 
  Mail, 
  Phone, 
  ArrowRight, 
  ArrowLeft,
  Sparkles, 
  ShieldCheck, 
  Loader2, 
  Crown,
  CalendarCheck,
  Check,
  AlertCircle
} from 'lucide-react'
import Logo from '../../../public/logo.svg'
import api from '@/lib/api'
import styles from './cadastro.module.css'

type PlanType = 'BASIC' | 'PREMIUM' | 'ENTERPRISE'

interface PlanDetail {
  name: string
  priceMonthly: string
  priceAnnual: string
  badge: string
  features: string[]
}

const PLAN_DETAILS: Record<PlanType, PlanDetail> = {
  BASIC: {
    name: 'Básico',
    priceMonthly: 'R$ 149,99',
    priceAnnual: 'R$ 134,90',
    badge: 'Consultório Individual',
    features: [
      '1 Agenda / Dentista',
      'Prontuário digital com Odontograma',
      'Link de pré-cadastro para o paciente',
      'Gestão de stock e insumos manual',
      'Emissão de orçamentos e docs em PDF',
      'Importação de materiais via Excel/CSV',
    ],
  },
  PREMIUM: {
    name: 'Clínica Pro',
    priceMonthly: 'R$ 229,99',
    priceAnnual: 'R$ 206,90',
    badge: 'Mais Escolhido • Até 5 Dentistas',
    features: [
      'Até 5 Cirurgiões-Dentistas',
      'Exit Inteligente (baixa fracionada auto)',
      'Transcrição de evolução clínica com IA',
      'Trava de segurança jurídica CFO (24h)',
      'Gestão de comissões por procedimento',
      'White-Label completo (sua marca e cores)',
    ],
  },
  ENTERPRISE: {
    name: 'Enterprise',
    priceMonthly: 'R$ 319,99',
    priceAnnual: 'R$ 287,90',
    badge: 'Redes & Alta Escala',
    features: [
      'Dentistas e cadeiras ilimitadas',
      'Trava de idempotência sala / receção',
      'DRE Executivo e balancete contínuo',
      'Gestão multi-filiais integrada',
      'Auditoria de acessos por IP (AuditLog)',
      'Suporte prioritário via WhatsApp',
    ],
  },
}

function CadastroContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const initialPlan = (searchParams.get('plan')?.toUpperCase() as PlanType) || 'PREMIUM'
  const initialBilling = searchParams.get('billing') === 'monthly' ? 'monthly' : 'annual'

  const [currentHost, setCurrentHost] = useState('odontoflow.omniatechlabs.com.br')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentHost(window.location.host)
    }
  }, [])

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [plan, setPlan] = useState<PlanType>(initialPlan)
  const [billing, setBilling] = useState<'monthly' | 'annual'>(initialBilling)

  const [formData, setFormData] = useState({
    clinicName: '',
    slug: '',
    phone: '',
    cnpjOrCpf: '',
    adminName: '',
    adminEmail: '',
    password: '',
    confirmPassword: '',
  })

  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const handleClinicNameChange = (name: string) => {
    const rawSlug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')

    setFormData((prev) => ({
      ...prev,
      clinicName: name,
      slug: prev.slug === '' || prev.slug === prev.clinicName.toLowerCase().replace(/[^a-z0-9]/g, '-') ? rawSlug : prev.slug,
    }))
  }

  const handleNextStep1 = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    if (!formData.clinicName.trim() || !formData.slug.trim()) {
      setErrorMsg('Preencha o nome da sua clínica e o endereço do subdomínio.')
      return
    }
    setStep(2)
  }

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')

    if (formData.password.length < 6) {
      setErrorMsg('A palavra-passe precisa de ter no mínimo 6 caracteres.')
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setErrorMsg('As palavras-passe digitadas não coincidem.')
      return
    }

    setLoading(true)

    try {
      const payload = {
        tenantName: formData.clinicName.trim(),
        slug: formData.slug.trim(),
        plan: plan,
        billingCycle: billing,
        phone: formData.phone.trim() || undefined,
        cnpjOrCpf: formData.cnpjOrCpf.trim() || undefined,
        adminName: formData.adminName.trim(),
        email: formData.adminEmail.trim().toLowerCase(),
        password: formData.password,
      }

      const res = await api.post('/auth/register-tenant', payload)
      const data = res.data?.data || res.data

      if (data?.token) {
        localStorage.setItem('@odontoflow:token', data.token)
        localStorage.setItem('@odontoflow:user', JSON.stringify(data.user))
        localStorage.setItem('@odontoflow:tenant', JSON.stringify(data.tenant))
      }

      setStep(3)
    } catch (err: any) {
      console.error('Erro no registo:', err)
      setErrorMsg(
        err.response?.data?.message || 
        'Erro ao configurar a clínica. Verifique se o endereço ou e-mail já estão em utilização.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.container}>
      {/* ─── HEADER ─── */}
      <header className={styles.header}>
        <Link href="/landing" className={styles.logoGroup}>
          <div className={styles.logoIcon}>
            <Image src={Logo} alt="OdontoFlow" width={20} height={20} />
          </div>
          <span className={styles.brandTitle}>OdontoFlow</span>
        </Link>
        <div className={styles.headerRight}>
          <span className={styles.headerHelp}>Já tem uma conta?</span>
          <Link href="/login" className={styles.linkLogin}>
            Iniciar sessão
          </Link>
        </div>
      </header>

      {/* ─── CORPO PRINCIPAL ─── */}
      <main className={styles.mainGrid}>
        {/* COLUNA ESQUERDA: FORMULÁRIO */}
        <div className={styles.formCard}>
          {step < 3 && (
            <div className={styles.stepperWrapper}>
              <div className={`${styles.stepItem} ${step >= 1 ? styles.stepActive : ''}`}>
                <div className={styles.stepCircle}>{step > 1 ? <Check size={12} /> : '1'}</div>
                <span>Sua Clínica</span>
              </div>
              <div className={styles.stepLine} />
              <div className={`${styles.stepItem} ${step >= 2 ? styles.stepActive : ''}`}>
                <div className={styles.stepCircle}>2</div>
                <span>Administrador</span>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className={styles.errorAlert}>
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* PASSO 1: DADOS DA CLÍNICA */}
          {step === 1 && (
            <form onSubmit={handleNextStep1} className={styles.formContent}>
              <div className={styles.titleGroup}>
                <h1 className={styles.mainTitle}>Comece os seus 7 dias grátis</h1>
                <p className={styles.subTitle}>Configure o ambiente exclusivo da sua clínica odontológica em segundos.</p>
              </div>

              <div className={styles.inputGroup}>
                <label>Nome da Clínica ou Consultório *</label>
                <div className={styles.inputWithIcon}>
                  <Building2 size={18} className={styles.fieldIcon} />
                  <input
                    type="text"
                    required
                    placeholder="Ex: Odonto Prime & Estética"
                    value={formData.clinicName}
                    onChange={(e) => handleClinicNameChange(e.target.value)}
                  />
                </div>
              </div>

              <div className={styles.inputGroup}>
                <label>Endereço de Acesso (Subdomínio) *</label>
                <div className={styles.slugInputWrapper}>
                  <span className={styles.slugPrefix}>{currentHost}/</span>
                  <input
                    type="text"
                    required
                    placeholder="suaclinica"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                  />
                </div>
                <small className={styles.fieldHelp}>Este será o link seguro de acesso para si e para a sua equipa.</small>
              </div>

              <div className={styles.twoCols}>
                <div className={styles.inputGroup}>
                  <label>WhatsApp / Telemóvel</label>
                  <div className={styles.inputWithIcon}>
                    <Phone size={18} className={styles.fieldIcon} />
                    <input
                      type="text"
                      placeholder="(85) 99999-0000"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div className={styles.inputGroup}>
                  <label>CNPJ ou NIF / CPF</label>
                  <input
                    type="text"
                    placeholder="00.000.000/0000-00"
                    value={formData.cnpjOrCpf}
                    onChange={(e) => setFormData({ ...formData, cnpjOrCpf: e.target.value })}
                  />
                </div>
              </div>

              <button type="submit" className={styles.btnContinue}>
                <span>Continuar para Dados de Acesso</span>
                <ArrowRight size={16} />
              </button>
            </form>
          )}

          {/* PASSO 2: DADOS DO ADMINISTRADOR */}
          {step === 2 && (
            <form onSubmit={handleFinalSubmit} className={styles.formContent}>
              <div className={styles.titleGroup}>
                <button type="button" onClick={() => setStep(1)} className={styles.btnBack}>
                  <ArrowLeft size={14} />
                  <span>Voltar</span>
                </button>
                <h1 className={styles.mainTitle}>Dados do Administrador</h1>
                <p className={styles.subTitle}>Este perfil terá controlo total, acesso ao DRE e permissões master.</p>
              </div>

              <div className={styles.inputGroup}>
                <label>Seu Nome Completo *</label>
                <div className={styles.inputWithIcon}>
                  <User size={18} className={styles.fieldIcon} />
                  <input
                    type="text"
                    required
                    placeholder="Dr(a). Seu Nome"
                    value={formData.adminName}
                    onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
                  />
                </div>
              </div>

              <div className={styles.inputGroup}>
                <label>Seu E-mail Profissional *</label>
                <div className={styles.inputWithIcon}>
                  <Mail size={18} className={styles.fieldIcon} />
                  <input
                    type="email"
                    required
                    placeholder="doutor@suaclinica.com.br"
                    value={formData.adminEmail}
                    onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                  />
                </div>
              </div>

              <div className={styles.twoCols}>
                <div className={styles.inputGroup}>
                  <label>Palavra-passe de Acesso *</label>
                  <div className={styles.inputWithIcon}>
                    <Lock size={18} className={styles.fieldIcon} />
                    <input
                      type="password"
                      required
                      placeholder="Mínimo 6 dígitos"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    />
                  </div>
                </div>

                <div className={styles.inputGroup}>
                  <label>Confirmar Palavra-passe *</label>
                  <div className={styles.inputWithIcon}>
                    <Lock size={18} className={styles.fieldIcon} />
                    <input
                      type="password"
                      required
                      placeholder="Repita a palavra-passe"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <button type="submit" className={styles.btnSubmit} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 size={18} className={styles.spinner} />
                    <span>A configurar a sua Clínica...</span>
                  </>
                ) : (
                  <>
                    <span>Ativar Meus 7 Dias Grátis</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>

              <p className={styles.termsText}>
                Ao criar a sua conta, aceita os <Link href="/termos">Termos de Uso</Link> e a <Link href="/privacidade">Política de Privacidade</Link>.
              </p>
            </form>
          )}

          {/* PASSO 3: SUCESSO */}
          {step === 3 && (
            <div className={styles.successWrapper}>
              <div className={styles.successIconBg}>
                <CheckCircle2 size={44} color="#16a34a" />
              </div>

              <h1 className={styles.successTitle}>A sua clínica está pronta!</h1>
              <p className={styles.successDesc}>
                O ambiente da <strong>{formData.clinicName}</strong> foi criado com sucesso. O período de avaliação de 7 dias do plano <strong>{PLAN_DETAILS[plan].name}</strong> já está ativo.
              </p>

              <div className={styles.trialSummaryBox}>
                <div className={styles.trialRow}>
                  <CalendarCheck size={18} color="#0284c7" />
                  <div>
                    <strong>Período de Teste Ilimitado</strong>
                    <small>Até {new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-PT')}</small>
                  </div>
                </div>
                <div className={styles.trialDivider} />
                <div className={styles.trialRow}>
                  <ShieldCheck size={18} color="#10b981" />
                  <div>
                    <strong>Sem cobrança imediata</strong>
                    <small>Apenas seleciona a forma de pagamento após os 7 dias.</small>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => router.push('/dashboard')}
                className={styles.btnGoToDashboard}
              >
                <span>Aceder ao Painel da Clínica</span>
                <ArrowRight size={16} />
              </button>
            </div>
          )}
        </div>

        {/* COLUNA DIREITA: RESUMO DINÂMICO DO PLANO */}
        <div className={styles.summaryCol}>
          <div className={styles.planSummaryCard}>
            <div className={styles.planSummaryHeader}>
              <span className={styles.summaryBadge}>PLANO SELECIONADO</span>
              <div className={styles.planSwitchGroup}>
                {(['BASIC', 'PREMIUM', 'ENTERPRISE'] as PlanType[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPlan(p)}
                    className={`${styles.planSwitchBtn} ${plan === p ? styles.planSwitchActive : ''}`}
                  >
                    {p === 'PREMIUM' && <Crown size={12} />}
                    <span>{p === 'BASIC' ? 'Básico' : p === 'PREMIUM' ? 'Pro' : 'Enterprise'}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.planPriceRow}>
              <div>
                <h3 className={styles.summaryPlanName}>{PLAN_DETAILS[plan].name}</h3>
                <span className={styles.summaryPlanSub}>{PLAN_DETAILS[plan].badge}</span>
              </div>
              <div className={styles.summaryPriceValue}>
                <strong>{billing === 'annual' ? PLAN_DETAILS[plan].priceAnnual : PLAN_DETAILS[plan].priceMonthly}</strong>
                <small>/mês</small>
              </div>
            </div>

            <div className={styles.billingSelectPill}>
              <button
                type="button"
                onClick={() => setBilling('monthly')}
                className={`${styles.pillBtn} ${billing === 'monthly' ? styles.pillBtnActive : ''}`}
              >
                Mensal
              </button>
              <button
                type="button"
                onClick={() => setBilling('annual')}
                className={`${styles.pillBtn} ${billing === 'annual' ? styles.pillBtnActive : ''}`}
              >
                Anual (10% OFF)
              </button>
            </div>

            {/* LISTAGEM DINÂMICA BASEADA NO PLANO SELECIONADO */}
            <div className={styles.featuresListBlock}>
              <span className={styles.featuresLabel}>RECURSOS INCLUÍDOS NO PLANO {PLAN_DETAILS[plan].name.toUpperCase()}:</span>
              <ul className={styles.summaryFeatures}>
                {PLAN_DETAILS[plan].features.map((feature, idx) => (
                  <li key={idx}>
                    <CheckCircle2 size={15} color="#0284c7" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className={styles.trialGuarantees}>
              <div className={styles.guaranteeItem}>
                <ShieldCheck size={16} color="#16a34a" />
                <span>7 dias de acesso sem restrições</span>
              </div>
              <div className={styles.guaranteeItem}>
                <Sparkles size={16} color="#0284c7" />
                <span>Suporte humanizado no onboarding</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default function CadastroPage() {
  return (
    <Suspense fallback={<div style={{ padding: '60px', textAlign: 'center' }}>A carregar cadastro...</div>}>
      <CadastroContent />
    </Suspense>
  )
}