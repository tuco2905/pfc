import { checkPermission, UserType } from '@/permissions/utils';
import { auth } from '@@/auth';
import prisma from '@@/prisma/prismaClient';
import { PrismaClient } from '@prisma/client';
import { NextApiRequest, NextApiResponse } from 'next';

function decodeBase64(encodedString: string) {
  const decodedString = Buffer.from(encodedString, 'base64').toString('utf-8');

  if (decodedString === '') {
    return null;
  }

  return decodedString.split(',');
}

async function getRequestsByOrganization(
  prismaClient: PrismaClient,
  filters: {
    region:
      | {
          in: string[];
        }
      | undefined;
    organization:
      | {
          in: string[];
        }
      | undefined;
  },
) {
  const requestsByOrganization = await prismaClient.organization.findMany({
    where: {
      regionId: filters.region,
      id: filters.organization,
    },
    select: {
      id: true,
      name: true,
      region: {
        select: {
          id: true,
          name: true,
        },
      },
      _count: {
        select: {
          sentRequests: true,
        },
      },
    },
    orderBy: {
      sentRequests: {
        _count: 'desc',
      },
    },
  });

  return requestsByOrganization;
}

function getRequestsByRegion(
  requestsByOrganization: {
    id: string;
    name: string;
    region: {
      id: string;
      name: string;
    };
    _count: {
      sentRequests: number;
    };
  }[],
) {
  const requestsByRegionDictionary = requestsByOrganization.reduce(
    (acc, organization) => {
      const region = `${organization.region.id};${organization.region.name}`;

      if (!acc[region]) {
        acc[region] = 0;
      }

      acc[region] += organization._count.sentRequests;

      return acc;
    },
    {} as Record<string, number>,
  );

  const requestsByRegion = Object.entries(requestsByRegionDictionary).map(
    ([key, value]) => {
      const [id, name] = key.split(';');

      return {
        id,
        name,
        _count: {
          sentRequests: value,
        },
      };
    },
  );

  return requestsByRegion;
}

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
    if (!checkPermission(role, 'stats:read')) {
      return res.status(403).json({ message: 'Usuário não autorizado' });
    }

    const { regions, organizations } = req.query;

    const selectedRegions = decodeBase64(regions as string);
    const selectedOrganizations = decodeBase64(organizations as string);

    const filters: {
      region:
        | {
            in: string[];
          }
        | undefined;
      organization:
        | {
            in: string[];
          }
        | undefined;
    } = {
      region: undefined,
      organization: undefined,
    };

    if (selectedRegions) {
      filters.region = {
        in: selectedRegions,
      };
    }

    if (selectedOrganizations) {
      filters.organization = {
        in: selectedOrganizations,
      };
    }

    const requestsByOrganization = await getRequestsByOrganization(
      prisma,
      filters,
    );

    const requestsByRegion = getRequestsByRegion(requestsByOrganization);

    const cbhpmRanking = await prisma.request.groupBy({
      by: ['cbhpmCode'],
      where: {
        sender: {
          regionId: filters.region,
          id: filters.organization,
        },
      },
      _count: {
        _all: true,
      },
    });

    const cbhpmRankingSorted = cbhpmRanking.sort(
      (a, b) => b._count._all - a._count._all,
    );

    return res.status(200).json({
      requestsByOrganization,
      requestsByRegion,
      cbhpmRanking: cbhpmRankingSorted,
    });
  }

  return res.status(405).json({ message: 'Método não permitido' });
}
