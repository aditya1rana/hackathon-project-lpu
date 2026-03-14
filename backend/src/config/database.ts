import { PrismaClient } from '@prisma/client';
import { env } from './env';

/**
 * Singleton Prisma client with query logging in development mode.
 * Soft deletes are handled at the repository layer using explicit
 * where: { deletedAt: null } clauses.
 */
const prisma = new PrismaClient({
  log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

export default prisma;
