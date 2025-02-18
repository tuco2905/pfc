'use server';

import { signIn } from '@@/auth';
import { AuthError } from 'next-auth';

const login = async (values: any) => {
  const { email, password } = values;

  try {
    await signIn('credentials', {
      email,
      password,
      redirectTo: '/solicitacoes',
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: 'Credenciais inválidas.' };
    }
    throw error;
  }

  return true;
};

export default login;
