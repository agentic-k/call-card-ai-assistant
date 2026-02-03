export interface Question {
  text: string;
  id?: string;
}

export interface UseCase {
  title: string;
  description: string;
  questions: Question[];
  id?: string;
}

export interface PainPoint {
  title: string;
  description: string;
  questions: Question[];
  id?: string;
}

export interface CallCard {
  id?: string;
  name: string;
  description: string;
  useCases: UseCase[];
  painPoints: PainPoint[];
  createdAt?: string;
  updatedAt?: string;
}
