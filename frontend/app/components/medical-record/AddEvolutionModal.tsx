import React, { useState } from 'react';
import api from '@/lib/api'; // Certifique-se de que o caminho do seu axios/api está correto
import './AddEvolutionModal.css'; // Ajuste a extensão do CSS se for .module.css

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
  const [loading, setLoading] = useState(false);

  // Se o modal não estiver aberto, não renderiza
  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!medicalRecordId) {
      alert('Paciente não possui um prontuário cadastrado.');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post(`/medical-records/${medicalRecordId}/evolutions`, {
        title,
        type,
        description,
      });

      if (response.status === 200 || response.status === 201) {
        setTitle('');
        setDescription('');
        setType('NOTE');
        if (onSuccess) onSuccess();
      }
    } catch (err) {
      console.error('Erro ao adicionar evolução:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <form onSubmit={handleSubmit} className="add-evolution-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 className="add-evolution-title" style={{ margin: 0 }}>Nova Evolução / Anotação Clínica</h3>
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
                required
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
              rows={3}
              required
              className="form-textarea"
            />
          </div>

          <div className="form-actions" style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
            >
              {loading ? 'Salvando...' : 'Adicionar Registro'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};