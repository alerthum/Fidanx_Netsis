import { Body, Controller, Post } from '@nestjs/common';
import { AiService } from './ai.service';

@Controller('ai')
export class AiController {
    constructor(private readonly aiService: AiService) { }

    @Post('chat')
    async chat(@Body() body: { question?: string }) {
        const question = body?.question || '';
        const result = await this.aiService.analyze(question);
        return {
            question,
            ...result,
            createdAt: new Date().toISOString(),
        };
    }
}

