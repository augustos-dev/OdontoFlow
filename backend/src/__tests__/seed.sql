-- Dados de teste da rede. Rode em um banco VAZIO de teste, depois de `prisma migrate deploy`.
-- NUNCA em produção/desenvolvimento com dados reais.
INSERT INTO tenants (id,name,slug,plan,"billingCycle",status,"isActive","isBetaPartner","updatedAt") VALUES
 ('T_ENT','Rede','rede','ENTERPRISE','ANNUAL','ACTIVE',true,false,now()),('T_PREM','Premium','prem','PREMIUM','ANNUAL','ACTIVE',true,false,now());
INSERT INTO subscriptions (id,"tenantId",plan,status,"billingCycle","currentPeriodEnd","updatedAt","maxClinics","maxProfessionals") VALUES
 ('S1','T_ENT','ENTERPRISE','ACTIVE','ANNUAL',now()+interval '1 year',now(),3,1),('S2','T_PREM','PREMIUM','ACTIVE','ANNUAL',now()+interval '1 year',now(),1,NULL);
INSERT INTO clinics (id,"tenantId",name,"updatedAt") VALUES ('A','T_ENT','Messejana',now()),('B','T_ENT','Meireles',now()),('P','T_PREM','Premium 1',now()),('P2','T_PREM','Premium 2 (legado)',now());
INSERT INTO users (id,"tenantId","clinicId",name,email,"passwordHash",role,"updatedAt") VALUES
 ('U_OWNER','T_ENT','A','Dono','owner@r.com','x','OWNER',now()),('U_DENT_A','T_ENT','A','Dentista A','da@r.com','x','DENTIST',now()),
 ('U_SEC_B','T_ENT','B','Secretaria B','sb@r.com','x','SECRETARY',now()),('U_ADMIN_B','T_ENT','B','Admin B','ab@r.com','x','ADMIN',now()),('U_PADM','T_PREM','P','Admin Prem','p@p.com','x','ADMIN',now());
INSERT INTO patients (id,"tenantId","clinicId",name,phone,cpf,"updatedAt") VALUES
 ('PAT1','T_ENT','A','Maria Silva','85999990000','11111111111',now()),('PP1','T_PREM','P','Joao Premium','85988880000','33333333333',now()),('PP2','T_PREM','P2','Ana Outra Unidade','85977770000','44444444444',now());
INSERT INTO medical_records (id,"tenantId","clinicId","patientId","updatedAt") VALUES ('MR1','T_ENT','A','PAT1',now()),('MRP2','T_PREM','P2','PP2',now());
INSERT INTO procedures (id,"tenantId",name,"basePrice","updatedAt") VALUES ('PROC1','T_ENT','Restauração',100,now()),('PROC2','T_ENT','Limpeza',80,now());
INSERT INTO clinic_procedures (id,"tenantId","clinicId","procedureId","updatedAt") VALUES ('CP1','T_ENT','A','PROC1',now()),('CP2','T_ENT','A','PROC2',now());
INSERT INTO products (id,"tenantId","clinicId",name,quantity,"minQuantity","updatedAt") VALUES ('PRODA','T_ENT','A','Pasta A',10,1,now()),('PRODA2','T_ENT','A','Pomada A',0.5,1,now()),('PRODB','T_ENT','B','Pasta B',5,1,now());
INSERT INTO procedure_products (id,"tenantId","clinicId","procedureId","productId",quantity,unit) VALUES ('RA1','T_ENT','A','PROC1','PRODA',3,'UN'),('RA2','T_ENT','A','PROC1','PRODA2',1,'UN');
