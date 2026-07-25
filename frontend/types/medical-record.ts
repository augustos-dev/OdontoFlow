// types/medical-record.ts

export type EvolutionType = 'PROCEDURE' | 'ANAMNESIS' | 'NOTE' | 'FILE';

export interface Evolution {
  id: string;
  clinicId: string;
  medicalRecordId: string;
  dentistName: string; // Ex: Dr. Vicente
  type: EvolutionType;
  title: string;
  description: string;
  createdAt: string; // ISO date string
}

export interface Patient {
  id: string;
  name: string;
  cpf: string;
  birthDate: string;
  phone: string;
}

export interface MedicalRecordData {
  id: string;
  patient: Patient;
  evolutions: Evolution[];
}