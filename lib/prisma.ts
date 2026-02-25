import { PrismaClient } from '../prisma/generated/client'

const prisma = new PrismaClient({ accelerateUrl: process.env.DATABASE_URL! });

const globalForPrisma = global as unknown as { prisma: typeof prisma }

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma