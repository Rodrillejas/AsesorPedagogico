import {
  Injectable,
  Logger,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GeminiService } from './gemini.service';
import { SubmissionStatus } from '@prisma/client';
import { AiEvaluationResponse } from './evaluation.schema';

export interface ExecuteEvaluationDto {
  projectName?: string;
  semester?: string;
  term?: string; // 'Corte 1' | 'Corte 2' | 'Corte 3'
  studentName: string;
  assignmentTitle?: string;
  proposalContent?: string;
  rubricTitle?: string;
  rubricContent: string;
  fileTree: any;
  consolidatedCode: string;
}

export interface CloseInfographicDto {
  title?: string;
  semester: string;
  term?: string; // Si se cierra por corte específico o consolidado general del semestre
}

@Injectable()
export class EvaluationService {
  private readonly logger = new Logger(EvaluationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly geminiService: GeminiService,
  ) {}

  async createAndRunEvaluation(dto: ExecuteEvaluationDto) {
    const project = await this.prisma.project.create({
      data: {
        name: dto.projectName || dto.assignmentTitle || 'Laboratorio Técnico',
        semester: dto.semester || 'Semestre 2026-2',
        term: dto.term || 'Corte 1',
        description: `Evaluación de ${dto.studentName} para ${dto.assignmentTitle || 'Laboratorio'} (${dto.term || 'Corte 1'})`,
      },
    });

    await this.prisma.rubric.create({
      data: {
        projectId: project.id,
        title: dto.rubricTitle || 'Rúbrica de Laboratorio',
        content: dto.rubricContent,
      },
    });

    const submission = await this.prisma.evaluationSubmission.create({
      data: {
        projectId: project.id,
        studentName: dto.studentName,
        assignmentTitle: dto.assignmentTitle || 'Entrega de Laboratorio',
        fileTree: dto.fileTree,
        status: SubmissionStatus.PROCESSING,
      },
    });

    try {
      this.logger.log(`Evaluating multimodal solution for submission ${submission.id}...`);

      const aiResult: AiEvaluationResponse = await this.geminiService.evaluateCodebase(
        dto.rubricContent,
        dto.fileTree,
        dto.consolidatedCode,
        dto.studentName,
        dto.semester,
        dto.term,
      );

      const positiveAspects = aiResult.criteriaBreakdown
        .filter((c) => c.status === 'PASS')
        .map((c) => `${c.criterionName}: ${c.feedback}`);

      const checkSub = await this.prisma.evaluationSubmission.findUnique({
        where: { id: submission.id },
      });
      if (!checkSub) {
        throw new Error('La entrega no fue encontrada en la base de datos al intentar registrar los resultados.');
      }

      const savedResult = await this.prisma.evaluationResult.upsert({
        where: { submissionId: submission.id },
        update: {
          overallScore: aiResult.overallScore,
          maxScore: aiResult.maxScore,
          summary: aiResult.generalSummary,
          verificationNotes: aiResult.verification,
          category: aiResult.category,
          subcategory: aiResult.subcategory,
          domainSkills: {
            skills: aiResult.domainSkills,
            learningTrend: aiResult.learningTrend,
            pedagogicalFeedback: aiResult.pedagogicalFeedback,
          } as any,
          criteriaResults: aiResult.criteriaBreakdown as any,
          positiveAspects: positiveAspects as any,
          negativeAspects: aiResult.flawsAndErrors as any,
          improvementPlan: aiResult.improvements as any,
        },
        create: {
          submissionId: submission.id,
          overallScore: aiResult.overallScore,
          maxScore: aiResult.maxScore,
          summary: aiResult.generalSummary,
          verificationNotes: aiResult.verification,
          category: aiResult.category,
          subcategory: aiResult.subcategory,
          domainSkills: {
            skills: aiResult.domainSkills,
            learningTrend: aiResult.learningTrend,
            pedagogicalFeedback: aiResult.pedagogicalFeedback,
          } as any,
          criteriaResults: aiResult.criteriaBreakdown as any,
          positiveAspects: positiveAspects as any,
          negativeAspects: aiResult.flawsAndErrors as any,
          improvementPlan: aiResult.improvements as any,
        },
      });

      await this.prisma.evaluationSubmission.update({
        where: { id: submission.id },
        data: { status: SubmissionStatus.COMPLETED },
      });

      return {
        submissionId: submission.id,
        projectId: project.id,
        status: SubmissionStatus.COMPLETED,
        result: savedResult,
      };
    } catch (err: any) {
      this.logger.error(`Evaluation failed for submission ${submission.id}: ${err.message}`);

      try {
        await this.prisma.evaluationSubmission.update({
          where: { id: submission.id },
          data: { status: SubmissionStatus.FAILED },
        });
      } catch {}

      throw new InternalServerErrorException(
        `Error al ejecutar la evaluación con IA: ${err.message}`,
      );
    }
  }

