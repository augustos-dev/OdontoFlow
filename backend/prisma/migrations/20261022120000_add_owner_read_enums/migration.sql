-- Migration 1/2: novos valores de enum.
-- Fica em arquivo separado porque o PostgreSQL não permite USAR um valor de enum
-- na mesma transação em que ele foi criado.

-- Dono da rede (Enterprise): acessa todas as clínicas do tenant.
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'OWNER';

-- Auditoria de leitura (ex.: acesso a prontuário de paciente cadastrado em outra unidade).
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'READ';
