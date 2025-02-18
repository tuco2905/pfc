import { checkPermission, UserType } from '@/permissions/utils';
import { auth } from '@@/auth';
import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import mime from 'mime-types';

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
    if (!checkPermission(role, 'files:download')) {
      return res.status(403).json({ message: 'Usuário não autorizado' });
    }

    const { filePath } = req.query;
    const allowedDirectory = path.join(process.cwd(), 'public/arquivos');

    const absolutePath = path.join(process.cwd(), filePath as string);

    if (!absolutePath.startsWith(allowedDirectory)) {
      return res.status(403).json({ message: 'Acesso negado' });
    }

    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ message: 'Arquivo não encontrado' });
    }

    const fileName = path.basename(absolutePath);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=${encodeURIComponent(fileName)}`,
    );
    const mimeType = mime.lookup(absolutePath) || 'application/octet-stream';
    res.setHeader('Content-Type', mimeType);

    const stream = fs.createReadStream(absolutePath);
    return stream.pipe(res);
  }

  return res.status(405).json({ message: 'Método não permitido' });
}

export const config = {
  api: {
    bodyParser: false,
  },
};
