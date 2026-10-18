'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Sparkles,
  Calendar,
  Activity,
  Box,
  Link as LinkIcon,
  FileText,
  TrendingUp,
  Star,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  ShieldCheck,
  Building2,
  User,
  X,
  Loader2,
  Check,
  AlertCircle,
  ExternalLink,
  Copy,
  Zap,
  MoreHorizontal,
  Users,
  ClipboardList,
  BarChart2,
  Settings,
  Lock,
  Menu,
} from 'lucide-react'
import Image from 'next/image'
import api from '../../lib/api'
import styles from './landing.module.css'
import Toothsymbol from '../../public/Toothsymbol.svg'

interface PlanTier {
  id: 'BASIC' | 'PREMIUM' | 'ENTERPRISE'
  badge?: string
  target: string
  name: string
  description: string
  monthlyPrice: number
  annualPrice: number
  features: string[]
  ctaText: string
  isCustomConsultant?: boolean
}

const WHATSAPP_NUMBER = '5585999999999'

const PLANS: PlanTier[] = [
  {
    id: 'BASIC',
    target: 'PARA COMEÇAR',
    name: 'Básico',
    description: 'O essencial para seu consultório.',
    monthlyPrice: 149.9,
    annualPrice: 134.9,
    features: [
      '1 Agenda / Dentista',
      'Prontuário com Odontograma',
      'Estoque manual',
      'Orçamentos e documentos em PDF',
    ],
    ctaText: 'Testar 7 dias grátis',
  },
  {
    id: 'PREMIUM',
    badge: 'MAIS ESCOLHIDO',
    target: 'MAIS COMPLETO',
    name: 'Premium',
    description: 'Mais automação para a sua rotina.',
    monthlyPrice: 229.9,
    annualPrice: 206.9,
    features: [
      'Até 5 Dentistas',
      'Exit Inteligente (baixa fracionada auto)',
      'Transcrição de evolução clínica com IA',
      'Comissões e repasses automáticos',
      'Trava de segurança jurídica CFO (24h)',
      'White-Label com sua marca e cores',
    ],
    ctaText: 'Testar 7 dias grátis',
  },
  {
    id: 'ENTERPRISE',
    badge: 'ALTA ESCALA',
    target: 'ALTA ESCALA',
    name: 'Enterprise',
    description: 'Gestão para operações e policlínicas.',
    monthlyPrice: 319.9,
    annualPrice: 287.9,
    features: [
      'Dentistas e cadeiras ilimitadas',
      'Trava de idempotência recepção / sala',
      'DRE Executivo & Balancete contínuo',
      'White-label completo',
      'Suporte prioritário via WhatsApp',
    ],
    ctaText: 'Falar com especialista',
    isCustomConsultant: true,
  },
]

const FAQS = [
  {
    q: 'Como funciona o teste de 7 dias?',
    a: 'Escolha um plano e experimente o OdontoFlow por 7 dias sem restrições. Use esse período para conhecer a agenda, o prontuário e os recursos incluídos no plano antes de decidir.',
  },
  {
    q: 'Como funciona o Exit Inteligente de estoque?',
    a: 'Você cadastra a ficha técnica dos procedimentos (ex: 0.3g de resina e 1 tubete de anestésico). Assim que o dentista finaliza o atendimento clínico no sistema, a baixa fracionada é debitada do estoque e o custo proporcional é lançado no DRE em tempo real.',
  },
  {
    q: 'Posso usar o sistema com mais de um dentista?',
    a: 'Sim! O plano Básico é focado em consultórios individuais (1 dentista ativo), o plano Premium comporta até 5 dentistas e o plano Enterprise oferece cadeiras e profissionais ilimitados.',
  },
  {
    q: 'Consigo acessar pelo celular?',
    a: 'Sim, a plataforma é totalmente responsiva e acessível pelo navegador de qualquer smartphone ou tablet, contando com conformidade com o CFO e criptografia ativa.',
  },
  {
    q: 'Existe fidelidade contratual?',
    a: 'Não há fidelidade nem multas contratuais no plano mensal. Você tem total flexibilidade para cancelar ou alterar o plano quando desejar.',
  },
]

