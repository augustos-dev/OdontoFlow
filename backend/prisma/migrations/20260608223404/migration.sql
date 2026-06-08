/*
  Warnings:

  - You are about to drop the column `allergies` on the `patients` table. All the data in the column will be lost.
  - You are about to drop the column `bloodType` on the `patients` table. All the data in the column will be lost.
  - You are about to drop the column `historyNotes` on the `patients` table. All the data in the column will be lost.
  - You are about to drop the column `insuranceName` on the `patients` table. All the data in the column will be lost.
  - You are about to drop the column `insuranceNumber` on the `patients` table. All the data in the column will be lost.
  - You are about to drop the column `medications` on the `patients` table. All the data in the column will be lost.
  - You are about to drop the column `batchNumber` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `category` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `costPrice` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `deletedAt` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `unit` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `deletedAt` on the `suppliers` table. All the data in the column will be lost.
  - Made the column `paidAt` on table `transactions` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "TreatmentStatus" AS ENUM ('ORCAMENTO', 'APROVADO', 'EM_ANDAMENTO', 'CONCLUIDO', 'RECUSADO');

-- DropForeignKey
ALTER TABLE "appointments" DROP CONSTRAINT "appointments_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "clinics" DROP CONSTRAINT "clinics_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "patients" DROP CONSTRAINT "patients_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "products" DROP CONSTRAINT "products_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "suppliers" DROP CONSTRAINT "suppliers_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_tenantId_fkey";

-- DropIndex
DROP INDEX "appointments_clinicId_dentistId_idx";

-- DropIndex
DROP INDEX "appointments_clinicId_idx";

-- DropIndex
DROP INDEX "products_clinicId_category_idx";

-- DropIndex
DROP INDEX "transactions_clinicId_createdAt_idx";

-- DropIndex
DROP INDEX "transactions_clinicId_type_idx";

-- DropIndex
DROP INDEX "transactions_tenantId_idx";

-- AlterTable
ALTER TABLE "appointments" ALTER COLUMN "type" SET DEFAULT 'PARTICULAR',
ALTER COLUMN "room" SET DEFAULT 'SALA_1';

-- AlterTable
ALTER TABLE "patients" DROP COLUMN "allergies",
DROP COLUMN "bloodType",
DROP COLUMN "historyNotes",
DROP COLUMN "insuranceName",
DROP COLUMN "insuranceNumber",
DROP COLUMN "medications";

-- AlterTable
ALTER TABLE "products" DROP COLUMN "batchNumber",
DROP COLUMN "category",
DROP COLUMN "costPrice",
DROP COLUMN "deletedAt",
DROP COLUMN "description",
DROP COLUMN "unit";

-- AlterTable
ALTER TABLE "suppliers" DROP COLUMN "deletedAt";

-- AlterTable
ALTER TABLE "transactions" ALTER COLUMN "type" SET DEFAULT 'RECEITA',
ALTER COLUMN "paidAt" SET NOT NULL,
ALTER COLUMN "paidAt" SET DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "medical_records" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "chiefComplaint" TEXT,
    "historyNotes" TEXT,
    "allergies" TEXT,
    "medications" TEXT,
    "bloodType" TEXT,
    "habits" TEXT,
    "systemicDiseases" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medical_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evolutions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "medicalRecordId" TEXT NOT NULL,
    "dentistId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "lockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evolutions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tooth_conditions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "medicalRecordId" TEXT NOT NULL,
    "toothNumber" INTEGER NOT NULL,
    "condition" TEXT NOT NULL,
    "faces" TEXT[],
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tooth_conditions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "treatment_plans" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "dentistId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "TreatmentStatus" NOT NULL DEFAULT 'ORCAMENTO',
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "treatment_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "procedures" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "basePrice" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "procedures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_procedures" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "treatmentPlanId" TEXT NOT NULL,
    "procedureId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "actualPrice" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "plan_procedures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medical_files" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "medical_files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "medical_records_patientId_key" ON "medical_records"("patientId");

-- CreateIndex
CREATE INDEX "medical_records_clinicId_idx" ON "medical_records"("clinicId");

-- CreateIndex
CREATE UNIQUE INDEX "medical_records_tenantId_patientId_key" ON "medical_records"("tenantId", "patientId");

-- CreateIndex
CREATE INDEX "evolutions_tenantId_idx" ON "evolutions"("tenantId");

-- CreateIndex
CREATE INDEX "evolutions_medicalRecordId_idx" ON "evolutions"("medicalRecordId");

-- CreateIndex
CREATE INDEX "evolutions_medicalRecordId_createdAt_idx" ON "evolutions"("medicalRecordId", "createdAt");

-- CreateIndex
CREATE INDEX "tooth_conditions_tenantId_idx" ON "tooth_conditions"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "tooth_conditions_medicalRecordId_toothNumber_key" ON "tooth_conditions"("medicalRecordId", "toothNumber");

-- CreateIndex
CREATE INDEX "treatment_plans_tenantId_idx" ON "treatment_plans"("tenantId");

-- CreateIndex
CREATE INDEX "treatment_plans_clinicId_idx" ON "treatment_plans"("clinicId");

-- CreateIndex
CREATE INDEX "treatment_plans_patientId_idx" ON "treatment_plans"("patientId");

-- CreateIndex
CREATE INDEX "treatment_plans_clinicId_status_idx" ON "treatment_plans"("clinicId", "status");

-- CreateIndex
CREATE INDEX "procedures_tenantId_idx" ON "procedures"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "procedures_tenantId_name_key" ON "procedures"("tenantId", "name");

-- CreateIndex
CREATE INDEX "plan_procedures_tenantId_idx" ON "plan_procedures"("tenantId");

-- CreateIndex
CREATE INDEX "plan_procedures_treatmentPlanId_idx" ON "plan_procedures"("treatmentPlanId");

-- CreateIndex
CREATE INDEX "medical_files_tenantId_idx" ON "medical_files"("tenantId");

-- CreateIndex
CREATE INDEX "medical_files_patientId_idx" ON "medical_files"("patientId");

-- CreateIndex
CREATE INDEX "appointments_clinicId_dentistId_dateTime_idx" ON "appointments"("clinicId", "dentistId", "dateTime");

-- CreateIndex
CREATE INDEX "patients_clinicId_deletedAt_idx" ON "patients"("clinicId", "deletedAt");

-- CreateIndex
CREATE INDEX "products_clinicId_quantity_minQuantity_idx" ON "products"("clinicId", "quantity", "minQuantity");

-- CreateIndex
CREATE INDEX "transactions_tenantId_createdAt_idx" ON "transactions"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "transactions_clinicId_type_paidAt_idx" ON "transactions"("clinicId", "type", "paidAt");

-- AddForeignKey
ALTER TABLE "clinics" ADD CONSTRAINT "clinics_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_records" ADD CONSTRAINT "medical_records_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_records" ADD CONSTRAINT "medical_records_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_records" ADD CONSTRAINT "medical_records_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evolutions" ADD CONSTRAINT "evolutions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evolutions" ADD CONSTRAINT "evolutions_medicalRecordId_fkey" FOREIGN KEY ("medicalRecordId") REFERENCES "medical_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evolutions" ADD CONSTRAINT "evolutions_dentistId_fkey" FOREIGN KEY ("dentistId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tooth_conditions" ADD CONSTRAINT "tooth_conditions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tooth_conditions" ADD CONSTRAINT "tooth_conditions_medicalRecordId_fkey" FOREIGN KEY ("medicalRecordId") REFERENCES "medical_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_plans" ADD CONSTRAINT "treatment_plans_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_plans" ADD CONSTRAINT "treatment_plans_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_plans" ADD CONSTRAINT "treatment_plans_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_plans" ADD CONSTRAINT "treatment_plans_dentistId_fkey" FOREIGN KEY ("dentistId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procedures" ADD CONSTRAINT "procedures_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_procedures" ADD CONSTRAINT "plan_procedures_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_procedures" ADD CONSTRAINT "plan_procedures_treatmentPlanId_fkey" FOREIGN KEY ("treatmentPlanId") REFERENCES "treatment_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_procedures" ADD CONSTRAINT "plan_procedures_procedureId_fkey" FOREIGN KEY ("procedureId") REFERENCES "procedures"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_files" ADD CONSTRAINT "medical_files_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_files" ADD CONSTRAINT "medical_files_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
