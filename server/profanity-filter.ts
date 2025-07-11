// Extended profanity filtering system
// In production, this would load from a comprehensive database or API

export interface ProfanityFilter {
  isClean: boolean;
  blockedTerms: string[];
}

// Comprehensive profanity and harmful content list
const BLOCKED_WORDS = [
  // Basic profanity
  'fuck', 'shit', 'bitch', 'asshole', 'damn', 'crap', 'piss', 'dick',
  'cock', 'pussy', 'slut', 'whore', 'bastard', 'cunt', 'twat',
  
  // Homophobic slurs
  'fag', 'faggot', 'homo', 'dyke', 'tranny', 'shemale',
  
  // Racial slurs
  'nigger', 'nigga', 'chink', 'gook', 'spic', 'wetback', 'kike',
  'towelhead', 'sandnigger', 'raghead', 'beaner', 'coon',
  
  // Hate speech
  'nazi', 'hitler', 'holocaust', 'kkk', 'white power', 'heil',
  
  // Violence/harmful
  'kill', 'die', 'suicide', 'murder', 'rape', 'bomb', 'terrorist',
  'shooting', 'massacre', 'genocide',
  
  // Sexual explicit
  'porn', 'sex', 'xxx', 'cum', 'orgasm', 'masturbate', 'dildo',
  'vibrator', 'blowjob', 'handjob', 'anal', 'oral',
  
  // Common character replacements
  'f*ck', 'f**k', 'sh*t', 'sh**', 'b*tch', 'b**ch', 'a$$hole',
  'a$$', 'f4ck', 'sh1t', 'b1tch', 'fvck', 'shyt', 'btch',
  'a55hole', 'a55', 'f@ck', 'sh!t', 'b!tch', 'h0m0', 'g@y',
  
  // Leetspeak variations
  'fuk', 'sht', 'btch', 'cnt', 'dck', 'pss', 'shtty', 'btchy',
  'diky', 'pric', 'azz', 'asz', 'phuk', 'phuck', 'shiet',
  
  // Numbers replacing letters
  'n1gg3r', 'n1gga', 'f4gg0t', 'h1tl3r', 'n4z1', 'k1ll',
  
  // Spaced out versions
  'f u c k', 'n i g g e r', 'b i t c h', 'f a g', 'g a y'
];

// Additional pattern-based checks
const HARMFUL_PATTERNS = [
  // Multiple character replacements
  /f+u+c+k+/i,
  /s+h+i+t+/i,
  /b+i+t+c+h+/i,
  /n+i+g+g+e+r+/i,
  /f+a+g+/i,
  
  // Mixed character patterns
  /f[u@*!]+c*k/i,
  /sh[i!1*]+t/i,
  /b[i!1*]+tch/i,
  /n[i!1*]+gg[e3*]+r/i,
  /f[a@*]+g/i,
  
  // Common substitution patterns
  /[f]+[u@*!0]+[c]+[k]+/i,
  /[s]+[h]+[i!1*]+[t]+/i,
  /[b]+[i!1*]+[t]+[c]+[h]+/i,
];

export function checkProfanity(text: string): ProfanityFilter {
  const lowerText = text.toLowerCase().trim();
  const blockedTerms: string[] = [];
  
  // Remove common separators for checking
  const cleanText = lowerText.replace(/[-_\s.]/g, '');
  
  // Check against word list
  for (const word of BLOCKED_WORDS) {
    if (lowerText.includes(word) || cleanText.includes(word.replace(/\s/g, ''))) {
      blockedTerms.push(word);
    }
  }
  
  // Check against harmful patterns
  for (const pattern of HARMFUL_PATTERNS) {
    if (pattern.test(lowerText) || pattern.test(cleanText)) {
      blockedTerms.push('harmful pattern detected');
      break;
    }
  }
  
  return {
    isClean: blockedTerms.length === 0,
    blockedTerms
  };
}

// Additional username-specific validation
export function validateUsernameFormat(username: string): { isValid: boolean; reason?: string } {
  const trimmed = username.trim();
  
  // Length check
  if (trimmed.length < 3) {
    return { isValid: false, reason: 'Username too short (minimum 3 characters)' };
  }
  
  if (trimmed.length > 20) {
    return { isValid: false, reason: 'Username too long (maximum 20 characters)' };
  }
  
  // Character validation - allow only alphanumeric, underscore, dash
  if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
    return { isValid: false, reason: 'Username contains invalid characters' };
  }
  
  // Must start and end with alphanumeric
  if (!/^[a-zA-Z0-9].*[a-zA-Z0-9]$/.test(trimmed) && trimmed.length > 1) {
    return { isValid: false, reason: 'Username must start and end with a letter or number' };
  }
  
  // No consecutive special characters
  if (/[-_]{2,}/.test(trimmed)) {
    return { isValid: false, reason: 'No consecutive dashes or underscores allowed' };
  }
  
  return { isValid: true };
}

// Enhanced sponsor ad content validation
export function validateSponsorContent(productName: string, description: string, url?: string): {
  isValid: boolean;
  reason?: string;
  blockedTerms?: string[];
} {
  // Check for profanity in product name and description
  const productCheck = checkProfanity(productName);
  const descriptionCheck = checkProfanity(description);
  
  if (!productCheck.isClean) {
    return {
      isValid: false,
      reason: "Product name contains inappropriate content",
      blockedTerms: productCheck.blockedTerms
    };
  }
  
  if (!descriptionCheck.isClean) {
    return {
      isValid: false,
      reason: "Description contains inappropriate content",
      blockedTerms: descriptionCheck.blockedTerms
    };
  }
  
  // Check for illegal/prohibited advertising categories
  const combinedText = `${productName} ${description}`.toLowerCase();
  
  // Prohibited categories
  const prohibitedCategories = [
    'gambling', 'casino', 'poker', 'betting', 'lottery', 'slots',
    'drugs', 'weed', 'cannabis', 'marijuana', 'cocaine', 'heroin', 'pills',
    'weapons', 'guns', 'firearms', 'ammunition', 'explosives', 'knife',
    'cryptocurrency', 'crypto', 'bitcoin', 'ethereum', 'investment', 'trading',
    'adult', 'escort', 'dating', 'hookup', 'onlyfans', 'cam', 'webcam',
    'fake', 'counterfeit', 'replica', 'pirated', 'illegal', 'stolen',
    'pyramid', 'mlm', 'get rich quick', 'make money fast', 'work from home',
    'miracle cure', 'weight loss', 'diet pills', 'supplements',
    'hacking', 'ddos', 'botnet', 'spam', 'phishing'
  ];
  
  for (const category of prohibitedCategories) {
    if (combinedText.includes(category)) {
      return {
        isValid: false,
        reason: `Advertising for ${category} is not permitted`,
        blockedTerms: [category]
      };
    }
  }
  
  // URL validation if provided
  if (url) {
    const urlCheck = checkProfanity(url);
    if (!urlCheck.isClean) {
      return {
        isValid: false,
        reason: "URL contains inappropriate content",
        blockedTerms: urlCheck.blockedTerms
      };
    }
    
    // Check for suspicious domains
    const suspiciousDomains = [
      'bit.ly', 'tinyurl.com', 'goo.gl', 't.co', // URL shorteners
      '.tk', '.ml', '.ga', '.cf', // Free suspicious TLDs
      'phishing', 'scam', 'fake'
    ];
    
    for (const domain of suspiciousDomains) {
      if (url.toLowerCase().includes(domain)) {
        return {
          isValid: false,
          reason: "Suspicious or prohibited URL detected",
          blockedTerms: [domain]
        };
      }
    }
  }
  
  return { isValid: true };
}