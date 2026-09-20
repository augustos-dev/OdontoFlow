'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { 
  CheckCircle2, 
  ArrowRight, 
  PackageCheck, 
  TrendingUp, 
  Sparkles, 
  ChevronDown, 
  ChevronUp, 
  Stethoscope, 
  Crown, 
  Link2, 
  Calendar, 
  FileText, 
  Star, 
  Heart, 
  Check 
} from 'lucide-react'
import Logo from '../../public/logo.svg'
import styles from './landing.module.css'

const TESTIMONIALS_TICKER = [
  'Facilitou imenso a rotina do meu consultório!',
  'A dedução automática de resinas e anestésicos poupa horas de trabalho.',
  'Prontuário muito interativo e intuitivo.',
  'O suporte é rápido e eficiente.',
  'A melhor plataforma odontológica que já utilizámos.',
  'A nossa receção nunca mais atrasou a fila de espera.',
]

const CARDS_FEATURES = [
  {
    badge: 'AGENDA & FILA CLÍNICA',
    title: 'Reduza faltas e organize as suas cadeiras',
    desc: 'Centralize a rotina da clínica num único ecrã: confirmações ágeis, estado da consulta em tempo real e fila de espera sem atritos.',
    icon: Calendar,
    color: '#0284c7',
  },
  {
    badge: 'PRONTUÁRIO & ODONTOGRAMA',
    title: 'Paciente acessível a partir de qualquer lugar',
    desc: 'Odontograma interativo, histórico clínico blindado contra adulterações (CFO 24h) e arquivo seguro de radiografias.',
    icon: Stethoscope,
    color: '#06b6d4',
  },
  {
    badge: 'EXIT INTELIGENTE DE STOCK',
    title: 'Elimine a contagem manual de seringas',
    desc: 'O único sistema que fraciona gramas, mililitros e doses diretamente na evolução clínica. Lucratividade precisa por procedimento.',
    icon: PackageCheck,
    color: '#10b981',
  },
  {
    badge: 'ANAMNESE & PRÉ-CADASTRO',
    title: 'Poupe tempo antes de a consulta iniciar',
    desc: 'Envie a hiperligação para o paciente preencher os dados e a anamnese diretamente no telemóvel via WhatsApp.',
    icon: Link2,
    color: '#6366f1',
  },
  {
    badge: 'RECEITUÁRIO & DOCUMENTOS',
    title: 'Menos papel, maior segurança jurídica',
    desc: 'Emissão ágil de atestados, termos de consentimento e receitas digitais formatadas com a identidade visual da sua clínica.',
    icon: FileText,
    color: '#f59e0b',
  },
  {
    badge: 'GESTÃO FINANCEIRA & DRE',
    title: 'Controlo de margens e comissões sem imprevistos',
    desc: 'Margem real por procedimento através da dedução direta dos insumos consumidos. Gestão de repasses a dentistas e fluxo de caixa.',
    icon: TrendingUp,
    color: '#059669',
  },
]