export default function LandingPage() {
  const router = useRouter()
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'YEARLY'>('YEARLY')
  const [selectedPlanId, setSelectedPlanId] = useState<'BASIC' | 'PREMIUM' | 'ENTERPRISE'>('PREMIUM')
  const [mobilePlanTab, setMobilePlanTab] = useState<'BASIC' | 'PREMIUM' | 'ENTERPRISE'>('PREMIUM')
  const [openFaq, setOpenFaq] = useState<number | null>(0)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Controle do Modal de Onboarding
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

  // Estados de Submissão
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [createdClinicData, setCreatedClinicData] = useState<{
    subdomainUrl: string
    clinicTitle: string
    token?: string
  } | null>(null)
  const [copiedLink, setCopiedLink] = useState(false)

  const activePlan = PLANS.find((p) => p.id === selectedPlanId) || PLANS[1]
  const displayedPrice = billingCycle === 'YEARLY' ? activePlan.annualPrice : activePlan.monthlyPrice

  function handleOpenCheckoutModal(planId?: 'BASIC' | 'PREMIUM' | 'ENTERPRISE') {
    if (planId) setSelectedPlanId(planId)
    setCheckoutStep(1)
    setErrorMessage('')
    setCreatedClinicData(null)
    setCopiedLink(false)
    setIsCheckoutOpen(true)
    setIsMobileMenuOpen(false)
  }

  function handleProceedToStep2(e: React.FormEvent) {
    e.preventDefault()
    setErrorMessage('')
    setCheckoutStep(2)
  }

  async function handleFinalizeOnboarding(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setErrorMessage('')

    try {
      const cleanSlug =
        subdomain
          .trim()
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9-]/g, '') || 'clinica'

      const registerPayload = {
        tenantName: clinicName.trim(),
        slug: cleanSlug,
        plan: selectedPlanId,
        billingCycle,
        phone: whatsapp.trim() || undefined,
        cnpjOrCpf: documentNumber.trim() || undefined,
        adminName: adminName.trim(),
        email: adminEmail.trim().toLowerCase(),
        password: adminPassword,
      }

      const response = await api.post('/auth/register', registerPayload)
      const data = response.data?.data || response.data

      const token = data?.token
      const user = data?.user
      const tenant = data?.tenant

      if (token) {
        localStorage.setItem('odontoflow_token', token)
        localStorage.setItem('@odontoflow:token', token)
      }
      if (user) {
        localStorage.setItem('odontoflow_user', JSON.stringify({ ...user, tenantId: tenant?.id }))
        localStorage.setItem('@odontoflow:user', JSON.stringify({ ...user, tenantId: tenant?.id }))
      }

      const originHost = typeof window !== 'undefined' ? window.location.origin : 'https://odontoflow.omniatechlabs.com.br'
      const generatedLink = `${originHost}/?clinic=${cleanSlug}`

      setCreatedClinicData({
        subdomainUrl: generatedLink,
        clinicTitle: clinicName.trim() || 'Minha Clínica Odontológica',
        token,
      })
    } catch (err: any) {
      console.error('Erro no registro do tenant:', err)
      const errorResponse = err.response?.data?.message || err.message || 'Falha ao registrar clínica. Tente novamente.'
      setErrorMessage(Array.isArray(errorResponse) ? errorResponse.join(', ') : errorResponse)
    } finally {
      setSubmitting(false)
    }
  }

  function handleGoToDashboard() {
    setIsCheckoutOpen(false)
    router.push('/')
  }

  function handleCopy() {
    if (!createdClinicData?.subdomainUrl) return
    navigator.clipboard.writeText(createdClinicData.subdomainUrl)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  return (
    <div className={styles.landingContainer}>
      {/* ─── 1. NAVBAR ─── */}
      <header className={styles.navbar}>
        <div className={styles.navInner}>
          <div className={styles.navBrand}>
            <div className={styles.logoCircle}>
              <Image src={Toothsymbol} alt="OdontoFlow" width={22} height={22} priority />
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
              onClick={() => handleOpenCheckoutModal('PREMIUM')}
              className={styles.btnNavTestar}
            >
              Testar
            </button>
            <button
              type="button"
              className={styles.btnMobileMenu}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Menu"
            >
              {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className={styles.mobileNavDropdown}>
            <a href="#recursos" onClick={() => setIsMobileMenuOpen(false)}>Recursos</a>
            <a href="#depoimentos" onClick={() => setIsMobileMenuOpen(false)}>Depoimentos</a>
            <a href="#planos" onClick={() => setIsMobileMenuOpen(false)}>Planos</a>
            <a href="#duvidas" onClick={() => setIsMobileMenuOpen(false)}>Dúvidas</a>
            <Link href="/login" className={styles.btnMobileLogin} onClick={() => setIsMobileMenuOpen(false)}>
              Entrar no sistema
            </Link>
          </div>
        )}
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
              Administrar um consultório ou clínica não necessita de ser um processo burocrático. O OdontoFlow integra
              prontuário ágil, dedução automática de insumos e DRE analítico em tempo real.
            </p>

            <div className={styles.heroButtonsRow}>
              <button
                type="button"
                onClick={() => handleOpenCheckoutModal('PREMIUM')}
                className={styles.btnComecarGraca}
              >
                <span>Começar de graça</span>
                <ArrowRight size={16} />
              </button>

              <a
                href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('Olá! Gostaria de falar com um especialista do OdontoFlow.')}`}
                target="_blank"
                rel="noreferrer"
                className={styles.btnFalarEspecialista}
              >
                Falar com especialista
              </a>
            </div>

            <div className={styles.heroDisclaimer}>
              <span>Sem fidelidade contratual. Cancele quando quiser 💙</span>
            </div>
          </div>

          {/* MOCKUP VISUAL INTERATIVO */}
          <div className={styles.heroMockupCol}>
            <div className={styles.laptopFrame}>
              <div className={styles.laptopTopBar}>
                <div className={styles.laptopDots}>
                  <span className={`${styles.dot} ${styles.dotRed}`} />
                  <span className={`${styles.dot} ${styles.dotYellow}`} />
                  <span className={`${styles.dot} ${styles.dotGreen}`} />
                </div>
                <div className={styles.laptopUrlBar}>app.odontoflow.com.br/agenda</div>
                <div className={styles.laptopTopRight}>
                  <MoreHorizontal size={14} className={styles.topDotsIcon} />
                </div>
              </div>

              <div className={styles.laptopBody}>
                <aside className={styles.miniSidebar}>
                  <div className={`${styles.miniIconItem} ${styles.miniIconActive}`}>
                    <Activity size={17} strokeWidth={2.4} />
                  </div>
                  <div className={styles.miniIconItem}><Calendar size={17} /></div>
                  <div className={styles.miniIconItem}><Users size={17} /></div>
                  <div className={styles.miniIconItem}><ClipboardList size={17} /></div>
                  <div className={styles.miniIconItem}><Box size={17} /></div>
                  <div className={styles.miniIconItem}><BarChart2 size={17} /></div>
                  <div className={styles.miniIconItem}><Settings size={17} /></div>
                </aside>

                <main className={styles.agendaContent}>
                  <div className={styles.mockupHeader}>
                    <div className={styles.mockupHeaderLeft}>
                      <h3 className={styles.mockupTitle}>Agenda Geral • Consultório 01</h3>
                      <span className={styles.mockupSubtitle}>Quarta-feira, 14 de outubro</span>
                    </div>
                    <div className={styles.userAvatar}>NR</div>
                  </div>

                  <div className={styles.subBar}>
                    <div className={styles.exitBadge}>
                      <Zap size={13} className={styles.zapIcon} />
                      <span>Exit Inteligente Ativo</span>
                    </div>
                    <div className={styles.viewTabs}>
                      <span className={styles.tabActive}>Dia</span>
                      <span className={styles.tabInactive}>Semana</span>
                    </div>
                  </div>

                  <div className={styles.scheduleGrid}>
                    <div className={styles.timeRow}>
                      <div className={styles.timeLabel}>09:00</div>
                      <div className={styles.appointmentCard}>
                        <div className={styles.cardHeader}>
                          <strong className={styles.dentistName}>Dra. Nathalia Rosa</strong>
                          <span className={styles.statusDotGreen} />
                        </div>
                        <div className={styles.patientInfo}>Mariana Costa · Restauração</div>
                        <div className={styles.cardFooter}>
                          <span className={styles.roomDuration}>45 min · Cadeira 01</span>
                          <span className={styles.pillConfirmed}>Confirmada</span>
                        </div>
                      </div>
                    </div>

                    <div className={styles.timeRow}>
                      <div className={styles.timeLabel}>10:00</div>
                      <div className={styles.appointmentCard}>
                        <div className={styles.cardHeader}>
                          <strong className={styles.dentistName}>Dr. Leonardo Martins</strong>
                          <span className={styles.statusDotCyan} />
                        </div>
                        <div className={styles.patientInfo}>Pedro Almeida · Avaliação clínica</div>
                        <div className={styles.cardFooter}>
                          <span className={styles.roomDuration}>45 min · Cadeira 01</span>
                          <span className={styles.pillScheduled}>Agendada</span>
                        </div>
                      </div>
                    </div>

                    <div className={styles.timeRowDimmed}>
                      <div className={styles.timeLabel}>11:00</div>
                      <div className={styles.dividerLine} />
                    </div>
                  </div>

                  <div className={styles.floatingFichaCard}>
                    <div className={styles.floatingIconBox}>
                      <Box size={20} strokeWidth={2.2} />
                    </div>
                    <div className={styles.floatingTexts}>
                      <span className={styles.floatingTitle}>Resumo da Ficha Clínica:</span>
                      <span className={styles.floatingHighlight}>Resina Composta (0.3g) - R$ 9,00</span>
                    </div>
                  </div>
                </main>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 3. TICKER DEPOIMENTOS EM PROGRAMA PILOTO ─── */}
      <div className={styles.tickerWrapper} id="depoimentos">
        <div className={styles.tickerTrack}>
          <span>★★★★★ “ Facilitou a rotina clínica e a conferência de procedimentos. ”</span>
          <span>★★★★★ “ A baixa de materiais na evolução poupa conferência manual no fim do dia. ”</span>
          <span>★★★★★ “ Prontuário visual claro e suporte técnico ágil pelo WhatsApp. ”</span>
        </div>
      </div>

      {/* ─── 4. PROVA SOCIAL (PROGRAMA BETA & VALIDAÇÃO) ─── */}
      <section className={styles.socialProofSection}>
        <div className={styles.sectionHeadingCenter}>
          <span className={styles.preBadgeCategory}>DESENVOLVIDO COM QUEM VIVE O CONSULTÓRIO</span>
          <h2 className={styles.socialTitle}>Construído lado a lado com cirurgiões-dentistas</h2>
          <p className={styles.socialSub}>Métricas de validação do nosso programa piloto com clínicas parceiras.</p>
        </div>

        <div className={styles.statsCardsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statHeaderTop}>
              <Star size={16} className={styles.iconBlue} />
              <span className={styles.statLabel}>Avaliação Beta</span>
            </div>
            <div className={styles.statScoreRow}>
              <strong className={styles.statBigNumber}>5.0</strong>
              <div className={styles.statStars}>
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={14} fill="#f59e0b" color="#f59e0b" />
                ))}
              </div>
            </div>
            <span className={styles.statFootNote}>Feedback unânime dos dentistas piloto</span>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statHeaderTop}>
              <CheckCircle2 size={16} className={styles.iconBlue} />
              <span className={styles.statLabel}>Resolutividade</span>
            </div>
            <div className={styles.statScoreRow}>
              <strong className={styles.statBigNumber}>100%</strong>
            </div>
            <span className={styles.statFootNote}>Chamados atendidos em até 15 minutos</span>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statHeaderTop}>
              <Activity size={16} className={styles.iconBlue} />
              <span className={styles.statLabel}>Aderência Operacional</span>
            </div>
            <div className={styles.statScoreRow}>
              <strong className={styles.statBigNumber}>9.8</strong>
              <span className={styles.statSmallFraction}>/10</span>
            </div>
            <span className={styles.statFootNote}>Facilidade de uso na recepção e mocho</span>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statHeaderTop}>
              <ShieldCheck size={16} className={styles.iconBlue} />
              <span className={styles.statLabel}>Precisão de Estoque</span>
            </div>
            <div className={styles.statScoreRow}>
              <strong className={styles.statBigNumber}>99.8%</strong>
            </div>
            <span className={styles.statFootNote}>Exatidão na baixa fracionada de insumos</span>
          </div>
        </div>

        <div className={styles.approvedFootText}>
          <span>Plataforma em fase de homologação contínua com consultórios parceiros 💙</span>
        </div>
      </section>

      {/* ─── 5. TECNOLOGIA PARA POTENCIAR A SUA CLÍNICA ─── */}
      <section className={styles.featuresSection} id="recursos">
        <div className={styles.sectionHeadingCenter}>
          <span className={styles.preBadgeCategory}>MENOS BUROCRACIA, MAIS ODONTOLOGIA</span>
          <h2 className={styles.featuresHeading}>Tecnologia para simplificar e potenciar a sua clínica</h2>
          <p className={styles.featuresSubheading}>Ferramentas concebidas para apoiar o dentista e acelerar o fluxo na recepção.</p>
        </div>

        <div className={styles.featuresGrid}>
          <div className={styles.featureBox}>
            <div className={styles.featureIconWrap}>
              <Calendar size={22} color="#0082c9" />
            </div>
            <span className={styles.featureCategory}>AGENDA & FILA CLÍNICA</span>
            <h3 className={styles.featureTitle}>Reduza faltas e organize as suas cadeiras</h3>
            <span className={styles.featureArrowCorner}>↗</span>
          </div>

          <div className={styles.featureBox}>
            <div className={styles.featureIconWrap}>
              <Activity size={22} color="#0082c9" />
            </div>
            <span className={styles.featureCategory}>PRONTUÁRIO & ODONTOGRAMA</span>
            <h3 className={styles.featureTitle}>Paciente acessível a partir de qualquer lugar</h3>
            <span className={styles.featureArrowCorner}>↗</span>
          </div>

          <div className={styles.featureBox}>
            <div className={styles.featureIconWrap}>
              <Box size={22} color="#0082c9" />
            </div>
            <span className={styles.featureCategory}>EXIT INTELIGENTE DE ESTOQUE</span>
            <h3 className={styles.featureTitle}>Elimine a contagem manual de seringas</h3>
            <span className={styles.featureArrowCorner}>↗</span>
          </div>

          <div className={styles.featureBox}>
            <div className={styles.featureIconWrap}>
              <LinkIcon size={22} color="#0082c9" />
            </div>
            <span className={styles.featureCategory}>ANAMNESE & PRÉ-CADASTRO</span>
            <h3 className={styles.featureTitle}>Poupe tempo antes de a consulta iniciar</h3>
            <span className={styles.featureArrowCorner}>↗</span>
          </div>

          <div className={styles.featureBox}>
            <div className={styles.featureIconWrap}>
              <FileText size={22} color="#0082c9" />
            </div>
            <span className={styles.featureCategory}>RECEITUÁRIO & DOCUMENTOS</span>
            <h3 className={styles.featureTitle}>Menos papel, maior segurança jurídica</h3>
            <span className={styles.featureArrowCorner}>↗</span>
          </div>

          <div className={styles.featureBox}>
            <div className={styles.featureIconWrap}>
              <TrendingUp size={22} color="#0082c9" />
            </div>
            <span className={styles.featureCategory}>GESTÃO FINANCEIRA & DRE</span>
            <h3 className={styles.featureTitle}>Controle de margens e comissões sem imprevistos</h3>
            <span className={styles.featureArrowCorner}>↗</span>
          </div>
        </div>
      </section>

      {/* ─── 6. BANNER AZUL DE TAREFAS ─── */}
      <section className={styles.blueBannerSection}>
        <div className={styles.blueBannerCard}>
          <div className={styles.blueBannerLeft}>
            <span className={styles.blueBannerBadge}>Exclusivo OdontoFlow</span>
            <h2 className={styles.blueBannerTitle}>Organize as tarefas clínicas sem depender da memória</h2>
            <button
              type="button"
              onClick={() => handleOpenCheckoutModal('PREMIUM')}
              className={styles.btnBannerWhite}
            >
              Testar funcionalidade agora
            </button>
          </div>

          <div className={styles.blueBannerRight}>
            <div className={styles.tasksPreviewCard}>
              <div className={styles.tasksPreviewHeader}>
                <div className={styles.taskTitleRow}>
                  <Sparkles size={15} color="#0082c9" />
                  <strong>Tarefas do Dia</strong>
                </div>
                <span className={styles.taskCountBadge}>1 / 3</span>
              </div>
              <ul className={styles.tasksList}>
                <li className={styles.taskDone}>
                  <input type="checkbox" readOnly checked />
                  <s>Enviar moldes de próteses ao laboratório</s>
                </li>
                <li>
                  <input type="checkbox" readOnly checked={false} />
                  <span>Conferir estoque de anestésicos</span>
                </li>
                <li>
                  <input type="checkbox" readOnly checked={false} />
                  <span>Solicitar reposição de anestésicos</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 7. NÚMEROS DE ROBUSTEZ ─── */}
      <section className={styles.robustnessSection}>
        <div className={styles.robustGrid}>
          <div className={styles.robustCard}>
            <strong className={styles.robustNumber}>+450.000</strong>
            <span className={styles.robustLabel}>Consultas realizadas</span>
          </div>
          <div className={styles.robustCard}>
            <strong className={styles.robustNumber}>+120.000</strong>
            <span className={styles.robustLabel}>Prontuários com validação CFO</span>
          </div>
          <div className={styles.robustCard}>
            <strong className={styles.robustNumber}>99.8%</strong>
            <span className={styles.robustLabel}>Precisão no controle de estoque</span>
          </div>
        </div>
      </section>

      {/* ─── 8. TABELA DE PLANOS (DESKTOP E CARROSSEL MOBILE) ─── */}
      <section className={styles.plansSection} id="planos">
        <div className={styles.sectionHeadingCenter}>
          <span className={styles.preBadgeCategory}>UM PLANO PARA CADA MOMENTO</span>
          <h2 className={styles.plansHeading}>Planos à medida da sua clínica</h2>

          <div className={styles.togglePillContainer}>
            <button
              type="button"
              className={`${styles.togglePillBtn} ${billingCycle === 'MONTHLY' ? styles.togglePillActive : ''}`}
              onClick={() => setBillingCycle('MONTHLY')}
            >
              Mensal
            </button>
            <button
              type="button"
              className={`${styles.togglePillBtn} ${billingCycle === 'YEARLY' ? styles.togglePillActive : ''}`}
              onClick={() => setBillingCycle('YEARLY')}
            >
              <span>Anual</span>
              <span className={styles.discountBadgeSmall}>10% OFF</span>
            </button>
          </div>

          {/* Abas de Navegação Rápida no Mobile */}
          <div className={styles.mobilePlanTabs}>
            <button
              type="button"
              className={`${styles.mobileTabBtn} ${mobilePlanTab === 'BASIC' ? styles.mobileTabActive : ''}`}
              onClick={() => setMobilePlanTab('BASIC')}
            >
              Básico
            </button>
            <button
              type="button"
              className={`${styles.mobileTabBtn} ${mobilePlanTab === 'PREMIUM' ? styles.mobileTabActive : ''}`}
              onClick={() => setMobilePlanTab('PREMIUM')}
            >
              Premium
            </button>
            <button
              type="button"
              className={`${styles.mobileTabBtn} ${mobilePlanTab === 'ENTERPRISE' ? styles.mobileTabActive : ''}`}
              onClick={() => setMobilePlanTab('ENTERPRISE')}
            >
              Enterprise
            </button>
          </div>
        </div>

        <div className={styles.plansGrid}>
          {PLANS.map((plan) => {
            const price = billingCycle === 'YEARLY' ? plan.annualPrice : plan.monthlyPrice
            const isFeatured = plan.id === 'PREMIUM'
            const isEnterprise = plan.id === 'ENTERPRISE'
            const isVisibleOnMobile = mobilePlanTab === plan.id

            return (
              <div
                key={plan.id}
                className={`${styles.planCard} ${isFeatured ? styles.planCardHighlighted : ''} ${
                  isVisibleOnMobile ? styles.mobileVisibleCard : styles.mobileHiddenCard
                }`}
              >
                {plan.badge && (
                  <div className={isFeatured ? styles.badgeMaisEscolhido : styles.badgeAltaEscala}>
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
                <span className={styles.billingCycleNote}>
                  Cobrança {billingCycle === 'YEARLY' ? 'anual' : 'mensal'}
                </span>

                <ul className={styles.planFeaturesList}>
                  {plan.features.map((feat, i) => (
                    <li key={i}>
                      <Check size={16} className={styles.checkIconBlue} />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>

                {isEnterprise ? (
                  <a
                    href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
                      'Olá! Gostaria de falar com um consultor comercial sobre o Plano Enterprise do OdontoFlow.'
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.btnCardWhiteLink}
                  >
                    <span>{plan.ctaText}</span>
                    <ArrowRight size={14} style={{ marginLeft: 6 }} />
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleOpenCheckoutModal(plan.id)}
                    className={isFeatured ? styles.btnCardBlue : styles.btnCardWhite}
                  >
                    {plan.ctaText}
                  </button>
                )}
              </div>
            )
          })}
        </div>

        {/* Indicador de Deslize (Mobile Dots) */}
        <div className={styles.mobileSliderDots}>
          <span className={`${styles.sliderDot} ${mobilePlanTab === 'BASIC' ? styles.sliderDotActive : ''}`} />
          <span className={`${styles.sliderDot} ${mobilePlanTab === 'PREMIUM' ? styles.sliderDotActive : ''}`} />
          <span className={`${styles.sliderDot} ${mobilePlanTab === 'ENTERPRISE' ? styles.sliderDotActive : ''}`} />
        </div>

        <div className={styles.plansFooterDisclaimer}>
          <span>Sem fidelidade contratual. Cancele quando quiser 💙</span>
        </div>
      </section>

      {/* ─── 9. FAQ / PERGUNTAS FREQUENTES ─── */}
      <section className={styles.faqSection} id="duvidas">
        <div className={styles.sectionHeadingCenter}>
          <span className={styles.preBadgeCategory}>DÚVIDAS FREQUENTES</span>
          <h2 className={styles.faqTitle}>Tudo o que precisa saber para começar</h2>
        </div>

        <div className={styles.faqContainer}>
          {FAQS.map((faq, idx) => {
            const isOpen = openFaq === idx
            return (
              <div key={idx} className={`${styles.faqCard} ${isOpen ? styles.faqCardOpen : ''}`}>
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className={styles.faqButton}
                >
                  <span>{faq.q}</span>
                  <span className={styles.faqIconHolder}>
                    {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </span>
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

        <div className={styles.faqDirectContact}>
          Ainda tem alguma dúvida?{' '}
          <a
            href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('Olá! Gostaria de tirar dúvidas com um especialista sobre o OdontoFlow.')}`}
            target="_blank"
            rel="noreferrer"
          >
            Falar com especialista ↗
          </a>
        </div>
      </section>

      {/* ─── 10. FOOTER ─── */}
      <footer className={styles.footerSection}>
        <div className={styles.footerTop}>
          <div className={styles.footerBrandArea}>
            <div className={styles.navBrand}>
              <div className={styles.logoCircleDark}>
                <Image src={Toothsymbol} alt="OdontoFlow" width={22} height={22} />
              </div>
              <span className={styles.logoTextDark}>OdontoFlow</span>
            </div>
            <p className={styles.footerBrandDesc}>
              Tecnologia que cuida da gestão. Mais tempo para cuidar de pessoas.
            </p>
            <button
              type="button"
              onClick={() => handleOpenCheckoutModal('PREMIUM')}
              className={styles.btnFooterCta}
            >
              <span>Começar de graça</span>
              <ArrowRight size={15} />
            </button>
          </div>

          <div className={styles.footerNavLinksGrid}>
            <div className={styles.footerNavCol}>
              <strong>Plataforma</strong>
              <a href="#recursos">Recursos</a>
              <a href="#depoimentos">Depoimentos</a>
              <a href="#planos">Planos</a>
              <a href="#duvidas">Dúvidas</a>
            </div>

            <div className={styles.footerNavCol}>
              <strong>Institucional</strong>
              <a
                href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('Olá! Gostaria de falar com um especialista do OdontoFlow.')}`}
                target="_blank"
                rel="noreferrer"
              >
                Falar com especialista
              </a>
              <a href="#">Termos de uso</a>
              <a href="#">Política de privacidade</a>
            </div>

            <div className={styles.footerBadgesCol}>
              <div className={styles.badgeCertDark}>
                <ShieldCheck size={16} color="#0082c9" />
                <span>Validação CFO</span>
              </div>
              <div className={styles.badgeCertDark}>
                <Lock size={16} color="#0082c9" />
                <span>Conformidade LGPD</span>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.footerBottomBar}>
          <span>
            © 2026 <strong>OdontoFlow</strong>. Todos os direitos reservados.
          </span>
          <span className={styles.footerAuthor}>
            Desenvolvido por <strong>Omnia Tech</strong>
          </span>
        </div>
      </footer>

      {/* ─── 11. MODAL DE ONBOARDING ATÔMICO ─── */}
      {isCheckoutOpen && (
        <div className={styles.checkoutOverlay} onClick={() => setIsCheckoutOpen(false)}>
          <div className={styles.checkoutModalBox} onClick={(e) => e.stopPropagation()}>
            <div className={styles.checkoutModalTopbar}>
              <div className={styles.checkoutBrandLogo}>
                <div className={styles.logoCircle}>
                  <Image src={Toothsymbol} alt="OdontoFlow" width={20} height={20} />
                </div>
                <strong>OdontoFlow</strong>
              </div>

              <div className={styles.checkoutTopRight}>
                <span>
                  Já tem uma conta?{' '}
                  <Link href="/login" className={styles.linkIniciarSessao}>
                    Iniciar sessão
                  </Link>
                </span>
                <button
                  type="button"
                  onClick={() => setIsCheckoutOpen(false)}
                  className={styles.closeCheckoutBtn}
                  aria-label="Fechar"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className={styles.checkoutBodyGrid}>
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
                    <p className={styles.checkoutFormSubtitle}>
                      Configure o ambiente exclusivo da sua clínica odontológica em segundos.
                    </p>

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
                                      .replace(/[^a-z0-9-]/g, '')
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
                              onChange={(e) =>
                                setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
                              }
                              className={styles.subdomainInputPart}
                            />
                          </div>
                          <small className={styles.subdomainHelp}>
                            Este será o link seguro de acesso para você e sua equipe.
                          </small>
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
                  <div className={styles.successOnboardingBox}>
                    <div className={styles.successBadgeCircle}>
                      <CheckCircle2 size={44} color="#10b981" />
                    </div>
                    <h3 className={styles.successTitle}>Clínica Criada com Sucesso!</h3>
                    <p className={styles.successDesc}>
                      O ambiente para <strong>{createdClinicData.clinicTitle}</strong> está ativo e configurado com
                      7 dias grátis no plano <strong>{activePlan.name}</strong>[cite: 17].
                    </p>

                    <div className={styles.generatedLinkCard}>
                      <span className={styles.generatedLinkLabel}>Link Direto de Acesso:</span>
                      <div className={styles.generatedLinkRow}>
                        <code>{createdClinicData.subdomainUrl}</code>
                        <button
                          type="button"
                          onClick={handleCopy}
                          className={styles.btnCopyLink}
                          title="Copiar link"
                        >
                          {copiedLink ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                          <span>{copiedLink ? 'Copiado!' : 'Copiar'}</span>
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
                      className={`${styles.miniPill} ${selectedPlanId === 'BASIC' ? styles.miniPillActive : ''}`}
                      onClick={() => setSelectedPlanId('BASIC')}
                    >
                      Básico
                    </button>
                    <button
                      type="button"
                      className={`${styles.miniPill} ${selectedPlanId === 'PREMIUM' ? styles.miniPillActive : ''}`}
                      onClick={() => setSelectedPlanId('PREMIUM')}
                    >
                      <ShieldCheck size={12} /> Pro
                    </button>
                    <button
                      type="button"
                      className={`${styles.miniPill} ${selectedPlanId === 'ENTERPRISE' ? styles.miniPillActive : ''}`}
                      onClick={() => setSelectedPlanId('ENTERPRISE')}
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
                      {activePlan.id === 'PREMIUM' ? 'Mais Escolhido • Até 5 Dentistas' : activePlan.target}
                    </span>
                  </div>

                  <div className={styles.planPriceBigWrap}>
                    <strong className={styles.bigPriceModal}>
                      R$ {displayedPrice.toFixed(2).replace('.', ',')}
                    </strong>
                    <span className={styles.bigPricePeriod}>/mês</span>
                  </div>
                </div>

                <div className={styles.modalToggleBilling}>
                  <button
                    type="button"
                    className={`${styles.modalToggleBtn} ${billingCycle === 'MONTHLY' ? styles.modalToggleBtnActive : ''}`}
                    onClick={() => setBillingCycle('MONTHLY')}
                  >
                    Mensal
                  </button>
                  <button
                    type="button"
                    className={`${styles.modalToggleBtn} ${billingCycle === 'YEARLY' ? styles.modalToggleBtnActive : ''}`}
                    onClick={() => setBillingCycle('YEARLY')}
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
                        <CheckCircle2 size={15} color="#0082c9" />
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
                    <Sparkles size={14} color="#0082c9" />
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