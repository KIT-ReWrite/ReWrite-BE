import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { UpdateSubmissionDto } from './dto/update-submission.dto';
import { AIFeedbackService } from '../ai-feedback/ai-feedback.service';

@Injectable()
export class SubmissionsService {
  constructor(
    private prisma: PrismaService,
    private aiFeedbackService: AIFeedbackService,
  ) {}

  async getSubmissions(assignmentId: number, user: any, status?: string) {
    if (user.role !== 'teacher') {
      throw new ForbiddenException('교사만 제출물 목록을 조회할 수 있습니다.');
    }

    const assignment = await this.prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: { class: true },
    });
    if (!assignment) throw new NotFoundException('과제를 찾을 수 없습니다.');
    if (assignment.class.teacher_id.toString() !== user.id.toString()) {
      throw new ForbiddenException('본인의 학급 과제만 조회할 수 있습니다.');
    }

    return this.prisma.submission.findMany({
      where: {
        assignment_id: assignmentId,
        ...(status && { status: status as any }),
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            student_number: true,
            profile_image: true,
          },
        },
        images: true,
      },
      orderBy: [{ status: 'asc' }, { created_at: 'desc' }],
    });
  }

  async getSubmissionById(submissionId: number, user: any) {
    const submission = await this.prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        images: true,
        ai_feedback: true,
        teacher_feedback: true,
        student: { select: { id: true, name: true, student_number: true } },
        assignment: { include: { class: true } },
      },
    });
    if (!submission) throw new NotFoundException('제출물을 찾을 수 없습니다.');

    if (user.role === 'teacher') {
      if (
        submission.assignment.class.teacher_id.toString() !== user.id.toString()
      ) {
        throw new ForbiddenException('접근 권한이 없습니다.');
      }
    } else {
      if (submission.student_id.toString() !== user.id.toString()) {
        throw new ForbiddenException('본인의 제출물만 조회할 수 있습니다.');
      }
    }

    return submission;
  }

  async createSubmission(
    assignmentId: number,
    user: any,
    dto: CreateSubmissionDto,
    files: Express.Multer.File[],
  ) {
    if (user.role !== 'student') {
      throw new ForbiddenException('학생만 과제를 제출할 수 있습니다.');
    }

    const assignment = await this.prisma.assignment.findUnique({
      where: { id: assignmentId },
    });
    if (!assignment) throw new NotFoundException('과제를 찾을 수 없습니다.');

    const enrolled = await this.prisma.classStudent.findUnique({
      where: {
        class_id_student_id: {
          class_id: assignment.class_id,
          student_id: user.id,
        },
      },
    });
    if (!enrolled)
      throw new ForbiddenException('해당 학급에 속해있지 않습니다.');

    // 이미 제출한 경우 수정으로 전환
    const existing = await this.prisma.submission.findFirst({
      where: { assignment_id: assignmentId, student_id: user.id },
    });
    if (existing) {
      return this.updateSubmission(existing.id, user, dto, files);
    }

    // 신규 제출
    const submission = await this.prisma.submission.create({
      data: {
        assignment_id: assignmentId,
        student_id: user.id,
        text_content: dto.text_content,
        status: 'submitted',
        submitted_at: new Date(),
      },
    });

    if (files?.length) {
      await this.saveImages(submission.id, files);
    }

    // ✅ AI 분석 백그라운드 자동 실행 (응답 블로킹 안 함)
    this.runAIAnalysis(submission.id, user);

    return this.prisma.submission.findUnique({
      where: { id: submission.id },
      include: { images: true },
    });
  }

  async updateSubmission(
    submissionId: number,
    user: any,
    dto: UpdateSubmissionDto,
    files?: Express.Multer.File[],
  ) {
    const submission = await this.prisma.submission.findUnique({
      where: { id: submissionId },
    });
    if (!submission) throw new NotFoundException('제출물을 찾을 수 없습니다.');
    if (submission.student_id.toString() !== user.id.toString()) {
      throw new ForbiddenException('본인의 제출물만 수정할 수 있습니다.');
    }

    const updated = await this.prisma.submission.update({
      where: { id: submissionId },
      data: {
        ...(dto.text_content && { text_content: dto.text_content }),
        status: 'submitted',
        submitted_at: new Date(),
      },
    });

    if (files?.length) {
      await this.saveImages(submissionId, files);
    }

    // ✅ 수정 제출 시에도 AI 재분석 실행
    this.runAIAnalysis(submissionId, user);

    return this.prisma.submission.findUnique({
      where: { id: updated.id },
      include: { images: true },
    });
  }

  async deleteSubmissionImage(imageId: number, user: any) {
    const image = await this.prisma.submissionImage.findUnique({
      where: { id: imageId },
      include: { submission: true },
    });
    if (!image) throw new NotFoundException('이미지를 찾을 수 없습니다.');
    if (image.submission.student_id.toString() !== user.id.toString()) {
      throw new ForbiddenException(
        '본인의 제출물 이미지만 삭제할 수 있습니다.',
      );
    }

    await this.prisma.submissionImage.delete({ where: { id: imageId } });
    return { message: '이미지가 삭제되었습니다.' };
  }

  // ── 헬퍼 ──────────────────────────────────────────

  private async saveImages(submissionId: number, files: Express.Multer.File[]) {
    const data = files.map((file) => ({
      submission_id: submissionId,
      image_url: `/uploads/submissions/${file.filename}`,
    }));
    await this.prisma.submissionImage.createMany({ data });
  }

  // ✅ AI 분석 백그라운드 실행 (await 안 걸어서 응답 먼저 반환)
  private runAIAnalysis(submissionId: number, user: any) {
    this.aiFeedbackService.createAIFeedback(submissionId, user).catch((err) => {
      console.error(
        `[AI 분석 실패] submissionId: ${submissionId}`,
        err.message,
      );
    });
  }
}
