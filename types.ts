
export type AccuracyRate = 'all' | '80' | '60' | '40';

export interface FilterConfig {
  accuracyThreshold: AccuracyRate;
  years: string[]; // 検索対象の年度
  fields: string[]; // 追加: 抽出対象の分野
}

export interface FileItem {
  base64: string;
  name: string;
  id: string;
}

export interface Question {
  id?: number; // DB用
  year: string; // 年度 (例: 第60回)
  displayNumber: string; // e.g., "60A-4"
  category: string;
  body: string;
  options: string[];
  correctAnswer: string;
  accuracyRate: number;
  imageDescription?: string;
  imageUrl?: string; // 追加: Google Drive等の画像リンク
}

export interface ProblemSetResponse {
  questions: Question[];
}

export type ProcessingStatus = 'idle' | 'analyzing' | 'confirming' | 'saving' | 'success' | 'error' | 'linking';
export type AppMode = 'search' | 'admin';
