import { checkPermission, UserType } from '@/permissions/utils';
import { auth } from '@@/auth';
import prisma from '@@/prisma/prismaClient';
import { Role } from '@prisma/client';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const session = await auth(req, res);
  const { userId, role: userRole } = session?.user as UserType;

  if (!session?.user) {
    return res.status(401).json({ message: 'Usuário não autenticado' });
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      organizationId: true,
    },
  });

  if (!dbUser?.organizationId) {
    return res.status(403).json({ message: 'Usuário não autorizado' });
  }

  if (req.method === 'GET') {
    if (!checkPermission(userRole, 'users:read')) {
      return res.status(403).json({ message: 'Usuário não autorizado' });
    }

    const { role } = req.query;

    const users = await prisma.user.findMany({
      where: {
        organizationId: dbUser.organizationId,
        role: role as Role,
      },
      select: {
        id: true,
        name: true,
      },
    });

    return res.status(200).json(users);
  }

  return res.status(405).json({ message: 'Método não permitido' });
}
