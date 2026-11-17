export interface CriterionBreakdown {
  criterionName: string;
  weight: number;
  scoreEarned: number;
  feedback: string;
  status: 'PASS' | 'PARTIAL' | 'FAIL';
}

export interface FlawOrError {
  file: string;
  line?: number | string;
  issue: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
}

export interface DomainSkillEvaluation {
  domain: string;        // ej. "Arquitectura y Algoritmos", "Calidad e Ingeniería de Software", "Modelado y Datos", "Visión y Multimodalidad"
  subdomain: string;     // ej. "Estructura Modular", "Seguridad y Manejo de Errores", "Análisis Estadístico / IA"
  masteryPercentage: number; // 0 - 100
  trendFeedback?: string; // Breve criterio pedagógico del progreso en este dominio
}

export interface AiEvaluationResponse {
  overallScore: number;
  maxScore: number;
  category: string;       // Categoría principal del laboratorio (ej. "Inteligencia Artificial", "Ingeniería de Software")
  subcategory: string;    // Subcategoría (ej. "Modelos Fundacionales", "Sistemas Distribuidos", "Visión Artificial")
  learningTrend: string;  // Tendencia de aprendizaje y evolución técnica del estudiante/equipo
  pedagogicalFeedback: string; // Mensaje constructivo y motivacional de retroalimentación para el crecimiento técnico
  verification: string;   // Cotejo estricto de requerimientos cumplidos vs faltantes
  generalSummary: string; // Resumen ejecutivo integral
  domainSkills: DomainSkillEvaluation[];
  criteriaBreakdown: CriterionBreakdown[];
  flawsAndErrors: FlawOrError[];
  improvements: string[];
}

export const EVALUATION_JSON_SCHEMA = {
  type: 'object',
  properties: {
    overallScore: { type: 'number' },
    maxScore: { type: 'number' },
    category: { type: 'string' },
    subcategory: { type: 'string' },
    learningTrend: { type: 'string' },
    pedagogicalFeedback: { type: 'string' },
    verification: { type: 'string' },
    generalSummary: { type: 'string' },
    domainSkills: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          domain: { type: 'string' },
          subdomain: { type: 'string' },
          masteryPercentage: { type: 'number' },
          trendFeedback: { type: 'string' },
        },
        required: ['domain', 'subdomain', 'masteryPercentage'],
      },
    },
    criteriaBreakdown: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          criterionName: { type: 'string' },
          weight: { type: 'number' },
          scoreEarned: { type: 'number' },
          feedback: { type: 'string' },
          status: { type: 'string', enum: ['PASS', 'PARTIAL', 'FAIL'] },
        },
        required: ['criterionName', 'weight', 'scoreEarned', 'feedback', 'status'],
      },
    },
    flawsAndErrors: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          file: { type: 'string' },
          line: { type: 'string' },
          issue: { type: 'string' },
          severity: { type: 'string', enum: ['CRITICAL', 'WARNING', 'INFO'] },
        },
        required: ['file', 'issue', 'severity'],
      },
    },
    improvements: {
      type: 'array',
      items: { type: 'string' },
    },
  },
  required: [
    'overallScore',
    'maxScore',
    'category',
    'subcategory',
    'learningTrend',
    'pedagogicalFeedback',
    'verification',
    'generalSummary',
    'domainSkills',
    'criteriaBreakdown',
    'flawsAndErrors',
    'improvements',
  ],
};
