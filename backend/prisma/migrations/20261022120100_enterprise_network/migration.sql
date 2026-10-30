-- Migration 2/2: suporte a rede de clínicas (plano ENTERPRISE).
--
-- O que muda:
--   1. subscriptions: limites do pacote (maxClinics / maxProfessionals) + backfill de linhas ausentes
--   2. evolutions: clinicId (unidade onde a evolução foi feita) + stockDeducted (idempotência da baixa)
--   3. procedure_products: receita POR CLÍNICA (clinicId + FK composta com products)
--   4. clinic_procedures: quais procedimentos cada unidade oferece e a que preço
--   5. user_clinics: usuários que atuam em mais de uma unidade
--   6. stock_movements: FKs para tenant e clínica
--   7. patients: índices para busca na rede
--
-- Rode scripts/preflight.sql ANTES (somente leitura) e faça backup.

-- ─── 0. PRÉ-CHECAGENS QUE BLOQUEIAM A MIGRATION ─────────────────────────────
DO $$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n FROM "stock_movements" m
   WHERE NOT EXISTS (SELECT 1 FROM "tenants" t WHERE t."id" = m."tenantId")
      OR NOT EXISTS (SELECT 1 FROM "clinics" c WHERE c."id" = m."clinicId");
  IF n > 0 THEN
    RAISE EXCEPTION 'Existem % movimentações de estoque com tenantId/clinicId inexistente. Corrija antes de aplicar (ver scripts/preflight.sql).', n;
  END IF;

  SELECT count(*) INTO n FROM "medical_records" r
   WHERE NOT EXISTS (SELECT 1 FROM "clinics" c WHERE c."id" = r."clinicId");
  IF n > 0 THEN
    RAISE EXCEPTION 'Existem % prontuários apontando para clínica inexistente.', n;
  END IF;
END $$;

-- ─── 1. SUBSCRIPTIONS: LIMITES DO PACOTE ────────────────────────────────────
ALTER TABLE "subscriptions"
  ADD COLUMN "maxClinics"       INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "maxProfessionals" INTEGER;

-- registerTenant nunca criava a linha de subscription: cria para quem não tem.
INSERT INTO "subscriptions"
  ("id","tenantId","plan","status","billingCycle","currentPeriodStart","currentPeriodEnd","createdAt","updatedAt","maxClinics")
SELECT gen_random_uuid()::text, t."id", t."plan", t."status", t."billingCycle",
       CURRENT_TIMESTAMP, COALESCE(t."trialEndsAt", CURRENT_TIMESTAMP + interval '1 year'),
       CURRENT_TIMESTAMP, CURRENT_TIMESTAMP,
       GREATEST(1, (SELECT count(*) FROM "clinics" c WHERE c."tenantId" = t."id"))
  FROM "tenants" t
 WHERE NOT EXISTS (SELECT 1 FROM "subscriptions" s WHERE s."tenantId" = t."id");

-- Tenants que já têm várias clínicas não podem ficar "acima do limite": ajusta ao que existe hoje.
UPDATE "subscriptions" s
   SET "maxClinics" = GREATEST(1, (SELECT count(*) FROM "clinics" c WHERE c."tenantId" = s."tenantId"));

-- ─── 2. EVOLUTIONS: clinicId + stockDeducted ────────────────────────────────
ALTER TABLE "evolutions" ADD COLUMN "clinicId" TEXT;
ALTER TABLE "evolutions" ADD COLUMN "stockDeducted" BOOLEAN NOT NULL DEFAULT false;

UPDATE "evolutions" e
   SET "clinicId" = r."clinicId"
  FROM "medical_records" r
 WHERE r."id" = e."medicalRecordId";

ALTER TABLE "evolutions" ALTER COLUMN "clinicId" SET NOT NULL;
CREATE INDEX "evolutions_clinicId_createdAt_idx" ON "evolutions"("clinicId", "createdAt");
ALTER TABLE "evolutions" ADD CONSTRAINT "evolutions_clinicId_fkey"
  FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─── 3. PROCEDURE_PRODUCTS: RECEITA POR CLÍNICA ─────────────────────────────
