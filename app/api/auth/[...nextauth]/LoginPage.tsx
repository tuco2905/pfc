'use client';

import Button from '@/components/common/button';
import Card from '@/components/common/card';
import Input from '@/components/common/input';
import login from '@@/actions/login';
import { useState } from 'react';
import { SubmitHandler, useForm } from 'react-hook-form';

type FormData = {
  email: string;
  password: string;
};

export default function LoginPage() {
  const { register, handleSubmit } = useForm<FormData>();

  const [isLoading, setIsLoading] = useState(false);

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    setIsLoading(true);
    await login(data);
    setIsLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-tr from-verdeClaro to-verdeEscuro">
      <Card>
        <div className="flex w-96 flex-col gap-10">
          <div className="flex flex-col items-center justify-center gap-2">
            <img src="/logo-dsau.gif" className="size-36" alt="" />
            <h1 className="text-center text-2xl font-bold text-grafite">
              Sistema de Regulação de Beneficiários
            </h1>
          </div>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
          >
            <Input
              label="Email"
              type="email"
              {...register('email', {
                required: true,
              })}
            />
            <Input
              label="Senha"
              type="password"
              {...register('password', {
                required: true,
              })}
            />
            <Button type="submit" disabled={isLoading} isLoading={isLoading}>
              Entrar
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
