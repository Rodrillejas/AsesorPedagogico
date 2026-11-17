import {
  Controller,
  Post,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';

@Controller('api/upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('zip')
  @UseInterceptors(FileInterceptor('file'))
  uploadZip(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Zip file is required');
    }
    return this.uploadService.processZipBuffer(file.buffer);
  }

  @Post('files')
  @UseInterceptors(FilesInterceptor('files'))
  uploadFiles(@UploadedFiles() files: Express.Multer.File[]) {
    if (!files || files.length === 0) {
      throw new BadRequestException('At least one file is required');
    }
    return this.uploadService.processUploadedFiles(files);
  }
}

