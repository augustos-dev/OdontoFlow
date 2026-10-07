'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Sparkles,
  Calendar,
  Stethoscope,
  Package,
  Link as LinkIcon,
  FileText,
  TrendingUp,
  Star,
  CheckCircle2,
  ChevronDown,
  ArrowRight,
  ShieldCheck,
  Building2,
  User,
  X,
  Loader2,
  Check,
  AlertCircle,
  ExternalLink
} from 'lucide-react'
import api from '@/lib/api'
import styles from './landing.module.css'

interface PlanTier {
  id: 'basico' | 'premium' | 'enterprise'
  badge?: string
  target: string
  name: string
  description: string
  monthlyPrice: number
  annualPrice: number
  featuresTitle: string
  features: string[]
  ctaText: string
}

const PLANS: PlanTier[] = [
  {
    id: 'basico',
    target: 'CONSULTÓRIO INDIVIDUAL',
    name: 'Básico',
    description: 'Agenda clínica, prontuário digital com odontograma e gestão de estoque manual.',
    monthlyPrice: 149.9,
    annualPrice: 134.9,
    featuresTitle: 'RECURSOS INCLUSOS:',
    features: [
      '1 Agenda / Dentista',
      'Prontuário com Odontograma',
      'Link de pré-cadastro para o paciente',
      'Controle de estoque manual',
      'Orçamentos e documentos em PDF'
    ],
    ctaText: 'Testar 7 dias grátis'
  },
  {
    id: 'premium',
    badge: 'MAIS ESCOLHIDO',
    target: 'CLÍNICAS & EQUIPES',
    name: 'Premium',
    description: 'Exit Inteligente de materiais, transcrição por IA e compliance legal CFO/LGPD.',
    monthlyPrice: 229.9,
    annualPrice: 206.9,
    featuresTitle: 'TUDO DO BÁSICO, MAIS:',
    features: [
      'Até 5 Cirurgiões-Dentistas',
      'Exit Inteligente (baixa fracionada auto)',
      'Transcrição de evolução clínica com IA',
      'Trava de segurança jurídica CFO (24h)',
      'Gestão de comissões por procedimento',
      'White-Label com sua marca e cores'
    ],
    ctaText: 'Testar 7 dias grátis'
  },
  {
    id: 'enterprise',
    badge: 'ALTA ESCALA',
    target: 'REDES & POLICLÍNICAS',
    name: 'Enterprise',
    description: 'Baixa dupla na recepção, governança de redes e relatórios executivos avançados.',
    monthlyPrice: 319.9,
    annualPrice: 287.9,
    featuresTitle: 'TUDO DO PREMIUM, MAIS:',
    features: [
      'Dentistas e cadeiras ilimitadas',
      'Trava de idempotência recepção / sala',
      'DRE Executivo & Balancete contínuo',
      'Suporte prioritário via WhatsApp'
    ],
    ctaText: 'Falar com consultor'
  }
]

const FAQS = [
  {
    q: 'Como funciona a dedução automática de estoque (Exit Inteligente)?',
    a: 'Você cadastra a ficha técnica dos procedimentos (ex: 0.3g de resina e 1 tubete de anestésico). Assim que o dentista finaliza o atendimento clínico no sistema, a baixa fracionada é debitada do estoque e o custo proporcional é lançado no DRE em tempo real.'
  },
  {
    q: 'Como funciona a conformidade com o CFO e a LGPD?',
    a: 'O OdontoFlow segue à risca a resolução do CFO com trava jurídica de edição de prontuário em até 24 horas. Além disso, cada acesso, assinatura digital de paciente ou alteração possui carimbo de tempo (timestamp), IP registrado e criptografia de ponta a ponta.'
  },
  {
    q: 'O que é o link de pré-cadastro para o paciente?',
    a: 'É um magic link curto e seguro enviado pelo WhatsApp. O próprio paciente preenche seus dados cadastrais e a anamnese direto no celular antes da consulta, eliminando filas na recepção e papéis acumulados.'
  },
  {
    q: 'Como o OdontoFlow calcula as comissões dos profissionais?',
    a: 'O sistema audita a receita gerada em cada procedimento, desconta os custos de insumos utilizados caso parametrizado, aplica a porcentagem do dentista e gera o extrato de repasses pronto para liquidação unitária ou em lote.'
  }
]

