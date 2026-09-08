import { Request } from 'express';

import { User } from '../../database/entities/user.entity.js';

export type AuthenticatedRequest = Request & {
  user: User;
};