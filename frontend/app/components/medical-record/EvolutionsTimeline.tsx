import React from 'react';
import './EvolutionsTimeline.css';
import { Stethoscope, ClipboardList, FileText, Paperclip, User } from 'lucide-react';

// Tipagem dos tipos de evolução
export type EvolutionType = 'PROCEDURE' | 'ANAMNESIS' | 'NOTE' | 'FILE' | string;

export interface Evolution {
  id: string;
  medicalRecordId: string;
  dentistName: string;
  type: EvolutionType;
  title: string;
  description: string;
  createdAt: string;
}

interface EvolutionsTimelineProps {
  evolutions: Evolution[];
}

// Tipando explicitamente o 'type: EvolutionType'
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

export const EvolutionsTimeline: React.FC<EvolutionsTimelineProps> = ({ evolutions }) => {
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
                <span>Registrado por: <strong className="timeline-author">{item.dentistName}</strong></span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};