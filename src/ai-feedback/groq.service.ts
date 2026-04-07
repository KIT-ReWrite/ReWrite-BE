import { Injectable, InternalServerErrorException } from '@nestjs/common';
import Groq from 'groq-sdk';

export interface AIAnalysisResult {
  summary: string;
  detail_analysis: {
    logical: { score: number; comment: string };
    structure: { score: number; comment: string };
    grammar: { score: number; comment: string };
    creativity: { score: number; comment: string };
    understanding: { score: number; comment: string };
  };
  improvement_suggestions: string[];
}

@Injectable()
export class GroqService {
  private client: Groq;

  constructor() {
    this.client = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }

  async analyzeSubmission(
    assignmentTitle: string,
    assignmentDescription: string,
    submissionText: string,
  ): Promise<AIAnalysisResult> {
    const prompt = `당신은 학생 과제를 분석하는 교육 AI입니다.
아래 과제와 학생 제출물을 분석하고, 반드시 JSON 형식으로만 응답하세요.

[과제 제목]
${assignmentTitle}

[과제 설명]
${assignmentDescription}

[학생 제출물]
${submissionText}

다음 JSON 구조로 정확히 응답하세요 (다른 텍스트 없이 JSON만):
{
  "summary": "전체 총평 (2~3문장)",
  "detail_analysis": {
    "logical": { "score": 0~100 숫자, "comment": "논리성 평가 코멘트" },
    "structure": { "score": 0~100 숫자, "comment": "구조/구성 평가 코멘트" },
    "grammar": { "score": 0~100 숫자, "comment": "문법/맞춤법 평가 코멘트" },
    "creativity": { "score": 0~100 숫자, "comment": "창의성 평가 코멘트" },
    "understanding": { "score": 0~100 숫자, "comment": "과제 이해도 평가 코멘트" }
  },
  "improvement_suggestions": [
    "개선 제안 1",
    "개선 제안 2",
    "개선 제안 3"
  ]
}`;

    try {
      const response = await this.client.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content:
              '당신은 학생 과제를 분석하는 교육 AI입니다. 항상 요청된 JSON 형식으로만 응답합니다.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 1024,
        response_format: { type: 'json_object' },
      });

      const text = response.choices[0].message.content ?? '';
      const parsed: AIAnalysisResult = JSON.parse(text);
      return parsed;
    } catch (e) {
      throw new InternalServerErrorException('AI 분석 중 오류가 발생했습니다.');
    }
  }
}
