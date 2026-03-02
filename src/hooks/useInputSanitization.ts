import { useMemo } from 'react';

// Comprehensive input sanitization hook for security
export const useInputSanitization = () => {
  const sanitizeText = useMemo(() => {
    return (input: string): string => {
      if (!input || typeof input !== 'string') return '';
      
      // Remove potential script tags and other dangerous HTML
      let sanitized = input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
      
      // Remove other potentially dangerous HTML tags
      sanitized = sanitized.replace(/<(iframe|object|embed|form|input|textarea|button|select|option|link|meta|base)[^>]*>/gi, '');
      
      // Remove javascript: and data: protocols
      sanitized = sanitized.replace(/javascript:/gi, '');
      sanitized = sanitized.replace(/data:/gi, '');
      
      // Remove on* event handlers
      sanitized = sanitized.replace(/\son\w+\s*=\s*[^>]*/gi, '');
      
      // Limit length to prevent extremely long inputs
      return sanitized.slice(0, 5000);
    };
  }, []);

  const sanitizeSystemPrompt = useMemo(() => {
    return (prompt: string): string => {
      if (!prompt || typeof prompt !== 'string') return '';
      
      // Apply security sanitization without character limit
      let sanitized = prompt;
      
      // Remove potential script tags and other dangerous HTML
      sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
      
      // Remove other potentially dangerous HTML tags
      sanitized = sanitized.replace(/<(iframe|object|embed|form|input|textarea|button|select|option|link|meta|base)[^>]*>/gi, '');
      
      // Remove javascript: and data: protocols
      sanitized = sanitized.replace(/javascript:/gi, '');
      sanitized = sanitized.replace(/data:/gi, '');
      
      // Remove on* event handlers
      sanitized = sanitized.replace(/\son\w+\s*=\s*[^>]*/gi, '');
      
      // Remove common prompt injection patterns
      const injectionPatterns = [
        /ignore previous instructions/gi,
        /forget everything/gi,
        /new role:/gi,
        /system message:/gi,
        /override instructions/gi,
        /execute command/gi
      ];
      
      injectionPatterns.forEach(pattern => {
        sanitized = sanitized.replace(pattern, '[FILTERED]');
      });
      
      return sanitized.slice(0, 40000); // Extended limit for system prompts
    };
  }, []);

  const escapeHtml = useMemo(() => {
    return (text: string): string => {
      if (!text || typeof text !== 'string') return '';
      
      const map: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
        '/': '&#x2F;'
      };
      
      return text.replace(/[&<>"'\/]/g, (m) => map[m]);
    };
  }, []);

  return {
    sanitizeText,
    sanitizeSystemPrompt,
    escapeHtml
  };
};