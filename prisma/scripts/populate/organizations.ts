/* eslint-disable no-console */
import { PrismaClient } from '@prisma/client';

const organizations = [
  {
    id: 'hce',
    name: 'HCE - Hospital Central do Exército',
    region: {
      connect: {
        id: '1RM',
      },
    },
  },
  {
    id: 'pmpv',
    name: 'PMPV - Policlínica Militar da Praia Vermelha',
    region: {
      connect: {
        id: '1RM',
      },
    },
  },
  {
    id: 'hmasp',
    name: 'HMASP - Hospital Militar de Área de São Paulo',
    region: {
      connect: {
        id: '2RM',
      },
    },
  },
];

export default async function populateOrganizations(prisma: PrismaClient) {
  try {
    await Promise.all(
      organizations.map((organization) =>
        prisma.organization.create({ data: organization }),
      ),
    );
    console.log('Tabela Organization populada');
  } catch (error) {
    console.log('Erro ao popular tabela Organization', error);
  }
}
