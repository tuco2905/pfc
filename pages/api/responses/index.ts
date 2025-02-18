import { checkPermission, UserType } from '@/permissions/utils';
import { isStatusForRole } from '@/utils';
import { auth } from '@@/auth';
import prisma from '@@/prisma/prismaClient';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const session = await auth(req, res);
  const { userId, role } = session?.user as UserType;

  if (!session?.user) {
    return res.status(401).json({ message: 'Usuário não autenticado' });
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      organizationId: true,
    },
  });

  if (req.method === 'GET') {
    if (!checkPermission(role, 'requests:read')) {
      return res.status(403).json({ message: 'Usuário não autorizado' });
    }

    const { filter } = req.query;

    let whereClause: any = {
      receiverId: dbUser?.organizationId || '',
    };

    if (filter === 'sent') {
      whereClause = {
        ...whereClause,
        actions: {
          some: {
            userId,
          },
        },
      };
    }

    const requestResponses = await prisma.requestResponse.findMany({
      where: whereClause,
      include: {
        request: {
          include: {
            sender: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        updatedAt: 'asc',
      },
    });

    const roleResponses = requestResponses.filter((requestResponse) =>
      isStatusForRole(requestResponse.status, role),
    );

    return res
      .status(200)
      .json(filter === 'sent' ? requestResponses : roleResponses);
  }

  if (req.method === 'POST') {
    if (!checkPermission(role, 'requests:update')) {
      return res.status(403).json({ message: 'Usuário não autorizado' });
    }

    const { requestId, receiverId, ...rest } = req.body;

    const requestExists = await prisma.request.findUnique({
      where: { id: requestId },
    });

    const receiverExists = await prisma.organization.findUnique({
      where: { id: receiverId },
    });

    if (!requestExists) {
      return res.status(400).json({ message: 'Request ID não encontrado' });
    }

    if (!receiverExists) {
      return res.status(400).json({ message: 'Receiver ID não encontrado' });
    }

    const response = await prisma.requestResponse.create({
      data: {
        ...rest,
        request: {
          connect: {
            id: requestId,
          },
        },
        receiver: {
          connect: {
            id: receiverId,
          },
        },
        sender: {
          connect: {
            id: dbUser?.organizationId,
          },
        },
      },
    });

    return res.status(201).json(response);
  }

  return res.status(405).json({ message: 'Método não permitido' });
}
