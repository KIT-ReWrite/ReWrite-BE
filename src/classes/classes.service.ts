import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClassDto } from './dto/create-class.dto';
import { JoinClassDto } from './dto/join-class.dto';

@Injectable()
export class ClassesService {
  constructor(private prisma: PrismaService) {}

  private generateInviteCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    return Array.from(
      { length: 6 },
      () => chars[Math.floor(Math.random() * chars.length)],
    ).join('');
  }

  async getClasses(user: any) {
    if (user.role === 'teacher') {
      const classes = await this.prisma.class.findMany({
        where: { teacher_id: user.id },
        orderBy: { created_at: 'desc' },
      });

      return Promise.all(
        classes.map(async (cls) => {
          const [student_count, assignment_count] = await Promise.all([
            this.prisma.classStudent.count({ where: { class_id: cls.id } }),
            this.prisma.assignment.count({ where: { class_id: cls.id } }),
          ]);
          return { ...cls, student_count, assignment_count };
        }),
      );
    }

    const classStudents = await this.prisma.classStudent.findMany({
      where: { student_id: user.id },
      include: { class: true },
      orderBy: { joined_at: 'desc' },
    });

    return Promise.all(
      classStudents.map(async (cs) => {
        const [student_count, assignment_count] = await Promise.all([
          this.prisma.classStudent.count({ where: { class_id: cs.class_id } }),
          this.prisma.assignment.count({ where: { class_id: cs.class_id } }),
        ]);
        return { ...cs.class, student_count, assignment_count };
      }),
    );
  }

  async createClass(user: any, dto: CreateClassDto) {
    if (user.role !== 'teacher') {
      throw new ForbiddenException('교사만 학급을 생성할 수 있습니다.');
    }

    let invite_code: string;
    while (true) {
      invite_code = this.generateInviteCode();
      const exists = await this.prisma.class.findUnique({
        where: { invite_code },
      });
      if (!exists) break;
    }

    return this.prisma.class.create({
      data: { name: dto.name, teacher_id: user.id, invite_code },
    });
  }

  async getClassById(classId: number, user: any) {
    const cls = await this.prisma.class.findUnique({
      where: { id: classId },
      include: { teacher: { select: { id: true, name: true, subject: true } } },
    });
    if (!cls) throw new NotFoundException('학급을 찾을 수 없습니다.');

    const [student_count, assignment_count] = await Promise.all([
      this.prisma.classStudent.count({ where: { class_id: classId } }),
      this.prisma.assignment.count({ where: { class_id: classId } }),
    ]);

    return {
      class: cls,
      teacher: { ...cls.teacher, id: cls.teacher.id.toString() },
      student_count,
      assignment_count,
    };
  }

  async joinClass(user: any, dto: JoinClassDto) {
    if (user.role !== 'student') {
      throw new ForbiddenException('학생만 학급에 참가할 수 있습니다.');
    }

    const cls = await this.prisma.class.findUnique({
      where: { invite_code: dto.invite_code },
    });
    if (!cls) throw new NotFoundException('유효하지 않은 초대코드입니다.');

    const already = await this.prisma.classStudent.findUnique({
      where: { class_id_student_id: { class_id: cls.id, student_id: user.id } },
    });
    if (already) throw new BadRequestException('이미 참가한 학급입니다.');

    await this.prisma.classStudent.create({
      data: { class_id: cls.id, student_id: user.id },
    });

    return cls;
  }

  async getStudents(classId: number) {
    const classStudents = await this.prisma.classStudent.findMany({
      where: { class_id: classId },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            username: true,
            student_number: true,
            profile_image: true,
          },
        },
      },
      orderBy: { joined_at: 'asc' },
    });

    return classStudents.map((cs) => ({
      ...cs.student,
      id: cs.student.id.toString(),
      joined_at: cs.joined_at,
    }));
  }

  async getStats(classId: number) {
    const assignments = await this.prisma.assignment.findMany({
      where: { class_id: classId },
      select: { id: true, due_date: true },
    });

    const student_count = await this.prisma.classStudent.count({
      where: { class_id: classId },
    });

    const today = new Date();
    const todayStart = new Date(today.setHours(0, 0, 0, 0));
    const todayEnd = new Date(today.setHours(23, 59, 59, 999));

    const due_today_count = assignments.filter(
      (a) => a.due_date >= todayStart && a.due_date <= todayEnd,
    ).length;

    const submitted_count = await this.prisma.submission.count({
      where: {
        assignment_id: { in: assignments.map((a) => a.id) },
        status: { not: 'not_submitted' },
      },
    });

    const total = student_count * assignments.length;
    const submission_rate =
      total === 0 ? 0 : Math.round((submitted_count / total) * 100);

    return { submission_rate, due_today_count };
  }

  async removeStudent(classId: number, studentId: bigint, user: any) {
    if (user.role !== 'teacher') {
      throw new ForbiddenException('교사만 학생을 강퇴할 수 있습니다.');
    }

    const cls = await this.prisma.class.findUnique({ where: { id: classId } });
    if (!cls) throw new NotFoundException('학급을 찾을 수 없습니다.');
    if (cls.teacher_id !== user.id) {
      throw new ForbiddenException('본인의 학급만 관리할 수 있습니다.');
    }

    await this.prisma.classStudent.delete({
      where: {
        class_id_student_id: { class_id: classId, student_id: studentId },
      },
    });

    return { message: 'removed' };
  }
}
