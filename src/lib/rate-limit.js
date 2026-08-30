/**
 * Simple in-memory rate limiter for Next.js API routes
 * Used for mitigating simple DOS/DDOS and brute force attacks
 */

const rateLimitMap = new Map();

export default function rateLimit({ interval = 60000, max = 5 } = {}) {
  return {
    check: (limit, ip) => {
      return new Promise((resolve, reject) => {
        const tokenCount = rateLimitMap.get(ip) || [0];
        if (tokenCount[0] === 0) {
          rateLimitMap.set(ip, [1]);
          setTimeout(() => {
            rateLimitMap.delete(ip);
          }, interval);
          return resolve();
        }
        
        if (tokenCount[0] >= limit) {
          return reject(new Error('Rate limit exceeded'));
        }
        
        tokenCount[0] += 1;
        rateLimitMap.set(ip, tokenCount);
        return resolve();
      });
    },
  };
}
