export type MatchType = 'exact' | 'alias' | 'token' | 'variant' | 'fuzzy' | 'rule' | 'none';

export interface NamingAttemptDetail {
  itemId: number;
  target: string;
  response: string;
  normalizedResponse: string;
  isCorrect: boolean;
  matchType: MatchType;
  matchedCanonical: string | null;
}

export interface FluencyValidationTraceItem {
  raw: string;
  normalized: string;
  isCorrect: boolean;
  matchType: MatchType;
  matchedCanonical: string | null;
}

interface MatchResult {
  isCorrect: boolean;
  matchType: MatchType;
  matchedCanonical: string | null;
}

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'that', 'this', 'have', 'has', 'from', 'into', 'then', 'than',
  'very', 'just', 'like', 'you', 'your', 'its', 'was', 'are', 'can', 'many', 'name', 'as', 'of',
]);

const OBJECT_NAME_ALIASES: Record<string, string[]> = {
  durian: ['king of fruits', 'king of fruit'],
  merlion: ['mer lion', 'lion fish statue'],
  satay: ['sate', 'satay skewer', 'satay skewers', 'meat skewer', 'meat skewers'],
  bicycle: ['bike', 'cycle'],
  kopitiam: ['coffee shop', 'kopi tiam', 'coffeeshop'],
  'chilli crab': ['chili crab', 'crab dish', 'spicy crab'],
  abacus: ['counting frame'],
  phonograph: ['record player', 'gramophone', 'turntable'],
};

const FLUENCY_CATEGORY_TERMS: Record<string, string[]> = {
  Animals: [
    'dog', 'cat', 'lion', 'tiger', 'elephant', 'giraffe', 'zebra', 'monkey', 'bear', 'wolf',
    'fox', 'horse', 'cow', 'goat', 'sheep', 'rabbit', 'deer', 'panda', 'kangaroo', 'hippo',
  ],
  Fruits: [
    'apple', 'banana', 'orange', 'pear', 'grape', 'mango', 'papaya', 'pineapple', 'durian',
    'watermelon', 'strawberry', 'blueberry', 'kiwi', 'peach', 'plum', 'lemon', 'lime', 'cherry',
  ],
  Furniture: [
    'chair', 'table', 'sofa', 'couch', 'bed', 'wardrobe', 'desk', 'cabinet', 'bookshelf', 'stool',
    'drawer', 'shelf', 'bench', 'nightstand', 'armchair',
  ],
  Colors: [
    'red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'black', 'white', 'brown',
    'gray', 'grey', 'cyan', 'magenta', 'gold', 'silver',
  ],
  'Musical Instruments': [
    'piano', 'guitar', 'violin', 'drum', 'flute', 'trumpet', 'clarinet', 'saxophone', 'harp',
    'cello', 'ukulele', 'tambourine', 'harmonica', 'trombone', 'xylophone',
  ],
  Countries: [
    'singapore', 'malaysia', 'indonesia', 'thailand', 'japan', 'korea', 'china', 'india',
    'australia', 'france', 'germany', 'italy', 'spain', 'brazil', 'canada', 'mexico', 'egypt',
    'vietnam', 'philippines', 'myanmar',
  ],
  Emotions: [
    'happy', 'sad', 'angry', 'afraid', 'scared', 'excited', 'nervous', 'calm', 'joyful',
    'anxious', 'proud', 'guilty', 'ashamed', 'surprised', 'confused', 'lonely',
  ],
  'Chemical Elements': [
    'hydrogen', 'helium', 'lithium', 'carbon', 'nitrogen', 'oxygen', 'sodium', 'magnesium',
    'aluminum', 'silicon', 'phosphorus', 'sulfur', 'chlorine', 'iron', 'copper', 'silver',
    'gold', 'zinc', 'calcium', 'potassium',
  ],
};

export function normalizeText(input: string): string {
  return input
    .toLowerCase()
    .replace(/['`]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function singularize(token: string): string {
  if (token.endsWith('ies') && token.length > 4) {
    return `${token.slice(0, -3)}y`;
  }
  if (token.endsWith('es') && token.length > 4) {
    return token.slice(0, -2);
  }
  if (token.endsWith('s') && token.length > 3) {
    return token.slice(0, -1);
  }
  return token;
}

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));

  for (let i = 0; i <= a.length; i += 1) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j += 1) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }

  return matrix[a.length][b.length];
}

function extractCandidateTerms(transcript: string): string[] {
  const normalized = normalizeText(transcript);
  if (!normalized) return [];

  const words = normalized
    .split(/\s+/)
    .filter((word) => word.length > 1 && !STOP_WORDS.has(word));

  const bigrams: string[] = [];
  for (let i = 0; i < words.length - 1; i += 1) {
    bigrams.push(`${words[i]} ${words[i + 1]}`);
  }

  return unique([...words, ...bigrams]);
}

