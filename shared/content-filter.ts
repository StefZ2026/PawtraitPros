const blockedWords = [
  "ass", "asshole", "bastard", "bitch", "blowjob", "boob", "boobs",
  "butt", "cock", "crap", "cum", "cunt", "damn", "dick", "dildo",
  "douche", "fag", "fuck", "fucker", "fucking", "handjob", "hell",
  "hoe", "homo", "horny", "jerk", "milf", "mofo", "motherfucker",
  "naked", "nazi", "nigga", "nigger", "nude", "orgasm", "penis",
  "piss", "porn", "porno", "pussy", "rape", "rapist", "retard",
  "scrotum", "sex", "shit", "shitty", "slut", "smut", "sperm",
  "stripper", "tit", "tits", "titty", "twat", "vagina", "viagra",
  "vulva", "whore", "wanker", "xxx",
];

const leetMap: Record<string, string> = {
  "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", "$": "s",
  "!": "i", "*": "", "+": "t",
};

function normalizeLeet(text: string): string {
  return text.split("").map(c => leetMap[c] || c).join("");
}

function normalizeText(text: string): string {
  let n = text.toLowerCase();
  n = normalizeLeet(n);
  n = n.replace(/[^a-z]/g, "");
  return n;
}

const blockedPatterns = blockedWords.map(w => new RegExp(`\\b${w}\\b`, "i"));

export function containsInappropriateLanguage(text: string): boolean {
  if (blockedPatterns.some(p => p.test(text))) return true;

  const stripped = text.toLowerCase().replace(/[^a-z\s]/g, "");
  if (blockedPatterns.some(p => p.test(stripped))) return true;

  const normalized = normalizeText(text);
  if (blockedWords.some(w => normalized.includes(w))) return true;

  const spaceless = text.toLowerCase().replace(/[\s._\-*!@#$%^&()]/g, "");
  if (blockedWords.some(w => spaceless.includes(w))) return true;

  return false;
}

export function validatePetName(name: string): { valid: boolean; error?: string } {
  const trimmed = name.trim();
  if (!trimmed) return { valid: false, error: "Name is required" };
  if (trimmed.length < 1) return { valid: false, error: "Name is too short" };
  if (trimmed.length > 50) return { valid: false, error: "Name must be 50 characters or less" };
  if (containsInappropriateLanguage(trimmed)) {
    return { valid: false, error: "Please choose a family-friendly name" };
  }
  return { valid: true };
}
