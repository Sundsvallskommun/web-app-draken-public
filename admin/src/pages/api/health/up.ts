import type { NextApiRequest, NextApiResponse } from 'next';
import { apiService } from '@services/api-service';

const requireAuth = process.env.HEALTH_AUTH === 'true';
const authUsername = process.env.HEALTH_USERNAME;
const authPassword = process.env.HEALTH_PASSWORD;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { headers: resHeaders } = req;
  const { authorization } = resHeaders;
  const userAuth64 = Buffer.from(`${authUsername}:${authPassword}`).toString('base64');

  if (requireAuth && authorization !== `Basic ${userAuth64}`) {
    res.status(401).send('NOT_AUTHORIZED');
    return;
  }

  try {
    const health = await apiService.get('health/up').then((res) => res.data);

    res.status(200).send(health);
  } catch {
    res.status(500).send({
      status: 'ERROR!',
    });
  }
}
