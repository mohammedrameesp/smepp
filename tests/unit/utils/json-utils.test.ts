/**
 * @file json-utils.test.ts
 * @description Unit tests for JSON parsing utilities
 */

import { parseJsonArray } from '@/lib/utils/json-utils';

describe('JSON Utilities', () => {
  describe('parseJsonArray', () => {
    describe('with valid JSON array string', () => {
      it('should parse a simple JSON array', () => {
        expect(parseJsonArray('["English","Arabic"]')).toEqual(['English', 'Arabic']);
      });

      it('should parse an empty JSON array', () => {
        expect(parseJsonArray('[]')).toEqual([]);
      });

      it('should parse a single-element array', () => {
        expect(parseJsonArray('["JavaScript"]')).toEqual(['JavaScript']);
      });

      it('should parse arrays with various string content', () => {
        expect(parseJsonArray('["a","b","c"]')).toEqual(['a', 'b', 'c']);
        expect(parseJsonArray('["hello world"]')).toEqual(['hello world']);
        expect(parseJsonArray('["with spaces", "and more"]')).toEqual(['with spaces', 'and more']);
      });

      it('should preserve special characters in strings', () => {
        expect(parseJsonArray('["hello\\nworld"]')).toEqual(['hello\nworld']);
        expect(parseJsonArray('["with\\"quotes"]')).toEqual(['with"quotes']);
      });
    });

    describe('with array input (passthrough)', () => {
      it('should return the same array when input is already an array', () => {
        const input = ['English', 'Arabic'];
        expect(parseJsonArray(input)).toBe(input); // Same reference
      });

      it('should passthrough empty arrays', () => {
        expect(parseJsonArray([])).toEqual([]);
      });

      it('should passthrough single-element arrays', () => {
        expect(parseJsonArray(['test'])).toEqual(['test']);
      });
    });

    describe('with null/undefined', () => {
      it('should return empty array for null', () => {
        expect(parseJsonArray(null)).toEqual([]);
      });

      it('should return empty array for undefined', () => {
        expect(parseJsonArray(undefined)).toEqual([]);
      });
    });

    describe('with invalid JSON', () => {
      it('should return empty array for invalid JSON string', () => {
        expect(parseJsonArray('invalid')).toEqual([]);
      });

      it('should return empty array for malformed JSON', () => {
        expect(parseJsonArray('["unclosed')).toEqual([]);
        expect(parseJsonArray('{broken}')).toEqual([]);
        expect(parseJsonArray('[missing, quotes]')).toEqual([]);
      });

      it('should return empty array for plain text', () => {
        expect(parseJsonArray('hello world')).toEqual([]);
        expect(parseJsonArray('English')).toEqual([]);
      });
    });

    describe('with JSON object (not array)', () => {
      it('should return empty array for JSON object', () => {
        expect(parseJsonArray('{"key": "value"}')).toEqual([]);
      });

      it('should return empty array for nested object', () => {
        expect(parseJsonArray('{"data": {"nested": true}}')).toEqual([]);
      });

      it('should return empty array for object with array property', () => {
        expect(parseJsonArray('{"items": ["a", "b"]}')).toEqual([]);
      });
    });

    describe('edge cases', () => {
      it('should return empty array for empty string', () => {
        expect(parseJsonArray('')).toEqual([]);
      });

      it('should return empty array for whitespace string', () => {
        expect(parseJsonArray('   ')).toEqual([]);
      });

      it('should return empty array for JSON null literal', () => {
        expect(parseJsonArray('null')).toEqual([]);
      });

      it('should return empty array for JSON number', () => {
        expect(parseJsonArray('123')).toEqual([]);
      });

      it('should return empty array for JSON boolean', () => {
        expect(parseJsonArray('true')).toEqual([]);
        expect(parseJsonArray('false')).toEqual([]);
      });

      it('should return empty array for JSON string literal', () => {
        expect(parseJsonArray('"just a string"')).toEqual([]);
      });
    });
  });
});
