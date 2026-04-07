import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SubmissionsService } from './submissions.service';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { UpdateSubmissionDto } from './dto/update-submission.dto';

const submissionImageStorage = diskStorage({
  destination: './uploads/submissions',
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${extname(file.originalname)}`);
  },
});

@Controller()
@UseGuards(JwtAuthGuard)
export class SubmissionsController {
  constructor(private submissionsService: SubmissionsService) {}

  // GET /assignments/:id/submissions?status=
  @Get('assignments/:id/submissions')
  getSubmissions(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
    @Query('status') status?: string,
  ) {
    return this.submissionsService.getSubmissions(id, user, status);
  }

  // GET /submissions/:id
  @Get('submissions/:id')
  getSubmissionById(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    return this.submissionsService.getSubmissionById(id, user);
  }

  // POST /assignments/:id/submit
  @Post('assignments/:id/submit')
  @UseInterceptors(
    FilesInterceptor('images', 10, {
      storage: submissionImageStorage,
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
      fileFilter: (req, file, cb) => {
        const allowed = /\.(jpg|jpeg|png|gif|webp)$/i;
        if (!allowed.test(file.originalname)) {
          return cb(new Error('이미지 파일만 업로드 가능합니다.'), false);
        }
        cb(null, true);
      },
    }),
  )
  createSubmission(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
    @Body() dto: CreateSubmissionDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.submissionsService.createSubmission(id, user, dto, files);
  }

  // PATCH /submissions/:id
  @Patch('submissions/:id')
  @UseInterceptors(
    FilesInterceptor('images', 10, {
      storage: submissionImageStorage,
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        const allowed = /\.(jpg|jpeg|png|gif|webp)$/i;
        if (!allowed.test(file.originalname)) {
          return cb(new Error('이미지 파일만 업로드 가능합니다.'), false);
        }
        cb(null, true);
      },
    }),
  )
  updateSubmission(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
    @Body() dto: UpdateSubmissionDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.submissionsService.updateSubmission(id, user, dto, files);
  }

  // DELETE /submission-images/:id
  @Delete('submission-images/:id')
  deleteSubmissionImage(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    return this.submissionsService.deleteSubmissionImage(id, user);
  }
}
