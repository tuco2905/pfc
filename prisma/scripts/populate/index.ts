/* eslint-disable no-console */
import { PrismaClient } from '@prisma/client';
import populateRegions from './regions';
import populateOrganizations from './organizations';
import populatePacients from './pacients';
import populateUsers from './users';

async function main() {
  const prisma = new PrismaClient();
  await populatePacients(prisma);
  await populateRegions(prisma);
  await populateOrganizations(prisma);
  await populateUsers(prisma);

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
