import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const exists = await this.prisma.user.findUnique({
      where: { username: dto.username },
    });

    if (exists) throw new BadRequestException('이미 존재하는 사용자명입니다.');

    const hashed = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        role: dto.role,
        username: dto.username,
        password: hashed,
        name: dto.name,
        school: dto.school,
        student_number: dto.student_number,
        subject: dto.subject,
      },
    });

    return {
      id: user.id,
      username: user.username,
      role: user.role,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { username: dto.username },
    });

    if (!user)
      throw new UnauthorizedException('잘못된 사용자명 또는 비밀번호입니다.');

    const ok = await bcrypt.compare(dto.password, user.password);
    if (!ok)
      throw new UnauthorizedException('잘못된 사용자명 또는 비밀번호입니다.');

    const token = await this.jwt.signAsync({
      sub: user.id,
      role: user.role,
    });

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        school: user.school,
        student_number: user.student_number,
        subject: user.subject,
        profile_image: user.profile_image,
      },
    };
  }
}
