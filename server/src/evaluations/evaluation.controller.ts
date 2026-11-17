import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { EvaluationService, ExecuteEvaluationDto, CloseInfographicDto } from './evaluation.service';

@Controller('api/evaluations')
export class EvaluationController {
  constructor(private readonly evaluationService: EvaluationService) {}

  @Post('run')
  async runEvaluation(@Body() dto: ExecuteEvaluationDto) {
    if (!dto.studentName || !dto.rubricContent || !dto.consolidatedCode) {
      throw new BadRequestException('Faltan campos requeridos para la auditoría (studentName, rubricContent, consolidatedCode)');
    }
    return this.evaluationService.createAndRunEvaluation(dto);
  }

  @Delete('clear-all')
  async clearAll() {
    return this.evaluationService.clearAllEvaluations();
  }

  @Get('infographic')
  async getGlobalInfographic(
    @Query('semester') semester?: string,
    @Query('term') term?: string,
  ) {
    return this.evaluationService.getGlobalInfographicData(semester, term);
  }

  @Post('infographic/close')
  async closeInfographic(@Body() dto: CloseInfographicDto) {
    if (!dto.semester) {
      throw new BadRequestException('El campo semestre es requerido');
    }
    return this.evaluationService.closeAndSaveInfographic(dto);
  }

  @Get('infographic/closed')
  async getClosedInfographics() {
    return this.evaluationService.getClosedInfographics();
  }

  @Get('infographic/closed/:id')
  async getClosedInfographicById(@Param('id') id: string) {
    return this.evaluationService.getClosedInfographicById(id);
  }

  @Delete('infographic/closed/:id')
  async deleteClosedInfographic(@Param('id') id: string) {
    return this.evaluationService.deleteClosedInfographic(id);
  }

  @Get('autocomplete')
  async getAutocomplete() {
    return this.evaluationService.getAutocompleteSuggestions();
  }

  @Get('submissions')
  async getAllSubmissions() {
    return this.evaluationService.getAllSubmissions();
  }

  @Get('submissions/:id')
  async getSubmission(@Param('id') id: string) {
    return this.evaluationService.getSubmissionWithResult(id);
  }
}
