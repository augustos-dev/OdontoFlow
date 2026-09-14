'use client'

import { useState } from 'react'
import { 
  TrendingUp, 
  AlertCircle, 
  CheckCircle2, 
  Sparkles, 
  Calendar, 
  ArrowUpRight,
  ShieldCheck,
  Zap,
  Target,
  FileSpreadsheet
} from 'lucide-react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import styles from './dre.module.css'

// ─── Dados Mockados de Projeção (Histórico Real + Previsão de 3 Meses) ───
const MOCK_PROJECTION_DATA = [
  { month: 'Mai', realizado: 18500, projetado: null, custos: 6200, novosPacientes: 24 },
  { month: 'Jun', realizado: 21200, projetado: null, custos: 7100, novosPacientes: 29 },
  { month: 'Jul', realizado: 24800, projetado: null, custos: 8400, novosPacientes: 35 },
  { month: 'Ago', realizado: 26500, projetado: null, custos: 8900, novosPacientes: 38 },
  { month: 'Set (Atual)', realizado: 29800, projetado: 29800, custos: 9800, novosPacientes: 42 },
  { month: 'Out (Proj.)', realizado: null, projetado: 34200, custos: 11200, novosPacientes: 49 },
  { month: 'Nov (Proj.)', realizado: null, projetado: 38900, custos: 12400, novosPacientes: 55 },
  { month: 'Dez (Proj.)', realizado: null, projetado: 45000, custos: 14100, novosPacientes: 64 },
]

// ─── Dados de Distribuição de Custos (Donut) ───
const MOCK_COST_BREAKDOWN = [
  { name: 'Insumos & Dentais', value: 9800, color: '#06b6d4' },
  { name: 'Ocupação & Aluguel', value: 4500, color: '#3b82f6' },
  { name: 'Marketing & Tráfego', value: 2800, color: '#8b5cf6' },
  { name: 'Equipe & Pró-labore', value: 5200, color: '#f59e0b' },
]

