export interface GptPromptOptions {
  targetLanguage: string;
  nativeLanguage?: string;
  cefrLevel: string;
  domainArea: string;
  lessonCount: number;
}

export function generateGptCoursePrompt(options: GptPromptOptions): string {
  const {
    targetLanguage = 'en',
    nativeLanguage = 'cs',
    cefrLevel = 'B2',
    domainArea = 'Project Management',
    lessonCount = 10,
  } = options;

  const langNames: Record<string, string> = {
    en: 'Angličtina (English)',
    de: 'Němčina (Deutsch)',
    es: 'Španělština (Español)',
    fr: 'Francouzština (Français)',
    it: 'Italština (Italiano)',
  };

  const targetLangLabel = langNames[targetLanguage.toLowerCase()] || targetLanguage.toUpperCase();

  return `Jsi špičkový lingvista a autor odborných jazykových kurzů pro aplikaci VERBA.
Vytvoř kompletní praktický kurz odborného jazyka pro následující zadání:

- Obor / Profesní zaměření: ${domainArea}
- Cílový studovaný jazyk: ${targetLangLabel}
- Domácí vysvětlující jazyk (překlady): Čeština (CZ)
- Jazyková úroveň dle CEFR: ${cefrLevel}
- Počet lekcí: ${lessonCount} lekcí

DŮLEŽITÉ METODICKÉ POKYNY:
1. Žádná obecná výplňová slova – každé slovíčko a fráze musí být skutečný odborný termín, ustálená kolokace nebo reálná obrat z každodenní praxe v oboru ${domainArea}.
2. Každá lekce musí mít konkrétní reálné téma, které řeší specifickou byznysovou situaci.
3. Pro každou lekci vytvoř:
   - 8 až 12 odborných položek (slovíčka, ustálené výrazy, profesionální fráze a věty).
   - Odborný článek lekce (~15–20 vět) pro nácvik čtení a porozumění.
   - Poslechový skript (~8–12 vět přirozeného dialogu nebo monologu).
   - 3 až 5 cvičení (výběr ze 4 možností "choice" nebo doplňování "fill_blank").

FORMÁT ODPOVĚDI:
Odpověz VÝHRADNĚ validním JSON objektem přesně podle následujícího schématu. Neuváděj ŽÁDNÝ úvodní text, žádné vysvětlivky okolo ani markdownové komentáře mimo JSON.

JSON SCHÉMA:
{
  "course": {
    "title": "${domainArea}",
    "domain_area": "${domainArea}",
    "target_language": "${targetLanguage.toLowerCase()}",
    "native_language": "${nativeLanguage.toLowerCase()}",
    "cefr_level": "${cefrLevel}",
    "description": "Praktický odborný kurz zaměřený na ${domainArea} pro úroveň ${cefrLevel}."
  },
  "lessons": [
    {
      "lesson_number": 1,
      "title": "Název první lekce v cílovém jazyce",
      "theme_focus": "Konkrétní téma lekce v češtině (např. Zahájení projektu a schválení rozpočtu)",
      "article_title": "Odborný název článku v cílovém jazyce",
      "article_body": "Souvislý odborný text článku v cílovém jazyce obsahující nová slovíčka...",
      "listening_script": "Přirozený poslechový text nebo dialog v cílovém jazyce...",
      "items": [
        {
          "item_type": "expression",
          "target_text": "odborný termín v cílovém jazyce",
          "czech_text": "přesný český překlad",
          "context_note": "Stručné vysvětlení kontextu použití v praxi",
          "example_sentence_target": "Příkladová věta v cílovém jazyce.",
          "example_sentence_czech": "Překlad příkladové věty do češtiny.",
          "phonetic_hint": "/výslovnost v IPA nebo foneticky/"
        }
      ],
      "exercises": [
        {
          "exercise_type": "choice",
          "prompt": "Otázka nebo zadání v češtině?",
          "options": ["správná možnost", "možnost b", "možnost c", "možnost d"],
          "canonical_answer": "správná možnost",
          "explanation": "Vysvětlení správné odpovědi v češtině."
        }
      ]
    }
  ]
}`;
}
