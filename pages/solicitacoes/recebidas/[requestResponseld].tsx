/* eslint-disable jsx-a11y/control-has-associated-label */
import Card from '@/components/common/card';
import SpinLoading from '@/components/common/loading/SpinLoading';
import RequestInfo, {
  transformToBoolean,
} from '@/components/requests/RequestInfo';
import RequestResponseInfo from '@/components/requests/RequestResponseInfo';
import fetcher from '@/fetcher';
import { checkPermission, UserType } from '@/permissions/utils';
import { auth } from '@@/auth';
import { GetServerSidePropsContext } from 'next';
import { useRouter } from 'next/router';
import { Role } from '@prisma/client';
import useSWR from 'swr';
import Accordion from '@/components/common/accordion';
import Select from '@/components/common/select';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import Button from '@/components/common/button';
import modal from '@/components/common/modal';
import Swal from 'sweetalert2';
import { TRequestResponseWithRequestInfo } from '@/common-types';
import { isStatusForRole } from '@/utils';
import {
  ArrowUpTrayIcon,
  DocumentIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useState } from 'react';
import ActionsTable from '@/components/actions/ActionsTable';

const opinionFormSchema = z.object({
  favorable: z.string().transform(transformToBoolean).or(z.boolean()),
  observation: z.string().optional(),
  selectedAuditor: z
    .object({
      value: z.string(),
      label: z.string(),
    })
    .optional(),
});

type OpinionFormDataType = z.infer<typeof opinionFormSchema>;

