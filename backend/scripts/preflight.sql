-- PRÉ-CHECAGEM (somente leitura). Rode antes de aplicar as migrations e leia o resultado.

-- 1) Tenants com mais de 1 clínica (a regra nova é: Basic/Premium = 1 clínica).
--    A migration ajusta maxClinics ao que existe hoje, então ninguém quebra, mas vale saber.
SELECT t.id, t.name, t.plan, count(c.id) AS clinicas
  FROM tenants t JOIN clinics c ON c."tenantId" = t.id
 GROUP BY t.id, t.name, t.plan
HAVING count(c.id) > 1
 ORDER BY clinicas DESC;

-- 2) plan/status divergentes entre tenants e subscriptions (o app lê tenants.plan no login).
SELECT t.id, t.name, t.plan AS tenant_plan, s.plan AS subscription_plan, t.status AS tenant_status, s.status AS subscription_status
  FROM tenants t JOIN subscriptions s ON s."tenantId" = t.id
 WHERE t.plan <> s.plan OR t.status <> s.status;

-- 3) Movimentações de estoque órfãs (a migration ABORTA se existirem).
SELECT m.id, m."tenantId", m."clinicId"
  FROM stock_movements m
 WHERE NOT EXISTS (SELECT 1 FROM tenants t WHERE t.id = m."tenantId")
    OR NOT EXISTS (SELECT 1 FROM clinics c WHERE c.id = m."clinicId");

-- 4) Receitas hoje: quantas por tenant (viram receitas da clínica dona do produto).
SELECT pp."tenantId", count(*) AS itens_de_receita FROM procedure_products pp GROUP BY 1;

-- 5) Procedimentos de agendamentos finalizados que NÃO baixaram estoque (informativo).
SELECT count(*) AS finalizados_sem_baixa
  FROM appointments a
 WHERE a.status = 'FINALIZADO' AND a."procedureId" IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM stock_movements m WHERE m."appointmentId" = a.id OR m.reason LIKE '%' || a.id || '%');
