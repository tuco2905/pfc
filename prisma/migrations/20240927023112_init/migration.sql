-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('AGUARDANDO_CHEFE_FUSEX_1', 'AGUARDANDO_CHEFE_AUDITORIA_1', 'AGUARDANDO_AUDITOR', 'AGUARDANDO_CHEFE_AUDITORIA_2', 'AGUARDANDO_CHEFE_FUSEX_2', 'AGUARDANDO_HOMOLOGADOR_SOLICITANTE_1', 'AGUARDANDO_HOMOLOGADOR_SOLICITADA_1', 'AGUARDANDO_CHEFE_DIV_MEDICINA_1', 'AGUARDANDO_ESPECIALISTA', 'AGUARDANDO_CHEFE_DIV_MEDICINA_2', 'AGUARDANDO_COTACAO', 'AGUARDANDO_CHEFE_DIV_MEDICINA_3', 'AGUARDANDO_HOMOLOGADOR_SOLICITADA_2', 'AGUARDANDO_HOMOLOGADOR_SOLICITANTE_2', 'AGUARDANDO_CHEFE_FUSEX_3', 'AGUARDANDO_PASSAGEM', 'AGUARDANDO_CHEFE_FUSEX_4', 'AGUARDANDO_HOMOLOGADOR_SOLICITANTE_3', 'AGUARDANDO_CHEM_1', 'AGUARDANDO_CHEFE_SECAO_REGIONAL_1', 'AGUARDANDO_OPERADOR_SECAO_REGIONAL', 'AGUARDANDO_CHEFE_SECAO_REGIONAL_2', 'AGUARDANDO_CHEM_2', 'AGUARDANDO_SUBDIRETOR_SAUDE_1', 'AGUARDANDO_DRAS', 'AGUARDANDO_SUBDIRETOR_SAUDE_2', 'AGUARDANDO_CHEM_3', 'AGUARDANDO_RESPOSTA', 'REPROVADO', 'REPROVADO_DSAU', 'CANCELADO', 'APROVADO');

-- CreateEnum
CREATE TYPE "ActionType" AS ENUM ('CRIACAO', 'ORCAMENTO', 'ESCOLHA_OMS', 'APROVACAO', 'REPROVACAO', 'CANCELAMENTO');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPERADMIN', 'OPERADOR_FUSEX', 'CHEFE_FUSEX', 'AUDITOR', 'CHEFE_AUDITORIA', 'ESPECIALISTA', 'CHEFE_DIV_MEDICINA', 'COTADOR', 'HOMOLOGADOR', 'CHEM', 'CHEFE_SECAO_REGIONAL', 'OPERADOR_SECAO_REGIONAL', 'DRAS', 'SUBDIRETOR_SAUDE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "organizationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "regionId" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "regionId" TEXT NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Region" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Region_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pacient" (
    "cpf" TEXT NOT NULL,
    "precCp" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rank" TEXT NOT NULL,
    "isDependent" BOOLEAN NOT NULL,

    CONSTRAINT "Pacient_pkey" PRIMARY KEY ("cpf")
);

-- CreateTable
CREATE TABLE "Request" (
    "id" TEXT NOT NULL,
    "description" TEXT,
    "pacientCpf" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "requestedOrganizationIds" TEXT[],
    "status" "RequestStatus" NOT NULL DEFAULT 'AGUARDANDO_CHEFE_FUSEX_1',
    "cbhpmCode" TEXT NOT NULL,
    "needsCompanion" BOOLEAN NOT NULL,
    "opmeCost" INTEGER NOT NULL,
    "psaCost" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequestResponse" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'AGUARDANDO_HOMOLOGADOR_SOLICITADA_1',
    "opmeCost" INTEGER,
    "procedureCost" INTEGER,
    "ticketCost" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "selected" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "RequestResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActionLog" (
    "id" TEXT NOT NULL,
    "requestId" TEXT,
    "requestResponseId" TEXT,
    "userId" TEXT NOT NULL,
    "action" "ActionType" NOT NULL,
    "observation" TEXT,
    "files" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActionLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_cpf_key" ON "User"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "Pacient_precCp_key" ON "Pacient"("precCp");

-- CreateIndex
CREATE UNIQUE INDEX "RequestResponse_requestId_receiverId_key" ON "RequestResponse"("requestId", "receiverId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Request" ADD CONSTRAINT "Request_pacientCpf_fkey" FOREIGN KEY ("pacientCpf") REFERENCES "Pacient"("cpf") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Request" ADD CONSTRAINT "Request_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestResponse" ADD CONSTRAINT "RequestResponse_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestResponse" ADD CONSTRAINT "RequestResponse_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionLog" ADD CONSTRAINT "ActionLog_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionLog" ADD CONSTRAINT "ActionLog_requestResponseId_fkey" FOREIGN KEY ("requestResponseId") REFERENCES "RequestResponse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionLog" ADD CONSTRAINT "ActionLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
