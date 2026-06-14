import { UserResponse } from '../dto/user-response.dto';
import { UserEntity } from '../persistence/user.entity';

export function mapUserResponse(user: UserEntity): UserResponse {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
