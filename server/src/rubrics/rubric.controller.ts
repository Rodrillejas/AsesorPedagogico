import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { RubricService } from './rubric.service';

class CreateRubricDto {
  projectId: string;
  title?: string;
  content: string;
}

@Controller('api/rubrics')
export class RubricController {
  constructor(private readonly rubricService: RubricService) {}

  @Post('extract')
  @UseInterceptors(FileInterceptor('file'))
  async extractText(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Archivo no subido');
    }
    return this.rubricService.parseRubricFile(file);
  }

  @Post()
  async saveRubric(@Body() dto: CreateRubricDto) {
    if (!dto.projectId || !dto.content) {
      throw new BadRequestException('projectId y content son requeridos');
    }
    return this.rubricService.saveRubric(
      dto.projectId,
      dto.title || 'Rúbrica de Evaluación',
      dto.content,
    );
  }

  @Get(':id')
  async getRubric(@Param('id') id: string) {
    return this.rubricService.getRubricById(id);
  }
}

