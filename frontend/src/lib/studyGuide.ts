export interface StudyGuideChapter {
    title: string;
    start_id: number;
    description: string;
}

export interface StudyGuideExpression {
    phrase: string;
    meaning: string;
    example: string;
    source_id: number;
}

export interface StudyGuideQuestion {
    question: string;
    options: string[];
    answer: number;
    explanation: string;
}

export interface StudyGuide {
    summary: string;
    chapters: StudyGuideChapter[];
    expressions: StudyGuideExpression[];
    questions: StudyGuideQuestion[];
}
