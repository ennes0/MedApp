/**
 * Content Filter — Client-side message moderation for health safety.
 *
 * Flags messages that contain potentially dangerous medical advice,
 * dosage recommendations, or harmful content. This is a first-pass
 * filter; server-side Cloud Functions perform deeper analysis.
 */

// ──────────────────────────────────────────────
// Dangerous Medical Keywords (Turkish + English)
// ──────────────────────────────────────────────

const DANGEROUS_PATTERNS: RegExp[] = [
  // Dosage advice
  /(\d+)\s*(mg|ml|gr|gram|tablet|hap|damla|drop)/i,
  /doz(unu|u|aj)?\s*(artır|azalt|değiştir|iki\s*kat)/i,
  /dose?\s*(increas|decreas|doubl|chang)/i,

  // "Stop taking" / "Don't take"
  /ilacını?\s*(bırak|kes|alma|kullanma)/i,
  /(stop|quit|don'?t)\s*(tak|us)ing\s*(your|the|this)?\s*(med|drug|pill)/i,

  // Self-medication
  /kendi(n)?\s*(iç|kullan|dene)/i,
  /self[\s-]?medicat/i,

  // Specific dangerous advice
  /reçetesiz|without\s*prescription/i,
  /overdose|aşırı\s*doz/i,

  // Mixing medications
  /karıştır|birlikte\s*(iç|kullan|al)/i,
  /mix(ing)?\s*(with|meds|pills|drug)/i,
];

// Harmful content patterns
const HARMFUL_PATTERNS: RegExp[] = [
  /intihar|suicide|kendine\s*zarar/i,
  /öl(mek|üm|dür)/i,
  /kill\s*(your)?self/i,
  /self[\s-]?harm/i,
];

// Spam patterns
const SPAM_PATTERNS: RegExp[] = [
  /(http|https):\/\/[^\s]+/i,  // links
  /\b(sat(ıyor|ılık|ın\s*al)|buy|sell|purchase|order)\b.*\b(ilaç|hap|med|pill|drug)\b/i,
  /whatsapp|telegram|instagram|snapchat/i,  // social redirects
  /\+?\d{10,}/,  // phone numbers
];

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export type ContentFlag =
  | 'medical_advice'
  | 'harmful_content'
  | 'spam'
  | 'clean';

export interface ContentCheckResult {
  flag: ContentFlag;
  shouldBlock: boolean;
  shouldWarn: boolean;
  warningMessage: string | null;
}

// ──────────────────────────────────────────────
// Filter Function
// ──────────────────────────────────────────────

export function checkMessageContent(text: string): ContentCheckResult {
  const trimmed = text.trim();

  // Check harmful content FIRST — highest severity
  for (const pattern of HARMFUL_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        flag: 'harmful_content',
        shouldBlock: true,
        shouldWarn: true,
        warningMessage:
          'This message may contain sensitive content. If you are going through a difficult time, please contact a crisis helpline or your doctor.',
      };
    }
  }

  // Check spam
  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        flag: 'spam',
        shouldBlock: true,
        shouldWarn: true,
        warningMessage:
          'This message could not be sent. Sharing links, phone numbers, and drug sale content is prohibited.',
      };
    }
  }

  // Check medical advice
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        flag: 'medical_advice',
        shouldBlock: false,
        shouldWarn: true,
        warningMessage:
          '⚕️ Attention: This message may contain medical information. Reminder: Sharing here is personal experience, not medical advice. Consult your doctor.',
      };
    }
  }

  return {
    flag: 'clean',
    shouldBlock: false,
    shouldWarn: false,
    warningMessage: null,
  };
}

// ──────────────────────────────────────────────
// Medical Disclaimer Texts
// ──────────────────────────────────────────────

export const MEDICAL_DISCLAIMERS = {
  /** Shown at the top of every chat */
  chatBanner: {
    tr: '⚕️ Bu sohbet genel deneyim paylaşımı içindir. Tıbbi tavsiye almak için doktorunuza danışın. İlaç dozajı, kullanım şekli veya tedavi değişiklikleri hakkında karar vermek için mutlaka sağlık profesyoneline başvurun.',
    en: '⚕️ This chat is for sharing personal experiences only. Consult your doctor for medical advice. Always contact a healthcare professional for decisions about medication dosage, usage, or treatment changes.',
  },

  /** Shown before first chat */
  consentPrompt: {
    tr: 'MediMates\'te paylaşılan bilgiler kişisel deneyime dayalıdır ve tıbbi tavsiye yerine geçmez. İlaçlarınız hakkında her türlü karar için doktorunuza danışın.\n\nBu platformda:\n• Kişisel deneyimlerinizi paylaşabilirsiniz\n• Birbirinizi motive edebilirsiniz\n• Tıbbi tavsiye vermek/almak yasaktır\n• İlaç dozajı önerisi yapmak yasaktır\n• Kişisel bilgilerinizi paylaşmayın',
    en: 'Information shared on MediMates is based on personal experience and does not replace medical advice. Consult your doctor for any decisions about your medications.\n\nOn this platform:\n• You can share personal experiences\n• You can motivate each other\n• Giving/receiving medical advice is prohibited\n• Suggesting medication dosages is prohibited\n• Do not share personal information',
  },

  /** Shown in mate profile */
  profileWarning: {
    tr: 'Bu kullanıcı hakkındaki bilgiler kendi beyanına dayanmaktadır. MediMates, kullanıcıların sağlık durumlarını doğrulamamaktadır.',
    en: 'Information about this user is self-reported. MediMates does not verify users\' health conditions.',
  },

  /** Shown on mates discover screen */
  discoverWarning: {
    tr: 'Mate\'ler aynı ilacı kullanan kişilerdir. Paylaşılan bilgiler kişisel deneyimdir, tıbbi tavsiye değildir.',
    en: 'Mates are people who take the same medication. Information shared is personal experience, not medical advice.',
  },

  /** Legal footer */
  legalFooter: {
    tr: 'MediMates bir sağlık danışmanlık hizmeti değildir. Uygulama içi iletişim, kullanıcıların kişisel deneyimlerini paylaşması amacıyla sunulmaktadır. Herhangi bir tıbbi karar için mutlaka doktorunuza veya eczacınıza danışın.',
    en: 'MediMates is not a healthcare advisory service. In-app communication is provided for users to share personal experiences. Always consult your doctor or pharmacist for any medical decisions.',
  },
} as const;

/**
 * Community guidelines — Turkish
 */
export const COMMUNITY_GUIDELINES = [
  {
    title: 'Personal Experience Sharing',
    description: 'Only share your own experiences. Saying "This is what happened to me" is fine, saying "You should do this" is prohibited.',
    icon: 'text.bubble.fill',
  },
  {
    title: 'Don\'t Give Medical Advice',
    description: 'Do not suggest medication dosage, usage, or treatment changes. Consult your doctor for these matters.',
    icon: 'cross.case.fill',
  },
  {
    title: 'Privacy & Security',
    description: 'Do not share your real name, address, phone number, or other personal information. Use your nickname.',
    icon: 'lock.shield.fill',
  },
  {
    title: 'Respectful Communication',
    description: 'Everyone is on a different health journey. Be respectful and supportive of each other.',
    icon: 'heart.fill',
  },
  {
    title: 'Report Suspicious Content',
    description: 'Use the report button when you see harmful, false, or disturbing content.',
    icon: 'exclamationmark.shield.fill',
  },
] as const;

// Keep backward-compat alias
export const COMMUNITY_GUIDELINES_TR = COMMUNITY_GUIDELINES;
