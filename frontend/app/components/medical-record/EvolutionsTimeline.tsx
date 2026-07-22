import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Stethoscope, ClipboardList, FileText, Paperclip, User } from 'lucide-react';
import './EvolutionsTimeline.css';

export type EvolutionType = 'PROCEDURE' | 'ANAMNESIS' | 'NOTE' | 'FILE' | string;

export interface Evolution {
  id: string;
  medicalRecordId: string;
  dentistName?: string;
  dentist?: { name: string };
  type: EvolutionType;
  title: string;
  description: string;
  createdAt: string;
}

interface EvolutionsTimelineProps {
  patientId: string;
  medicalRecordId?: string;
  evolutions?: Evolution[];
}

const getIcon = (type: EvolutionType) => {
  switch (type) {
    case 'PROCEDURE':
      return <Stethoscope size={16} color="#047857" />;
    case 'ANAMNESIS':
      return <ClipboardList size={16} color="#1d4ed8" />;
    case 'FILE':
      return <Paperclip size={16} color="#b45309" />;
    case 'NOTE':
    default:
      return <FileText size={16} color="#475569" />;
  }
};

const getBadgeClass = (type: EvolutionType) => {
  switch (type) {
    case 'PROCEDURE':
      return 'badge badge-procedure';
    case 'ANAMNESIS':
      return 'badge badge-anamnesis';
    case 'FILE':
      return 'badge badge-file';
    case 'NOTE':
    default:
      return 'badge badge-note';
  }
};

export const EvolutionsTimeline: React.FC<EvolutionsTimelineProps> = ({
  patientId,
  evolutions: initialEvolutions,
}) => {
  const [evolutions, setEvolutions] = useState<Evolution[]>(initialEvolutions || []);
  const [loading, setLoading] = useState(!initialEvolutions);

  useEffect(() => {
    if (initialEvolutions) return;

    async function loadEvolutions() {
      if (!patientId) return;

      try {
        setLoading(true);
        // 🎯 Rota unificada no padrão /medical-records/:patientId/evolutions
        const { data } = await api.get(`/medical-records/${patientId}/evolutions`);
        setEvolutions(Array.isArray(data) ? data : data.evolutions || []);
      } catch (err) {
        console.error('Erro ao carregar evoluções:', err);
      } finally {
        setLoading(false);
      }
    }

    loadEvolutions();
  }, [patientId, initialEvolutions]);

  if (loading) {
    return <div className="timeline-empty">Carregando evoluções clínicas...</div>;
  }

  if (!evolutions || evolutions.length === 0) {
    return (
      <div className="timeline-empty">
        Nenhuma evolução clínica registrada até o momento.
      </div>
    );
  }

  return (
    <div className="timeline-container">
      {evolutions.map((item) => {
        const formattedDate = new Date(item.createdAt).toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });

        const authorName = item.dentistName || item.dentist?.name || 'Profissional da Saúde';

        return (
          <div key={item.id} className="timeline-item">
            <div className="timeline-icon-badge">
              {getIcon(item.type)}
            </div>

            <div className="timeline-card">
              <div className="timeline-header">
                <div className="timeline-header-left">
                  <span className={getBadgeClass(item.type)}>
                    {item.type}
                  </span>
                  <h4 className="timeline-title">{item.title}</h4>
                </div>
                <time className="timeline-date">{formattedDate}</time>
              </div>

              <p className="timeline-description">
                {item.description}
              </p>

              <div className="timeline-footer">
                <User size={12} />
                <span>Registrado por: <strong className="timeline-author">{authorName}</strong></span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};