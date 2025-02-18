import { checkPermission, UserType } from '@/permissions/utils';
import { auth } from '@@/auth';
import prisma from '@@/prisma/prismaClient';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const session = await auth(req, res);
  const { role } = session?.user as UserType;

  if (!session?.user) {
    return res.status(401).json({ message: 'Usuário não autenticado' });
  }

  if (req.method === 'GET') {
    if (!checkPermission(role, 'organizations:read')) {
      return res.status(403).json({ message: 'Usuário não autorizado' });
    }

    const organizations = await prisma.organization.findMany({
      select: {
        id: true,
        name: true,
      },
    });

    return res.status(200).json(organizations);
  }

  return res.status(405).json({ message: 'Método não permitido' });
}
