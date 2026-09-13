export type CourseStatus =
  | 'outline_pending'
  | 'outline_approved'
  | 'generating'
  | 'ready'
  | 'failed';

export type LearningState = 'new' | 'learning' | 'review' | 'mastered';

export type LearningItemType = 'word' | 'expression' | 'phrase' | 'sentence';

export type LearningDirection = 'cz_to_target' | 'target_to_cz';

export interface User {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
}

export interface Course {
  id: string;
  user_id: string;
  target_language: string;
  native_language: string;
  cefr_level: string;
  domain_area: string;
  status: CourseStatus;
  total_lessons: number;
  completed_lessons_count: number;
  generation_error?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CurriculumLessonOutline {
  lesson_number: number;
  title: string;
  theme_focus: string;
  learning_goal: string;
}

export interface CurriculumOutline {
  id: string;
  course_id: string;
  outline: CurriculumLessonOutline[];
  is_approved: boolean;
  approved_at?: string | null;
  created_at: string;
}

export interface Lesson {
  id: string;
  course_id: string;
  lesson_number: number;
  title: string;
  theme_focus: string;
  article_title: string;
  article_body: string;
  listening_script: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  created_at: string;
}

export interface LearningItem {
  id: string;
  lesson_id: string;
  course_id: string;
  item_type: LearningItemType;
  target_text: string;
  czech_text: string;
  context_note: string;
  example_sentence_target: string;
  example_sentence_czech: string;
  phonetic_hint?: string | null;
  audio_url?: string | null;
  created_at: string;
}

export interface UserItemState {
  id: string;
  user_id: string;
  learning_item_id: string;
  course_id: string;
  cz_to_target_state: LearningState;
  cz_to_target_streak: number;
  cz_to_target_last_reviewed?: string | null;
  cz_to_target_next_review?: string | null;
  target_to_cz_state: LearningState;
  target_to_cz_streak: number;
  target_to_cz_last_reviewed?: string | null;
  target_to_cz_next_review?: string | null;
  overall_state: LearningState;
  updated_at: string;
}

export interface AttemptLog {
  id: string;
  user_id: string;
  course_id: string;
  learning_item_id?: string | null;
  direction: LearningDirection;
  exercise_type: string;
  user_answer: string;
  is_correct: boolean;
  score: number;
  evaluation_mode: 'deterministic_exact' | 'deterministic_synonym' | 'ai_semantic';
  ai_feedback?: string | null;
  created_at: string;
}

export interface LessonExercise {
  id: string;
  lesson_id: string;
  exercise_type: 'choice' | 'fill_blank' | 'open_qa' | 'listening_transcribe';
  prompt: string;
  target_language_context?: string | null;
  options?: string[] | null;
  canonical_answer: string;
  acceptable_synonyms?: string[] | null;
  explanation: string;
}

export interface TransferArticle {
  id: string;
  lesson_id: string;
  title: string;
  body_text: string;
  questions: {
    question: string;
    type: 'multiple_choice' | 'true_false' | 'open_answer';
    options?: string[];
    canonical_answer: string;
    explanation: string;
  }[];
}
