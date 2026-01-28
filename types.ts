
export type AccuracyRate = 'all' | '80' | '60' | '40';

export interface FilterConfig {
  accuracyThreshold: AccuracyRate;
  fields: string[]; // Changed from single field to multiple fields
}

export interface FileItem {
  base64: string;
  name: string;
  id: string;
}

export interface Question {
  displayNumber: string; // e.g., "60A-4"
  category: string;
  body: string;
  options: string[];
  correctAnswer: string;
  accuracyRate: number; // 4校正答率
  imageDescription?: string; // Content of the screenshot/image described by AI
}

export interface ProblemSetResponse {
  questions: Question[];
  unmatchedProblems?: string[];
}

export type ProcessingStatus = 'idle' | 'uploading' | 'processing' | 'success' | 'error';
