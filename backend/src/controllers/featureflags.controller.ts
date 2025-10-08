import { Controller, Get, Put, Param, Body, Req, UseBefore } from 'routing-controllers';
import { PrismaClient } from '@prisma/client';
import authMiddleware from '@middlewares/auth.middleware';
import { RequestWithUser } from '@/interfaces/auth.interface';

const prisma = new PrismaClient();
const application = process.env.APPLICATION || 'KC';

export interface FeatureFlag {
  id: number;
  name: string;
  enabled: boolean;
  application: string;
  createdAt: string;
  updatedAt: string;
}

@Controller()
export class FeatureFlagController {
  @Get('/flags')
  @UseBefore(authMiddleware)
  async getFlags(@Req() req: RequestWithUser) {
    const flags = await prisma.featureFlags.findMany({
      where: { application },
    });

    return {
      data: flags.map(f => ({
        id: f.id,
        name: f.name,
        enabled: f.enabled,
        application: f.application,
        createdAt: f.createdAt,
        updatedAt: f.updatedAt,
      })),
      status: 200,
    };
  }

  @Get('/flags/id/:id')
  @UseBefore(authMiddleware)
  async getFlag(@Param('id') id: string) {
    const numericId = Number(id);
    const flag = await prisma.featureFlags.findUnique({
      where: { id: numericId },
    });

    if (!flag) throw new Error('Flag not found');

    return {
      data: flag,
      status: 200,
    };
  }

  @Put('/flags/:id')
  async updateFlag(@Param('id') id: number, @Body() body: { enabled: boolean }) {
    console.log(body);
    const updated = await prisma.featureFlags.update({
      where: { id },
      data: { enabled: body.enabled },
    });
    return {
      ...updated,
    };
  }
}
