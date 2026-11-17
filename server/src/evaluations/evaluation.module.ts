import { Module } from '@nestjs/common';
import { GeminiService } from './gemini.service';
import { EvaluationService } from './evaluation.service';
import { EvaluationController } from './evaluation.controller';
import { AppConfigModule } from '../config/app-config.module';

@Module({
  imports: [AppConfigModule],
  controllers: [EvaluationController],
  providers: [GeminiService, EvaluationService],
  exports: [EvaluationService, GeminiService],
})
export class EvaluationModule {}

