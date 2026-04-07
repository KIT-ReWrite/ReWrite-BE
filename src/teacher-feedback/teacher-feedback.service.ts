import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTeacherFeedbackDto } from './dto/create-teacher-feedback.dto';
import { UpdateTeacherFeedbackDto } from './dto/update-teacher-feedback.dto';

@Injectable()
export class TeacherFeedbackService {
  constructor(private prisma: PrismaService) {}

  // 피드백 작성 (교사 전용)
  async createFeedback(
    submissionId: number,
    user: any,
    dto: CreateTeacherFeedbackDto,
  ) {
    if (user.role !== 'teacher') {
      throw new ForbiddenException('교사만 피드백을 작성할 수 있습니다.');
    }

    const submission = await this.getSubmissionOrThrow(submissionId, user);

    const existing = await this.prisma.teacherFeedback.findUnique({
      where: { submission_id: submissionId },
    });
    if (existing)
      throw new ConflictException(
        '이미 피드백이 존재합니다. 수정 API를 사용해주세요.',
      );

    const feedback = await this.prisma.teacherFeedback.create({
      data: {
        submission_id: submissionId,
        score: dto.score,
        feedback: dto.feedback,
      },
    });

    // 제출 상태를 graded로 업데이트
    await this.prisma.submission.update({
      where: { id: submissionId },
      data: { status: 'graded' },
    });

    // 점수 이력 저장
    await this.prisma.studentScoreHistory.create({
      data: {
        student_id: submission.student_id,
        assignment_id: submission.assignment_id,
        score: dto.score,
      },
    });

    return feedback;
  }

  // 피드백 수정 (교사 전용)
  async updateFeedback(
    feedbackId: number,
    user: any,
    dto: UpdateTeacherFeedbackDto,
  ) {
    if (user.role !== 'teacher') {
      throw new ForbiddenException('교사만 피드백을 수정할 수 있습니다.');
    }

    const feedback = await this.prisma.teacherFeedback.findUnique({
      where: { id: feedbackId },
      include: {
        submission: { include: { assignment: { include: { class: true } } } },
      },
    });
    if (!feedback) throw new NotFoundException('피드백을 찾을 수 없습니다.');
    if (feedback.submission.assignment.class.teacher_id !== user.id) {
      throw new ForbiddenException('본인 학급의 피드백만 수정할 수 있습니다.');
    }

    const updated = await this.prisma.teacherFeedback.update({
      where: { id: feedbackId },
      data: dto,
    });

    // 점수가 변경된 경우 점수 이력도 업데이트
    if (dto.score !== undefined) {
      const history = await this.prisma.studentScoreHistory.findFirst({
        where: {
          student_id: feedback.submission.student_id,
          assignment_id: feedback.submission.assignment_id,
        },
      });
      if (history) {
        await this.prisma.studentScoreHistory.update({
          where: { id: history.id },
          data: { score: dto.score },
        });
      }
    }

    return updated;
  }

  // 피드백 조회
  async getFeedback(submissionId: number, user: any) {
    await this.getSubmissionOrThrow(submissionId, user);

    const feedback = await this.prisma.teacherFeedback.findUnique({
      where: { submission_id: submissionId },
    });
    if (!feedback) throw new NotFoundException('피드백이 존재하지 않습니다.');

    return feedback;
  }

  // ── 헬퍼 ──────────────────────────────────────────

  private async getSubmissionOrThrow(submissionId: number, user: any) {
    const submission = await this.prisma.submission.findUnique({
      where: { id: submissionId },
      include: { assignment: { include: { class: true } } },
    });
    if (!submission) throw new NotFoundException('제출물을 찾을 수 없습니다.');

    if (user.role === 'teacher') {
      if (submission.assignment.class.teacher_id !== user.id) {
        throw new ForbiddenException(
          '본인 학급의 제출물만 접근할 수 있습니다.',
        );
      }
    } else {
      if (submission.student_id !== user.id) {
        throw new ForbiddenException('본인의 제출물만 접근할 수 있습니다.');
      }
    }

    return submission;
  }
}
