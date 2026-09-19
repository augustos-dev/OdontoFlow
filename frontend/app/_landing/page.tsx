'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { 
  CheckCircle2, 
  ArrowRight, 
  ShieldCheck, 
  PackageCheck, 
  TrendingUp, 
  Sparkles, 
  ChevronDown, 
  ChevronUp, 
  Stethoscope, 
  Layers, 
  Lock, 
  Building2, 
  Crown, 
  Info, 
  Bot, 
  FileCheck, 
  Link2, 
  Percent 
} from 'lucide-react'
import Logo from '../../public/logo.svg'
import styles from './landing.module.css'

const FAQS = [
  {
    q: 'Como funciona a dedução automática de stock (Exit Inteligente)?',
    a: 'Ao associar insumos a uma Ficha Técnica (ex: 0,2g de resina ou 1 dose anestésica), o sistema efetua o fracionamento proporcional e debita as quantidades em tempo real assim que o dentista encerra o atendimento na sala clínica.',
  },
  {
    q: 'Como funciona a conformidade com o CFO e a LGPD?',
    a: 'Evoluções clínicas possuem assinatura com carimbo temporal e sofrem trava automática de imutabilidade após a janela de 24 horas. Retificações posteriores exigem justificativa formal que fica gravada na trilha de auditoria (AuditLog).',
  },
  {
    q: 'O que é o link de cadastro prévio para o paciente?',
    a: 'A sua clínica gera um link exclusivo para envio via WhatsApp. O paciente preenche a anamnese e os dados de identificação a partir do telemóvel antes de chegar ao consultório, adiantando a receção.',
  },
  {
    q: 'Como o OdontoFlow calcula as comissões dos profissionais?',
    a: 'O sistema calcula o repasse percentual ou fixo do cirurgião-dentista com base no valor líquido real, permitindo descontar automaticamente o custo fracionado dos materiais consumidos no procedimento.',
  },
]

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('annual')

  return (
    <div className={styles.wrapper}>
      {/* ─── NAVBAR ─── */}
      <header className={styles.navbar}>
        <div className={styles.navContainer}>
          <div className={styles.logoGroup}>
            <div className={styles.logoIcon}>
              <Image src={Logo} alt="OdontoFlow" width={22} height={22} />
            </div>
            <div className={styles.logoText}>
              <span className={styles.brandTitle}>OdontoFlow</span>
              <span className={styles.brandSubtitle}>GESTÃO CLÍNICA INTELIGENTE</span>
            </div>
          </div>

          <nav className={styles.navLinks}>
            <a href="#funcionalidades" className={styles.navLink}>Recursos</a>
            <a href="#planos" className={styles.navLink}>Preços</a>
            <a href="#faq" className={styles.navLink}>Dúvidas Frequentes</a>
          </nav>

          <div className={styles.navActions}>
            <Link href="/login" className={styles.btnLogin}>
              Entrar
            </Link>
            <a href="#planos" className={styles.btnCtaNav}>
              <span>Testar 7 dias grátis</span>
              <ArrowRight size={14} />
            </a>
          </div>
        </div>
      </header>

      {/* ─── HERO SECTION ─── */}
      <section className={styles.heroSection}>
        <div className={styles.heroContainer}>
          <div className={styles.pillBadge}>
            <Sparkles size={14} />
            <span>Plataforma SaaS Odontológica Completa & Multi-Tenant</span>
          </div>

          <h1 className={styles.heroTitle}>
            Gestão clínica sem complexidade: <br />
            <span className={styles.textGradient}>do atendimento à margem líquida real.</span>
          </h1>

          <p className={styles.heroDescription}>
            Fichas clínicas com inteligência artificial, dedução inteligente de insumos fracionados, agendamento interativo com link para o paciente e conformidade legal rigorosa com o CFO e a LGPD.
          </p>

          <div className={styles.heroActions}>
            <a href="#planos" className={styles.btnHeroPrimary}>
              <span>Testar 7 dias grátis</span>
              <ArrowRight size={16} />
            </a>
            <a href="#funcionalidades" className={styles.btnHeroSecondary}>
              Ver tabela comparativa
            </a>
          </div>

          <div className={styles.heroSocialProof}>
            <div className={styles.proofItem}>
              <Lock size={15} color="#06b6d4" />
              <span>Trava Imutável CFO 24h</span>
            </div>
            <div className={styles.proofDot} />
            <div className={styles.proofItem}>
              <PackageCheck size={15} color="#10b981" />
              <span>Exit Inteligente (g, ml, doses)</span>
            </div>
            <div className={styles.proofDot} />
            <div className={styles.proofItem}>
              <Bot size={15} color="#38bdf8" />
              <span>Evolução Clínica com IA</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── PREVIEW / SHOWCASE ─── */}
      <section className={styles.previewSection}>
        <div className={styles.previewContainer}>
          <div className={styles.previewCard}>
            <div className={styles.browserHeader}>
              <div className={styles.browserDots}>
                <span />
                <span />
                <span />
              </div>
              <div className={styles.browserAddress}>
                app.odontoflow.com.br/consultorio
              </div>
            </div>

            <div className={styles.previewInnerGrid}>
              <div className={styles.previewMetricMini}>
                <span>MOTOR DE INSUMOS</span>
                <strong>Exit Inteligente Ativo</strong>
                <small className={styles.cyanText}>Baixa fracionada de resinas e anestésicos</small>
              </div>

              <div className={styles.previewMetricMini}>
                <span>CONFORMIDADE REGULATÓRIA</span>
                <strong>Trava CFO 24 Horas</strong>
                <small className={styles.greenText}>Imutabilidade com carimbo digital</small>
              </div>

              <div className={styles.previewMetricMini}>
                <span>REPASSE DE COMISSÕES</span>
                <strong>Margem Operacional Real</strong>
                <small className={styles.blueText}>Custos de materiais deduzidos do líquido</small>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── RECURSOS EM DESTAQUE ─── */}
      <section id="funcionalidades" className={styles.featuresSection}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionSub}>FUNCIONALIDADES DO SISTEMA</span>
          <h2 className={styles.sectionTitle}>Tecnologia desenhada para a rotina odontológica</h2>
          <p className={styles.sectionDesc}>
            Recursos projetados para eliminar atritos operacionais no consultório e na receção.
          </p>
        </div>

        <div className={styles.featuresGrid}>
          <div className={styles.featureCard}>
            <div className={styles.featureIconBg}>
              <PackageCheck size={22} color="#06b6d4" />
            </div>
            <h3>Exit Inteligente de Estoque</h3>
            <p>
              Abatimento fracionado com conversão de embalagem (caixas para tubetes, seringas para gramas ou mililitros). As baixas ocorrem automaticamente ao encerrar a evolução clínica.
            </p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIconBg}>
              <Bot size={22} color="#38bdf8" />
            </div>
            <h3>Transcrição de Evolução com IA</h3>
            <p>
              Dite o atendimento com linguagem clínica natural e a inteligência artificial estrutura o prontuário, organiza queixas, condutas e prescrições.
            </p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIconBg}>
              <Link2 size={22} color="#10b981" />
            </div>
            <h3>Link de Pré-Cadastro & Anamnese</h3>
            <p>
              Envie um link pelo WhatsApp para o paciente preencher os dados de cadastro e histórico de saúde antes mesmo de sair de casa.
            </p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIconBg}>
              <Percent size={22} color="#f59e0b" />
            </div>
            <h3>Gestão de Comissões Cirúrgicas</h3>
            <p>
              Defina comissões com base no lucro líquido real. O sistema confronta honorários com os insumos consumidos na cadeira.
            </p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIconBg}>
              <ShieldCheck size={22} color="#0284c7" />
            </div>
            <h3>Trava Jurídica CFO (24h)</h3>
            <p>
              Garantia de conformidade legal. Registos clínicos são trancados após a janela regulamentar, exigindo justificativa auditada para qualquer retificação.
            </p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIconBg}>
              <Layers size={22} color="#8b5cf6" />
            </div>
            <h3>White-Label Completo</h3>
            <p>
              Identidade visual sob medida. Aplique o logotipo da clínica, paleta de cores e tipografia no portal e nos documentos gerados.
            </p>
          </div>
        </div>
      </section>

      {/* ─── TABELA DE PREÇOS (INSPIRAÇÃO CODENTAL + MATRIZ ODONTOFLOW) ─── */}
      <section id="planos" className={styles.pricingSection}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionSub}>PLANOS FLEXÍVEIS</span>
          <h2 className={styles.sectionTitle}>Escolha o plano ideal para a sua estrutura</h2>

          <div className={styles.billingToggleWrapper}>
            <div className={styles.billingToggle}>
              <button 
                type="button" 
                onClick={() => setBillingPeriod('monthly')}
                className={`${styles.toggleBtn} ${billingPeriod === 'monthly' ? styles.toggleActive : ''}`}
              >
                Mensal[cite: 14]
              </button>
              <button 
                type="button" 
                onClick={() => setBillingPeriod('annual')}
                className={`${styles.toggleBtn} ${billingPeriod === 'annual' ? styles.toggleActive : ''}`}
              >
                Anual <span className={styles.discountBadge}>10% OFF</span>[cite: 16, 17]
              </button>
            </div>
            <span className={styles.installmentNote}>
              {billingPeriod === 'annual' ? 'Pagamento anual em até 12x sem juros no cartão' : 'Sem fidelidade contratual'}[cite: 16, 17]
            </span>
          </div>
        </div>

        <div className={styles.pricingGrid}>
          {/* 1. PLANO ESSENCIAL */}
          <div className={styles.pricingCard}>
            <span className={styles.planBadge}>CONSULTÓRIO INDIVIDUAL[cite: 14]</span>
            <h3 className={styles.planName}>Essencial[cite: 14, 18]</h3>
            <p className={styles.planSubtitle}>Tudo o que precisa para organizar agendamentos, prontuários digitais e orçamentos.</p>

            <div className={styles.priceContainer}>
              <span className={styles.currency}>R$</span>
              <span className={styles.priceValue}>
                {billingPeriod === 'annual' ? '134,90' : '149,99'}
              </span>
              <span className={styles.period}>/mês</span>
            </div>

            <div className={styles.featuresIncludedBlock}>
              <span className={styles.featuresBlockTitle}>Recursos inclusos:[cite: 18]</span>
              <ul className={styles.featureList}>
                <li>
                  <CheckCircle2 size={15} color="#10b981" />
                  <span>1 Agenda / Dentista[cite: 18]</span>
                </li>
                <li>
                  <CheckCircle2 size={15} color="#10b981" />
                  <span>Prontuário digital & Odontograma[cite: 18]</span>
                </li>
                <li>
                  <CheckCircle2 size={15} color="#10b981" />
                  <span>Anamnese inteligente[cite: 18]</span>
                </li>
                <li>
                  <CheckCircle2 size={15} color="#10b981" />
                  <span>Link de pré-cadastro para o paciente[cite: 16]</span>
                  <span className={styles.infoTooltip} title="O paciente preenche os dados cadastrais antes da consulta.">i</span>[cite: 16, 17, 18]
                </li>
                <li>
                  <CheckCircle2 size={15} color="#10b981" />
                  <span>Emissão de receitas, docs e atestados[cite: 18]</span>
                </li>
                <li>
                  <CheckCircle2 size={15} color="#10b981" />
                  <span>Controlo financeiro e de recebíveis[cite: 18]</span>
                </li>
                <li>
                  <CheckCircle2 size={15} color="#10b981" />
                  <span>Upload de exames e radiografias[cite: 18]</span>
                </li>
              </ul>
            </div>

            <Link href="/login" className={styles.btnPlanOutline}>
              Testar 7 dias grátis →[cite: 16, 17, 18]
            </Link>
          </div>

          {/* 2. PLANO CLÍNICA PRO (DESTAQUE) */}
          <div className={`${styles.pricingCard} ${styles.pricingCardFeatured}`}>
            <div className={styles.popularRibbon}>MAIS ESCOLHIDO[cite: 14]</div>
            <span className={styles.planBadgeHighlight}>CLÍNICAS EM CRESCIMENTO[cite: 14]</span>
            <h3 className={styles.planName}>Clínica Pro[cite: 14]</h3>
            <p className={styles.planSubtitle}>Exit Inteligente de materiais, transcrição por IA e gestão de comissões cirúrgicas[cite: 16].</p>

            <div className={styles.priceContainer}>
              <span className={styles.currency}>R$</span>
              <span className={styles.priceValue}>
                {billingPeriod === 'annual' ? '206,90' : '229,99'}
              </span>
              <span className={styles.period}>/mês</span>
            </div>

            <div className={styles.featuresIncludedBlock}>
              <span className={styles.featuresBlockTitle}>Recursos do Essencial, mais:[cite: 16, 17]</span>
              <ul className={styles.featureList}>
                <li>
                  <CheckCircle2 size={15} color="#06b6d4" />
                  <strong>Até 5 Cirurgiões-Dentistas[cite: 14]</strong>
                </li>
                <li>
                  <CheckCircle2 size={15} color="#06b6d4" />
                  <strong>Exit Inteligente (Dedução fracionada)[cite: 14]</strong>
                  <span className={styles.infoTooltip} title="Debita gramas, doses e mililitros direto na evolução clínica.">i</span>[cite: 16, 17, 18]
                </li>
                <li>
                  <CheckCircle2 size={15} color="#06b6d4" />
                  <strong>Transcrição de evolução com IA[cite: 16]</strong>
                  <span className={styles.infoTooltip} title="Estruturação do prontuário por voz com inteligência artificial.">i</span>[cite: 16, 17, 18]
                </li>
                <li>
                  <CheckCircle2 size={15} color="#06b6d4" />
                  <span>Gestão de comissões por procedimento[cite: 16]</span>
                </li>
                <li>
                  <CheckCircle2 size={15} color="#06b6d4" />
                  <span>Trava legal temporal CFO de 24 horas</span>
                  <span className={styles.infoTooltip} title="Conformidade estrita contra adulterações retroativas em prontuários.">i</span>[cite: 16, 17, 18]
                </li>
                <li>
                  <CheckCircle2 size={15} color="#06b6d4" />
                  <span>White-Label Completo (Cores & Logotipo)[cite: 14]</span>
                </li>
                <li>
                  <CheckCircle2 size={15} color="#06b6d4" />
                  <span>Prescrição com assinatura digitalizada[cite: 17]</span>
                </li>
              </ul>
            </div>

            <Link href="/login" className={styles.btnPlanPrimary}>
              Testar 7 dias grátis →[cite: 16, 17, 18]
            </Link>
          </div>

          {/* 3. PLANO ENTERPRISE */}
          <div className={styles.pricingCard}>
            <div className={styles.enterpriseRibbon}>
              <Crown size={12} /> REDES & POLICLÍNICAS
            </div>
            <span className={styles.planBadge}>MÚLTIPLAS UNIDADES</span>
            <h3 className={styles.planName}>Enterprise</h3>
            <p className={styles.planSubtitle}>Solução para clínicas de grande volume que exigem auditoria avançada e suporte prioritário.</p>

            <div className={styles.priceContainer}>
              <span className={styles.currency}>R$</span>
              <span className={styles.priceValue}>
                {billingPeriod === 'annual' ? '287,90' : '319,99'}
              </span>
              <span className={styles.period}>/mês</span>
            </div>

            <div className={styles.featuresIncludedBlock}>
              <span className={styles.featuresBlockTitle}>Recursos do Clínica Pro, mais:[cite: 16]</span>
              <ul className={styles.featureList}>
                <li>
                  <CheckCircle2 size={15} color="#10b981" />
                  <strong>Agendas ilimitadas[cite: 16]</strong>
                </li>
                <li>
                  <CheckCircle2 size={15} color="#10b981" />
                  <span>Trava de idempotência sala/receção</span>
                  <span className={styles.infoTooltip} title="Evita baixas financeiras e de insumos duplicadas no mesmo agendamento.">i</span>[cite: 16, 17, 18]
                </li>
                <li>
                  <CheckCircle2 size={15} color="#10b981" />
                  <span>DRE Executivo & Balancete contínuo</span>
                </li>
                <li>
                  <CheckCircle2 size={15} color="#10b981" />
                  <span>Módulo multi-filiais integrado</span>
                </li>
                <li>
                  <CheckCircle2 size={15} color="#10b981" />
                  <span>Suporte prioritário dedicado via WhatsApp</span>
                </li>
              </ul>
            </div>

            <Link href="/login" className={styles.btnPlanOutline}>
              Falar com Consultor
            </Link>
          </div>
        </div>
      </section>

      {/* ─── FAQ INTERATIVO ─── */}
      <section id="faq" className={styles.faqSection}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionSub}>TIRA-DÚVIDAS</span>
          <h2 className={styles.sectionTitle}>Perguntas frequentes</h2>
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

      {/* ─── FOOTER ─── */}
      <footer className={styles.footer}>
        <div className={styles.footerContainer}>
          <div className={styles.footerBrand}>
            <div className={styles.logoGroup}>
              <div className={styles.logoIcon}>
                <Image src={Logo} alt="OdontoFlow" width={20} height={20} />
              </div>
              <span className={styles.brandTitle}>OdontoFlow</span>
            </div>
            <p className={styles.footerTagline}>
              SaaS B2B Multi-tenant de Gerenciamento Clínico Odontológico.
            </p>
          </div>

          <div className={styles.footerLinksGroup}>
            <h4>Navegação</h4>
            <a href="#funcionalidades">Recursos</a>
            <a href="#planos">Planos & Preços</a>
            <a href="#faq">Dúvidas Frequentes</a>
          </div>

          <div className={styles.footerLinksGroup}>
            <h4>Segurança & Legal</h4>
            <span>Conformidade CFO & LGPD</span>
            <span>Criptografia de Ponta a Ponta</span>
          </div>
        </div>

        <div className={styles.footerBottom}>
          <p>© {new Date().getFullYear()} OdontoFlow. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  )
}