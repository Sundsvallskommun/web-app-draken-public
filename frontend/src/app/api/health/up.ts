import type { NextApiRequest, NextApiResponse } from 'next';

import axios from 'axios';
import https from 'https';

const requireAuth = process.env.HEALTH_AUTH === 'true';
const authUsername = process.env.HEALTH_USERNAME;
const authPassword = process.env.HEALTH_PASSWORD;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { headers: resHeaders } = req;
  const { authorization } = resHeaders;
  const userAuth64 = Buffer.from(`${authUsername}:${authPassword}`).toString('base64');

  if (requireAuth && authorization !== `Basic ${userAuth64}`) {
    res.status(401).send('Not Authorized');
    return;
  }

  try {
    const agent = new https.Agent({
      rejectUnauthorized: false,
    });
    const health = await axios
      .get(`${process.env.NEXT_PUBLIC_API_URL}/health/up`, { httpsAgent: agent })
      .then((res) => {
        return res.data;
      });

    res.status(200).send(health);
  } catch (error) {
    res.status(500).send({
      error: error.toString(),
      status: 'ERROR!',
    });
  }
}