-- Necessário para a FK composta (productId, clinicId): garante NO BANCO que
-- o insumo da receita pertence à mesma clínica da receita.
CREATE UNIQUE INDEX "products_id_clinicId_key" ON "products"("id", "clinicId");

ALTER TABLE "procedure_products" ADD COLUMN "clinicId" TEXT;

UPDATE "procedure_products" pp
   SET "clinicId" = p."clinicId"
  FROM "products" p
 WHERE p."id" = pp."productId";

ALTER TABLE "procedure_products" ALTER COLUMN "clinicId" SET NOT NULL;

DROP INDEX "procedure_products_procedureId_productId_key";
ALTER TABLE "procedure_products" DROP CONSTRAINT "procedure_products_productId_fkey";

CREATE UNIQUE INDEX "procedure_products_procedureId_clinicId_productId_key"
  ON "procedure_products"("procedureId", "clinicId", "productId");
CREATE INDEX "procedure_products_clinicId_procedureId_idx"
  ON "procedure_products"("clinicId", "procedureId");
ALTER TABLE "procedure_products" ADD CONSTRAINT "procedure_products_productId_clinicId_fkey"
  FOREIGN KEY ("productId", "clinicId") REFERENCES "products"("id", "clinicId") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── 4. CLINIC_PROCEDURES ───────────────────────────────────────────────────
CREATE TABLE "clinic_procedures" (
  "id"          TEXT NOT NULL,
  "tenantId"    TEXT NOT NULL,
  "clinicId"    TEXT NOT NULL,
  "procedureId" TEXT NOT NULL,
  "price"       DECIMAL(10,2),
  "isActive"    BOOLEAN NOT NULL DEFAULT true,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,
  CONSTRAINT "clinic_procedures_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "clinic_procedures_clinicId_procedureId_key" ON "clinic_procedures"("clinicId", "procedureId");
CREATE INDEX "clinic_procedures_tenantId_idx" ON "clinic_procedures"("tenantId");
CREATE INDEX "clinic_procedures_clinicId_isActive_idx" ON "clinic_procedures"("clinicId", "isActive");
ALTER TABLE "clinic_procedures" ADD CONSTRAINT "clinic_procedures_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "clinic_procedures" ADD CONSTRAINT "clinic_procedures_clinicId_fkey"
  FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "clinic_procedures" ADD CONSTRAINT "clinic_procedures_procedureId_fkey"
  FOREIGN KEY ("procedureId") REFERENCES "procedures"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Tenants que JÁ são ENTERPRISE mantêm o comportamento atual: todas as unidades ativas em todos os procedimentos.
-- (Basic/Premium não usam esta tabela: a aplicação só a consulta para ENTERPRISE.)
INSERT INTO "clinic_procedures" ("id","tenantId","clinicId","procedureId","isActive","createdAt","updatedAt")
SELECT gen_random_uuid()::text, c."tenantId", c."id", p."id", true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  FROM "clinics" c
  JOIN "tenants" t    ON t."id" = c."tenantId" AND t."plan" = 'ENTERPRISE'
  JOIN "procedures" p ON p."tenantId" = c."tenantId";

-- ─── 5. USER_CLINICS ────────────────────────────────────────────────────────
CREATE TABLE "user_clinics" (
  "id"        TEXT NOT NULL,
  "tenantId"  TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "clinicId"  TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_clinics_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "user_clinics_userId_clinicId_key" ON "user_clinics"("userId", "clinicId");
CREATE INDEX "user_clinics_tenantId_idx" ON "user_clinics"("tenantId");
CREATE INDEX "user_clinics_clinicId_idx" ON "user_clinics"("clinicId");
ALTER TABLE "user_clinics" ADD CONSTRAINT "user_clinics_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "user_clinics" ADD CONSTRAINT "user_clinics_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_clinics" ADD CONSTRAINT "user_clinics_clinicId_fkey"
  FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── 6. STOCK_MOVEMENTS: FKs de isolamento ──────────────────────────────────
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_clinicId_fkey"
  FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─── 7. PATIENTS: ÍNDICES PARA BUSCA NA REDE ────────────────────────────────
CREATE INDEX "patients_tenantId_name_idx" ON "patients"("tenantId", "name");
CREATE INDEX "patients_tenantId_deletedAt_idx" ON "patients"("tenantId", "deletedAt");
