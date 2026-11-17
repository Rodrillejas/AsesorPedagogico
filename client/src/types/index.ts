export interface FileTreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  children?: FileTreeNode[];
}

export interface UploadedCodeResponse {
  totalFiles: number;
  totalCharacters: number;
  fileTree: FileTreeNode[];
  consolidatedText: string;
}

export interface RubricParsedResponse {
  title: string;
  content: string;
  totalPages?: number;
  wordCount: number;
}

export interface CriterionResult {
  criterionName: string;
  weight: number;
  scoreEarned: number;
  feedback: string;
  status: 'PASS' | 'PARTIAL' | 'FAIL';
}

export interface NegativeAspect {
  file: string;
  line?: string;
  issue: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
}

export interface DomainSkill {
  domain: string;
  subdomain: string;
  masteryPercentage: number;
}

export interface EvaluationResultData {
  id: string;
  submissionId: string;
  overallScore: number;
  maxScore: number;
  summary: string;
  verificationNotes?: string;
  category?: string;
  subcategory?: string;
  domainSkills?: DomainSkill[];
  criteriaResults: CriterionResult[];
  positiveAspects: string[];
  negativeAspects: NegativeAspect[];
  improvementPlan: string[];
  createdAt: string;
}

export interface SubmissionResponse {
  submissionId: string;
  projectId: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  result?: EvaluationResultData;
}

export interface GlobalInfographicData {
  semester?: string;
  term?: string;
  totalEvaluations: number;
  globalAverageScore: number;
  globalAveragePercentage: number;
  termStats?: {
    term: string;
    count: number;
    averageScore: number;
    averagePercentage: number;
  }[];
  categories: {
    category: string;
    count: number;
    averageScore: number;
    averagePercentage: number;
    subcategories: { name: string; count: number }[];
  }[];
  domainMastery: {
    domain: string;
    averageMastery: number;
    evaluationsCount: number;
    topSubdomains: string[];
    feedbackSamples?: string[];
  }[];
  topStrengths?: { strength: string; frequency: number }[];
  topWeaknesses: { issue: string; frequency: number }[];
  topImprovements?: { improvement: string; frequency: number }[];
  pedagogicalInsights?: {
    student: string;
    assignment: string;
    trend: string;
    feedback: string;
  }[];
  submissions: {
    id: string;
    studentName: string;
    assignmentTitle?: string;
    projectName: string;
    semester?: string;
    term?: string;
    score?: number;
    maxScore?: number;
    category?: string;
    subcategory?: string;
    verificationNotes?: string;
    summary?: string;
    date: string;
  }[];
}

export interface ClosedInfographicItem {
  id: string;
  title: string;
  semester: string;
  term?: string;
  totalEvaluations: number;
  averageScore: number;
  averagePercentage: number;
  snapshotData: GlobalInfographicData;
  createdAt: string;
}
