import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateMetricsDto } from './dto/update-metrics.dto';
import { CreateScoreDto } from './dto/create-score.dto';

@Injectable()
export class StudentMetricsService {
  constructor(private prisma: PrismaService) {}

  // ── 역량 분석 ──────────────────────────────────────

  // 역량 조회
  async getMetrics(studentId: bigint, user: any) {
    await this.checkStudentAccess(studentId, user);

    const metrics = await this.prisma.studentMetrics.findUnique({
      where: { student_id: studentId },
    });

    // 없으면 기본값 반환
    if (!metrics) {
      return {
        student_id: studentId.toString(),
        logical: 0,
        structure: 0,
        grammar: 0,
        creativity: 0,
        understanding: 0,
        updated_at: null,
      };
    }

    return { ...metrics, student_id: metrics.student_id.toString() };
  }

  // 역량 업데이트 (AI 전용 - 교사 or 서버 내부 호출 상정)
  async updateMetrics(studentId: bigint, user: any, dto: UpdateMetricsDto) {
    if (user.role !== 'teacher') {
      throw new ForbiddenException(
        '교사만 역량 데이터를 업데이트할 수 있습니다.',
      );
    }

    await this.checkStudentExists(studentId);

    const metrics = await this.prisma.studentMetrics.upsert({
      where: { student_id: studentId },
      update: { ...dto },
      create: { student_id: studentId, ...dto },
    });

    return { ...metrics, student_id: metrics.student_id.toString() };
  }

  // ── 점수 추이 ──────────────────────────────────────

  // 점수 추이 조회
  async getScores(studentId: bigint, user: any) {
    await this.checkStudentAccess(studentId, user);

    const scores = await this.prisma.studentScoreHistory.findMany({
      where: { student_id: studentId },
      include: {
        assignment: {
          select: {
            id: true,
            title: true,
            due_date: true,
            class: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { created_at: 'asc' },
    });

    return scores.map((s) => ({
      ...s,
      student_id: s.student_id.toString(),
    }));
  }

  // 점수 기록 추가
  async createScore(studentId: bigint, user: any, dto: CreateScoreDto) {
    if (user.role !== 'teacher') {
      throw new ForbiddenException('교사만 점수를 기록할 수 있습니다.');
    }

    await this.checkStudentExists(studentId);

    const assignment = await this.prisma.assignment.findUnique({
      where: { id: dto.assignment_id },
      include: { class: true },
    });
    if (!assignment) throw new NotFoundException('과제를 찾을 수 없습니다.');
    if (assignment.class.teacher_id !== user.id) {
      throw new ForbiddenException(
        '본인 학급의 과제만 점수를 기록할 수 있습니다.',
      );
    }

    const score = await this.prisma.studentScoreHistory.create({
      data: {
        student_id: studentId,
        assignment_id: dto.assignment_id,
        score: dto.score,
      },
      include: {
        assignment: { select: { id: true, title: true } },
      },
    });

    return { ...score, student_id: score.student_id.toString() };
  }

  // ── 헬퍼 ──────────────────────────────────────────

  // 본인 또는 담당 교사만 접근 가능
  private async checkStudentAccess(studentId: bigint, user: any) {
    if (user.role === 'student') {
      if (user.id !== studentId) {
        throw new ForbiddenException('본인의 데이터만 조회할 수 있습니다.');
      }
      return;
    }

    // 교사인 경우 - 담당 학급의 학생인지 확인
    const isMyStudent = await this.prisma.classStudent.findFirst({
      where: {
        student_id: studentId,
        class: { teacher_id: user.id },
      },
    });
    if (!isMyStudent) {
      throw new ForbiddenException('담당 학급의 학생만 조회할 수 있습니다.');
    }
  }

  private async checkStudentExists(studentId: bigint) {
    const student = await this.prisma.user.findUnique({
      where: { id: studentId, role: 'student' },
    });
    if (!student) throw new NotFoundException('학생을 찾을 수 없습니다.');
  }
}
