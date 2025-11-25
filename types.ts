export enum AppMode {
  INTRO = 'intro',
  LEARN = 'learn',
  QUIZ = 'quiz',
  TEACH_BACK = 'teach_back'
}

export interface TopicContent {
  title: string;
  description: string;
  keyConcepts: Array<{
    term: string;
    definition: string;
  }>;
  quizQuestions: Array<{
    question: string;
    answer: string;
  }>;
}

export interface VoiceConfig {
  voiceName: 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr';
  label: string; // The user-facing name (Matthew, Alicia, Ken)
}

export type ModeConfig = {
  [key in AppMode]: {
    voice: VoiceConfig;
    systemInstruction: (content: TopicContent) => string;
  };
};