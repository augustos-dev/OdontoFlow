import React, { useState } from 'react';
import api from '../../../lib/api';
import { Odontogram, OdontogramData } from '../tooth/Odontogram';
import './AddEvolutionModal.css';

interface AddEvolutionModalProps {
  patientId: string;
  medicalRecordId?: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AddEvolutionModal: React.FC<AddEvolutionModalProps> = ({
  patientId,
  medicalRecordId,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [title, setTitle] = useState('');
  const [type, setType] = useState('NOTE');
  const [description, setDescription] = useState('');
  const [odontogramSnapshot, setOdontogramSnapshot] = useState<OdontogramData>({});
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!medicalRecordId) {
      alert('Atenção: Este paciente ainda não possui um prontuário cadastrado!');
      return;
    }

    if (!description.trim()) {
      alert('A descrição da evolução é obrigatória.');
      return;
    }

    setLoading(true);

    try {
      // ─── ✅ Payload Corrigido: Envia o Snapshot JSONB e campos estruturados ───
      const payload = {
        title: title.trim() || undefined,
        type,
        description,
        odontogramSnapshot: Object.keys(odontogramSnapshot).length > 0 ? odontogramSnapshot : null,
      };

      const response = await api.post(`/medical-records/${patientId}/evolutions`, payload);

      if (response.status === 200 || response.status === 201) {
        setTitle('');
        setDescription('');
        setType('NOTE');
        setOdontogramSnapshot({});
        if (onSuccess) onSuccess();
        onClose();
      }
    } catch (err: any) {
      console.error('Erro ao adicionar evolução:', err);
      alert(err.response?.data?.message || 'Erro ao salvar registro de evolução.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '900px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }}
      >
        <form onSubmit={handleSubmit} className="add-evolution-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 className="add-evolution-title" style={{ margin: 0 }}>
              Nova Evolução / Anotação Clínica
            </h3>
            <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>
              ✕
            </button>
          </div>

          <div className="add-evolution-grid">
            <div className="form-group">
              <input
                type="text"
                placeholder="Título (ex: Restauração Resina Dente 16)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="form-select"
              >
                <option value="NOTE">Anotação Geral</option>
                <option value="PROCEDURE">Procedimento</option>
                <option value="ANAMNESIS">Anamnese</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <textarea
              placeholder="Descreva os detalhes da evolução clínica..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              required
              className="form-textarea"
            />
          </div>

          {/* 🦷 Odontograma */}
          <div style={{ marginTop: '1.5rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem', color: '#334155' }}>
              Registro Anatômico do Atendimento (Odontograma)
            </h4>
            <p style={{ margin: '0 0 1rem 0', fontSize: '0.8rem', color: '#64748b' }}>
              Marque os procedimentos ou intercorrências realizadas nesta consulta para registrar o histórico inalterável.
            </p>
            <Odontogram
              patientId={patientId}
              value={odontogramSnapshot}
              onChange={setOdontogramSnapshot}
            />
          </div>

          <div className="form-actions" style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Salvando...' : 'Adicionar Registro'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};