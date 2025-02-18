/* eslint-disable no-console */
import { PrismaClient } from '@prisma/client';

const pacients = [
  {
    cpf: '12345678901',
    name: 'Fulano da Silva',
    precCp: '123456789',
    rank: 'Aspirante a Oficial',
    isDependent: false,
  },
  {
    cpf: '12345678902',
    name: 'Ciclano de Souza',
    precCp: '123456780',
    rank: 'Primeiro Tenente',
    isDependent: false,
  },
  {
    cpf: '12345678903',
    name: 'Beltrano de Oliveira',
    precCp: '123456781',
    rank: 'Tenente-Coronel',
    isDependent: false,
  },
];

export default async function populatePacients(prisma: PrismaClient) {
  try {
    await Promise.all(
      pacients.map((pacient) => prisma.pacient.create({ data: pacient })),
    );
    console.log('Tabela Pacient populada');
  } catch (error) {
    console.log('Erro ao popular tabela Pacient', error);
  }
}
