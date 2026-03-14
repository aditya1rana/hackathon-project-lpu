import prisma from '../../config/database';

/**
 * User Repository — Data access for user management operations.
 */
export class UserRepository {
  async findAll(params: {
    skip: number;
    limit: number;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
    search?: string;
    role?: string;
  }) {
    const where: any = { deletedAt: null };

    if (params.search) {
      where.OR = [
        { firstName: { contains: params.search, mode: 'insensitive' } },
        { lastName: { contains: params.search, mode: 'insensitive' } },
        { email: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    if (params.role) {
      where.role = { name: params.role };
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: { role: true },
        skip: params.skip,
        take: params.limit,
        orderBy: { [params.sortBy]: params.sortOrder },
      }),
      prisma.user.count({ where }),
    ]);

    return { users, total };
  }

  async findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      include: { role: true },
    });
  }

  async update(id: string, data: {
    firstName?: string;
    lastName?: string;
    department?: string;
    phone?: string;
    isActive?: boolean;
    avatar?: string;
  }) {
    return prisma.user.update({
      where: { id },
      data,
      include: { role: true },
    });
  }

  async updateRole(userId: string, roleName: string) {
    const role = await prisma.role.findUnique({ where: { name: roleName as any } });
    if (!role) throw new Error(`Role ${roleName} not found`);

    return prisma.user.update({
      where: { id: userId },
      data: { roleId: role.id },
      include: { role: true },
    });
  }

  async softDelete(id: string) {
    return prisma.user.delete({ where: { id } });
  }
}

export const userRepository = new UserRepository();
