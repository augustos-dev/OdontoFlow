import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: {
    padding: 28,
    fontSize: 8.5,
    fontFamily: 'Helvetica',
    color: '#1e293b',
    backgroundColor: '#ffffff',
  },
  header: {
    borderBottomWidth: 1.5,
    borderBottomColor: '#0284c7',
    paddingBottom: 8,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  clinicName: {
    fontSize: 15,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
  },
  clinicSub: {
    fontSize: 7.5,
    color: '#64748b',
    marginTop: 2,
  },
  docTitleBlock: {
    textAlign: 'right',
  },
  docTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#0284c7',
  },
  docDate: {
    fontSize: 7.5,
    color: '#64748b',
    marginTop: 2,
  },
  section: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    backgroundColor: '#f1f5f9',
    padding: 3,
    marginBottom: 5,
    borderLeftWidth: 3,
    borderLeftColor: '#0284c7',
  },
  grid2: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  gridItem: {
    width: '48%',
  },
  label: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 8.5,
    marginTop: 1,
  },
  alertValue: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    color: '#dc2626',
    marginTop: 1,
  },
  // 🦷 Estilos do Odontograma no PDF
  odontogramBox: {
    borderWidth: 0.5,
    borderColor: '#cbd5e1',
    borderRadius: 4,
    padding: 6,
    backgroundColor: '#f8fafc',
    marginBottom: 6,
  },
  archRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 3,
    marginVertical: 2,
  },
  toothBadge: {
    width: 26,
    paddingVertical: 2,
    borderWidth: 0.5,
    borderColor: '#94a3b8',
    borderRadius: 2,
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  toothNum: {
    fontSize: 6.5,
    fontFamily: 'Helvetica-Bold',
    color: '#334155',
  },
  toothCondition: {
    fontSize: 5.5,
    marginTop: 1,
  },
  table: {
    width: '100%',
    marginTop: 2,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#e2e8f0',
    paddingVertical: 4,
  },
  tableHeader: {
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
  },
  colDate: { width: '22%' },
  colDentist: { width: '25%' },
  colDesc: { width: '53%' },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 28,
    right: 28,
    borderTopWidth: 0.5,
    borderTopColor: '#cbd5e1',
    paddingTop: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 7,
    color: '#94a3b8',
  },
  signaturesRow: {
    marginTop: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  signatureLine: {
    width: '42%',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 3,
    textAlign: 'center',
    fontSize: 7.5,
  },
})

interface PDFProps {
  patient: any
  evolutions: any[]
  odontogramData?: any
}

const UPPER_TEETH = ['18', '17', '16', '15', '14', '13', '12', '11', '21', '22', '23', '24', '25', '26', '27', '28']
const LOWER_TEETH = ['48', '47', '46', '45', '44', '43', '42', '41', '31', '32', '33', '34', '35', '36', '37', '38']

