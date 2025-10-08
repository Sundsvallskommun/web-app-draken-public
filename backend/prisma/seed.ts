import { PrismaClient } from '@prisma/client';
import { defaultFeatureFlags } from '../../frontend/src/config/feature-flags';

const prisma = new PrismaClient();
const application = process.env.APPLICATION || 'default';

async function main() {
  for (const [name, enabled] of Object.entries(defaultFeatureFlags)) {
    await prisma.featureFlags.upsert({
      where: { name_application: { name, application } },
      update: {},
      create: { name, enabled, application },
    });
  }

  console.log(`Seed finished for application: ${application}`);
}

main()
  .catch(console.error)
  .finally(async () => await prisma.$disconnect());