export default function RequestPage({ role }: { role: Role }) {
  const router = useRouter();
  const { requestResponseId } = router.query;

  const { register, setValue, handleSubmit } = useForm<OpinionFormDataType>({
    resolver: zodResolver(opinionFormSchema),
  });

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { value, name } = e.target;
    setValue(name as keyof OpinionFormDataType, value);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFilesArray = Array.from(e.target.files);
      setSelectedFiles([...selectedFiles, ...newFilesArray]);
    }
  };

  const handleRemoveFile = (file: File) => {
    setSelectedFiles(selectedFiles.filter((f) => f.name !== file.name));
  };

  const { data: requestResponse, isLoading } =
    useSWR<TRequestResponseWithRequestInfo>(
      `/api/responses/${requestResponseId}`,
      fetcher,
      {
        revalidateOnFocus: false,
      },
    );

  const onSubmit = async (data: OpinionFormDataType) => {
    const formData = new FormData();
    Object.entries({ ...data, files: selectedFiles }).forEach(
      ([key, value]) => {
        if (key === 'files') {
          (value as File[]).forEach((file) => {
            formData.append('files', file);
          });
        } else if (Array.isArray(value)) {
          formData.append(`${key}[]`, JSON.stringify(value));
        } else if (typeof value === 'object') {
          formData.append(key, JSON.stringify(value));
        } else {
          formData.append(key, value as string);
        }
      },
    );

    const response = await fetch(`/api/responses/${requestResponseId}/status`, {
      method: 'PATCH',
      body: formData,
    });

    if (response.ok) {
      router.push('/solicitacoes');
    } else {
      Swal.fire({
        title: 'Erro',
        icon: 'error',
        text: 'Ocorreu um erro ao enviar o parecer',
        customClass: {
          confirmButton:
            'bg-verde text-white border-none py-2 px-4 text-base cursor-pointer hover:bg-verdeEscuro',
        },
      });
    }
  };

  const submitConfirmation = async (data: OpinionFormDataType) => {
    modal({
      onConfirm: () => onSubmit(data),
    });
  };

  if (isLoading) {
    return (
      <div className="flex w-full items-center justify-center">
        <SpinLoading size={10} showText />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-2xl font-bold text-grafite">
        Solicitação {requestResponse?.requestId}
      </h1>
      <div className="flex flex-col gap-4 px-2">
        <Accordion.Root startOpen>
          <Accordion.Header>
            <h2 className="text-xl font-bold text-grafite">
              Detalhes da solicitação
            </h2>
          </Accordion.Header>
          <Accordion.Body>
            <Card>
              <RequestInfo request={requestResponse?.request} />
            </Card>
          </Accordion.Body>
        </Accordion.Root>
        {requestResponse?.actions && requestResponse.actions.length > 0 && (
          <Accordion.Root>
            <Accordion.Header>
              <h2 className="text-xl font-bold text-grafite">
                Histórico de ações
              </h2>
            </Accordion.Header>
            <Accordion.Body>
              <ActionsTable actions={requestResponse.actions || []} />
            </Accordion.Body>
          </Accordion.Root>
        )}
        {(typeof requestResponse?.opmeCost === 'number' ||
          typeof requestResponse?.procedureCost === 'number' ||
          role === Role.COTADOR) && (
          <Accordion.Root startOpen>
            <Accordion.Header>
              <h2 className="text-xl font-bold text-grafite">Orçamento</h2>
            </Accordion.Header>
            <Accordion.Body>
              <Card>
                {role === Role.COTADOR &&
                !(
                  typeof requestResponse?.opmeCost === 'number' ||
                  typeof requestResponse?.procedureCost === 'number'
                ) ? (
                  <RequestResponseInfo />
                ) : (
                  <RequestResponseInfo requestResponse={requestResponse} />
                )}
              </Card>
            </Accordion.Body>
          </Accordion.Root>
        )}
        {isStatusForRole(requestResponse?.status, role) &&
          role !== Role.COTADOR && (
            <form
              onSubmit={handleSubmit(submitConfirmation)}
              className="flex w-full flex-col gap-2"
            >
              <h3 className="text-xl font-bold text-grafite">Parecer</h3>
              <Card>
                <div className="flex w-full flex-col gap-2">
                  <Select
                    label="Favorável?"
                    options={[
                      { label: 'Sim', value: 'true' },
                      { label: 'Não', value: 'false' },
                    ]}
                    {...register('favorable', {
                      required: true,
                      onChange: (e) => handleSelectChange(e),
                    })}
                    divClassname="w-fit"
                  />
                  <div className="flex flex-col gap-1">
                    <span className="font-medium text-grafite">
                      Observações
                    </span>
                    <textarea
                      placeholder="Digite sua observação aqui..."
                      rows={3}
                      className="w-full rounded border border-gray-300 px-2 text-grafite focus:outline-0 focus:ring focus:ring-verde"
                      {...register('observation')}
                    />
                  </div>
                  <div className="flex flex-col items-start gap-1">
                    <span className="font-medium text-grafite">Anexos</span>
                    <div className="flex items-center gap-2">
                      {selectedFiles.map((file) => (
                        <div
                          key={file.name}
                          className="relative flex flex-col items-center justify-center rounded-md border border-dashed border-gray-400 bg-cinzaClaro/50 p-4"
                        >
                          <button
                            type="button"
                            onClick={() => handleRemoveFile(file)}
                            className="absolute right-2 top-2"
                          >
                            <XMarkIcon className="size-4 stroke-gray-600" />
                          </button>
                          <DocumentIcon className="size-6 w-full stroke-gray-400" />
                          <span className="text-sm font-medium text-grafite">
                            {file.name}
                          </span>
                        </div>
                      ))}
                      <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-gray-400 bg-cinzaClaro/50 p-4">
                        <ArrowUpTrayIcon className="size-6 w-full stroke-gray-400" />
                        <label htmlFor="file-upload" className="cursor-pointer">
                          <span className="text-sm font-medium text-blue-500">
                            Adicionar arquivo
                          </span>
                          <input
                            id="file-upload"
                            type="file"
                            className="sr-only"
                            onChange={handleFileChange}
                            multiple
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
              <Button type="submit" className="mt-3 max-w-40">
                Enviar
              </Button>
            </form>
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
