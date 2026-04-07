import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  private sanitize(user: any) {
    const { password, ...rest } = user;
    return { ...rest, id: rest.id.toString() };
  }

  async getMe(userId: bigint) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');
    return this.sanitize(user);
  }

  async updateMe(userId: bigint, dto: UpdateUserDto) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: dto,
    });
    return this.sanitize(user);
  }

  async updateProfileImage(userId: bigint, imageUrl: string) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { profile_image: imageUrl },
    });
    return { image_url: user.profile_image };
  }

  async getUserById(id: bigint) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');
    return this.sanitize(user);
  }
}
