import { AppMode, ModeConfig, TopicContent, VoiceConfig } from './types';

// The "Subject Matter" for the tutor
export const PHOTOSYNTHESIS_CONTENT: TopicContent = {
  title: "Photosynthesis",
  description: "The process by which plants use sunlight, water, and carbon dioxide to create oxygen and energy in the form of sugar.",
  keyConcepts: [
    {
      term: "Chlorophyll",
      definition: "A green pigment responsible for the absorption of light to provide energy for photosynthesis."
    },
    {
      term: "Stomata",
      definition: "Tiny pores in plant leaves that facilitate gas exchange (CO2 in, O2 out)."
    },
    {
      term: "Light-dependent Reactions",
      definition: "The first stage of photosynthesis, occurring in the thylakoid membranes, requiring direct light to produce ATP."
    },
    {
      term: "Calvin Cycle",
      definition: "The set of chemical reactions that take place in chloroplasts during photosynthesis, not requiring light directly."
    }
  ],
  quizQuestions: [
    {
      question: "What is the primary byproduct of photosynthesis that is released into the atmosphere?",
      answer: "Oxygen"
    },
    {
      question: "Where exactly does the Calvin Cycle take place?",
      answer: "In the stroma of the chloroplast."
    },
    {
      question: "Which pigment is primarily responsible for absorbing light energy?",
      answer: "Chlorophyll"
    }
  ]
};

// Voice Mappings based on request
// Matthew (Learn) -> Zephyr
// Alicia (Quiz) -> Kore
// Ken (Teach Back) -> Fenrir
export const VOICE_CONFIGS: Record<string, VoiceConfig> = {
  MATTHEW: { voiceName: 'Zephyr', label: 'Matthew (Learn)' },
  ALICIA: { voiceName: 'Kore', label: 'Alicia (Quiz)' },
  KEN: { voiceName: 'Fenrir', label: 'Ken (Teach Back)' },
  INTRO: { voiceName: 'Zephyr', label: 'Greeter' } // Default
};

export const MODE_CONFIG: ModeConfig = {
  [AppMode.INTRO]: {
    voice: VOICE_CONFIGS.INTRO,
    systemInstruction: (content) => `
      You are a helpful "Active Recall Coach".
      Your goal is to greet the user and ask them which learning mode they want to start with:
      1. Learn Mode (where you explain concepts).
      2. Quiz Mode (where you test their knowledge).
      3. Teach-Back Mode (where they explain to you).
      
      The topic today is: ${content.title}.
      
      If the user selects a mode, you MUST use the "switchMode" tool to change the mode.
      Do not start teaching yet. Just route the user.
    `
  },
  [AppMode.LEARN]: {
    voice: VOICE_CONFIGS.MATTHEW,
    systemInstruction: (content) => `
      You are in LEARN MODE. You are "Matthew".
      Your goal is to explain the topic: ${content.title}.
      Here is the content: ${JSON.stringify(content)}.
      
      Explain the concepts clearly and engagingly. Use analogies.
      Pause frequently to ensure the user understands.
      If the user wants to switch modes, use the "switchMode" tool.
    `
  },
  [AppMode.QUIZ]: {
    voice: VOICE_CONFIGS.ALICIA,
    systemInstruction: (content) => `
      You are in QUIZ MODE. You are "Alicia".
      Your goal is to quiz the user on: ${content.title}.
      Here are some questions: ${JSON.stringify(content.quizQuestions)}.
      
      Ask ONE question at a time. Wait for the user's answer.
      Give feedback (Correct/Incorrect) and explain briefly if they are wrong.
      Then ask the next question.
      If the user wants to switch modes, use the "switchMode" tool.
    `
  },
  [AppMode.TEACH_BACK]: {
    voice: VOICE_CONFIGS.KEN,
    systemInstruction: (content) => `
      You are in TEACH-BACK MODE. You are "Ken".
      Your goal is to ask the user to explain concepts back to you about: ${content.title}.
      Here is the content: ${JSON.stringify(content.keyConcepts)}.
      
      Pick a concept and ask the user to explain it to you as if you were a beginner.
      Give qualitative feedback on their explanation. Did they miss key details? Was it clear?
      If the user wants to switch modes, use the "switchMode" tool.
    `
  }
};