/* eslint-disable no-console */
import { PrismaClient } from '@prisma/client';

const regions = [
  ...Array(12)
    .fill(0)
    .map((_, index) => ({
      id: `${index + 1}RM`,
      name: `${index + 1}ª Região Militar`,
    })),
  {
    id: 'dsau',
    name: 'Diretoria de Saúde',
  },
];

export default async function populateRegions(prisma: PrismaClient) {
  try {
    await Promise.all(
      regions.map((region) => prisma.region.create({ data: region })),
    );
    console.log('Tabela Region populada');
  } catch (error) {
    console.log('Erro ao popular tabela Region', error);
  }
}
