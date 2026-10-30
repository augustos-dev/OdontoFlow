-- ROLLBACK MANUAL da migration 20261022120100_enterprise_network (não é executado pelo Prisma).
-- Atenção: receitas diferentes por clínica serão perdidas se você voltar ao modelo antigo
-- (a unicidade volta a ser (procedureId, productId)). Os valores de enum (OWNER, READ) não são removidos
-- porque o PostgreSQL não permite DROP VALUE; são inofensivos.

DROP INDEX IF EXISTS "patients_tenantId_name_idx";
DROP INDEX IF EXISTS "patients_tenantId_deletedAt_idx";

ALTER TABLE "stock_movements" DROP CONSTRAINT IF EXISTS "stock_movements_tenantId_fkey";
ALTER TABLE "stock_movements" DROP CONSTRAINT IF EXISTS "stock_movements_clinicId_fkey";

DROP TABLE IF EXISTS "user_clinics";
DROP TABLE IF EXISTS "clinic_procedures";

ALTER TABLE "procedure_products" DROP CONSTRAINT IF EXISTS "procedure_products_productId_clinicId_fkey";
DROP INDEX IF EXISTS "procedure_products_clinicId_procedureId_idx";
DROP INDEX IF EXISTS "procedure_products_procedureId_clinicId_productId_key";
-- Se houver o mesmo (procedureId, productId) em mais de uma clínica, remova as duplicatas antes:
CREATE UNIQUE INDEX "procedure_products_procedureId_productId_key" ON "procedure_products"("procedureId", "productId");
ALTER TABLE "procedure_products" ADD CONSTRAINT "procedure_products_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "procedure_products" DROP COLUMN "clinicId";
DROP INDEX IF EXISTS "products_id_clinicId_key";

ALTER TABLE "evolutions" DROP CONSTRAINT IF EXISTS "evolutions_clinicId_fkey";
DROP INDEX IF EXISTS "evolutions_clinicId_createdAt_idx";
ALTER TABLE "evolutions" DROP COLUMN "clinicId", DROP COLUMN "stockDeducted";

ALTER TABLE "subscriptions" DROP COLUMN "maxClinics", DROP COLUMN "maxProfessionals";