export function MedicalRecordPDF({ patient, evolutions = [], odontogramData = {} }: PDFProps) {
  const mr = patient.medicalRecord || {}

  // Helper para identificar status do dente
  const getToothStatus = (toothNum: string) => {
    const data = odontogramData?.[toothNum]
    if (!data) return { text: '—', color: '#94a3b8' }
    if (data.isMissing) return { text: 'AUS', color: '#dc2626' }
    if (data.faces?.occlusal === 'carie' || Object.values(data.faces || {}).includes('carie')) return { text: 'CÁR', color: '#ef4444' }
    if (data.faces?.occlusal === 'restaurado' || Object.values(data.faces || {}).includes('restaurado')) return { text: 'RES', color: '#16a34a' }
    if (data.faces?.occlusal === 'canal' || Object.values(data.faces || {}).includes('canal')) return { text: 'CAN', color: '#9333ea' }
    return { text: 'OK', color: '#0284c7' }
  }

  return (
    <Document title={`Prontuario_${patient.name}.pdf`}>
      <Page size="A4" style={styles.page}>
        
        {/* CABEÇALHO */}
        <View style={styles.header}>
          <View>
            <Text style={styles.clinicName}>OdontoFlow Gestão Clínica</Text>
            <Text style={styles.clinicSub}>Documento Oficial de Prontuário Odontológico Auditado</Text>
          </View>
          <View style={styles.docTitleBlock}>
            <Text style={styles.docTitle}>PRONTUÁRIO CLÍNICO</Text>
            <Text style={styles.docDate}>Emissão: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</Text>
          </View>
        </View>

        {/* 1. IDENTIFICAÇÃO */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. IDENTIFICAÇÃO DO PACIENTE</Text>
          <View style={styles.grid2}>
            <View style={styles.gridItem}>
              <Text style={styles.label}>Nome Completo</Text>
              <Text style={styles.value}>{patient.name}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.label}>CPF</Text>
              <Text style={styles.value}>{patient.cpf || 'Não informado'}</Text>
            </View>
          </View>
          <View style={styles.grid2}>
            <View style={styles.gridItem}>
              <Text style={styles.label}>Telefone</Text>
              <Text style={styles.value}>{patient.phone}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.label}>Data de Nascimento</Text>
              <Text style={styles.value}>{patient.birthDate ? new Date(patient.birthDate).toLocaleDateString('pt-BR') : '—'}</Text>
            </View>
          </View>
        </View>

        {/* 2. ANAMNESE */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. ANAMNESE & QUADRO CLÍNICO BASE</Text>
          <View style={styles.grid2}>
            <View style={styles.gridItem}>
              <Text style={styles.label}>Queixa Principal</Text>
              <Text style={styles.value}>{mr.chiefComplaint || 'Não informado'}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.label}>Alergias</Text>
              <Text style={mr.allergies && mr.allergies.toLowerCase() !== 'nenhuma' ? styles.alertValue : styles.value}>
                {mr.allergies || 'Nenhuma'}
              </Text>
            </View>
          </View>
          <View style={{ marginTop: 2 }}>
            <Text style={styles.label}>Doenças Sistêmicas & Condições</Text>
            <Text style={styles.value}>{mr.systemicDiseases || 'Nenhuma relatada'}</Text>
          </View>
          <View style={{ marginTop: 2 }}>
            <Text style={styles.label}>Medicamentos em Uso</Text>
            <Text style={styles.value}>{mr.medications || 'Nenhum'}</Text>
          </View>
        </View>

        {/* 3. ODONTOGRAMA (MAPA BUCAL) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. REGISTRO ANATÔMICO DENTÁRIO (ODONTOGRAMA)</Text>
          <View style={styles.odontogramBox}>
            {/* Arcada Superior */}
            <View style={styles.archRow}>
              {UPPER_TEETH.map((t) => {
                const status = getToothStatus(t)
                return (
                  <View key={t} style={styles.toothBadge}>
                    <Text style={styles.toothNum}>{t}</Text>
                    <Text style={[styles.toothCondition, { color: status.color }]}>{status.text}</Text>
                  </View>
                )
              })}
            </View>
            {/* Arcada Inferior */}
            <View style={styles.archRow}>
              {LOWER_TEETH.map((t) => {
                const status = getToothStatus(t)
                return (
                  <View key={t} style={styles.toothBadge}>
                    <Text style={styles.toothNum}>{t}</Text>
                    <Text style={[styles.toothCondition, { color: status.color }]}>{status.text}</Text>
                  </View>
                )
              })}
            </View>
          </View>
        </View>

        {/* 4. HISTÓRICO DE EVOLUÇÕES */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. HISTÓRICO DE EVOLUÇÕES CLÍNICAS</Text>
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableHeader]}>
              <Text style={[styles.colDate, styles.label]}>Data / Hora</Text>
              <Text style={[styles.colDentist, styles.label]}>Profissional</Text>
              <Text style={[styles.colDesc, styles.label]}>Procedimento & Descrição</Text>
            </View>

            {evolutions.length === 0 ? (
              <View style={styles.tableRow}>
                <Text style={{ fontSize: 7.5, color: '#64748b' }}>Nenhuma evolução clínica registrada até o momento.</Text>
              </View>
            ) : (
              evolutions.map((evo, i) => (
                <View key={i} style={styles.tableRow} wrap={false}>
                  <Text style={[styles.colDate, { fontSize: 7.5 }]}>
                    {new Date(evo.createdAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </Text>
                  <Text style={[styles.colDentist, { fontSize: 7.5 }]}>
                    {evo.dentist?.name || evo.dentistName || 'Dr(a). Responsável'}
                  </Text>
                  <Text style={[styles.colDesc, { fontSize: 7.5 }]}>
                    {evo.procedure?.name ? `[${evo.procedure.name}] ` : ''}
                    {evo.description?.replace(/<[^>]*>?/gm, '') || '—'}
                  </Text>
                </View>
              ))
            )}
          </View>
        </View>

        {/* ASSINATURAS */}
        <View style={styles.signaturesRow}>
          <View style={styles.signatureLine}>
            <Text>Assinatura do Profissional Responsável</Text>
            <Text style={{ fontSize: 6.5, color: '#64748b', marginTop: 1 }}>Carimbo / CRO</Text>
          </View>
          <View style={styles.signatureLine}>
            <Text>{patient.name}</Text>
            <Text style={{ fontSize: 6.5, color: '#64748b', marginTop: 1 }}>Assinatura do Paciente / Responsável</Text>
          </View>
        </View>

        {/* RODAPÉ FIXO */}
        <View style={styles.footer} fixed>
          <Text>Prontuário em conformidade com as normas CFO e LGPD — OdontoFlow</Text>
          <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>

      </Page>
    </Document>
  )
}