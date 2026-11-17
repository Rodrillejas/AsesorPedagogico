import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AppConfigModule } from './config/app-config.module';
import { UploadModule } from './upload/upload.module';
import { RubricModule } from './rubrics/rubric.module';
import { EvaluationModule } from './evaluations/evaluation.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    AppConfigModule,
    UploadModule,
    RubricModule,
    EvaluationModule,
  ],
})
export class AppModule {}

