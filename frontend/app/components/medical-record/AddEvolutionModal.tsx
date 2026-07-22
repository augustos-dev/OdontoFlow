import React, { useState } from 'react';
import './AddEvolutionModal.css';

// 1. Definimos a interface das props
interface AddEvolutionModalProps {
  medicalRecordId: string;
  onSuccess?: () => void;
}

export const AddEvolutionModal: React.FC<AddEvolutionModalProps> = ({
  medicalRecordId,
  onSuccess,
}) => {
  const [title, setTitle] = useState('');
  const [type, setType] = useState('NOTE');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  // 2. Tipamos o evento do formulário com React.FormEvent
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`/api/medical-records/${medicalRecordId}/evolutions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, type, description }),
      });

      if (res.ok) {
        setTitle('');
        setDescription('');
        if (onSuccess) onSuccess();
      }
    } catch (err) {
      console.error('Erro ao adicionar evolução:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="add-evolution-card">
      <h3 className="add-evolution-title">Nova Evolução / Anotação Clínica</h3>
      
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

      <div className="form-actions">
        <button
          type="submit"
          disabled={loading}
          className="btn-primary"
        >
          {loading ? 'Salvando...' : 'Adicionar Registro'}
        </button>
      </div>
    </form>
  );
};