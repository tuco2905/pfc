import Card from '@/components/common/card';
import SpinLoading from '@/components/common/loading/SpinLoading';
import RequestInfo from '@/components/requests/RequestInfo';
import fetcher from '@/fetcher';
import { checkPermission, UserType } from '@/permissions/utils';
import { auth } from '@@/auth';
import { GetServerSidePropsContext } from 'next';
import { useRouter } from 'next/router';
import { RequestStatus, Role } from '@prisma/client';
import useSWR from 'swr';
import Accordion from '@/components/common/accordion';
import { TRequestInfoWithResponses } from '@/common-types';
import { isStatusForRole } from '@/utils';
import ResponsesTable from '@/components/responses/ResponsesTable';
import { useMemo } from 'react';
import RequestForm from '@/components/requests/RequestForm';
import ActionsTable from '@/components/actions/ActionsTable';

export default function RequestPage({ role }: { role: Role }) {
  const router = useRouter();
  const { requestId } = router.query;

  const { data: request, isLoading } = useSWR<TRequestInfoWithResponses>(
    `/api/requests/${requestId}`,
    fetcher,
    {
      revalidateOnFocus: false,
    },
  );

  const responses = useMemo(() => request?.requestResponses, [request]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <h1 className="text-2xl font-bold text-grafite">
          Solicitação {requestId}
        </h1>
        <div className="flex flex-col gap-4 px-2">
          <div className="flex w-full items-center justify-center">
            <SpinLoading size={10} showText />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-2xl font-bold text-grafite">
        Solicitação {requestId}
      </h1>
      <div className="flex flex-col gap-4 px-2">
        {request?.status && (
          <h2 className="text-xl font-bold text-grafite">
            Status: {request.status.replaceAll('_', ' ').replace(/\d/g, '')}
          </h2>
        )}
        <Accordion.Root startOpen>
          <Accordion.Header>
            <h2 className="text-xl font-bold text-grafite">
              Detalhes da solicitação
            </h2>
          </Accordion.Header>
          <Accordion.Body>
            <Card>
              <RequestInfo request={request} />
            </Card>
          </Accordion.Body>
        </Accordion.Root>
        {request?.requestActions && request.requestActions.length > 0 && (
          <Accordion.Root>
            <Accordion.Header>
              <h2 className="text-xl font-bold text-grafite">
                Histórico de ações
              </h2>
            </Accordion.Header>
            <Accordion.Body>
              <ActionsTable actions={request.requestActions || []} />
            </Accordion.Body>
          </Accordion.Root>
        )}
        {request?.requestResponses &&
          request.requestResponses.length > 0 &&
          request?.status !== RequestStatus.AGUARDANDO_PASSAGEM && (
            <div className="flex flex-col gap-2">
              <h2 className="w-full border-b-2 border-cinzaClaro py-1 text-xl font-bold text-grafite">
                Respostas
              </h2>
              <ResponsesTable responses={request.requestResponses} />
            </div>
          )}
        {isStatusForRole(request?.status, role) && (
          <RequestForm
            status={request?.status}
            responses={responses}
            userRole={role}
          />
        )}
      </div>
    </div>
  );
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const session = await auth(context);
  const { role } = session?.user as UserType;

  if (!checkPermission(role, 'requests:read')) {
    return {
      redirect: {
        destination: '/solicitacoes',
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
