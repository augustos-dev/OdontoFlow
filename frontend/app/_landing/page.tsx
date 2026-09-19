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
  Crown
} from 'lucide-react'
import Logo from '../../public/logo.svg'
import styles from './landing.module.css'

const FAQS = [
  {
    q: 'Como funciona a dedução automática de estoque (Exit Inteligente)?',
    a: 'Ao vincular insumos à Ficha Técnica de um procedimento (ex: 0,2g de resina ou 1 dose anestésica), o sistema efetua o fracionamento proporcional e debita as quantidades em segundo plano no exato instante em que o dentista conclui o atendimento ou evolução clínica.',
  },
  {
    q: 'Como funciona a conformidade jurídica com o CFO e LGPD?',
    a: 'Evoluções clínicas possuem assinatura com carimbo temporal e sofrem trava automática de imutabilidade após a janela de 24 horas. Qualquer retificação clínica posterior requer justificativa textual obrigatória gravada na trilha de auditoria (AuditLog).',
  },
  {
    q: 'O que muda na White-Label do OdontoFlow?',
    a: 'A sua clínica assume a interface: paleta primária, cores de destaque, fontes e logotipo oficial são incorporados via variáveis CSS personalizadas nos orçamentos, dashboard e fichas técnicas.',
  },
  {
    q: 'Existe mecanismo contra duplicidade de baixa entre recepção e consultório?',
    a: 'Sim. Implementamos trava de idempotência com chave atômica por consulta (appointmentId). Se o dentista lançar o procedimento na cadeira com Exit Inteligente, a recepção é bloqueada de duplicar a dedução financeira e de insumos ao receber o paciente.',
  },
]

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('annual')

  return (
    <div className={styles.wrapper}>
      {/* ─── NAVBAR PÚBLICA ─── */}
      <header className={styles.navbar}>
        <div className={styles.navContainer}>
          <div className={styles.logoGroup}>
            <div className={styles.logoIcon}>
              <Image src={Logo} alt="OdontoFlow" width={22} height={22} />
            </div>
            <div className={styles.logoText}>
              <span className={styles.brandTitle}>OdontoFlow</span>
              <span className={styles.brandSubtitle}>PLATAFORMA SAAS B2B</span>
            </div>
          </div>

          <nav className={styles.navLinks}>
            <a href="#funcionalidades" className={styles.navLink}>Recursos</a>
            <a href="#compliance" className={styles.navLink}>Compliance CFO</a>
            <a href="#planos" className={styles.navLink}>Planos</a>
            <a href="#faq" className={styles.navLink}>FAQ</a>
          </nav>

          <div className={styles.navActions}>
            <Link href="/login" className={styles.btnLogin}>
              Entrar
            </Link>
            <Link href="/login" className={styles.btnCtaNav}>
              <span>Acessar Demo</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </header>

      {/* ─── HERO SECTION ─── */}
      <section className={styles.heroSection}>
        <div className={styles.heroContainer}>
          <div className={styles.pillBadge}>
            <Sparkles size={14} />
            <span>SaaS B2B Multi-tenant de Alta Performance</span>
          </div>

          <h1 className={styles.heroTitle}>
            Gestão clínica odontológica com <br />
            <span className={styles.textGradient}>Exit Inteligente & Lucratividade Real</span>
          </h1>

          <p className={styles.heroDescription}>
            Automatize baixas fracionadas de estoque por procedimento, audite o DRE em tempo real e mantenha prontuários em conformidade estrita com as normas do CFO e LGPD.
          </p>

          <div className={styles.heroActions}>
            <a href="#planos" className={styles.btnHeroPrimary}>
              <span>Ver Planos & Assinaturas</span>
              <ArrowRight size={16} />
            </a>
            <a href="#funcionalidades" className={styles.btnHeroSecondary}>
              Conhecer a Arquitetura
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
              <span>Fracionamento (g, ml, doses)</span>
            </div>
            <div className={styles.proofDot} />
            <div className={styles.proofItem}>
              <Layers size={15} color="#06b6d4" />
              <span>Multi-Tenant & White-Label</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── SHOWCASE TÉCNICO ─── */}
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
                app.odontoflow.com.br/estoque
              </div>
            </div>

            <div className={styles.previewInnerGrid}>
              <div className={styles.previewMetricMini}>
                <span>MOTOR DE ESTOQUE</span>
                <strong>EXIT_AUTO Ativo</strong>
                <small className={styles.cyanText}>Dedução fracionada por Ficha Técnica</small>
              </div>

              <div className={styles.previewMetricMini}>
                <span>GOVERNANÇA CFO / LGPD</span>
                <strong>24h Lock Temporal</strong>
                <small className={styles.greenText}>Evoluções protegidas contra edição</small>
              </div>

              <div className={styles.previewMetricMini}>
                <span>FINANCEIRO ANALÍTICO</span>
                <strong>Margem Real BRL</strong>
                <small className={styles.blueText}>DRE discriminado por cadeira clínica</small>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── PILARES FUNCIONAIS ─── */}
      <section id="funcionalidades" className={styles.featuresSection}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionSub}>ENGENHARIA CLÍNICA</span>
          <h2 className={styles.sectionTitle}>Feito para eliminar gargalos da rotina odontológica</h2>
          <p className={styles.sectionDesc}>
            Elimine inconsistências de almoxarifado, cálculos manuais de seringas e orçamentos sem previsão de custo operacional.
          </p>
        </div>

        <div className={styles.featuresGrid}>
          <div className={styles.featureCard}>
            <div className={styles.featureIconBg}>
              <PackageCheck size={22} color="#06b6d4" />
            </div>
            <h3>Exit Inteligente Fracionado</h3>
            <p>
              Cadastre insumos em caixas, gramas (g), mililitros (ml) ou doses. Ao concluir restaurações ou raspagens, o estoque é recalculado com precisão milimétrica.
            </p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIconBg}>
              <TrendingUp size={22} color="#10b981" />
            </div>
            <h3>DRE & Margem de Contribuição</h3>
            <p>
              Preço de venda confrontado com o custo direto dos insumos consumidos. Saiba o lucro líquido de cada cadeira e cirurgião em moeda nacional (BRL).
            </p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIconBg}>
              <ShieldCheck size={22} color="#0284c7" />
            </div>
            <h3>Conformidade CFO & Trilha Auditada</h3>
            <p>
              Prontuários eletrônicos com trava imutável após 24 horas. Auditoria completa (AuditLog) de criação, exclusão, acessos e alterações com registro de IP.
            </p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIconBg}>
              <Stethoscope size={22} color="#8b5cf6" />
            </div>
            <h3>Sala do Cirurgião-Dentista</h3>
            <p>
              Visão limpa da fila do dia. Chame o paciente, abra o odontograma, descreva a evolução clínica e finalize com baixa de estoque num único fluxo.
            </p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIconBg}>
              <Layers size={22} color="#06b6d4" />
            </div>
            <h3>White-Label Completo</h3>
            <p>
              Multi-tenancy nativo com injeção dinâmica de CSS: a clínica utiliza o próprio logotipo, nome empresarial e paleta de cores institucional.
            </p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIconBg}>
              <Building2 size={22} color="#f59e0b" />
            </div>
            <h3>Gestão Multi-Unidades</h3>
            <p>
              Pronto para redes e franquias. Separe filiais por clinicId ou isole instâncias corporativas dedicadas com escalabilidade nativa.
            </p>
          </div>
        </div>
      </section>

      {/* ─── TABELA DE PREÇOS / PLANOS (OFICIAL FASE 15) ─── */}
      <section id="planos" className={styles.pricingSection}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionSub}>INVESTIMENTO TRANSPARENTE</span>
          <h2 className={styles.sectionTitle}>Planos à medida do tamanho da sua clínica[cite: 14]</h2>
          
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
              Anual <span className={styles.discountBadge}>2 Meses Grátis</span>[cite: 14]
            </button>
          </div>
        </div>

        <div className={styles.pricingGrid}>
          {/* 1. PLANO BÁSICO */}
          <div className={styles.pricingCard}>
            <span className={styles.planBadge}>CONSULTÓRIOS INDIVIDUAIS[cite: 14]</span>
            <h3 className={styles.planName}>Básico</h3>
            <p className={styles.planSubtitle}>Agenda integrada, prontuário digital com odontograma e gestão de estoque manual.</p>

            <div className={styles.priceContainer}>
              <span className={styles.currency}>R$</span>
              <span className={styles.priceValue}>
                {billingPeriod === 'annual' ? '124,99' : '149,99'}
              </span>
              <span className={styles.period}>/mês</span>
            </div>

            <ul className={styles.featureList}>
              <li><CheckCircle2 size={16} color="#10b981" /> 1 Cirurgião-Dentista</li>
              <li><CheckCircle2 size={16} color="#10b981" /> Agenda Clínica por Sala & Horário</li>
              <li><CheckCircle2 size={16} color="#10b981" /> Prontuário Eletrônico & Odontograma</li>
              <li><CheckCircle2 size={16} color="#10b981" /> Gestão de Estoque e Insumos Manual</li>
              <li><CheckCircle2 size={16} color="#10b981" /> Emissão de Orçamentos em PDF</li>
            </ul>

            <Link href="/login" className={styles.btnPlanOutline}>
              Assinar Plano Básico
            </Link>
          </div>

          {/* 2. PLANO PREMIUM (DESTAQUE) */}
          <div className={`${styles.pricingCard} ${styles.pricingCardFeatured}`}>
            <div className={styles.popularRibbon}>MAIS ESCOLHIDO[cite: 14]</div>
            <span className={styles.planBadgeHighlight}>CLÍNICAS & EQUIPAS[cite: 14]</span>
            <h3 className={styles.planName}>Premium</h3>
            <p className={styles.planSubtitle}>Exit Inteligente na evolução, conversão de embalagem e compliance integral CFO/LGPD.</p>

            <div className={styles.priceContainer}>
              <span className={styles.currency}>R$</span>
              <span className={styles.priceValue}>
                {billingPeriod === 'annual' ? '189,99' : '229,99'}
              </span>
              <span className={styles.period}>/mês</span>
            </div>

            <ul className={styles.featureList}>
              <li><CheckCircle2 size={16} color="#06b6d4" /> <strong>Até 5 Cirurgiões-Dentistas</strong></li>
              <li><CheckCircle2 size={16} color="#06b6d4" /> <strong>Exit Inteligente de Estoque (Baixa Automática)</strong></li>
              <li><CheckCircle2 size={16} color="#06b6d4" /> <strong>Fracionamento Universal (g, ml, doses, cx)</strong></li>
              <li><CheckCircle2 size={16} color="#06b6d4" /> <strong>Trava de Imutabilidade CFO (Janela de 24h)</strong></li>
              <li><CheckCircle2 size={16} color="#06b6d4" /> White-Label Dinâmico (Sua Marca & Cores)</li>
              <li><CheckCircle2 size={16} color="#06b6d4" /> Trilha de Auditoria (AuditLog por IP)</li>
            </ul>

            <Link href="/login" className={styles.btnPlanPrimary}>
              Experimentar 14 Dias Grátis[cite: 14]
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
                {billingPeriod === 'annual' ? '269,99' : '319,99'}
              </span>
              <span className={styles.period}>/mês</span>
            </div>

            <ul className={styles.featureList}>
              <li><CheckCircle2 size={16} color="#10b981" /> <strong>Dentistas e Cadeiras Ilimitadas</strong></li>
              <li><CheckCircle2 size={16} color="#10b981" /> <strong>Trava de Idempotência Recepção / Sala</strong></li>
              <li><CheckCircle2 size={16} color="#10b981" /> DRE Executivo & Fluxo de Caixa Preditivo</li>
              <li><CheckCircle2 size={16} color="#10b981" /> Gestão Multi-Filiais (Add-on Unidades)</li>
              <li><CheckCircle2 size={16} color="#10b981" /> Suporte Prioritário Direto via WhatsApp</li>
            </ul>

            <Link href="/login" className={styles.btnPlanOutline}>
              Falar com Consultor
            </Link>
          </div>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section id="faq" className={styles.faqSection}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionSub}>DÚVIDAS FREQUENTES</span>
          <h2 className={styles.sectionTitle}>Perguntas Respondidas</h2>
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
            <a href="#planos">Tabela de Preços</a>
            <a href="#faq">Perguntas Frequentes</a>
          </div>

          <div className={styles.footerLinksGroup}>
            <h4>SaaS Engine</h4>
            <Link href="/login">Portal da Clínica</Link>
            <a href="https://odontoflow-bbcl.onrender.com/docs" target="_blank" rel="noopener noreferrer">
              Documentação API Swagger
            </a>
          </div>
        </div>

        <div className={styles.footerBottom}>
          <p>© {new Date().getFullYear()} OdontoFlow. Todos os direitos reservados.</p>
          <div className={styles.footerLegal}>
            <span>LGPD & CFO Compliant</span>
            <span>Ambiente Criptografado</span>
          </div>
        </div>
      </footer>
    </div>
  )
}