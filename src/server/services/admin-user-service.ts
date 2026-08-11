import type {
  AdminUserRepository,
  UserListQuery,
  UserRole,
} from "@/domain/admin/users";

export class AdminUserService {
  constructor(private readonly repository: AdminUserRepository) {}

  listUsers(query: UserListQuery) {
    return this.repository.listUsers(query);
  }

  findById(userId: string) {
    return this.repository.findById(userId);
  }

  setRole(
    userId: string,
    role: UserRole,
    actorUserId: string,
    now = new Date(),
  ) {
    return this.repository.setRole(userId, role, actorUserId, now);
  }

  setLocked(
    userId: string,
    locked: boolean,
    actorUserId: string,
    now = new Date(),
  ) {
    return this.repository.setLocked(userId, locked, actorUserId, now);
  }

  recordPasswordResetTriggered(
    userId: string,
    actorUserId: string,
    now = new Date(),
  ) {
    return this.repository.recordPasswordResetTriggered(
      userId,
      actorUserId,
      now,
    );
  }
}
