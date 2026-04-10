import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';

@Injectable()
export class AssignmentsService {
  constructor(private prisma: PrismaService) {}

  async getAssignments(user: any, classId?: number, status?: string) {
    let classIds: number[] = [];

    if (user.role === 'teacher') {
      const classes = await this.prisma.class.findMany({
        where: { teacher_id: user.id },
        select: { id: true },
      });
      classIds = classes.map((c) => c.id);
    } else {
      const classStudents = await this.prisma.classStudent.findMany({
        where: { student_id: user.id },
        select: { class_id: true },
      });
      classIds = classStudents.map((cs) => cs.class_id);
    }

    if (classId) {
      if (!classIds.includes(classId)) {
        throw new ForbiddenException('해당 학급에 접근 권한이 없습니다.');
      }
      classIds = [classId];
    }

    const assignments = await this.prisma.assignment.findMany({
      where: { class_id: { in: classIds } },
      include: { class: { select: { id: true, name: true } } },
      orderBy: { created_at: 'desc' },
    });

    const now = new Date();
    const sorted = [...assignments].sort((a, b) => {
      const aExpired = a.due_date < now;
      const bExpired = b.due_date < now;
      if (aExpired !== bExpired) return aExpired ? 1 : -1;
      return 0;
    });

    if (user.role === 'student' && status) {
      const submissionMap = await this.getSubmissionStatusMap(
        user.id,
        sorted.map((a) => a.id),
      );
      return sorted.filter(
        (a) => (submissionMap[a.id] ?? 'not_submitted') === status,
      );
    }

    return sorted;
  }

  async createAssignment(user: any, dto: CreateAssignmentDto) {
    if (user.role !== 'teacher') {
      throw new ForbiddenException('교사만 과제를 생성할 수 있습니다.');
    }

    const cls = await this.prisma.class.findUnique({
      where: { id: dto.class_id },
    });
    if (!cls) throw new NotFoundException('학급을 찾을 수 없습니다.');
    if (cls.teacher_id !== user.id) {
      throw new ForbiddenException(
        '본인의 학급에만 과제를 생성할 수 있습니다.',
      );
    }

    // ✅ 마감일 검증
    const dueDate = new Date(dto.due_date);
    if (dueDate <= new Date()) {
      throw new BadRequestException('마감일은 현재 시간보다 이후여야 합니다.');
    }

    return this.prisma.assignment.create({
      data: {
        class_id: dto.class_id,
        title: dto.title,
        description: dto.description,
        due_date: dueDate,
      },
    });
  }

  async updateAssignment(
    assignmentId: number,
    user: any,
    dto: UpdateAssignmentDto,
  ) {
    if (user.role !== 'teacher') {
      throw new ForbiddenException('교사만 과제를 수정할 수 있습니다.');
    }

    const assignment = await this.prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: { class: true },
    });
    if (!assignment) throw new NotFoundException('과제를 찾을 수 없습니다.');
    if (assignment.class.teacher_id !== user.id) {
      throw new ForbiddenException('본인의 과제만 수정할 수 있습니다.');
    }

    // ✅ 마감일 검증
    if (dto.due_date) {
      const dueDate = new Date(dto.due_date);
      if (dueDate <= new Date()) {
        throw new BadRequestException(
          '마감일은 현재 시간보다 이후여야 합니다.',
        );
      }
    }

    return this.prisma.assignment.update({
      where: { id: assignmentId },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.due_date !== undefined && { due_date: new Date(dto.due_date) }),
      },
      include: { class: { select: { id: true, name: true } } },
    });
  }

  // ✅ 추가
  async deleteAssignment(assignmentId: number, user: any) {
    if (user.role !== 'teacher') {
      throw new ForbiddenException('교사만 과제를 삭제할 수 있습니다.');
    }
    const assignment = await this.prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: { class: true },
    });
    if (!assignment) throw new NotFoundException('과제를 찾을 수 없습니다.');
    if (assignment.class.teacher_id !== user.id) {
      throw new ForbiddenException('본인의 과제만 삭제할 수 있습니다.');
    }
    await this.prisma.assignment.delete({ where: { id: assignmentId } });
    return { message: '과제가 삭제되었습니다.' };
  }

  async getAssignmentById(assignmentId: number, user: any) {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        class: { select: { id: true, name: true, teacher_id: true } },
      },
    });
    if (!assignment) throw new NotFoundException('과제를 찾을 수 없습니다.');
    await this.checkAccess(assignment.class, user);

    const [total_students, submitted_count, graded_count] = await Promise.all([
      this.prisma.classStudent.count({
        where: { class_id: assignment.class_id },
      }),
      this.prisma.submission.count({
        where: {
          assignment_id: assignmentId,
          status: { not: 'not_submitted' },
        },
      }),
      this.prisma.submission.count({
        where: { assignment_id: assignmentId, status: 'graded' },
      }),
    ]);

    const submission_rate =
      total_students === 0
        ? 0
        : Math.round((submitted_count / total_students) * 100);

    let my_submission: Awaited<
      ReturnType<typeof this.prisma.submission.findFirst>
    > = null;
    if (user.role === 'student') {
      my_submission = await this.prisma.submission.findFirst({
        where: { assignment_id: assignmentId, student_id: user.id },
        include: { images: true },
      });
    }

    return {
      ...assignment,
      stats: { total_students, submitted_count, graded_count, submission_rate },
      ...(user.role === 'student' && { my_submission }),
    };
  }

  async getAssignmentsByClass(classId: number, user: any) {
    const cls = await this.prisma.class.findUnique({ where: { id: classId } });
    if (!cls) throw new NotFoundException('학급을 찾을 수 없습니다.');
    await this.checkAccess(cls, user);

    const assignments = await this.prisma.assignment.findMany({
      where: { class_id: classId },
      orderBy: { created_at: 'desc' }, // ✅ 변경
    });

    // ✅ 마감된 과제 하단으로
    const now = new Date();
    const sorted = [...assignments].sort((a, b) => {
      const aExpired = a.due_date < now;
      const bExpired = b.due_date < now;
      if (aExpired !== bExpired) return aExpired ? 1 : -1;
      return 0;
    });

    if (user.role === 'student') {
      const submissionMap = await this.getSubmissionStatusMap(
        user.id,
        sorted.map((a) => a.id),
      );
      return sorted.map((a) => ({
        ...a,
        my_status: submissionMap[a.id] ?? 'not_submitted',
      }));
    }

    return sorted;
  }

  private async checkAccess(cls: any, user: any) {
    if (user.role === 'teacher') {
      if (cls.teacher_id !== user.id) {
        throw new ForbiddenException('본인의 학급만 조회할 수 있습니다.');
      }
    } else {
      const enrolled = await this.prisma.classStudent.findUnique({
        where: {
          class_id_student_id: { class_id: cls.id, student_id: user.id },
        },
      });
      if (!enrolled)
        throw new ForbiddenException('해당 학급에 접근 권한이 없습니다.');
    }
  }

  private async getSubmissionStatusMap(
    studentId: bigint,
    assignmentIds: number[],
  ): Promise<Record<number, string>> {
    const submissions = await this.prisma.submission.findMany({
      where: { student_id: studentId, assignment_id: { in: assignmentIds } },
      select: { assignment_id: true, status: true },
    });
    return Object.fromEntries(
      submissions.map((s) => [s.assignment_id, s.status]),
    );
  }
}
