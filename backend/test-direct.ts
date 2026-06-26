import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient({ datasources: { db: { url: 'postgresql://postgres:VvJmBf-VBJ3v2uS@db.sdbauortmlqyojnkaylr.supabase.co:5432/postgres' } } });
prisma.usuario.findFirst().then(console.log).catch(console.error).finally(() => prisma.$disconnect());
