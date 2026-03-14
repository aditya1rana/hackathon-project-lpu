import { userRepository } from './user.repository';
import { ServiceResult } from '../../shared/types';

/**
 * User Service — Business logic for user management.
 */
export class UserService {
  async getAllUsers(params: {
    skip: number;
    limit: number;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
    search?: string;
    role?: string;
  }): Promise<ServiceResult<{ users: any[]; total: number }>> {
    const { users, total } = await userRepository.findAll(params);
    // Strip password hashes from results
    const sanitized = users.map(({ passwordHash, ...u }) => u);
    return { success: true, data: { users: sanitized, total } };
  }

  async getUserById(id: string): Promise<ServiceResult<any>> {
    const user = await userRepository.findById(id);
    if (!user) return { success: false, error: 'User not found', statusCode: 404 };
    const { passwordHash, ...sanitized } = user;
    return { success: true, data: sanitized };
  }

  async updateUser(id: string, data: any): Promise<ServiceResult<any>> {
    const user = await userRepository.findById(id);
    if (!user) return { success: false, error: 'User not found', statusCode: 404 };

    const updated = await userRepository.update(id, data);
    const { passwordHash, ...sanitized } = updated;
    return { success: true, data: sanitized };
  }

  async updateUserRole(userId: string, roleName: string): Promise<ServiceResult<any>> {
    try {
      const updated = await userRepository.updateRole(userId, roleName);
      const { passwordHash, ...sanitized } = updated;
      return { success: true, data: sanitized };
    } catch {
      return { success: false, error: 'Failed to update role', statusCode: 400 };
    }
  }

  async deleteUser(id: string): Promise<ServiceResult<null>> {
    const user = await userRepository.findById(id);
    if (!user) return { success: false, error: 'User not found', statusCode: 404 };
    await userRepository.softDelete(id);
    return { success: true, data: null, message: 'User deleted' };
  }
}

export const userService = new UserService();