  async closeAndSaveInfographic(dto: CloseInfographicDto) {
    const currentData = await this.getGlobalInfographicData(dto.semester, dto.term);

    if (currentData.totalEvaluations === 0) {
      throw new Error('No hay evaluaciones para cerrar en este informe.');
    }

    const termLabel = dto.term && dto.term !== 'TODOS' ? ` - ${dto.term}` : ' - Consolidado Semestral';
    const title = dto.title?.trim() || `Consolidado ${dto.semester}${termLabel} (${currentData.totalEvaluations} laboratorios)`;

    const saved = await this.prisma.closedInfographic.create({
      data: {
        title,
        semester: dto.semester,
        term: dto.term || 'TODOS',
        totalEvaluations: currentData.totalEvaluations,
        averageScore: currentData.globalAverageScore,
        averagePercentage: currentData.globalAveragePercentage,
        snapshotData: currentData as any,
      },
    });

    return {
      success: true,
      message: 'Informe cerrado y archivado en el historial exitosamente.',
      closedInfographic: saved,
    };
  }

  async getClosedInfographics() {
    return this.prisma.closedInfographic.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async getClosedInfographicById(id: string) {
    const item = await this.prisma.closedInfographic.findUnique({
      where: { id },
    });
    if (!item) throw new NotFoundException('Informe cerrado no encontrado');
    return item;
  }

  async deleteClosedInfographic(id: string) {
    await this.prisma.closedInfographic.delete({ where: { id } });
    return { success: true };
  }

  async clearAllEvaluations() {
    await this.prisma.evaluationResult.deleteMany();
    await this.prisma.evaluationSubmission.deleteMany();
    await this.prisma.rubric.deleteMany();
    await this.prisma.labProposal.deleteMany();
    await this.prisma.project.deleteMany();
    return { success: true, message: 'Ciclo de evaluaciones reiniciado.' };
  }

  async getGlobalInfographicData(semester?: string, term?: string) {
    const whereClause: any = {
      status: SubmissionStatus.COMPLETED,
      result: { isNot: null },
    };

    if (semester && semester !== 'TODOS') {
      whereClause.project = {
        ...whereClause.project,
        semester: semester,
      };
    }

    if (term && term !== 'TODOS') {
      whereClause.project = {
        ...whereClause.project,
        term: term,
      };
    }

    const submissions = await this.prisma.evaluationSubmission.findMany({
      where: whereClause,
      include: {
        project: true,
        result: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const categoryStats: Record<string, { count: number; totalScore: number; maxScore: number; subcategories: Record<string, number> }> = {};
    const domainMastery: Record<string, { sumMastery: number; count: number; subdomains: Record<string, number>; feedbackSamples: string[] }> = {};
    const commonFlaws: Record<string, number> = {};
    const keyStrengths: Record<string, number> = {};
    const pedagogicalInsights: { student: string; assignment: string; trend: string; feedback: string }[] = [];
    const recommendedImprovements: Record<string, number> = {};

    // Desglose analítico por cortes
    const termStats: Record<string, { count: number; totalScore: number; maxScore: number }> = {
      'Corte 1': { count: 0, totalScore: 0, maxScore: 0 },
      'Corte 2': { count: 0, totalScore: 0, maxScore: 0 },
      'Corte 3': { count: 0, totalScore: 0, maxScore: 0 },
    };

    let totalSubmissions = 0;
    let accumulatedScore = 0;
    let accumulatedMaxScore = 0;

    for (const sub of submissions) {
      if (!sub.result) continue;
      totalSubmissions++;
      accumulatedScore += sub.result.overallScore;
      accumulatedMaxScore += sub.result.maxScore;

      const subTerm = sub.project.term || 'Corte 1';
      if (!termStats[subTerm]) {
        termStats[subTerm] = { count: 0, totalScore: 0, maxScore: 0 };
      }
      termStats[subTerm].count++;
      termStats[subTerm].totalScore += sub.result.overallScore;
      termStats[subTerm].maxScore += sub.result.maxScore;

      const cat = sub.result.category || 'Inteligencia Artificial';
      const subcat = sub.result.subcategory || 'Modelos y Experimentación';

      if (!categoryStats[cat]) {
        categoryStats[cat] = { count: 0, totalScore: 0, maxScore: 0, subcategories: {} };
      }
      categoryStats[cat].count++;
      categoryStats[cat].totalScore += sub.result.overallScore;
      categoryStats[cat].maxScore += sub.result.maxScore;
      categoryStats[cat].subcategories[subcat] = (categoryStats[cat].subcategories[subcat] || 0) + 1;

      const skillsRaw = sub.result.domainSkills as any;
      const skillsList = Array.isArray(skillsRaw) ? skillsRaw : (skillsRaw?.skills || []);
      const learningTrend = skillsRaw?.learningTrend || 'Evolución técnica positiva';
      const pedagogicalMsg = skillsRaw?.pedagogicalFeedback || sub.result.summary;

      pedagogicalInsights.push({
        student: sub.studentName,
        assignment: sub.assignmentTitle || sub.project.name,
        trend: learningTrend,
        feedback: pedagogicalMsg,
      });

      for (const sk of skillsList) {
        if (!sk.domain) continue;
        if (!domainMastery[sk.domain]) {
          domainMastery[sk.domain] = { sumMastery: 0, count: 0, subdomains: {}, feedbackSamples: [] };
        }
        domainMastery[sk.domain].sumMastery += sk.masteryPercentage || 80;
        domainMastery[sk.domain].count++;
        if (sk.subdomain) {
          domainMastery[sk.domain].subdomains[sk.subdomain] = (domainMastery[sk.domain].subdomains[sk.subdomain] || 0) + 1;
        }
        if (sk.trendFeedback && !domainMastery[sk.domain].feedbackSamples.includes(sk.trendFeedback)) {
          domainMastery[sk.domain].feedbackSamples.push(sk.trendFeedback);
        }
      }

      // Fortalezas
      const positives = (sub.result.positiveAspects as any[]) || [];
      for (const pos of positives) {
        const text = typeof pos === 'string' ? pos.slice(0, 90) : '';
        if (text) {
          keyStrengths[text] = (keyStrengths[text] || 0) + 1;
        }
      }

      // Falencias
      const flaws = (sub.result.negativeAspects as any[]) || [];
      for (const fl of flaws) {
        const key = fl.issue ? fl.issue.slice(0, 80) : 'Oportunidad de mejora técnica';
        commonFlaws[key] = (commonFlaws[key] || 0) + 1;
      }

      // Mejoras recomendadas
      const improvements = (sub.result.improvementPlan as any[]) || [];
      for (const imp of improvements) {
        const impText = typeof imp === 'string' ? imp.slice(0, 90) : '';
        if (impText) {
          recommendedImprovements[impText] = (recommendedImprovements[impText] || 0) + 1;
        }
      }
    }

    const categoriesFormatted = Object.entries(categoryStats).map(([name, data]) => ({
      category: name,
      count: data.count,
      averageScore: Number((data.totalScore / data.count).toFixed(1)),
      averagePercentage: Math.round((data.totalScore / data.maxScore) * 100),
      subcategories: Object.entries(data.subcategories).map(([subName, count]) => ({
        name: subName,
        count,
      })),
    }));

    const domainsFormatted = Object.entries(domainMastery).map(([domain, data]) => ({
      domain,
      averageMastery: Math.round(data.sumMastery / data.count),
      evaluationsCount: data.count,
      topSubdomains: Object.keys(data.subdomains).slice(0, 3),
      feedbackSamples: data.feedbackSamples.slice(0, 2),
    }));

    const topWeaknesses = Object.entries(commonFlaws)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([issue, frequency]) => ({ issue, frequency }));

    const topStrengths = Object.entries(keyStrengths)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([strength, frequency]) => ({ strength, frequency }));

    const topImprovements = Object.entries(recommendedImprovements)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([improvement, frequency]) => ({ improvement, frequency }));

    const termsFormatted = Object.entries(termStats).map(([tName, tData]) => ({
      term: tName,
      count: tData.count,
      averageScore: tData.count > 0 ? Number((tData.totalScore / tData.count).toFixed(1)) : 0,
      averagePercentage: tData.maxScore > 0 ? Math.round((tData.totalScore / tData.maxScore) * 100) : 0,
    }));

    return {
      semester: semester || 'TODOS',
      term: term || 'TODOS',
      totalEvaluations: totalSubmissions,
      globalAverageScore: totalSubmissions > 0 ? Number((accumulatedScore / totalSubmissions).toFixed(1)) : 0,
      globalAveragePercentage: accumulatedMaxScore > 0 ? Math.round((accumulatedScore / accumulatedMaxScore) * 100) : 0,
      termStats: termsFormatted,
      categories: categoriesFormatted,
      domainMastery: domainsFormatted,
      topStrengths,
      topWeaknesses,
      topImprovements,
      pedagogicalInsights: pedagogicalInsights.slice(0, 10),
      submissions: submissions.map((s) => ({
        id: s.id,
        studentName: s.studentName,
        assignmentTitle: s.assignmentTitle,
        projectName: s.project.name,
        semester: s.project.semester,
        term: s.project.term,
        score: s.result?.overallScore,
        maxScore: s.result?.maxScore,
        category: s.result?.category,
        subcategory: s.result?.subcategory,
        verificationNotes: s.result?.verificationNotes,
        summary: s.result?.summary,
        date: s.createdAt,
      })),
    };
  }

  async getAutocompleteSuggestions() {
    const semesters = await this.prisma.project.findMany({
      select: { semester: true },
      distinct: ['semester'],
    });

    const students = await this.prisma.evaluationSubmission.findMany({
      select: { studentName: true },
      distinct: ['studentName'],
    });

    return {
      semesters: semesters.map((s) => s.semester).filter(Boolean),
      terms: ['Corte 1', 'Corte 2', 'Corte 3'],
      students: students.map((s) => s.studentName).filter(Boolean),
    };
  }

  async getSubmissionWithResult(submissionId: string) {
    const submission = await this.prisma.evaluationSubmission.findUnique({
      where: { id: submissionId },
      include: {
        project: {
          include: {
            rubrics: true,
          },
        },
        result: true,
      },
    });

    if (!submission) {
      throw new NotFoundException(`Submission con ID ${submissionId} no encontrada`);
    }

    return submission;
  }

  async getAllSubmissions() {
    return this.prisma.evaluationSubmission.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        project: true,
        result: true,
      },
      take: 100,
    });
  }
}
