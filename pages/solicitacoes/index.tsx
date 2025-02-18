import React from 'react';
import { useRouter } from 'next/router';
import TableRow from '@/components/common/tablerow';
import { GetServerSidePropsContext } from 'next';
import { auth } from '@@/auth';
import { checkPermission, UserType } from '@/permissions/utils';
import useSWR from 'swr';
import { Request, RequestResponse, Role } from '@prisma/client';
import fetcher from '@/fetcher';
import SpinLoading from '@/components/common/loading/SpinLoading';
import Button from '@/components/common/button';

export default function RequestsListPage({ role }: { role: Role }) {
  const router = useRouter();
  const { type } = router.query;

  const { data: requests, isLoading } = useSWR<
    (Request & {
      sender: { name: string };
    })[]
  >(`/api/requests?filter=${type || 'received'}`, fetcher, {
    revalidateOnFocus: false,
  });

  const { data: requestResponses, isLoading: isLoadingResponses } = useSWR<
    (RequestResponse & {
      request: Request & {
        sender: { name: string };
      };
    })[]
  >(`/api/responses?filter=${type || 'received'}`, fetcher, {
    revalidateOnFocus: false,
  });

  const adaptedRequestResponses =
    requestResponses?.map((response) => ({
      id: response.id,
      status: response.status,
      pacientCpf: response.request.pacientCpf,
      sender: {
        name: response.request.sender.name,
      },
      updatedAt: response.updatedAt,
      isResponse: true,
    })) || [];

  const allRequests: any[] = [
    ...(requests || []),
    ...adaptedRequestResponses,
  ].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex w-full items-center justify-between">
        <h1 className="text-2xl font-bold text-grafite">Solicitações</h1>
        {role === Role.OPERADOR_FUSEX && (
          <Button onClick={() => router.push('/solicitacoes/criar')}>
            Solicitar evacuação
          </Button>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() =>
            router.push(
              `/solicitacoes?${new URLSearchParams({
                type: 'received',
              })}`,
            )
          }
          className={`rounded p-1 text-sm ${type !== 'sent' ? 'bg-verdeClaro font-medium' : 'bg-cinzaClaro'} border border-gray-200 text-center text-grafite transition-all duration-100 ease-in-out hover:scale-105 hover:bg-verdeClaro hover:font-medium`}
        >
          Pendentes
        </button>
        <button
          type="button"
          onClick={() =>
            router.push(
              `/solicitacoes?${new URLSearchParams({
                type: 'sent',
              })}`,
            )
          }
          className={`rounded p-1 text-sm ${type === 'sent' ? 'bg-verdeClaro font-medium' : 'bg-cinzaClaro'} border border-gray-200 text-center text-grafite transition-all duration-100 ease-in-out hover:scale-105 hover:bg-verdeClaro hover:font-medium`}
        >
          Enviadas
        </button>
      </div>
      {!isLoading || !isLoadingResponses ? (
        <div className="block w-full overflow-x-auto">
          {allRequests && allRequests.length > 0 ? (
            <table className="w-full border-collapse items-center">
              <thead className="bg-white">
                <tr>
                  <th className="whitespace-nowrap border border-x-0 border-solid px-6 py-3 text-left align-middle text-xs font-bold uppercase">
                    ID
                  </th>
                  <th className="whitespace-nowrap border border-x-0 border-solid px-6 py-3 text-left align-middle text-xs font-bold uppercase">
                    Status
                  </th>
                  <th className="whitespace-nowrap border border-x-0 border-solid px-6 py-3 text-left align-middle text-xs font-bold uppercase">
                    Paciente
                  </th>
                  <th className="whitespace-nowrap border border-x-0 border-solid px-6 py-3 text-left align-middle text-xs font-bold uppercase">
                    Solicitante
                  </th>
                  <th className="whitespace-nowrap border border-x-0 border-solid px-6 py-3 text-left align-middle text-xs font-bold uppercase">
                    Tempo
                  </th>
                  <th className="whitespace-nowrap border border-x-0 border-solid px-6 py-3 text-left align-middle text-xs font-bold uppercase">
                    Última atualização
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cinzaClaro">
                {allRequests.map((request) => (
                  <TableRow
                    key={request.id}
                    request={request}
                    isResponse={request.isResponse}
                  />
                ))}
              </tbody>
            </table>
          ) : (
            <div className="flex w-full items-center justify-center rounded border-2 border-dashed border-cinzaClaro p-8">
              <p className="font-medium text-grafite">
                Nenhuma solicitação encontrada
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="flex w-full items-center justify-center">
          <SpinLoading size={10} showText />
        </div>
      )}
    </div>
  );
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const session = await auth(context);
  const { role } = session?.user as UserType;

  if (!checkPermission(role, 'requests:read')) {
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
