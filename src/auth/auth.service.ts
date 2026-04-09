import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { StringValue } from 'ms';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  private issueAccessToken(userId: string, username: string) {
    return this.jwt.sign(
      { sub: userId, username },
      {
        expiresIn: (process.env.JWT_ACCESS_EXPIRES_IN ?? '15m') as StringValue,
      },
    );
  }

  private issueRefreshToken(userId: string, username: string) {
    return this.jwt.sign(
      { sub: userId, username },
      {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN ?? '7d') as StringValue,
      },
    );
  }
  async register(dto: RegisterDto) {
    const exists = await this.prisma.user.findUnique({
      where: { username: dto.username },
    });
    if (exists) throw new BadRequestException('이미 존재하는 아이디입니다.');

    const hashed = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: { ...dto, password: hashed },
    });
    return { id: user.id.toString(), username: user.username, role: user.role };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { username: dto.username },
    });
    if (!user || !(await bcrypt.compare(dto.password, user.password))) {
      throw new UnauthorizedException(
        '아이디 또는 비밀번호가 올바르지 않습니다.',
      );
    }

    const userId = user.id.toString();
    const accessToken = this.issueAccessToken(userId, user.username);
    const refreshToken = this.issueRefreshToken(userId, user.username);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { refresh_token: await bcrypt.hash(refreshToken, 10) },
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: userId,
        username: user.username,
        name: user.name,
        role: user.role,
        profile_image: user.profile_image,
      },
    };
  }

  async refresh(refreshToken: string) {
    let payload: { sub: string; username: string };
    try {
      payload = this.jwt.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
    } catch {
      throw new UnauthorizedException('유효하지 않은 refresh token입니다.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: BigInt(payload.sub) },
    });
    if (!user?.refresh_token) {
      throw new UnauthorizedException('로그인이 필요합니다.');
    }

    const isMatch = await bcrypt.compare(refreshToken, user.refresh_token);
    if (!isMatch) {
      throw new UnauthorizedException('유효하지 않은 refresh token입니다.');
    }

    const userId = user.id.toString();
    const newAccessToken = this.issueAccessToken(userId, user.username);
    const newRefreshToken = this.issueRefreshToken(userId, user.username);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { refresh_token: await bcrypt.hash(newRefreshToken, 10) },
    });

    return {
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
    };
  }

  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: BigInt(userId) },
      data: { refresh_token: null },
    });
    return { message: '로그아웃 되었습니다.' };
  }
}