export function validateObjectNamingResponse(targetName: string, transcript: string): MatchResult {
  const normalizedTarget = normalizeText(targetName);
  const normalizedTranscript = normalizeText(transcript);

  if (!normalizedTranscript) {
    return { isCorrect: false, matchType: 'none', matchedCanonical: null };
  }

  const aliasTerms = OBJECT_NAME_ALIASES[normalizedTarget] ?? [];
  const acceptedTerms = unique([normalizedTarget, ...aliasTerms.map(normalizeText)]);

  const directMatch = acceptedTerms.find((term) => term && normalizedTranscript.includes(term));
  if (directMatch) {
    return {
      isCorrect: true,
      matchType: directMatch === normalizedTarget ? 'exact' : 'alias',
      matchedCanonical: normalizedTarget,
    };
  }

  const candidates = extractCandidateTerms(transcript);
  for (const candidate of candidates) {
    for (const accepted of acceptedTerms) {
      if (!accepted) continue;

      if (candidate === accepted) {
        return { isCorrect: true, matchType: 'token', matchedCanonical: normalizedTarget };
      }

      if (singularize(candidate) === singularize(accepted)) {
        return { isCorrect: true, matchType: 'variant', matchedCanonical: normalizedTarget };
      }

      if (candidate.length >= 5 && accepted.length >= 5 && levenshteinDistance(candidate, accepted) <= 1) {
        return { isCorrect: true, matchType: 'fuzzy', matchedCanonical: normalizedTarget };
      }
    }
  }

  return { isCorrect: false, matchType: 'none', matchedCanonical: null };
}

function extractFluencyCandidates(transcript: string): string[] {
  const normalized = normalizeText(transcript);
  if (!normalized) return [];

  const segments = normalized.split(/[\n,;]+/).map((segment) => segment.trim()).filter(Boolean);
  const candidates: string[] = [];

  for (const segment of segments) {
    // Preserve short phrases when speech recognition groups two-word entities.
    if (segment.length >= 3 && segment.length <= 30) {
      candidates.push(segment);
    }

    const words = segment.split(/\s+/).filter((word) => word.length > 1 && !STOP_WORDS.has(word));
    candidates.push(...words);
  }

  return unique(candidates);
}

function matchFluencyItem(categoryName: string, candidate: string): MatchResult {
  const normalizedCategory = categoryName.trim();
  const normalizedCandidate = normalizeText(candidate);

  if (!normalizedCandidate) {
    return { isCorrect: false, matchType: 'none', matchedCanonical: null };
  }

  if (normalizedCategory === 'Words starting with "S"') {
    if (normalizedCandidate.startsWith('s') && normalizedCandidate.length > 1) {
      return { isCorrect: true, matchType: 'rule', matchedCanonical: normalizedCandidate };
    }
    return { isCorrect: false, matchType: 'none', matchedCanonical: null };
  }

  const dictionary = FLUENCY_CATEGORY_TERMS[normalizedCategory] ?? [];
  for (const term of dictionary) {
    const normalizedTerm = normalizeText(term);

    if (normalizedCandidate === normalizedTerm) {
      return { isCorrect: true, matchType: 'exact', matchedCanonical: normalizedTerm };
    }

    if (singularize(normalizedCandidate) === singularize(normalizedTerm)) {
      return { isCorrect: true, matchType: 'variant', matchedCanonical: normalizedTerm };
    }

    if (
      normalizedCandidate.length >= 5
      && normalizedTerm.length >= 5
      && levenshteinDistance(normalizedCandidate, normalizedTerm) <= 1
    ) {
      return { isCorrect: true, matchType: 'fuzzy', matchedCanonical: normalizedTerm };
    }
  }

  return { isCorrect: false, matchType: 'none', matchedCanonical: null };
}

export function validateCategoryFluencyTranscript(
  categoryName: string,
  transcript: string,
  existingValidItems: string[] = [],
): { valid: string[]; invalid: string[]; details: FluencyValidationTraceItem[] } {
  const candidates = extractFluencyCandidates(transcript);
  const existingSet = new Set(existingValidItems.map(normalizeText));

  const valid: string[] = [];
  const invalid: string[] = [];
  const details: FluencyValidationTraceItem[] = [];

  for (const candidate of candidates) {
    const normalizedCandidate = normalizeText(candidate);
    if (!normalizedCandidate || existingSet.has(normalizedCandidate)) {
      continue;
    }

    const match = matchFluencyItem(categoryName, normalizedCandidate);

    details.push({
      raw: candidate,
      normalized: normalizedCandidate,
      isCorrect: match.isCorrect,
      matchType: match.matchType,
      matchedCanonical: match.matchedCanonical,
    });

    if (match.isCorrect) {
      const canonical = match.matchedCanonical ?? normalizedCandidate;
      if (!existingSet.has(canonical)) {
        valid.push(canonical);
        existingSet.add(canonical);
      }
    } else {
      invalid.push(normalizedCandidate);
    }
  }

  return {
    valid: unique(valid),
    invalid: unique(invalid),
    details,
  };
}