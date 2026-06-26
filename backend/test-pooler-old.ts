import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient({ datasources: { db: { url: 'postgresql://postgres:VvJmBf-VBJ3v2uS123@db.sdbauortmlqyojnkaylr.supabase.co:6543/postgres?pgbouncer=true' } } });
prisma.usuario.findFirst().then(console.log).catch(console.error).finally(() => prisma.$disconnect());
