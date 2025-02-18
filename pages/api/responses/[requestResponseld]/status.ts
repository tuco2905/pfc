import logAction from '@/log-action';
import {
  checkPermission,
  statusTransitions,
  UserType,
  terminalStatuses,
} from '@/permissions/utils';
import { auth } from '@@/auth';
import prisma from '@@/prisma/prismaClient';
import { ActionType, RequestStatus, Role } from '@prisma/client';
import { PrismaClient } from '@prisma/client/extension';
import formidable from 'formidable';
import { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import fs from 'fs';

function getNextStatus(currentStatus: RequestStatus, userRole: Role) {
  if (!statusTransitions[currentStatus]) {
    return 'unauthorized';
  }

  const { nextStatus, requiredRole } = statusTransitions[currentStatus] as {
    nextStatus: RequestStatus;
    previousStatus: RequestStatus | null;
    requiredRole: Role;
  };

  if (requiredRole !== userRole) {
    return 'unauthorized';
  }

  return nextStatus;
}

async function updateRequestDate(
  requestId: string,
  prismaClient: PrismaClient,
) {
  return prismaClient.request.update({
    where: {
      id: requestId,
    },
    data: {
      updatedAt: new Date(),
    },
  });
}

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const session = await auth(req, res);
  const { userId, role } = session?.user as UserType;
  const { requestResponseId } = req.query;

  if (!session?.user || !role) {
    return res.status(401).json({ message: 'Usuário não autenticado' });
  }

  const formData = formidable({ multiples: true });
  const [fields, files] = await formData.parse(req);
  const formattedFields = Object.entries(fields).reduce((acc, [key, value]) => {
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
  }, {} as any);

  if (req.method === 'PATCH') {
    if (!checkPermission(role, 'requests:update')) {
      return res.status(403).json({ message: 'Usuário não autorizado' });
    }

    const { favorable, observation } = formattedFields;

    const requestResponse = await prisma.requestResponse.findUnique({
      where: {
        id: requestResponseId as string,
      },
      select: {
        id: true,
        status: true,
        requestId: true,
      },
    });

    if (!requestResponse) {
      return res
        .status(404)
        .json({ message: 'Resposta à solicitação não encontrada' });
    }

    const request = await prisma.request.findUnique({
      where: {
        id: requestResponse.requestId,
      },
      select: {
        requestResponses: {
          select: {
            status: true,
          },
        },
      },
    });

    const allResponsesFinished =
      request?.requestResponses.filter((response) =>
        (terminalStatuses as RequestStatus[]).includes(response.status),
      ).length ===
      (request?.requestResponses.length || 0) - 1;

    if (!favorable) {
      const updatedRequestResponse = await prisma.$transaction(async (tx) => {
        await tx.actionLog.create(
          logAction(
            userId,
            requestResponseId as string,
            ActionType.REPROVACAO,
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

        const response = await tx.requestResponse.update({
          where: {
            id: requestResponseId as string,
          },
          data: {
            status: RequestStatus.REPROVADO,
          },
        });

        if (allResponsesFinished) {
          await tx.request.update({
            where: {
              id: requestResponse.requestId,
            },
            data: {
              status: RequestStatus.AGUARDANDO_HOMOLOGADOR_SOLICITANTE_2,
            },
          });
        }

        await updateRequestDate(requestResponse.requestId, tx);

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

      return res.status(200).json(updatedRequestResponse);
    }

    const nextStatus = getNextStatus(requestResponse.status, role);

    if (nextStatus === 'unauthorized') {
      return res.status(403).json({ message: 'Usuário não autorizado' });
    }

    const updatedRequestResponse = await prisma.$transaction(async (tx) => {
      await tx.actionLog.create(
        logAction(
          userId,
          requestResponseId as string,
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

      const response = await tx.requestResponse.update({
        where: {
          id: requestResponseId as string,
        },
        data: {
          status: nextStatus as RequestStatus,
        },
      });

      if (nextStatus === RequestStatus.APROVADO && allResponsesFinished) {
        await tx.request.update({
          where: {
            id: requestResponse.requestId,
          },
          data: {
            status: RequestStatus.AGUARDANDO_HOMOLOGADOR_SOLICITANTE_2,
          },
        });
      }

      await updateRequestDate(requestResponse.requestId, tx);

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

    return res.status(200).json(updatedRequestResponse);
  }

  if (req.method === 'PUT') {
    if (!checkPermission(role, 'requests:update')) {
      return res.status(403).json({ message: 'Usuário não autorizado' });
    }

    const { status } = formattedFields;

    if (!status) {
      return res
        .status(400)
        .json({ message: 'É necessário informar o novo status' });
    }

    try {
      const updatedRequestResponse = await prisma.requestResponse.update({
        where: { id: requestResponseId as string },
        data: { status: status as RequestStatus },
      });

      return res.status(200).json(updatedRequestResponse);
    } catch (error) {
      return res
        .status(500)
        .json({ message: 'Falha na atualização do status' });
    }
  }

  return res.status(405).json({ message: 'Método não permitido' });
}

export const config = {
  api: {
    bodyParser: false,
  },
};
