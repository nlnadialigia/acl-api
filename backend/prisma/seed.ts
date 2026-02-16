import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import "dotenv/config";
import { plugins } from './aux';


const connectionString = `${process.env.DATABASE_URL}`;

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const adminEmail = 'admin@portal.com';

  console.log('Seeding admin...');

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: 'Portal Administrator',
      role: 'PORTAL_ADMIN',
    },
  });

  console.log('Seeding plugins...');

  await prisma.plugin.createMany({
    data: plugins
  });

  console.log('Seeding public plugins...');

  const publicPlugins = await prisma.plugin.findMany({
    where: { isPublic: true },
    include: { roleDefinitions: true }
  });

  for (const plugin of publicPlugins) {
    if (plugin.roleDefinitions.length === 0) {
      console.log(`Criando role para plugin público: ${plugin.name}`);
      await prisma.pluginRole.create({
        data: {
          pluginId: plugin.id,
          name: "Public Access",
          description: "Default role for public access",
        }
      });
    }
  }

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