export default function DreDashboardView() {
  const [period, setPeriod] = useState('CURRENT_MONTH')
  const [growthRate] = useState(14.8) // Taxa de crescimento projetada (%)

  function formatCurrency(val: number) {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  return (
    <>
    <div className={styles.aiInsightCard}>
  <div className={styles.aiHeader}>
    <div className={styles.aiTitle}>
      <Sparkles size={16} className={styles.sparkleIcon} />
      <span>Copiloto Estratégico Omnia AI</span>
    </div>
    <span className={styles.aiBadge}>Análise em Tempo Real</span>
  </div>
  
  <p className={styles.aiText}>
    Com base na média de <strong>42 novos tratamentos</strong> e retenção atual de <strong>67%</strong>, sua clínica atingirá o ponto de equilíbrio no dia <strong>18 deste mês</strong>. 
    A maior oportunidade de expansão está em <strong>Ortodontia</strong>, que responde por 41% da receita com menor consumo de insumos diretos.
  </p>

  <div className={styles.aiActions}>
    <span className={styles.aiActionItem}>💡 Ação recomendada: Renegociar lote com fornecedor Dental Cremer</span>
  </div>
</div>
    <div className={styles.dreContainer}>
      {/* ─── Header Estratégico com Badge de Saúde Fiscal ─── */}
      <div className={styles.topExecutiveBar}>
        <div>
          <div className={styles.titleWithBadge}>
            <h2 className={styles.pageTitle}>Demonstrativo Contábil & Projeção Preditiva</h2>
            <span className={styles.healthBadge}>
              <ShieldCheck size={14} /> Saúde Fiscal: Excelente (Score 9.4/10)
            </span>
          </div>
          <p className={styles.pageSubtitle}>
            DRE consolidado com algoritmo preditivo de fluxo de caixa baseado na adesão de novos planos odontológicos.
          </p>
        </div>

        <div className={styles.toolbar}>
          <div className={styles.selectWrapper}>
            <Calendar size={13} className={styles.selectIcon} />
            <select 
              value={period} 
              onChange={(e) => setPeriod(e.target.value)}
              className={styles.periodSelect}
            >
              <option value="CURRENT_MONTH">Mês Atual (Setembro)</option>
              <option value="LAST_MONTH">Mês Anterior (Agosto)</option>
              <option value="YEAR">Exercício Fiscal Anual (2026)</option>
            </select>
          </div>

          <button type="button" className={styles.btnExport}>
            <FileSpreadsheet size={15} />
            <span>Exportar Relatório</span>
          </button>
        </div>
      </div>

      {/* ─── 4 Indicadores Executivos Preditivos ─── */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiLabel}>MARGEM DE CONTRIBUIÇÃO</span>
            <span className={styles.tagGreen}>67.1%</span>
          </div>
          <h3 className={styles.kpiValue}>R$ 20.000,00</h3>
          <p className={styles.kpiSub}>Retenção líquida pós-insumos e custos clínicos</p>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiLabel}>EBITDA OPERACIONAL</span>
            <span className={styles.tagCyan}>Superávit</span>
          </div>
          <h3 className={`${styles.kpiValue} ${styles.textGreen}`}>R$ 7.500,00</h3>
          <p className={styles.kpiSub}>Lucro real antes de amortizações e impostos</p>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiLabel}>PROJEÇÃO PRÓXIMO TRIMESTRE</span>
            <span className={styles.tagTrend}>
              <ArrowUpRight size={12} /> +{growthRate}%
            </span>
          </div>
          <h3 className={`${styles.kpiValue} ${styles.textPrimary}`}>R$ 128.100,00</h3>
          <p className={styles.kpiSub}>Estimativa baseada em +168 novos tratamentos</p>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiLabel}>RUNWAY & LIQUIDEZ</span>
            <span className={styles.tagGreen}>Seguro</span>
          </div>
          <h3 className={styles.kpiValue}>4.8 Meses</h3>
          <p className={styles.kpiSub}>Tempo de sobrevida operacional sem novas receitas</p>
        </div>
      </div>

      {/* ─── Grid de Gráficos Avançados (Projeção + Composição de Custos) ─── */}
      <div className={styles.chartsGrid}>
        {/* Gráfico 1: Forecast de Crescimento (Realizado vs Projetado) */}
        <div className={styles.chartCardLarge}>
          <div className={styles.cardHeader}>
            <div>
              <div className={styles.headerWithIcon}>
                <Sparkles size={16} color="#06b6d4" />
                <h3 className={styles.cardTitle}>Projeção Preditiva de Receitas (Forecast Contábil)</h3>
              </div>
              <p className={styles.cardSubtitle}>
                Valores consolidados até o mês atual seguidos pela projeção com intervalo de confiança.
              </p>
            </div>
            <div className={styles.legendIndicator}>
              <span className={styles.dotRealizado} /> Histórico Real
              <span className={styles.dotProjetado} /> Projeção Preditiva
            </div>
          </div>

          <div className={styles.chartWrapper}>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={MOCK_PROJECTION_DATA} margin={{ top: 12, right: 16, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRealizado" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorProjetado" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="month" 
                  tickLine={false} 
                  axisLine={{ stroke: '#e2e8f0' }} 
                  tick={{ fill: '#64748b', fontSize: 11 }} 
                />
                <YAxis 
                  tickLine={false} 
                  axisLine={false} 
                  tick={{ fill: '#64748b', fontSize: 11 }} 
                  tickFormatter={(val) => `${val / 1000}k`}
                />
                <Tooltip 
                  formatter={(val: any) => formatCurrency(Number(val))}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', border: 'none', color: '#fff' }}
                  />
                <Area 
                  type="monotone" 
                  dataKey="realizado" 
                  stroke="#06b6d4" 
                  strokeWidth={2.5} 
                  fillOpacity={1} 
                  fill="url(#colorRealizado)" 
                  name="Receita Realizada"
                />
                <Area 
                  type="monotone" 
                  dataKey="projetado" 
                  stroke="#8b5cf6" 
                  strokeWidth={2.5} 
                  strokeDasharray="4 4" 
                  fillOpacity={1} 
                  fill="url(#colorProjetado)" 
                  name="Receita Projetada"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico 2: Estrutura de Custos (Donut Chart) */}
        <div className={styles.chartCardSmall}>
          <div className={styles.cardHeader}>
            <div>
              <h3 className={styles.cardTitle}>Composição de Despesas</h3>
              <p className={styles.cardSubtitle}>Distribuição percentual dos custos</p>
            </div>
          </div>

          <div className={styles.donutContainer}>
            <ResponsiveContainer width="100%" height={170}>
              <PieChart>
                <Pie
                  data={MOCK_COST_BREAKDOWN}
                  innerRadius={48}
                  outerRadius={70}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {MOCK_COST_BREAKDOWN.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(val: any) => formatCurrency(Number(val))} />
              </PieChart>
            </ResponsiveContainer>

            <div className={styles.donutLegendList}>
              {MOCK_COST_BREAKDOWN.map(item => (
                  <div key={item.name} className={styles.donutLegendItem}>
                  <span className={styles.legendDot} style={{ backgroundColor: item.color }} />
                  <span className={styles.legendName}>{item.name}</span>
                  <span className={styles.legendValue}>{formatCurrency(item.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ─── DRE Contábil Tradicional com Análise Vertical (% AV) ─── */}
      <div className={styles.dreTableCard}>
        <div className={styles.tableHeader}>
          <div>
            <h3 className={styles.tableTitle}>Demonstrativo Estruturado de Resultado</h3>
            <p className={styles.tableSubtitle}>Regime de competência com percentual de análise vertical sobre a receita bruta</p>
          </div>
        </div>

        <div className={styles.dreTable}>
          <div className={styles.rowHead}>
            <span style={{ flex: 1 }}>Estrutura Contábil / Indicador</span>
            <span style={{ width: '120px', textAlign: 'right' }}>% AV</span>
            <span style={{ width: '160px', textAlign: 'right' }}>Valor Realizado</span>
          </div>

          <div className={`${styles.row} ${styles.rowPositive}`}>
            <span className={styles.colTitle}>(+) Receita Bruta Operacional (Consultas e Tratamentos)</span>
            <span className={styles.colAv}>100.0%</span>
            <span className={styles.colValue}>R$ 29.800,00</span>
          </div>

          <div className={`${styles.row} ${styles.rowNegative}`}>
            <span className={styles.colTitle}>(-) Insumos, Dentais & Laboratórios Protéticos (Custos Diretos)</span>
            <span className={styles.colAv}>32.9%</span>
            <span className={styles.colValue}>- R$ 9.800,00</span>
          </div>

          <div className={`${styles.row} ${styles.rowSubtotal}`}>
            <span className={styles.colTitle}>(=) Margem de Contribuição Clínica</span>
            <span className={styles.colAv}>67.1%</span>
            <span className={styles.colValue}>R$ 20.000,00</span>
          </div>

          <div className={`${styles.row} ${styles.rowNegative}`}>
            <span className={styles.colTitle}>(-) Ocupação e Utilidades (Aluguel, Água, Luz, Condomínio)</span>
            <span className={styles.colAv}>15.1%</span>
            <span className={styles.colValue}>- R$ 4.500,00</span>
          </div>

          <div className={`${styles.row} ${styles.rowNegative}`}>
            <span className={styles.colTitle}>(-) Marketing Odontológico & Aquisição de Novos Pacientes</span>
            <span className={styles.colAv}>9.4%</span>
            <span className={styles.colValue}>- R$ 2.800,00</span>
          </div>

          <div className={`${styles.row} ${styles.rowNegative}`}>
            <span className={styles.colTitle}>(-) Despesas Administrativas, Recepção e Softwares</span>
            <span className={styles.colAv}>17.4%</span>
            <span className={styles.colValue}>- R$ 5.200,00</span>
          </div>

          <div className={`${styles.row} ${styles.rowTotal}`}>
            <span className={styles.colTitle}>(=) Resultado Líquido Operacional / EBITDA</span>
            <span className={styles.colAv}>25.2%</span>
            <span className={`${styles.colValue} ${styles.textGreen}`}>R$ 7.500,00</span>
          </div>
        </div>
      </div>
    </div>
              </>
  )
}