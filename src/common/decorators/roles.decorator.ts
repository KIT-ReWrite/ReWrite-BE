import { SetMetadata } from '@nestjs/common';

export const Roles = (...roles: ('student' | 'teacher')[]) =>
  SetMetadata('roles', roles);
