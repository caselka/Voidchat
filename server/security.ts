/**
 * Security utilities to prevent CSS injection and backend interaction attempts
 */

// Sanitize message content to prevent CSS and HTML injection
export function sanitizeMessageContent(content: string): string {
  if (!content || typeof content !== 'string') {
    return '';
  }
  
  // Remove all HTML tags, CSS, and script-like content
  const sanitized = content
    // Remove HTML tags completely
    .replace(/<[^>]*>/g, '')
    .replace(/&lt;[^&]*&gt;/gi, '')
    // Remove CSS style attributes and properties
    .replace(/style\s*=\s*["'][^"']*["']/gi, '')
    .replace(/\{[^}]*\}/g, '')
    .replace(/:[^;]+;/g, '')
    // Remove JavaScript-like patterns
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/eval\s*\(/gi, '')
    .replace(/function\s*\(/gi, '')
    // Remove data URLs and protocols
    .replace(/data:/gi, '')
    .replace(/file:/gi, '')
    .replace(/ftp:/gi, '')
    .replace(/vbscript:/gi, '')
    // Remove CSS import and url patterns
    .replace(/@import/gi, '')
    .replace(/url\s*\(/gi, '')
    .replace(/@media/gi, '')
    .replace(/@keyframes/gi, '')
    .replace(/expression\s*\(/gi, '')
    .replace(/behavior\s*:/gi, '')
    // Remove HTML entities that could be exploited
    .replace(/&lt;/g, '')
    .replace(/&gt;/g, '')
    .replace(/&quot;/g, '')
    .replace(/&apos;/g, '')
    .replace(/&amp;/g, '')
    .replace(/&#x[0-9a-fA-F]+;/g, '')
    .replace(/&#\d+;/g, '')
    // Remove CSS hex colors and other patterns
    .replace(/#[0-9a-fA-F]{3,8}/g, '')
    .replace(/rgb\s*\([^)]*\)/gi, '')
    .replace(/rgba\s*\([^)]*\)/gi, '')
    .replace(/hsl\s*\([^)]*\)/gi, '')
    .replace(/hsla\s*\([^)]*\)/gi, '')
    // Remove CSS units and properties
    .replace(/\d+px/gi, '')
    .replace(/\d+em/gi, '')
    .replace(/\d+rem/gi, '')
    .replace(/\d+%/gi, '')
    .replace(/!important/gi, '')
    // Remove script and style blocks
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    // Remove iframe, object, embed
    .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '')
    .replace(/<object[^>]*>[\s\S]*?<\/object>/gi, '')
    .replace(/<embed[^>]*>/gi, '')
    .replace(/<link[^>]*>/gi, '')
    .replace(/<meta[^>]*>/gi, '')
    .replace(/<base[^>]*>/gi, '')
    // Remove CSS comments
    .replace(/\/\*[\s\S]*?\*\//g, '')
    // Trim and normalize whitespace
    .trim()
    .replace(/\s+/g, ' ');
  
  // Limit length to prevent abuse
  return sanitized.substring(0, 500);
}

// Validate username to prevent injection attempts
export function sanitizeUsername(username: string): string {
  if (!username || typeof username !== 'string') {
    return `anon${Math.floor(1000 + Math.random() * 9000)}`;
  }
  
  // Only allow alphanumeric, spaces, and basic punctuation
  const sanitized = username
    .replace(/[^a-zA-Z0-9\s\-_\.]/g, '')
    .trim()
    .substring(0, 50);
  
  if (sanitized.length < 1) {
    return `anon${Math.floor(1000 + Math.random() * 9000)}`;
  }
  
  return sanitized;
}

// Prevent backend interaction attempts in message content
export function blockBackendInteraction(content: string): boolean {
  if (!content || typeof content !== 'string') {
    return false;
  }
  
  const suspiciousPatterns = [
    // API endpoints and backend paths
    /\/api\//i,
    /\/server\//i,
    /\/admin/i,
    /\/auth/i,
    /\/ws/i,
    // Database queries and commands
    /SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE|EXEC|EXECUTE/i,
    /UNION|CONCAT|SUBSTRING|CHAR|ASCII|HEX|LOAD_FILE/i,
    // System and config access
    /\.env|config\.|database|admin|root|system/i,
    /passwd|shadow|hosts|boot|proc|sys|etc/i,
    // Script injection attempts
    /script|iframe|object|embed|link|meta|base|form/i,
    /document\.|window\.|eval\(|setTimeout|setInterval/i,
    // CSS injection and styling
    /expression\(|javascript:|behavior:|@import|url\(/i,
    /@media|@keyframes|@font-face|@page|@supports/i,
    /position\s*:|z-index\s*:|opacity\s*:|visibility\s*:/i,
    // Protocol attempts
    /file:|ftp:|data:|vbscript:|about:|chrome:|moz-extension:|ms-its:/i,
    // HTML entities and encoding
    /&#x|&#\d|%3C|%3E|%22|%27|%2F|%5C/i,
    // Server-side template injection
    /\{\{|\}\}|\{%|%\}|\$\{|\`/i,
    // Command injection
    /\||&&|;|`|nc|netcat|wget|curl|ping|nslookup/i,
    // Path traversal
    /\.\.\/|\.\.\\|%2e%2e%2f|%2e%2e%5c/i,
    // Common attack vectors
    /xss|csrf|clickjack|sqli|rfi|lfi|xxe|ssrf/i,
    // Hex and base64 that might encode attacks
    /[0-9a-f]{20,}|[A-Za-z0-9+\/]{20,}=/i,
  ];
  
  return suspiciousPatterns.some(pattern => pattern.test(content));
}

// Rate limiting for message content validation
const validationCache = new Map<string, { count: number; resetTime: number }>();

export function checkValidationRateLimit(ipAddress: string): boolean {
  const now = Date.now();
  const entry = validationCache.get(ipAddress);
  
  if (!entry || now > entry.resetTime) {
    validationCache.set(ipAddress, { count: 1, resetTime: now + 60000 }); // 1 minute
    return true;
  }
  
  if (entry.count >= 100) { // Max 100 validations per minute
    return false;
  }
  
  entry.count++;
  return true;
}

// Clean up validation cache periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of validationCache.entries()) {
    if (now > value.resetTime) {
      validationCache.delete(key);
    }
  }
}, 300000); // Clean every 5 minutes