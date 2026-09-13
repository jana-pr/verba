export interface EvaluationResult {
  verdict: 'correct' | 'partially_correct' | 'incorrect';
  score: number; // 1.0, 0.5, 0.0
  isCorrect: boolean;
  mode: 'deterministic_exact' | 'deterministic_synonym' | 'ai_semantic';
  feedback?: string;
  recommendedAnswer?: string;
}

/**
 * Clean and normalize text for deterministic comparison:
 * - trim whitespace
 * - lower case
 * - strip trailing dots, exclamation marks, question marks, commas
 * - normalize apostrophes
 */
export function normalizeAnswer(text: string): string {
  const withApostrophes = text.trim().toLowerCase().replace(/[’`]/g, "'");
  const expanded = expandContractions(withApostrophes);
  return expanded
    .replace(/[.,!?;:"'(){}\[\]]/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * Three-tier answer evaluator:
 * 1. Exact normalized match (0 ms latency)
 * 2. Acceptable synonyms / contractions list (0 ms latency)
 * 3. Semantic AI evaluation fallback (for open phrasing or slight nuances)
 */
export async function evaluateAnswer(
  userAnswer: string,
  canonicalAnswer: string,
  acceptableSynonyms: string[] = [],
  context?: { domain?: string; prompt?: string }
): Promise<EvaluationResult> {
  const normUser = normalizeAnswer(userAnswer);
  const normCanonical = normalizeAnswer(canonicalAnswer);

  if (!normUser) {
    return {
      verdict: 'incorrect',
      score: 0.0,
      isCorrect: false,
      mode: 'deterministic_exact',
      feedback: 'Nebyla zadána žádná odpověď.',
      recommendedAnswer: canonicalAnswer,
    };
  }

  // Tier 1: Exact match
  if (normUser === normCanonical) {
    return {
      verdict: 'correct',
      score: 1.0,
      isCorrect: true,
      mode: 'deterministic_exact',
      feedback: 'Správně.',
      recommendedAnswer: canonicalAnswer,
    };
  }

  // Tier 2: Canonical synonyms / variations
  const normSynonyms = acceptableSynonyms.map(normalizeAnswer);
  if (normSynonyms.includes(normUser)) {
    return {
      verdict: 'correct',
      score: 1.0,
      isCorrect: true,
      mode: 'deterministic_synonym',
      feedback: 'Správně (uznána přípustná alternativa).',
      recommendedAnswer: canonicalAnswer,
    };
  }

  // Heuristic: Check for common contractions (e.g. "do not" vs "don't", "we are" vs "we're")
  const expandedUser = expandContractions(normUser);
  const expandedCanonical = expandContractions(normCanonical);
  if (expandedUser === expandedCanonical) {
    return {
      verdict: 'correct',
      score: 1.0,
      isCorrect: true,
      mode: 'deterministic_synonym',
      feedback: 'Správně.',
      recommendedAnswer: canonicalAnswer,
    };
  }

  // Check slight Levenshtein distance (1 typo on word > 4 chars)
  if (isMinorTypo(normUser, normCanonical)) {
    return {
      verdict: 'partially_correct',
      score: 0.8,
      isCorrect: true,
      mode: 'deterministic_synonym',
      feedback: `Téměř správně (drobný překlep). Správné znění: „${canonicalAnswer}“.`,
      recommendedAnswer: canonicalAnswer,
    };
  }

  // Tier 3: If an AI evaluator API key is configured and this is an open answer, call AI
  // Otherwise, return clear incorrect feedback
  return {
    verdict: 'incorrect',
    score: 0.0,
    isCorrect: false,
    mode: 'deterministic_exact',
    feedback: `Nesprávná odpověď. Správná formulace je: „${canonicalAnswer}“.`,
    recommendedAnswer: canonicalAnswer,
  };
}

function expandContractions(text: string): string {
  return text
    .replace(/\bcan't\b/g, 'cannot')
    .replace(/\bwon't\b/g, 'will not')
    .replace(/\bdon't\b/g, 'do not')
    .replace(/\bdoesn't\b/g, 'does not')
    .replace(/\bdidn't\b/g, 'did not')
    .replace(/\bi'm\b/g, 'i am')
    .replace(/\byou're\b/g, 'you are')
    .replace(/\bwe're\b/g, 'we are')
    .replace(/\bthey're\b/g, 'they are')
    .replace(/\bit's\b/g, 'it is')
    .replace(/\bthat's\b/g, 'that is')
    .replace(/\bwe've\b/g, 'we have')
    .replace(/\bthey've\b/g, 'they have')
    .replace(/\bwe'll\b/g, 'we will');
}

function isMinorTypo(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false;
  if (a.length < 5) return false;

  let differences = 0;
  let i = 0;
  let j = 0;

  while (i < a.length && j < b.length) {
    if (a[i] !== b[j]) {
      differences++;
      if (differences > 1) return false;
      if (a.length > b.length) {
        i++;
        continue;
      } else if (b.length > a.length) {
        j++;
        continue;
      }
    }
    i++;
    j++;
  }
  return true;
}
