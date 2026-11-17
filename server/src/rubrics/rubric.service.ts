import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import * as pdfParse from 'pdf-parse';
import { PrismaService } from '../prisma/prisma.service';

export interface RubricParsedResult {
  title: string;
  content: string;
  totalPages?: number;
  wordCount: number;
}

@Injectable()
export class RubricService {
  private readonly logger = new Logger(RubricService.name);

  constructor(private readonly prisma: PrismaService) {}

  async parseRubricFile(file: Express.Multer.File): Promise<RubricParsedResult> {
    if (!file || !file.buffer) {
      throw new BadRequestException('Archivo de rúbrica no proporcionado');
    }

    const filename = file.originalname.toLowerCase();
    let text = '';
    let totalPages: number | undefined;

    if (filename.endsWith('.pdf')) {
      try {
        const pdfData = await pdfParse(file.buffer);
        text = pdfData.text || '';
        totalPages = pdfData.numpages;
      } catch (err) {
        this.logger.error(`Error procesando PDF: ${err.message}`);
        throw new BadRequestException('No se pudo extraer el texto del archivo PDF');
      }
    } else if (filename.endsWith('.md') || filename.endsWith('.txt')) {
      text = file.buffer.toString('utf8');
    } else {
      throw new BadRequestException('Formato no soportado. Debe ser un archivo .pdf, .md o .txt');
    }

    const cleanedText = this.cleanAndNormalizeText(text);

    if (cleanedText.length < 20) {
      throw new BadRequestException('El contenido extraído de la rúbrica está vacío o es demasiado corto');
    }

    const title = file.originalname.replace(/\.[^/.]+$/, '');
    const wordCount = cleanedText.split(/\s+/).filter(Boolean).length;

    return {
      title,
      content: cleanedText,
      totalPages,
      wordCount,
    };
  }

  async saveRubric(projectId: string, title: string, content: string) {
    return this.prisma.rubric.create({
      data: {
        projectId,
        title,
        content,
      },
    });
  }

  async getRubricById(id: string) {
    return this.prisma.rubric.findUnique({
      where: { id },
    });
  }

  private cleanAndNormalizeText(text: string): string {
    return text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F]/g, '') // remove strange control chars
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }
}

