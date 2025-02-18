import logAction from '@/log-action';
import { checkPermission, UserType } from '@/permissions/utils';
import { auth } from '@@/auth';
import prisma from '@@/prisma/prismaClient';
import { ActionType, RequestStatus } from '@prisma/client';
import formidable from 'formidable';
import { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import fs from 'fs';

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const session = await auth(req, res);
  const { userId, role } = session?.user as UserType;
  const { requestResponseId } = req.query;

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

    const requestResponse = await prisma.requestResponse.findUnique({
      where: {
        id: requestResponseId as string,
        receiverId: dbUser?.organizationId || '',
      },
      include: {
        request: {
          include: {
            pacient: true,
            sender: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!requestResponse) {
      return res
        .status(404)
        .json({ message: 'Resposta à solicitação não encontrada' });
    }

    const actions = await prisma.actionLog.findMany({
      where: {
        OR: [
          { requestId: requestResponse.requestId },
          { requestResponseId: requestResponseId as string },
        ],
      },
      include: {
        user: {
          include: {
            organization: {
              select: {
                name: true,
              },
            },
            region: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return res.status(200).json({
      ...requestResponse,
      actions: actions.map((action) => ({
        ...action,
        userName: action.user.name,
        userRole: action.user.role.replaceAll('_', ' '),
        userOrganization:
          action.user.region?.name || action.user.organization?.name,
      })),
    });
  }

  if (req.method === 'PUT') {
    if (!checkPermission(role, 'requests:update')) {
      return res.status(403).json({ message: 'Usuário não autorizado' });
    }

    const formData = formidable({ multiples: true });
    const [fields, files] = await formData.parse(req);
    const formattedFields = Object.entries(fields).reduce(
      (acc, [key, value]) => {
        if (value === undefined) {
          return acc;
        }

        if (key.includes('[]')) {
          const formattedKey = key.replace('[]', '');
          return {
            ...acc,
            [formattedKey]: JSON.parse(value[0]),
          };
        }

        if (value[0] === 'true' || value[0] === 'false') {
          return {
            ...acc,
            [key]: value[0] === 'true',
          };
        }

        return { ...acc, [key]: value[0] };
      },
      {} as any,
    );

    const { opmeCost, procedureCost, observation } = formattedFields;

    const updatedResponse = await prisma.$transaction(async (tx) => {
      const response = await tx.requestResponse.update({
        where: {
          id: requestResponseId as string,
          receiverId: dbUser?.organizationId || '',
        },
        data: {
          opmeCost: parseInt(opmeCost, 10),
          procedureCost: parseInt(procedureCost, 10),
          status: RequestStatus.AGUARDANDO_CHEFE_DIV_MEDICINA_3,
        },
      });

      await tx.actionLog.create(
        logAction(
          userId,
          response.id,
          ActionType.APROVACAO,
          observation,
          'response',
          files.files && files.files.length > 0
            ? files.files.map(
                (file) =>
                  `/public/arquivos/${requestResponseId}/${file.originalFilename}`,
              )
            : undefined,
        ),
      );

      return response;
    });

    if (files.files && files.files.length > 0) {
      const uploadDir = path.join(
        process.cwd(),
        `/public/arquivos/${requestResponseId}`,
      );

      files.files.forEach((file) => {
        const oldPath = file.filepath;
        const newPath = path.join(uploadDir, file.originalFilename as string);
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        fs.renameSync(oldPath, newPath);
      });
    }

    return res.status(200).json(updatedResponse);
  }

  return res.status(405).json({ message: 'Método não permitido' });
}

export const config = {
  api: {
    bodyParser: false,
  },
};
