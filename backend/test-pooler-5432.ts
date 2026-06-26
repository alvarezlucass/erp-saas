import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient({ datasources: { db: { url: 'postgresql://postgres.sdbauortmlqyojnkaylr:VvJmBf-VBJ3v2uS@aws-0-us-east-1.pooler.supabase.com:5432/postgres?pgbouncer=true' } } });
prisma.usuario.findFirst().then(console.log).catch(console.error).finally(() => prisma.$disconnect());
