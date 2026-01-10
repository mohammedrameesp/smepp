/**
 * @file headers.test.ts
 * @description Tests for security headers middleware
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  addSecurityHeaders,
  securityHeadersMiddleware,
} from '@/lib/security/headers';

// Mock NextResponse
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    next: jest.fn(() => ({
      headers: new Map(),
    })),
  },
}));

describe('Security Headers Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('addSecurityHeaders', () => {
    const createMockResponse = () => {
      const headers = new Map<string, string>();
      return {
        headers: {
          set: (name: string, value: string) => headers.set(name, value),
          get: (name: string) => headers.get(name),
        },
        _headers: headers,
      } as unknown as NextResponse & { _headers: Map<string, string> };
    };

    it('should add X-Frame-Options header', () => {
      const response = createMockResponse();

      addSecurityHeaders(response);

      expect(response._headers.get('X-Frame-Options')).toBe('DENY');
    });

    it('should add X-Content-Type-Options header', () => {
      const response = createMockResponse();

      addSecurityHeaders(response);

      expect(response._headers.get('X-Content-Type-Options')).toBe('nosniff');
    });

    it('should add X-XSS-Protection header', () => {
      const response = createMockResponse();

      addSecurityHeaders(response);

      expect(response._headers.get('X-XSS-Protection')).toBe('1; mode=block');
    });

    it('should add Referrer-Policy header', () => {
      const response = createMockResponse();

      addSecurityHeaders(response);

      expect(response._headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
    });

    it('should add X-Download-Options header', () => {
      const response = createMockResponse();

      addSecurityHeaders(response);

      expect(response._headers.get('X-Download-Options')).toBe('noopen');
    });

    it('should add Content-Security-Policy header', () => {
      const response = createMockResponse();

      addSecurityHeaders(response);

      const csp = response._headers.get('Content-Security-Policy');
      expect(csp).toBeDefined();
      expect(csp).toContain("default-src");
    });

    describe('Content-Security-Policy', () => {
      it('should use relaxed CSP in development', () => {
        Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', writable: true });
        const response = createMockResponse();

        addSecurityHeaders(response);

        const csp = response._headers.get('Content-Security-Policy');
        expect(csp).toContain("'unsafe-inline'");
        expect(csp).toContain("'unsafe-eval'");
      });

      it('should use strict CSP in production', () => {
        Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', writable: true });
        const response = createMockResponse();

        addSecurityHeaders(response);

        const csp = response._headers.get('Content-Security-Policy');
        expect(csp).not.toContain("'unsafe-eval'");
        expect(csp).toContain("script-src 'self'");
      });
    });

    describe('Strict-Transport-Security', () => {
      it('should add HSTS header in production', () => {
        Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', writable: true });
        const response = createMockResponse();

        addSecurityHeaders(response);

        const hsts = response._headers.get('Strict-Transport-Security');
        expect(hsts).toBe('max-age=31536000; includeSubDomains');
      });

      it('should not add HSTS header in development', () => {
        Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', writable: true });
        const response = createMockResponse();

        addSecurityHeaders(response);

        const hsts = response._headers.get('Strict-Transport-Security');
        expect(hsts).toBeUndefined();
      });
    });

    it('should return the modified response', () => {
      const response = createMockResponse();

      const result = addSecurityHeaders(response);

      expect(result).toBe(response);
    });
  });

  describe('securityHeadersMiddleware', () => {
    it('should create a response with security headers', () => {
      const mockNext = {
        headers: new Map(),
      };
      (NextResponse.next as jest.Mock).mockReturnValue(mockNext);

      const request = {} as NextRequest;
      const result = securityHeadersMiddleware(request);

      expect(NextResponse.next).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('Security Header Verification', () => {
    const createMockResponse = () => {
      const headers = new Map<string, string>();
      return {
        headers: {
          set: (name: string, value: string) => headers.set(name, value),
          get: (name: string) => headers.get(name),
        },
        _headers: headers,
      } as unknown as NextResponse & { _headers: Map<string, string> };
    };

    describe('Clickjacking Protection', () => {
      it('should prevent clickjacking with X-Frame-Options: DENY', () => {
        const response = createMockResponse();
        addSecurityHeaders(response);

        expect(response._headers.get('X-Frame-Options')).toBe('DENY');
      });
    });

    describe('MIME Type Sniffing Protection', () => {
      it('should prevent MIME type sniffing attacks', () => {
        const response = createMockResponse();
        addSecurityHeaders(response);

        expect(response._headers.get('X-Content-Type-Options')).toBe('nosniff');
      });
    });

    describe('XSS Protection', () => {
      it('should enable browser XSS filter in block mode', () => {
        const response = createMockResponse();
        addSecurityHeaders(response);

        expect(response._headers.get('X-XSS-Protection')).toBe('1; mode=block');
      });
    });

    describe('Referrer Leakage Protection', () => {
      it('should use strict-origin-when-cross-origin referrer policy', () => {
        const response = createMockResponse();
        addSecurityHeaders(response);

        // This policy:
        // - Sends full referrer for same-origin requests
        // - Sends only origin for cross-origin requests
        // - Sends nothing when navigating from HTTPS to HTTP
        expect(response._headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
      });
    });

    describe('Download Protection', () => {
      it('should prevent automatic file execution on download', () => {
        const response = createMockResponse();
        addSecurityHeaders(response);

        expect(response._headers.get('X-Download-Options')).toBe('noopen');
      });
    });

    describe('HTTPS Enforcement', () => {
      it('should enforce HTTPS for 1 year in production', () => {
        Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', writable: true });
        const response = createMockResponse();
        addSecurityHeaders(response);

        const hsts = response._headers.get('Strict-Transport-Security');
        expect(hsts).toContain('max-age=31536000'); // 1 year in seconds
        expect(hsts).toContain('includeSubDomains');
      });
    });

    describe('Content Security Policy Directives', () => {
      it('should have default-src directive', () => {
        const response = createMockResponse();
        addSecurityHeaders(response);

        const csp = response._headers.get('Content-Security-Policy');
        expect(csp).toContain("default-src 'self'");
      });

      it('should allow images from self and HTTPS sources', () => {
        const response = createMockResponse();
        addSecurityHeaders(response);

        const csp = response._headers.get('Content-Security-Policy');
        expect(csp).toContain('img-src');
        expect(csp).toContain('https:');
      });

      it('should allow data URIs for images and fonts', () => {
        const response = createMockResponse();
        addSecurityHeaders(response);

        const csp = response._headers.get('Content-Security-Policy');
        expect(csp).toContain('data:');
      });

      it('should allow blob URLs', () => {
        const response = createMockResponse();
        addSecurityHeaders(response);

        const csp = response._headers.get('Content-Security-Policy');
        expect(csp).toContain('blob:');
      });
    });
  });

  describe('OWASP Compliance', () => {
    const createMockResponse = () => {
      const headers = new Map<string, string>();
      return {
        headers: {
          set: (name: string, value: string) => headers.set(name, value),
          get: (name: string) => headers.get(name),
        },
        _headers: headers,
      } as unknown as NextResponse & { _headers: Map<string, string> };
    };

    it('should include all recommended security headers', () => {
      Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', writable: true });
      const response = createMockResponse();
      addSecurityHeaders(response);

      // OWASP recommended headers
      const requiredHeaders = [
        'X-Frame-Options',
        'X-Content-Type-Options',
        'X-XSS-Protection',
        'Referrer-Policy',
        'Content-Security-Policy',
        'Strict-Transport-Security',
      ];

      requiredHeaders.forEach((header) => {
        expect(response._headers.has(header)).toBe(true);
      });
    });
  });
});
