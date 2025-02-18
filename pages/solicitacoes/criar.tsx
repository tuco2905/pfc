import Card from '@/components/common/card';
import RequestInfo from '@/components/requests/RequestInfo';
import { checkPermission, UserType } from '@/permissions/utils';
import { auth } from '@@/auth';
import { GetServerSidePropsContext } from 'next';

export default function CreateRequestPage() {
  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-2xl font-bold text-grafite">
        Criar solicitação de evacuação
      </h1>
      <Card>
        <RequestInfo />
      </Card>
    </div>
  );
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const session = await auth(context);
  const { role } = session?.user as UserType;

  if (!checkPermission(role, 'requests:create')) {
    return {
      redirect: {
        destination: '/solicitacoes',
        permanent: false,
      },
    };
  }

  return {
    props: {},
  };
}
