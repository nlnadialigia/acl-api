import {PrismaPg} from '@prisma/adapter-pg';
import {PrismaClient} from '@prisma/client';
import "dotenv/config";


const connectionString = `${process.env.DATABASE_URL}`;

const adapter = new PrismaPg({connectionString});
const prisma = new PrismaClient({adapter});

async function main() {
  const adminEmail = 'admin@portal.com';

  const admin = await prisma.user.upsert({
    where: {email: adminEmail},
    update: {},
    create: {
      email: adminEmail,
      name: 'Portal Administrator',
      role: 'PORTAL_ADMIN',
    },
  });

  console.log('Seeding finished.');
  console.log({admin});
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
