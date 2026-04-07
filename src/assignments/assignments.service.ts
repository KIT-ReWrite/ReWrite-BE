import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';

@Injectable()
export class AssignmentsService {
  constructor(private prisma: PrismaService) {}

  // 전체 과제 목록 (classId, status 필터)
  async getAssignments(user: any, classId?: number, status?: string) {
    // 교사: 본인 학급 과제만 / 학생: 본인이 속한 학급 과제만
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

    // classId 필터가 있으면 권한 내에서만 허용
    if (classId) {
      if (!classIds.includes(classId)) {
        throw new ForbiddenException('해당 학급에 접근 권한이 없습니다.');
      }
      classIds = [classId];
    }

    const assignments = await this.prisma.assignment.findMany({
      where: { class_id: { in: classIds } },
      include: { class: { select: { id: true, name: true } } },
      orderBy: { due_date: 'asc' },
    });

    // 학생인 경우 status 필터 적용
    if (user.role === 'student' && status) {
      const submissionMap = await this.getSubmissionStatusMap(
        user.id,
        assignments.map((a) => a.id),
      );
      return assignments.filter((a) => {
        const s = submissionMap[a.id] ?? 'not_submitted';
        return s === status;
      });
    }

    return assignments;
  }

  // 과제 생성 (교사 전용)
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

    return this.prisma.assignment.create({
      data: {
        class_id: dto.class_id,
        title: dto.title,
        description: dto.description,
        due_date: new Date(dto.due_date),
      },
    });
  }

  // 과제 상세 + 통계
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

    // 학생인 경우 본인 제출 상태 포함
    let my_submission = null;
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

  // 특정 학급의 과제 목록
  async getAssignmentsByClass(classId: number, user: any) {
    const cls = await this.prisma.class.findUnique({ where: { id: classId } });
    if (!cls) throw new NotFoundException('학급을 찾을 수 없습니다.');

    await this.checkAccess(cls, user);

    const assignments = await this.prisma.assignment.findMany({
      where: { class_id: classId },
      orderBy: { due_date: 'asc' },
    });

    // 학생이면 각 과제별 제출 상태 포함
    if (user.role === 'student') {
      const submissionMap = await this.getSubmissionStatusMap(
        user.id,
        assignments.map((a) => a.id),
      );
      return assignments.map((a) => ({
        ...a,
        my_status: submissionMap[a.id] ?? 'not_submitted',
      }));
    }

    return assignments;
  }

  // ── 헬퍼 ──────────────────────────────────────────

  // 학급 접근 권한 체크
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

  // 학생의 과제별 제출 상태 Map 반환
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