const FAQS = [
  {
    q: 'Como funciona a dedução automática de stock (Exit Inteligente)?',
    a: 'Ao associar insumos à Ficha Técnica (ex: 0,2g de resina ou 1 dose de anestésico), o sistema calcula o fracionamento proporcional e debita as quantidades exatas assim que o dentista encerra o atendimento.',
  },
  {
    q: 'Como funciona a conformidade com o CFO e a LGPD?',
    a: 'As evoluções clínicas possuem assinatura digital com carimbo de tempo e são bloqueadas contra alterações após a janela regulamentar de 24 horas. Retificações posteriores exigem justificação formal registada na trilha de auditoria (AuditLog).',
  },
  {
    q: 'O que é a hiperligação de pré-cadastro para o paciente?',
    a: 'A sua clínica gera uma hiperligação exclusiva para envio por WhatsApp. O paciente preenche a anamnese e os dados de identificação pelo telemóvel antes de chegar ao consultório.',
  },
  {
    q: 'Como o OdontoFlow calcula as comissões dos profissionais?',
    a: 'O sistema calcula o repasse percentual ou fixo do dentista com base no valor líquido real, permitindo descontar automaticamente o custo fracionado dos materiais consumidos no procedimento.',
  },
]

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('annual')

  return (
    <div className={styles.wrapper}>
      {/* ─── NAVBAR SUPERIOR ─── */}
      <header className={styles.navbar}>
        <div className={styles.navContainer}>
          <div className={styles.navLeft}>
            <Link href="/landing" className={styles.logoGroup}>
              <div className={styles.logoIcon}>
                <Image src={Logo} alt="OdontoFlow" width={22} height={22} />
              </div>
              <span className={styles.brandTitle}>OdontoFlow</span>
            </Link>

            <nav className={styles.navLinks}>
              <a href="#recursos" className={styles.navLink}>Recursos</a>
              <a href="#depoimentos" className={styles.navLink}>Depoimentos</a>
              <a href="#planos" className={styles.navLink}>Planos</a>
              <a href="#faq" className={styles.navLink}>Dúvidas</a>
            </nav>
          </div>

          <div className={styles.navActions}>
            <Link href="/login" className={styles.btnLogin}>
              Entrar
            </Link>
            <Link 
              href={`/cadastro?plan=PREMIUM&billing=${billingPeriod}`} 
              className={styles.btnTestarGratis}
            >
              Testar grátis
            </Link>
          </div>
        </div>
      </header>

      {/* ─── HERO SECTION ─── */}
      <section className={styles.heroSection}>
        <div className={styles.heroContainer}>
          <div className={styles.heroContent}>
            <div className={styles.pillBadge}>
              <Sparkles size={14} color="#0284c7" />
              <span>Crie fichas técnicas e automatize a baixa de materiais</span>
            </div>

            <h1 className={styles.heroTitle}>
              O software odontológico <br />
              <span className={styles.heroTitleHighlight}>feito para valorizar</span> o seu tempo e rentabilidade.
            </h1>

            <p className={styles.heroDescription}>
              Administrar um consultório ou clínica não necessita de ser um processo burocrático. O OdontoFlow integra prontuário ágil, dedução automática de insumos e DRE analítico em tempo real.
            </p>

            <div className={styles.heroButtons}>
              <a 
                href="https://wa.me/5585999999999" 
                target="_blank" 
                rel="noopener noreferrer" 
                className={styles.btnOutline}
              >
                Falar com especialista
              </a>
              <Link 
                href={`/cadastro?plan=PREMIUM&billing=${billingPeriod}`} 
                className={styles.btnPrimary}
              >
                Começar de graça
              </Link>
            </div>

            <p className={styles.heroMicroCopy}>
              Sem fidelidade contratual. Cancele quando quiser <Heart size={13} fill="#0284c7" color="#0284c7" />
            </p>
          </div>

          {/* MOCKUP DO NOTEBOOK */}
          <div className={styles.heroMockupContainer}>
            <div className={styles.laptopFrame}>
              <div className={styles.laptopScreen}>
                <div className={styles.screenHeader}>
                  <div className={styles.screenDots}>
                    <span />
                    <span />
                    <span />
                  </div>
                  <span className={styles.screenUrl}>app.odontoflow.com.br/agenda</span>
                </div>

                <div className={styles.screenBody}>
                  <div className={styles.mockSidebar}>
                    <div className={styles.mockLogo} />
                    <div className={styles.mockNavItemActive} />
                    <div className={styles.mockNavItem} />
                    <div className={styles.mockNavItem} />
                    <div className={styles.mockNavItem} />
                  </div>

                  <div className={styles.mockMain}>
                    <div className={styles.mockTopbar}>
                      <span className={styles.mockTitle}>Agenda Geral • Consultório 01</span>
                      <span className={styles.mockStatusTag}>Exit Inteligente Ativo</span>
                    </div>

                    <div className={styles.mockAgendaGrid}>
                      <div className={styles.mockCardAppointment}>
                        <div className={styles.mockAvatar} />
                        <div>
                          <strong>Dra. Nathalia Rosa</strong>
                          <small>09:00 • Restauração Estética Z350</small>
                        </div>
                        <span className={styles.mockBadgeOk}>Confirmada</span>
                      </div>

                      <div className={styles.mockCardAppointment}>
                        <div className={styles.mockAvatar} />
                        <div>
                          <strong>Dr. Leonardo Martins</strong>
                          <small>10:15 • Profilaxia + Aplicação Tópica</small>
                        </div>
                        <span className={styles.mockBadgeAuto}>Baixa Auto 0.4g</span>
                      </div>

                      <div className={styles.mockFloatingCard}>
                        <span className={styles.floatingTitle}>Resumo da Ficha Clínica</span>
                        <div className={styles.floatingLine}>
                          <span>Insumo consumido:</span>
                          <strong>Resina Composta (0.3g)</strong>
                        </div>
                        <div className={styles.floatingLine}>
                          <span>Custo proporcional:</span>
                          <strong style={{ color: '#16a34a' }}>R$ 9,00</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className={styles.laptopBase} />
            </div>
          </div>
        </div>
      </section>

      {/* ─── TICKER ─── */}
      <div className={styles.tickerSection}>
        <div className={styles.tickerTrack}>
          {TESTIMONIALS_TICKER.concat(TESTIMONIALS_TICKER).map((txt, idx) => (
            <div key={idx} className={styles.tickerItem}>
              <span className={styles.tickerQuote}>“</span>
              <span>{txt}</span>
              <span className={styles.tickerQuote}>”</span>
            </div>
          ))}
        </div>
      </div>

      {/* ─── PROVA SOCIAL (AVALIAÇÕES) ─── */}
      <section id="depoimentos" className={styles.proofSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Quem usa, recomenda</h2>
          <p className={styles.sectionSubtitle}>Satisfação comprovada por clínicas e cirurgiões-dentistas.</p>
        </div>

        <div className={styles.cardsProofGrid}>
          <div className={styles.proofCard}>
            <span className={styles.proofPlatform}>Google Reviews</span>
            <div className={styles.proofScore}>
              <strong>5.0</strong>
              <div className={styles.starsRow}>
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={15} fill="#f59e0b" color="#f59e0b" />
                ))}
              </div>
            </div>
            <span className={styles.proofDetail}>+300 avaliações de profissionais</span>
          </div>

          <div className={styles.proofCard}>
            <span className={styles.proofPlatform} style={{ color: '#16a34a' }}>ReclameAQUI</span>
            <div className={styles.proofScore}>
              <strong style={{ fontSize: '24px' }}>100%</strong>
            </div>
            <span className={styles.proofDetail}>Índice de resolutividade exemplar</span>
          </div>

          <div className={styles.proofCard}>
            <span className={styles.proofPlatform}>App Mobile</span>
            <div className={styles.proofScore}>
              <strong>4.9</strong>
              <div className={styles.starsRow}>
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={15} fill="#f59e0b" color="#f59e0b" />
                ))}
              </div>
            </div>
            <span className={styles.proofDetail}>Experiência no consultório e receção</span>
          </div>

          <div className={styles.proofCard}>
            <span className={styles.proofPlatform}>NPS Clínico</span>
            <div className={styles.proofScore}>
              <strong>9.8</strong>
              <span className={styles.scoreMax}>/10</span>
            </div>
            <span className={styles.proofDetail}>Grau de satisfação dos utilizadores</span>
          </div>
        </div>

        <div className={styles.socialAvatarRow}>
          <span className={styles.socialAvatarText}>
            Aprovado por mais de <strong>1.500 consultórios</strong> em todo o país <Heart size={14} fill="#0284c7" color="#0284c7" />
          </span>
        </div>
      </section>

      {/* ─── CARDS DE RECURSOS ─── */}
      <section id="recursos" className={styles.featuresCardsSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Tecnologia para simplificar e potenciar a sua clínica</h2>
          <p className={styles.sectionSubtitle}>Ferramentas concebidas para apoiar o dentista e acelerar o fluxo na receção.</p>
        </div>

        <div className={styles.cardsGrid}>
          {CARDS_FEATURES.map((feat, index) => {
            const Icon = feat.icon

            return (
              <div key={index} className={styles.featureCardModern}>
                <div className={styles.featureCardMedia}>
                  <div className={styles.mediaIconWrapper} style={{ backgroundColor: `${feat.color}15`, color: feat.color }}>
                    <Icon size={32} />
                  </div>
                </div>

                <div className={styles.featureCardBody}>
                  <span className={styles.featureBadge} style={{ color: feat.color, backgroundColor: `${feat.color}10` }}>
                    {feat.badge}
                  </span>
                  <h3 className={styles.featureCardTitle}>{feat.title}</h3>
                  <p className={styles.featureCardDesc}>{feat.desc}</p>

                  <Link 
                    href={`/cadastro?plan=PREMIUM&billing=${billingPeriod}`} 
                    className={styles.btnCardAction}
                  >
                    <span>Começar agora</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ─── BANNER DE TAREFAS ─── */}
      <section className={styles.blueBannerSection}>
        <div className={styles.blueBannerCard}>
          <div className={styles.blueBannerContent}>
            <span className={styles.blueBannerBadge}>EXCLUSIVO DO ODONTOFLOW</span>
            <h2>Organize as tarefas clínicas sem depender da memória</h2>
            <p>
              Evite sobrecargas na equipa. Com a gestão de pendências associada ao prontuário, acompanhe pedidos de próteses, compras de material e retornos com clareza operacional.
            </p>
            <Link 
              href={`/cadastro?plan=PREMIUM&billing=${billingPeriod}`} 
              className={styles.btnBannerLight}
            >
              Testar funcionalidade agora
            </Link>
          </div>

          <div className={styles.blueBannerMockup}>
            <div className={styles.taskCardMock}>
              <div className={styles.taskCardHeader}>
                <Sparkles size={16} color="#0284c7" />
                <span>Tarefas do Dia</span>
              </div>
              <div className={styles.taskItemMock}>
                <div className={styles.checkSquare} />
                <span>Confirmar envio do molde da Coroa (Laboratório)</span>
              </div>
              <div className={styles.taskItemMock}>
                <div className={styles.checkSquare} />
                <span>Validar cirurgia de siso com Dra. Amanda</span>
              </div>
              <div className={styles.taskItemMockDone}>
                <Check size={14} color="#16a34a" />
                <span>Reposição de tubetes anestésicos (2 caixas)</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── NÚMEROS DE IMPACTO ─── */}
      <section className={styles.numbersSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Segurança e robustez comprovadas</h2>
          <p className={styles.sectionSubtitle}>Arquitetura desenhada para apoiar consultórios e policlínicas em expansão.</p>
        </div>

        <div className={styles.numbersGrid}>
          <div className={styles.numberCard}>
            <strong>+450.000</strong>
            <span>Consultas realizadas</span>
          </div>

          <div className={styles.numberCard}>
            <strong>+120.000</strong>
            <span>Prontuários com validação CFO</span>
          </div>

          <div className={styles.numberCard}>
            <strong>99.8%</strong>
            <span>Precisão no controlo fracionado de stock</span>
          </div>
        </div>
      </section>

      {/* ─── TABELA DE PREÇOS (CONVERSÃO COM PARÂMETROS) ─── */}
      <section id="planos" className={styles.pricingSection}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTag}>TABELA TRANSPARENTE</span>
          <h2 className={styles.sectionTitle}>Planos à medida da sua clínica</h2>
          
          <div className={styles.billingToggleWrapper}>
            <div className={styles.billingToggle}>
              <button 
                type="button" 
                onClick={() => setBillingPeriod('monthly')}
                className={`${styles.toggleBtn} ${billingPeriod === 'monthly' ? styles.toggleActive : ''}`}
              >
                Mensal
              </button>
              <button 
                type="button" 
                onClick={() => setBillingPeriod('annual')}
                className={`${styles.toggleBtn} ${billingPeriod === 'annual' ? styles.toggleActive : ''}`}
              >
                Anual <span className={styles.discountBadge}>10% OFF</span>
              </button>
            </div>
            <span className={styles.installmentNote}>
              {billingPeriod === 'annual' ? 'Pagamento anual em até 12x sem juros no cartão' : 'Sem fidelidade contratual'}
            </span>
          </div>
        </div>

        <div className={styles.pricingGrid}>
          {/* 1. PLANO BÁSICO */}
          <div className={styles.pricingCard}>
            <span className={styles.planBadge}>CONSULTÓRIO INDIVIDUAL</span>
            <h3 className={styles.planName}>Básico</h3>
            <p className={styles.planSubtitle}>Agenda clínica, prontuário digital com odontograma e gestão de stock manual.</p>

            <div className={styles.priceContainer}>
              <span className={styles.currency}>R$</span>
              <span className={styles.priceValue}>
                {billingPeriod === 'annual' ? '134,90' : '149,99'}
              </span>
              <span className={styles.period}>/mês</span>
            </div>

            <div className={styles.featuresIncludedBlock}>
              <span className={styles.featuresBlockTitle}>Recursos inclusos:</span>
              <ul className={styles.featureList}>
                <li>
                  <CheckCircle2 size={15} color="#10b981" />
                  <span>1 Agenda / Dentista</span>
                </li>
                <li>
                  <CheckCircle2 size={15} color="#10b981" />
                  <span>Prontuário com Odontograma</span>
                </li>
                <li>
                  <CheckCircle2 size={15} color="#10b981" />
                  <span>Link de pré-cadastro para o paciente</span>
                </li>
                <li>
                  <CheckCircle2 size={15} color="#10b981" />
                  <span>Controlo de estoque manual</span>
                </li>
                <li>
                  <CheckCircle2 size={15} color="#10b981" />
                  <span>Orçamentos e documentos em PDF</span>
                </li>
              </ul>
            </div>

            <Link 
              href={`/cadastro?plan=BASIC&billing=${billingPeriod}`} 
              className={styles.btnPlanOutline}
            >
              Testar 7 dias grátis
            </Link>
          </div>

          {/* 2. PLANO PREMIUM (DESTAQUE) */}
          <div className={`${styles.pricingCard} ${styles.pricingCardFeatured}`}>
            <div className={styles.popularRibbon}>MAIS ESCOLHIDO</div>
            <span className={styles.planBadgeHighlight}>CLÍNICAS & EQUIPES</span>
            <h3 className={styles.planName}>Premium</h3>
            <p className={styles.planSubtitle}>Exit Inteligente de materiais, transcrição por IA e compliance legal CFO/LGPD.</p>

            <div className={styles.priceContainer}>
              <span className={styles.currency}>R$</span>
              <span className={styles.priceValue}>
                {billingPeriod === 'annual' ? '206,90' : '229,99'}
              </span>
              <span className={styles.period}>/mês</span>
            </div>

            <div className={styles.featuresIncludedBlock}>
              <span className={styles.featuresBlockTitle}>Tudo do Básico, mais:</span>
              <ul className={styles.featureList}>
                <li>
                  <CheckCircle2 size={15} color="#0284c7" />
                  <strong>Até 5 Cirurgiões-Dentistas</strong>
                </li>
                <li>
                  <CheckCircle2 size={15} color="#0284c7" />
                  <strong>Exit Inteligente (Baixa fracionada auto)</strong>
                </li>
                <li>
                  <CheckCircle2 size={15} color="#0284c7" />
                  <strong>Transcrição de evolução com IA</strong>
                </li>
                <li>
                  <CheckCircle2 size={15} color="#0284c7" />
                  <span>Trava de segurança legal CFO (24h)</span>
                </li>
                <li>
                  <CheckCircle2 size={15} color="#0284c7" />
                  <span>Gestão de comissões por procedimento</span>
                </li>
                <li>
                  <CheckCircle2 size={15} color="#0284c7" />
                  <span>White-Label com sua marca e cores</span>
                </li>
              </ul>
            </div>

            <Link 
              href={`/cadastro?plan=PREMIUM&billing=${billingPeriod}`} 
              className={styles.btnPlanPrimary}
            >
              Testar 7 dias grátis
            </Link>
          </div>

          {/* 3. PLANO ENTERPRISE */}
          <div className={styles.pricingCard}>
            <div className={styles.enterpriseRibbon}>
              <Crown size={12} /> ALTA ESCALA
            </div>
            <span className={styles.planBadge}>REDES & POLICLÍNICAS</span>
            <h3 className={styles.planName}>Enterprise</h3>
            <p className={styles.planSubtitle}>Baixa dupla na recepção, governança de redes e relatórios executivos avançados.</p>

            <div className={styles.priceContainer}>
              <span className={styles.currency}>R$</span>
              <span className={styles.priceValue}>
                {billingPeriod === 'annual' ? '287,90' : '319,99'}
              </span>
              <span className={styles.period}>/mês</span>
            </div>

            <div className={styles.featuresIncludedBlock}>
              <span className={styles.featuresBlockTitle}>Tudo do Premium, mais:</span>
              <ul className={styles.featureList}>
                <li>
                  <CheckCircle2 size={15} color="#10b981" />
                  <strong>Dentistas e cadeiras ilimitadas</strong>
                </li>
                <li>
                  <CheckCircle2 size={15} color="#10b981" />
                  <span>Trava de idempotência recepção / sala</span>
                </li>
                <li>
                  <CheckCircle2 size={15} color="#10b981" />
                  <span>DRE Executivo & Balancete contínuo</span>
                </li>
                <li>
                  <CheckCircle2 size={15} color="#10b981" />
                  <span>Suporte prioritário via WhatsApp</span>
                </li>
              </ul>
            </div>

            <a 
              href="https://wa.me/5585999999999" 
              target="_blank" 
              rel="noopener noreferrer" 
              className={styles.btnPlanOutline}
            >
              Falar com consultor
            </a>
          </div>
        </div>
      </section>

      {/* ─── FAQ INTERATIVO ─── */}
      <section id="faq" className={styles.faqSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Perguntas frequentes</h2>
          <p className={styles.sectionSubtitle}>Esclarecimentos sobre o ecossistema OdontoFlow.</p>
        </div>

        <div className={styles.faqContainer}>
          {FAQS.map((faq, index) => {
            const isOpen = openFaq === index

            return (
              <div 
                key={index} 
                className={`${styles.faqItem} ${isOpen ? styles.faqItemActive : ''}`}
                onClick={() => setOpenFaq(isOpen ? null : index)}
              >
                <div className={styles.faqQuestion}>
                  <span>{faq.q}</span>
                  {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>
                {isOpen && <p className={styles.faqAnswer}>{faq.a}</p>}
              </div>
            )
          })}
        </div>
      </section>

      {/* ─── FOOTER CLARO E PROFISSIONAL ─── */}
      <footer className={styles.footer}>
        <div className={styles.footerContainer}>
          <div className={styles.footerBrand}>
            <div className={styles.logoGroup}>
              <div className={styles.logoIcon}>
                <Image src={Logo} alt="OdontoFlow" width={22} height={22} />
              </div>
              <span className={styles.brandTitle}>OdontoFlow</span>
            </div>
            <p className={styles.footerTagline}>
              O ecossistema definitivo para a gestão de clínicas e consultórios odontológicos.
            </p>
          </div>

          <div className={styles.footerLinksGroup}>
            <h4>Navegação</h4>
            <a href="#recursos">Recursos</a>
            <a href="#depoimentos">Depoimentos</a>
            <a href="#planos">Planos</a>
            <a href="#faq">Dúvidas</a>
          </div>

          <div className={styles.footerLinksGroup}>
            <h4>Legal & Segurança</h4>
            <Link href="/termos">Termos de Uso</Link>
            <Link href="/privacidade">Privacidade</Link>
            <span>Conformidade CFO / LGPD</span>
            <span>Criptografia de Ponta a Ponta</span>
          </div>
        </div>

        <div className={styles.footerBottom}>
          <div className={styles.footerBottomLeft}>
            <p>
              © {new Date().getFullYear()} <strong>OdontoFlow</strong>. Todos os direitos reservados.
              <span className={styles.creditSeparator}>•</span>
              Uma solução desenvolvida por <span className={styles.creditBrand}>Omnia Tech</span>.
            </p>
          </div>

          <div className={styles.footerBottomBadges}>
            <span className={styles.complianceBadge}>
              <span className={styles.greenDot} /> Conformidade CFO & LGPD
            </span>
            <span className={styles.complianceBadge}>Criptografia Ativa</span>
          </div>

          <div className={styles.footerBottomLinks}>
            <Link href="/termos">Termos</Link>
            <Link href="/privacidade">Privacidade</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}