export default function LandingPage() {
  const router = useRouter()
  const [billingCycle, setBillingCycle] = useState<'mensal' | 'anual'>('anual')
  const [selectedPlanId, setSelectedPlanId] = useState<'basico' | 'premium' | 'enterprise'>('premium')
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  // Controle de Onboarding & Checkout
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [checkoutStep, setCheckoutStep] = useState<1 | 2>(1)

  // Etapa 1: Dados da Clínica
  const [clinicName, setClinicName] = useState('')
  const [subdomain, setSubdomain] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [documentNumber, setDocumentNumber] = useState('')

  // Etapa 2: Administrador
  const [adminName, setAdminName] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [adminCro, setAdminCro] = useState('')

  // Estados de Submissão
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [createdClinicData, setCreatedClinicData] = useState<{
    subdomainUrl: string
    clinicTitle: string
    token?: string
  } | null>(null)

  const activePlan = PLANS.find((p) => p.id === selectedPlanId) || PLANS[1]
  const displayedPrice = billingCycle === 'anual' ? activePlan.annualPrice : activePlan.monthlyPrice

  function handleOpenCheckoutModal(planId?: 'basico' | 'premium' | 'enterprise') {
    if (planId) setSelectedPlanId(planId)
    setCheckoutStep(1)
    setErrorMessage('')
    setCreatedClinicData(null)
    setIsCheckoutOpen(true)
  }

  function handleProceedToStep2(e: React.FormEvent) {
    e.preventDefault()
    setErrorMessage('')
    setCheckoutStep(2)
  }

  // 🚀 Registo do Tenant e Criação da Clínica na API
  async function handleFinalizeOnboarding(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setErrorMessage('')

    try {
      const tenantSlug = subdomain.trim().toLowerCase().replace(/[^a-z0-9]/g, '') || 'clinica'

      const registerPayload = {
        name: adminName.trim(),
        email: adminEmail.trim().toLowerCase(),
        password: adminPassword,
        role: 'ADMIN',
        phone: whatsapp.trim() || undefined,
        cro: adminCro.trim() || undefined,
        tenantId: tenantSlug,
        clinicId: `${tenantSlug}-matriz`,
      }

      // 1. POST /auth/register
      const registerRes = await api.post('/auth/register', registerPayload)
      const data = registerRes.data?.data || registerRes.data

      const token = data?.token || data?.accessToken
      const user = data?.user || {
        name: adminName,
        email: adminEmail,
        role: 'ADMIN',
      }

      // Persiste sessão para login imediato
      if (token) {
        localStorage.setItem('odontoflow_token', token)
        localStorage.setItem('@odontoflow:token', token)
      }
      if (user) {
        localStorage.setItem('odontoflow_user', JSON.stringify(user))
        localStorage.setItem('@odontoflow:user', JSON.stringify(user))
      }

      // 2. Tenta configurar o nome e telefone da clínica via PUT /clinics se houver ID
      const createdClinicId = data?.clinic?.id || data?.clinicId || `${tenantSlug}-matriz`
      if (createdClinicId && token) {
        await api.put(`/clinics/${createdClinicId}`, {
          name: clinicName.trim(),
          phone: whatsapp.trim() || undefined,
          cnpj: documentNumber.trim() || undefined,
        }, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => {})
      }

      // Constrói o link usável
      const originHost = typeof window !== 'undefined' ? window.location.origin : 'https://app.odontoflow.com.br'
      const generatedLink = `${originHost}/?clinic=${tenantSlug}`

      setCreatedClinicData({
        subdomainUrl: generatedLink,
        clinicTitle: clinicName.trim() || 'Minha Clínica Odontológica',
        token,
      })
    } catch (err: any) {
      console.error('Erro no registo de clínica:', err)
      const errorResponse = err.response?.data?.message || err.message || 'Falha ao registar clínica. Tente novamente.'
      setErrorMessage(Array.isArray(errorResponse) ? errorResponse.join(', ') : errorResponse)
    } finally {
      setSubmitting(false)
    }
  }

  function handleGoToDashboard() {
    setIsCheckoutOpen(false)
    router.push('/')
  }

  return (
    <div className={styles.landingContainer}>
      
      {/* ─── 1. NAVBAR SUPERIOR ─── */}
      <header className={styles.navbar}>
        <div className={styles.navInner}>
          <div className={styles.navBrand}>
            <div className={styles.logoCircle}>
              <div className={styles.logoGlow} />
            </div>
            <span className={styles.logoText}>OdontoFlow</span>
          </div>

          <nav className={styles.navLinks}>
            <a href="#recursos">Recursos</a>
            <a href="#depoimentos">Depoimentos</a>
            <a href="#planos">Planos</a>
            <a href="#duvidas">Dúvidas</a>
          </nav>

          <div className={styles.navActions}>
            <Link href="/login" className={styles.btnNavEntrar}>
              Entrar
            </Link>
            <button
              type="button"
              onClick={() => handleOpenCheckoutModal('premium')}
              className={styles.btnNavTestar}
            >
              Testar grátis
            </button>
          </div>
        </div>
      </header>

      {/* ─── 2. HERO SECTION ─── */}
      <section className={styles.heroSection}>
        <div className={styles.heroGrid}>
          
          <div className={styles.heroTextCol}>
            <div className={styles.pillBadge}>
              <Sparkles size={14} className={styles.pillBadgeIcon} />
              <span>Crie fichas técnicas e automatize a baixa de materiais</span>
            </div>

            <h1 className={styles.heroHeading}>
              O software odontológico <br />
              <span className={styles.headingBlue}>feito para valorizar</span> o seu tempo e rentabilidade.
            </h1>

            <p className={styles.heroDescription}>
              Administrar um consultório ou clínica não precisa ser um processo burocrático. O OdontoFlow integra prontuário ágil, dedução automática de insumos e DRE analítico em tempo real.
            </p>

            <div className={styles.heroButtonsRow}>
              <a
                href="https://wa.me/5585999999999?text=Ol%C3%A1!%20Gostaria%20de%20falar%20com%20um%20especialista%20do%20OdontoFlow."
                target="_blank"
                rel="noreferrer"
                className={styles.btnFalarEspecialista}
              >
                Falar com especialista
              </a>

              <button
                type="button"
                onClick={() => handleOpenCheckoutModal('premium')}
                className={styles.btnComecarGraca}
              >
                Começar de graça
              </button>
            </div>

            <div className={styles.heroDisclaimer}>
              <span>Sem fidelidade contratual. Cancele quando quiser 💙</span>
            </div>
          </div>

          <div className={styles.heroMockupCol}>
            <div className={styles.laptopFrame}>
              <div className={styles.laptopTopBar}>
                <div className={styles.laptopDots}>
                  <span className={`${styles.dot} ${styles.dotRed}`} />
                  <span className={`${styles.dot} ${styles.dotYellow}`} />
                  <span className={`${styles.dot} ${styles.dotGreen}`} />
                </div>
                <div className={styles.laptopUrlBar}>app.odontoflow.com.br/agenda</div>
              </div>

              <div className={styles.laptopBody}>
                <div className={styles.mockupHeader}>
                  <div className={styles.mockupHeaderLeft}>
                    <strong>Agenda Geral • Consultório 01</strong>
                  </div>
                  <span className={styles.mockupExitBadge}>Exit Inteligente Ativo</span>
                </div>

                <div className={styles.mockupList}>
                  <div className={styles.mockupRow}>
                    <div className={styles.mockupAvatar}>NR</div>
                    <div className={styles.mockupRowInfo}>
                      <strong>Dra. Nathalia Rosa</strong>
                      <span>09:00 • Restauração Estética Z350</span>
                    </div>
                    <span className={styles.mockupPillConfirmed}>Confirmada</span>
                  </div>

                  <div className={`${styles.mockupRow} ${styles.mockupRowActive}`}>
                    <div className={styles.mockupAvatar}>LM</div>
                    <div className={styles.mockupRowInfo}>
                      <strong>Dr. Leonardo Martins</strong>
                      <span>10:15 • Profilaxia + Aplicação Tópica</span>
                    </div>

                    <div className={styles.floatingFichaCard}>
                      <div className={styles.floatingFichaTitle}>Resumo da Ficha Clínica</div>
                      <div className={styles.floatingFichaLine}>
                        <span>Insumo consumido:</span>
                        <strong>Resina Composta (0.3g)</strong>
                      </div>
                      <div className={styles.floatingFichaLine}>
                        <span>Custo proporcional:</span>
                        <strong className={styles.floatingFichaCost}>R$ 9,00</strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ─── 3. TICKER DEPOIMENTOS INFINITO ─── */}
      <div className={styles.tickerWrapper} id="depoimentos">
        <div className={styles.tickerTrack}>
          <span>“ A melhor plataforma odontológica que já utilizamos. ”</span>
          <span>“ A nossa recepção nunca mais atrasou a fila de espera. ”</span>
          <span>“ Facilitou demais a rotina do meu consultório! ”</span>
          <span>“ A dedução automática de resinas e anestésicos poupa horas de trabalho. ”</span>
          <span>“ Prontuário muito interativo e intuitivo. ”</span>
          <span>“ O suporte é rápido e eficiente. ”</span>
          <span>“ A melhor plataforma odontológica que já utilizamos. ”</span>
        </div>
      </div>

      {/* ─── 4. PROVA SOCIAL ─── */}
      <section className={styles.socialProofSection}>
        <div className={styles.sectionHeadingCenter}>
          <h2 className={styles.socialTitle}>Quem usa, recomenda</h2>
          <p className={styles.socialSub}>Satisfação comprovada por clínicas e cirurgiões-dentistas.</p>
        </div>

        <div className={styles.statsCardsGrid}>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Google Reviews</span>
            <div className={styles.statScoreRow}>
              <strong className={styles.statBigNumber}>5.0</strong>
              <div className={styles.statStars}>
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={15} fill="#f59e0b" color="#f59e0b" />
                ))}
              </div>
            </div>
            <span className={styles.statFootNote}>+300 avaliações de profissionais</span>
          </div>

          <div className={styles.statCard}>
            <span className={styles.statLabel}>ReclameAQUI</span>
            <div className={styles.statScoreRow}>
              <strong className={styles.statBigNumber}>100%</strong>
            </div>
            <span className={styles.statFootNote}>Índice de resolutividade exemplar</span>
          </div>

          <div className={styles.statCard}>
            <span className={styles.statLabel}>App Mobile</span>
            <div className={styles.statScoreRow}>
              <strong className={styles.statBigNumber}>4.9</strong>
              <div className={styles.statStars}>
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={15} fill="#f59e0b" color="#f59e0b" />
                ))}
              </div>
            </div>
            <span className={styles.statFootNote}>Experiência no consultório e recepção</span>
          </div>

          <div className={styles.statCard}>
            <span className={styles.statLabel}>NPS Clínico</span>
            <div className={styles.statScoreRow}>
              <strong className={styles.statBigNumber}>9.8</strong>
              <span className={styles.statSmallFraction}>/10</span>
            </div>
            <span className={styles.statFootNote}>Grau de satisfação dos usuários</span>
          </div>
        </div>

        <div className={styles.approvedFootText}>
          <span>Aprovado por mais de <strong>1.500 consultórios</strong> em todo o país 💙</span>
        </div>
      </section>

      {/* ─── 5. TECNOLOGIA PARA POTENCIAR A SUA CLÍNICA (6 CARDS) ─── */}
      <section className={styles.featuresSection} id="recursos">
        <div className={styles.sectionHeadingCenter}>
          <h2 className={styles.featuresHeading}>Tecnologia para simplificar e potenciar a sua clínica</h2>
          <p className={styles.featuresSubheading}>Ferramentas concebidas para apoiar o dentista e acelerar o fluxo na recepção.</p>
        </div>

        <div className={styles.featuresGrid}>
          <div className={styles.featureBox}>
            <div className={`${styles.featureIconWrap} ${styles.iconBgBlue}`}>
              <Calendar size={22} color="#0284c7" />
            </div>
            <span className={styles.featureCategory}>AGENDA & FILA CLÍNICA</span>
            <h3 className={styles.featureTitle}>Reduza faltas e organize as suas cadeiras</h3>
            <p className={styles.featureDesc}>
              Centralize a rotina da clínica em uma única tela: confirmações ágeis, estado da consulta em tempo real e fila de espera sem atritos.
            </p>
            <button type="button" onClick={() => handleOpenCheckoutModal()} className={styles.featureLink}>
              <span>Começar agora</span>
              <ArrowRight size={14} />
            </button>
          </div>

          <div className={styles.featureBox}>
            <div className={`${styles.featureIconWrap} ${styles.iconBgCyan}`}>
              <Stethoscope size={22} color="#06b6d4" />
            </div>
            <span className={styles.featureCategory}>PRONTUÁRIO & ODONTOGRAMA</span>
            <h3 className={styles.featureTitle}>Paciente acessível a partir de qualquer lugar</h3>
            <p className={styles.featureDesc}>
              Odontograma interativo, histórico clínico blindado contra adulterações (CFO 24h) e arquivo seguro de radiografias.
            </p>
            <button type="button" onClick={() => handleOpenCheckoutModal()} className={styles.featureLink}>
              <span>Começar agora</span>
              <ArrowRight size={14} />
            </button>
          </div>

          <div className={styles.featureBox}>
            <div className={`${styles.featureIconWrap} ${styles.iconBgGreen}`}>
              <Package size={22} color="#10b981" />
            </div>
            <span className={styles.featureCategory}>EXIT INTELIGENTE DE ESTOQUE</span>
            <h3 className={styles.featureTitle}>Elimine a contagem manual de seringas</h3>
            <p className={styles.featureDesc}>
              O único sistema que fraciona gramas, mililitros e doses diretamente na evolução clínica. Lucratividade precisa por procedimento.
            </p>
            <button type="button" onClick={() => handleOpenCheckoutModal()} className={styles.featureLink}>
              <span>Começar agora</span>
              <ArrowRight size={14} />
            </button>
          </div>

          <div className={styles.featureBox}>
            <div className={`${styles.featureIconWrap} ${styles.iconBgPurple}`}>
              <LinkIcon size={22} color="#8b5cf6" />
            </div>
            <span className={styles.featureCategory}>ANAMNESE & PRÉ-CADASTRO</span>
            <h3 className={styles.featureTitle}>Poupe tempo antes de a consulta iniciar</h3>
            <p className={styles.featureDesc}>
              Envie o link seguro para o paciente preencher os dados e a anamnese diretamente no celular via WhatsApp.
            </p>
            <button type="button" onClick={() => handleOpenCheckoutModal()} className={styles.featureLink}>
              <span>Começar agora</span>
              <ArrowRight size={14} />
            </button>
          </div>

          <div className={styles.featureBox}>
            <div className={`${styles.featureIconWrap} ${styles.iconBgAmber}`}>
              <FileText size={22} color="#f59e0b" />
            </div>
            <span className={styles.featureCategory}>RECEITUÁRIO & DOCUMENTOS</span>
            <h3 className={styles.featureTitle}>Menos papel, maior segurança jurídica</h3>
            <p className={styles.featureDesc}>
              Emissão ágil de atestados, termos de consentimento e receitas digitais formatadas com a identidade visual da sua clínica.
            </p>
            <button type="button" onClick={() => handleOpenCheckoutModal()} className={styles.featureLink}>
              <span>Começar agora</span>
              <ArrowRight size={14} />
            </button>
          </div>

          <div className={styles.featureBox}>
            <div className={`${styles.featureIconWrap} ${styles.iconBgEmerald}`}>
              <TrendingUp size={22} color="#059669" />
            </div>
            <span className={styles.featureCategory}>GESTÃO FINANCEIRA & DRE</span>
            <h3 className={styles.featureTitle}>Controle de margens e comissões sem imprevistos</h3>
            <p className={styles.featureDesc}>
              Margem real por procedimento através da dedução direta dos insumos consumidos. Gestão de repasses a dentistas e fluxo de caixa.
            </p>
            <button type="button" onClick={() => handleOpenCheckoutModal()} className={styles.featureLink}>
              <span>Começar agora</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </section>

      {/* ─── 6. BANNER AZUL COM TAREFAS ─── */}
      <section className={styles.blueBannerSection}>
        <div className={styles.blueBannerCard}>
          <div className={styles.blueBannerLeft}>
            <span className={styles.blueBannerBadge}>EXCLUSIVO DO ODONTOFLOW</span>
            <h2 className={styles.blueBannerTitle}>Organize as tarefas clínicas sem depender da memória</h2>
            <p className={styles.blueBannerDesc}>
              Evite sobrecargas na equipe. Com a gestão de pendências associada ao prontuário, acompanhe pedidos de próteses, compras de material e retornos com clareza operacional.
            </p>
            <button
              type="button"
              onClick={() => handleOpenCheckoutModal()}
              className={styles.btnBannerWhite}
            >
              Testar funcionalidade agora
            </button>
          </div>

          <div className={styles.blueBannerRight}>
            <div className={styles.tasksPreviewCard}>
              <div className={styles.tasksPreviewHeader}>
                <Sparkles size={14} color="#0284c7" />
                <strong>Tarefas do Dia</strong>
              </div>
              <ul className={styles.tasksList}>
                <li>
                  <input type="checkbox" readOnly checked={false} />
                  <span>Confirmar envio do molde da Coroa (Laboratório)</span>
                </li>
                <li>
                  <input type="checkbox" readOnly checked={false} />
                  <span>Validar cirurgia de siso com Dra. Amanda</span>
                </li>
                <li className={styles.taskDone}>
                  <Check size={14} color="#10b981" />
                  <s>Reposição de tubetes anestésicos (2 caixas)</s>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 7. ROBUSTEZ ─── */}
      <section className={styles.robustnessSection}>
        <div className={styles.sectionHeadingCenter}>
          <h2 className={styles.robustTitle}>Segurança e robustez comprovadas</h2>
          <p className={styles.robustSub}>Arquitetura desenhada para apoiar consultórios e policlínicas em expansão.</p>
        </div>

        <div className={styles.robustGrid}>
          <div className={styles.robustCard}>
            <strong className={styles.robustNumber}>+450.000</strong>
            <span>Consultas realizadas</span>
          </div>

          <div className={styles.robustCard}>
            <strong className={styles.robustNumber}>+120.000</strong>
            <span>Prontuários com validação CFO</span>
          </div>

          <div className={styles.robustCard}>
            <strong className={styles.robustNumber}>99.8%</strong>
            <span>Precisão no controle fracionado de estoque</span>
          </div>
        </div>
      </section>

      {/* ─── 8. TABELA DE PLANOS ─── */}
      <section className={styles.plansSection} id="planos">
        <div className={styles.sectionHeadingCenter}>
          <span className={styles.tabelaTransparentePill}>TABELA TRANSPARENTE</span>
          <h2 className={styles.plansHeading}>Planos à medida da sua clínica</h2>

          <div className={styles.togglePillContainer}>
            <button
              type="button"
              className={`${styles.togglePillBtn} ${billingCycle === 'mensal' ? styles.togglePillActive : ''}`}
              onClick={() => setBillingCycle('mensal')}
            >
              Mensal
            </button>
            <button
              type="button"
              className={`${styles.togglePillBtn} ${billingCycle === 'anual' ? styles.togglePillActiveBlue : ''}`}
              onClick={() => setBillingCycle('anual')}
            >
              <span>Anual</span>
              <span className={styles.discountBadgeSmall}>10% OFF</span>
            </button>
          </div>
          <span className={styles.parcelamentoNotice}>Pagamento anual em até 12x sem juros no cartão</span>
        </div>

        <div className={styles.plansGrid}>
          {PLANS.map((plan) => {
            const price = billingCycle === 'anual' ? plan.annualPrice : plan.monthlyPrice

            return (
              <div
                key={plan.id}
                className={`${styles.planCard} ${plan.id === 'premium' ? styles.planCardHighlighted : ''}`}
              >
                {plan.badge && (
                  <div className={plan.id === 'premium' ? styles.badgeMaisEscolhido : styles.badgeAltaEscala}>
                    {plan.id === 'enterprise' && <ShieldCheck size={12} />}
                    <span>{plan.badge}</span>
                  </div>
                )}

                <span className={styles.planTargetLabel}>{plan.target}</span>
                <h3 className={styles.planCardName}>{plan.name}</h3>
                <p className={styles.planCardDescription}>{plan.description}</p>

                <div className={styles.planPriceRow}>
                  <span className={styles.currencyReal}>R$</span>
                  <strong className={styles.planBigValue}>{price.toFixed(2).replace('.', ',')}</strong>
                  <span className={styles.perMonthText}>/mês</span>
                </div>

                <div className={styles.featuresBox}>
                  <strong className={styles.featuresHeadingSmall}>{plan.featuresTitle}</strong>
                  <ul className={styles.planFeaturesList}>
                    {plan.features.map((feat, i) => (
                      <li key={i}>
                        <CheckCircle2 size={16} className={styles.checkIconGreen} />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenCheckoutModal(plan.id)}
                  className={plan.id === 'premium' ? styles.btnCardBlue : styles.btnCardWhite}
                >
                  {plan.ctaText}
                </button>
              </div>
            )
          })}
        </div>
      </section>

      {/* ─── 9. FAQ ─── */}
      <section className={styles.faqSection} id="duvidas">
        <div className={styles.sectionHeadingCenter}>
          <h2 className={styles.faqTitle}>Perguntas frequentes</h2>
          <p className={styles.faqSub}>Esclarecimentos sobre o ecossistema OdontoFlow.</p>
        </div>

        <div className={styles.faqContainer}>
          {FAQS.map((faq, idx) => {
            const isOpen = openFaq === idx
            return (
              <div key={idx} className={styles.faqCard}>
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className={styles.faqButton}
                >
                  <span>{faq.q}</span>
                  <ChevronDown size={18} className={`${styles.faqChevron} ${isOpen ? styles.faqChevronRotate : ''}`} />
                </button>
                {isOpen && (
                  <div className={styles.faqBody}>
                    <p>{faq.a}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* ─── 10. FOOTER ─── */}
      <footer className={styles.footerSection}>
        <div className={styles.footerTop}>
          <div className={styles.footerBrandArea}>
            <div className={styles.navBrand}>
              <div className={styles.logoCircle}>
                <div className={styles.logoGlow} />
              </div>
              <span className={styles.logoText}>OdontoFlow</span>
            </div>
            <p className={styles.footerBrandDesc}>
              O ecossistema definitivo para a gestão de clínicas e consultórios odontológicos.
            </p>
          </div>

          <div className={styles.footerNavCol}>
            <strong>NAVEGAÇÃO</strong>
            <a href="#recursos">Recursos</a>
            <a href="#depoimentos">Depoimentos</a>
            <a href="#planos">Planos</a>
            <a href="#duvidas">Dúvidas</a>
          </div>

          <div className={styles.footerNavCol}>
            <strong>LEGAL & SEGURANÇA</strong>
            <span>Termos de Uso</span>
            <span>Privacidade</span>
            <span>Conformidade CFO / LGPD</span>
            <span>Criptografia de Ponta a Ponta</span>
          </div>
        </div>

        <div className={styles.footerBottomBar}>
          <div className={styles.footerCopyLeft}>
            <span>© 2026 <strong>OdontoFlow</strong>. Todos os direitos reservados. • Uma solução desenvolvida por <strong>Omnia Tech</strong>.</span>
          </div>

          <div className={styles.footerBadgesRight}>
            <span className={styles.securityTag}>
              <span className={styles.greenDot} /> Conformidade CFO & LGPD
            </span>
            <span className={styles.securityTag}>
              Criptografia Ativa
            </span>
          </div>
        </div>
      </footer>

      {/* ─── 11. MODAL DE ONBOARDING & REGISTO INTEGRADO (SWAGGER /auth/register) ─── */}
      {isCheckoutOpen && (
        <div className={styles.checkoutOverlay} onClick={() => setIsCheckoutOpen(false)}>
          <div className={styles.checkoutModalBox} onClick={(e) => e.stopPropagation()}>
            
            <div className={styles.checkoutModalTopbar}>
              <div className={styles.checkoutBrandLogo}>
                <div className={styles.logoCircle}>
                  <div className={styles.logoGlow} />
                </div>
                <strong>OdontoFlow</strong>
              </div>

              <div className={styles.checkoutTopRight}>
                <span>Já tem uma conta? <Link href="/login" className={styles.linkIniciarSessao}>Iniciar sessão</Link></span>
                <button type="button" onClick={() => setIsCheckoutOpen(false)} className={styles.closeCheckoutBtn}>
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className={styles.checkoutBodyGrid}>
              
              {/* Coluna Esquerda: Formulário de Cadastro */}
              <div className={styles.checkoutLeftCard}>
                
                <div className={styles.stepperRow}>
                  <div className={`${styles.stepItem} ${checkoutStep === 1 ? styles.stepItemActive : styles.stepItemDone}`}>
                    <span className={styles.stepNumberBadge}>1</span>
                    <span className={styles.stepText}>Sua Clínica</span>
                  </div>
                  <div className={styles.stepDividerLine} />
                  <div className={`${styles.stepItem} ${checkoutStep === 2 ? styles.stepItemActive : ''}`}>
                    <span className={styles.stepNumberBadge}>2</span>
                    <span className={styles.stepText}>Administrador</span>
                  </div>
                </div>

                {errorMessage && (
                  <div className={styles.errorAlertBox}>
                    <AlertCircle size={16} />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {!createdClinicData ? (
                  <>
                    <h2 className={styles.checkoutFormTitle}>Comece os seus 7 dias grátis</h2>
                    <p className={styles.checkoutFormSubtitle}>Configure o ambiente exclusivo da sua clínica odontológica em segundos.</p>

                    {checkoutStep === 1 ? (
                      <form onSubmit={handleProceedToStep2} className={styles.formFieldsBox}>
                        <div className={styles.fieldGroup}>
                          <label>Nome da Clínica ou Consultório *</label>
                          <div className={styles.inputIconWrap}>
                            <Building2 size={16} className={styles.fieldIconLeft} />
                            <input
                              type="text"
                              required
                              placeholder="Ex: Odonto Prime & Estética"
                              value={clinicName}
                              onChange={(e) => {
                                setClinicName(e.target.value)
                                if (!subdomain) {
                                  setSubdomain(
                                    e.target.value
                                      .toLowerCase()
                                      .normalize('NFD')
                                      .replace(/[\u0300-\u036f]/g, '')
                                      .replace(/[^a-z0-9]/g, '')
                                  )
                                }
                              }}
                              className={styles.modalInput}
                            />
                          </div>
                        </div>

                        <div className={styles.fieldGroup}>
                          <label>Endereço de Acesso (Subdomínio) *</label>
                          <div className={styles.subdomainPrefixWrap}>
                            <span className={styles.subdomainDomainPart}>app.odontoflow.com.br/</span>
                            <input
                              type="text"
                              required
                              placeholder="suaclinica"
                              value={subdomain}
                              onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
                              className={styles.subdomainInputPart}
                            />
                          </div>
                          <small className={styles.subdomainHelp}>Este será o link seguro de acesso para você e sua equipe.</small>
                        </div>

                        <div className={styles.fieldsTwoCols}>
                          <div className={styles.fieldGroup}>
                            <label>WhatsApp / Telefone *</label>
                            <input
                              type="tel"
                              required
                              placeholder="(85) 99999-0000"
                              value={whatsapp}
                              onChange={(e) => setWhatsapp(e.target.value)}
                              className={styles.modalInputPlain}
                            />
                          </div>

                          <div className={styles.fieldGroup}>
                            <label>CNPJ ou CPF *</label>
                            <input
                              type="text"
                              required
                              placeholder="00.000.000/0000-00"
                              value={documentNumber}
                              onChange={(e) => setDocumentNumber(e.target.value)}
                              className={styles.modalInputPlain}
                            />
                          </div>
                        </div>

                        <button type="submit" className={styles.btnContinueCheckout}>
                          <span>Continuar para Dados de Acesso</span>
                          <ArrowRight size={16} />
                        </button>
                      </form>
                    ) : (
                      <form onSubmit={handleFinalizeOnboarding} className={styles.formFieldsBox}>
                        <div className={styles.fieldGroup}>
                          <label>Nome do Responsável Técnico *</label>
                          <div className={styles.inputIconWrap}>
                            <User size={16} className={styles.fieldIconLeft} />
                            <input
                              type="text"
                              required
                              placeholder="Dr(a). Seu Nome Completo"
                              value={adminName}
                              onChange={(e) => setAdminName(e.target.value)}
                              className={styles.modalInput}
                            />
                          </div>
                        </div>

                        <div className={styles.fieldsTwoCols}>
                          <div className={styles.fieldGroup}>
                            <label>E-mail Corporativo de Login *</label>
                            <input
                              type="email"
                              required
                              placeholder="admin@suaclinica.com.br"
                              value={adminEmail}
                              onChange={(e) => setAdminEmail(e.target.value)}
                              className={styles.modalInputPlain}
                            />
                          </div>

                          <div className={styles.fieldGroup}>
                            <label>Registro CRO (Opcional)</label>
                            <input
                              type="text"
                              placeholder="Ex: CE-12345"
                              value={adminCro}
                              onChange={(e) => setAdminCro(e.target.value)}
                              className={styles.modalInputPlain}
                            />
                          </div>
                        </div>

                        <div className={styles.fieldGroup}>
                          <label>Senha de Acesso do Administrador *</label>
                          <input
                            type="password"
                            required
                            minLength={6}
                            placeholder="Mínimo 6 dígitos"
                            value={adminPassword}
                            onChange={(e) => setAdminPassword(e.target.value)}
                            className={styles.modalInputPlain}
                          />
                        </div>

                        <div className={styles.buttonsRowModal}>
                          <button
                            type="button"
                            onClick={() => setCheckoutStep(1)}
                            className={styles.btnBackModal}
                            disabled={submitting}
                          >
                            Voltar
                          </button>
                          <button
                            type="submit"
                            disabled={submitting}
                            className={styles.btnFinishModal}
                          >
                            {submitting ? (
                              <>
                                <Loader2 size={16} className={styles.spinner} />
                                <span>Criando ambiente da clínica...</span>
                              </>
                            ) : (
                              <span>Gerar Ambiente e Acessar Agora</span>
                            )}
                          </button>
                        </div>
                      </form>
                    )}
                  </>
                ) : (
                  /* Tela de Conclusão com o Link Usável Imediato */
                  <div className={styles.successOnboardingBox}>
                    <div className={styles.successBadgeCircle}>
                      <CheckCircle2 size={44} color="#10b981" />
                    </div>
                    <h3 className={styles.successTitle}>Clínica Criada com Sucesso!</h3>
                    <p className={styles.successDesc}>
                      O ambiente para <strong>{createdClinicData.clinicTitle}</strong> está ativo e configurado com 7 dias grátis no plano <strong>{activePlan.name}</strong>.
                    </p>

                    <div className={styles.generatedLinkCard}>
                      <span className={styles.generatedLinkLabel}>Link Direto de Acesso:</span>
                      <div className={styles.generatedLinkRow}>
                        <code>{createdClinicData.subdomainUrl}</code>
                        <button
                          type="button"
                          onClick={() => navigator.clipboard.writeText(createdClinicData.subdomainUrl)}
                          className={styles.btnCopyLink}
                          title="Copiar link"
                        >
                          Copiar
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleGoToDashboard}
                      className={styles.btnAcessarAgora}
                    >
                      <span>Entrar no Painel OdontoFlow</span>
                      <ExternalLink size={16} />
                    </button>
                  </div>
                )}
              </div>

              {/* Coluna Direita: Resumo do Plano Selecionado */}
              <div className={styles.checkoutRightCard}>
                <div className={styles.planSelectorMiniRow}>
                  <span className={styles.miniLabelPlan}>PLANO SELECIONADO</span>
                  <div className={styles.planMiniPills}>
                    <button
                      type="button"
                      className={`${styles.miniPill} ${selectedPlanId === 'basico' ? styles.miniPillActive : ''}`}
                      onClick={() => setSelectedPlanId('basico')}
                    >
                      Básico
                    </button>
                    <button
                      type="button"
                      className={`${styles.miniPill} ${selectedPlanId === 'premium' ? styles.miniPillActive : ''}`}
                      onClick={() => setSelectedPlanId('premium')}
                    >
                      <ShieldCheck size={12} /> Pro
                    </button>
                    <button
                      type="button"
                      className={`${styles.miniPill} ${selectedPlanId === 'enterprise' ? styles.miniPillActive : ''}`}
                      onClick={() => setSelectedPlanId('enterprise')}
                    >
                      Enterprise
                    </button>
                  </div>
                </div>

                <div className={styles.selectedPlanHeader}>
                  <div>
                    <h3 className={styles.planMainTitle}>
                      {activePlan.name === 'Premium' ? 'Clínica Pro' : activePlan.name}
                    </h3>
                    <span className={styles.planTargetSub}>
                      {activePlan.id === 'premium' ? 'Mais Escolhido • Até 5 Dentistas' : activePlan.target}
                    </span>
                  </div>

                  <div className={styles.planPriceBigWrap}>
                    <strong className={styles.bigPriceModal}>R$ {displayedPrice.toFixed(2).replace('.', ',')}</strong>
                    <span className={styles.bigPricePeriod}>/mês</span>
                  </div>
                </div>

                <div className={styles.modalToggleBilling}>
                  <button
                    type="button"
                    className={`${styles.modalToggleBtn} ${billingCycle === 'mensal' ? styles.modalToggleBtnActive : ''}`}
                    onClick={() => setBillingCycle('mensal')}
                  >
                    Mensal
                  </button>
                  <button
                    type="button"
                    className={`${styles.modalToggleBtn} ${billingCycle === 'anual' ? styles.modalToggleBtnActiveBlue : ''}`}
                    onClick={() => setBillingCycle('anual')}
                  >
                    Anual (10% OFF)
                  </button>
                </div>

                <div className={styles.modalFeaturesBox}>
                  <strong className={styles.modalFeaturesTitle}>
                    RECURSOS INCLUÍDOS NO PLANO {activePlan.name.toUpperCase()}:
                  </strong>
                  <ul className={styles.modalFeaturesList}>
                    {activePlan.features.map((feat, idx) => (
                      <li key={idx}>
                        <CheckCircle2 size={15} color="#0284c7" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className={styles.modalTrustFooter}>
                  <div className={styles.trustItem}>
                    <CheckCircle2 size={14} color="#10b981" />
                    <span>7 dias de acesso sem restrições</span>
                  </div>
                  <div className={styles.trustItem}>
                    <Sparkles size={14} color="#0284c7" />
                    <span>Suporte humanizado no onboarding</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  )
}