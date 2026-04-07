import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GroqService } from './groq.service';

@Injectable()
export class AIFeedbackService {
  constructor(
    private prisma: PrismaService,
    private groqService: GroqService,
  ) {}

  // AI 분석 조회
  async getAIFeedback(submissionId: number, user: any) {
    const submission = await this.getSubmissionOrThrow(submissionId, user);

    const feedback = await this.prisma.aIFeedback.findUnique({
      where: { submission_id: submissionId },
    });
    if (!feedback)
      throw new NotFoundException(
        'AI 분석 결과가 없습니다. 먼저 분석을 실행해주세요.',
      );

    return feedback;
  }

  // AI 분석 실행 + 저장
  async createAIFeedback(submissionId: number, user: any) {
    const submission = await this.getSubmissionOrThrow(submissionId, user);

    // 이미 분석된 경우
    const existing = await this.prisma.aIFeedback.findUnique({
      where: { submission_id: submissionId },
    });
    if (existing)
      throw new ConflictException('이미 AI 분석이 완료된 제출물입니다.');

    // 제출물 텍스트가 비어있는 경우
    if (!submission.text_content?.trim()) {
      throw new ForbiddenException('제출물 내용이 없어 분석할 수 없습니다.');
    }

    // Groq AI 분석 실행
    const result = await this.groqService.analyzeSubmission(
      submission.assignment.title,
      submission.assignment.description,
      submission.text_content,
    );

    // AI 피드백 저장
    const feedback = await this.prisma.aIFeedback.create({
      data: {
        submission_id: submissionId,
        summary: result.summary,
        detail_analysis: result.detail_analysis,
        improvement_suggestions: result.improvement_suggestions,
      },
    });

    // 제출 상태 ai_done으로 업데이트
    await this.prisma.submission.update({
      where: { id: submissionId },
      data: { status: 'ai_done' },
    });

    // 역량 점수 자동 업데이트 (upsert)
    const da = result.detail_analysis;
    await this.prisma.studentMetrics.upsert({
      where: { student_id: submission.student_id },
      update: {
        logical: da.logical.score,
        structure: da.structure.score,
        grammar: da.grammar.score,
        creativity: da.creativity.score,
        understanding: da.understanding.score,
      },
      create: {
        student_id: submission.student_id,
        logical: da.logical.score,
        structure: da.structure.score,
        grammar: da.grammar.score,
        creativity: da.creativity.score,
        understanding: da.understanding.score,
      },
    });

    return feedback;
  }

  // ── 헬퍼 ──────────────────────────────────────────

  private async getSubmissionOrThrow(submissionId: number, user: any) {
    const submission = await this.prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        assignment: {
          include: { class: true },
        },
      },
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
