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
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')
    // Remove CSS style attributes and properties
    .replace(/style\s*=\s*["'][^"']*["']/gi, '')
    .replace(/\{[^}]*\}/g, '')
    // Remove JavaScript-like patterns
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    // Remove data URLs
    .replace(/data:/gi, '')
    // Remove CSS import and url patterns
    .replace(/@import/gi, '')
    .replace(/url\s*\(/gi, '')
    // Remove potential XSS vectors
    .replace(/&lt;/g, '')
    .replace(/&gt;/g, '')
    .replace(/&quot;/g, '')
    .replace(/&#x/gi, '')
    .replace(/&#\d/g, '')
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
    // API endpoints
    /\/api\//i,
    // Database queries
    /SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER/i,
    // Server paths
    /\/server\//i,
    // Config attempts
    /\.env|config\.|database|admin/i,
    // Injection attempts
    /script|iframe|object|embed|link|meta|base/i,
    // CSS injection
    /expression\(|javascript:|behavior:|@import|url\(/i,
    // Protocol attempts
    /file:|ftp:|data:|vbscript:/i,
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