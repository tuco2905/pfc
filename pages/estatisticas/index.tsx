import Button from '@/components/common/button';
import SpinLoading from '@/components/common/loading/SpinLoading';
import CountRanking from '@/components/stats/CountRanking';
import { cbhpmInfo } from '@/data/cbhpm/codes';
import fetcher from '@/fetcher';
import { checkPermission, UserType } from '@/permissions/utils';
import { auth } from '@@/auth';
import { GetServerSidePropsContext } from 'next';
import { useState } from 'react';
import ReactSelect, { MultiValue } from 'react-select';
import useSWR from 'swr';

const regionOptions = Array(12)
  .fill(0)
  .map((_, index) => ({
    value: `${index + 1}RM`,
    label: `${index + 1}ª Região Militar`,
  }));

export default function StatsPage() {
  const [filters, setFilters] = useState<{
    region: {
      value: string;
      label: string;
    }[];
    organization: {
      value: string;
      label: string;
    }[];
  }>({
    region: [],
    organization: [],
  });

  const [isPrinting, setisPrinting] = useState(false);

  const { data: organizations, isLoading: isLoadingOrganizations } = useSWR<
    {
      id: string;
      name: string;
    }[]
  >('/api/organizations', fetcher, {
    revalidateOnFocus: false,
  });

  const organizationOptions = organizations?.map((org) => ({
    value: org.id,
    label: org.name,
  }));

  const { data: statsData, isLoading: isLoadingStats } = useSWR<{
    requestsByOrganization: {
      id: string;
      name: string;
      _count: {
        sentRequests: number;
      };
    }[];
    requestsByRegion: {
      id: string;
      name: string;
      _count: {
        sentRequests: number;
      };
    }[];
    cbhpmRanking: {
      cbhpmCode: string;
      _count: {
        _all: number;
      };
    }[];
  }>(
    `/api/stats?${new URLSearchParams({
      // Encode base64 para evitar URLs muito longas
      regions: btoa(filters.region.map((filter) => filter.value).join(',')),
      organizations: btoa(
        filters.organization.map((filter) => filter.value).join(','),
      ),
    })}`,
    fetcher,
    {
      revalidateOnFocus: false,
    },
  );

  const handleFilterChange = (
    newValue: MultiValue<{
      value: string;
      label: string;
    }>,
    filter: 'region' | 'organization',
  ) => {
    setFilters((prevFilters) => ({
      ...prevFilters,
      [filter]: newValue,
    }));
  };

  const cbhpmRanking = statsData?.cbhpmRanking.map((item) => {
    const cbhpm = cbhpmInfo.find((c) => c.id === item.cbhpmCode);

    return {
      id: item.cbhpmCode,
      name: cbhpm?.description || '',
      _count: {
        sentRequests: item._count._all,
      },
    };
  });

  if (isLoadingOrganizations || isLoadingStats) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <h1 className="text-2xl font-bold text-grafite">Estatísticas</h1>
        <div className="flex w-full items-center justify-center">
          <SpinLoading size={10} showText />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <Button
        onClick={() => {
          setisPrinting(true);
          setTimeout(() => {
            window.print();
            setisPrinting(false);
          }, 100);
        }}
        className="w-fit print:hidden"
      >
        Exportar relatório
      </Button>
      <h1 className="text-2xl font-bold text-grafite">Estatísticas</h1>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="font-bold text-grafite">Região:</span>
          <ReactSelect
            isMulti
            value={filters.region}
            options={regionOptions}
            onChange={(newValue) => handleFilterChange(newValue, 'region')}
            placeholder="Todas"
            className="min-w-44"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="font-bold text-grafite">OM:</span>
          <ReactSelect
            isMulti
            value={filters.organization}
            options={organizationOptions}
            onChange={(newValue) =>
              handleFilterChange(newValue, 'organization')
            }
            placeholder="Todas"
            className="min-w-44"
          />
        </div>
      </div>
      <div
        className={`${isPrinting ? 'flex flex-col' : 'grid grid-cols-2 justify-between'} gap-2`}
      >
        {statsData?.requestsByRegion && (
          <div className="flex flex-col gap-2">
            <span className="font-bold text-grafite">Solicitações por RM:</span>
            <CountRanking
              entity="RM"
              ranking={statsData.requestsByRegion}
              isPrinting={isPrinting}
            />
          </div>
        )}
        {statsData?.requestsByOrganization && (
          <div className="flex flex-col gap-2">
            <span className="font-bold text-grafite">Solicitações por OM:</span>
            <CountRanking
              entity="OM"
              ranking={statsData.requestsByOrganization}
              isPrinting={isPrinting}
            />
          </div>
        )}
        {cbhpmRanking && (
          <div className="flex flex-col gap-2">
            <span className="font-bold text-grafite">
              Procedimentos mais solicitados:
            </span>
            <CountRanking
              entity="Procedimento"
              ranking={cbhpmRanking}
              isPrinting={isPrinting}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const session = await auth(context);
  const { role } = session?.user as UserType;

  if (!checkPermission(role, 'stats:read')) {
    return {
      redirect: {
        destination: '/',
        permanent: false,
      },
    };
  }

  return {
    props: {
      role,
    },
  };
}
