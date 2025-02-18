/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-console */
import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const exampleOrganizations = ['hce', 'pmpv', 'hmasp'];

const requesterRoles = [
  Role.OPERADOR_FUSEX,
  Role.CHEFE_FUSEX,
  Role.AUDITOR,
  Role.CHEFE_AUDITORIA,
  Role.HOMOLOGADOR,
];

const requestedRoles = [
  Role.ESPECIALISTA,
  Role.CHEFE_DIV_MEDICINA,
  Role.COTADOR,
];

const regionRoles = [
  Role.CHEM,
  Role.CHEFE_SECAO_REGIONAL,
  Role.OPERADOR_SECAO_REGIONAL,
];

const dsauRoles = [Role.DRAS, Role.SUBDIRETOR_SAUDE];

const organizationUsers = exampleOrganizations.flatMap(
  (organization, orgIndex) =>
    [...requesterRoles, ...requestedRoles].map((role, index) => ({
      email: `${role.toLowerCase().replaceAll('_', '')}@${organization}.com`,
      role,
      name: `${role}`,
      cpf: `0${orgIndex}00000000${index}`,
      organization: {
        connect: {
          id: organization,
        },
      },
    })),
);

const regionUsers = ['1RM', '2RM'].flatMap((region, regIndex) =>
  regionRoles.map((role, index) => ({
    email: `${role.toLowerCase().replace('_', '')}@${region.toLowerCase()}.com`,
    role,
    name: `${role}`,
    cpf: `1${regIndex}00000000${index}`,
    region: {
      connect: {
        id: region,
      },
    },
  })),
);

const dsauUsers = dsauRoles.map((role, index) => ({
  email: `${role.toLowerCase().replace('_', '')}@dsau.com`,
  role,
  name: `${role}`,
  cpf: `2000000000${index}`,
  region: {
    connect: {
      id: 'dsau',
    },
  },
}));

export default async function populateUsers(prisma: PrismaClient) {
  const password = await bcrypt.hash('admin', 10);

  try {
    for (const user of organizationUsers) {
      await prisma.user.create({ data: { ...user, password } });
    }
    console.log('Usuários de OM populados');

    for (const user of regionUsers) {
      await prisma.user.create({ data: { ...user, password } });
    }
    console.log('Usuários de RM populados');

    for (const user of dsauUsers) {
      await prisma.user.create({ data: { ...user, password } });
    }
    console.log('Usuários da DSAU populados');
  } catch (error) {
    console.log('Erro ao popular usuários', error);
  }
}
