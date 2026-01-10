/**
 * Tests for Utility Functions
 * @see src/lib/utils.ts
 */

import { cn } from '@/lib/core/utils';

describe('Utility Functions', () => {
  describe('cn (className merge utility)', () => {
    it('should merge single class names', () => {
      const result = cn('class1', 'class2');
      expect(result).toBe('class1 class2');
    });

    it('should handle empty strings', () => {
      const result = cn('class1', '', 'class2');
      expect(result).toBe('class1 class2');
    });

    it('should handle undefined values', () => {
      const result = cn('class1', undefined, 'class2');
      expect(result).toBe('class1 class2');
    });

    it('should handle null values', () => {
      const result = cn('class1', null, 'class2');
      expect(result).toBe('class1 class2');
    });

    it('should handle boolean false values', () => {
      const result = cn('class1', false, 'class2');
      expect(result).toBe('class1 class2');
    });

    it('should handle conditional classes', () => {
      const isActive = true;
      const isDisabled = false;
      const result = cn('base', isActive && 'active', isDisabled && 'disabled');
      expect(result).toBe('base active');
    });

    it('should handle object syntax', () => {
      const result = cn('base', {
        active: true,
        disabled: false,
        highlighted: true,
      });
      expect(result).toBe('base active highlighted');
    });

    it('should handle array syntax', () => {
      const result = cn(['class1', 'class2'], 'class3');
      expect(result).toBe('class1 class2 class3');
    });

    it('should handle nested arrays', () => {
      const result = cn(['class1', ['class2', 'class3']], 'class4');
      expect(result).toBe('class1 class2 class3 class4');
    });

    it('should merge Tailwind classes correctly (override conflicts)', () => {
      // tailwind-merge should handle conflicting classes
      const result = cn('p-4', 'p-2');
      expect(result).toBe('p-2'); // Later class should win
    });

    it('should merge Tailwind responsive classes', () => {
      const result = cn('text-sm', 'md:text-lg', 'lg:text-xl');
      expect(result).toContain('text-sm');
      expect(result).toContain('md:text-lg');
      expect(result).toContain('lg:text-xl');
    });

    it('should merge Tailwind hover states', () => {
      const result = cn('bg-blue-500', 'hover:bg-blue-600');
      expect(result).toContain('bg-blue-500');
      expect(result).toContain('hover:bg-blue-600');
    });

    it('should handle Tailwind padding conflicts', () => {
      const result = cn('px-4 py-2', 'p-6');
      // p-6 should override individual px/py values
      expect(result).toBe('p-6');
    });

    it('should handle Tailwind margin conflicts', () => {
      const result = cn('mx-auto', 'ml-4');
      // tailwind-merge keeps both mx-auto and ml-4 as they can coexist
      expect(result).toContain('ml-4');
      expect(result).toContain('mx-auto');
    });

    it('should handle no arguments', () => {
      const result = cn();
      expect(result).toBe('');
    });

    it('should handle complex component styling', () => {
      const variant: string = 'primary';
      const size: string = 'lg';
      const isLoading = true;

      const result = cn(
        'btn',
        variant === 'primary' && 'btn-primary bg-blue-500 text-white',
        variant === 'secondary' && 'btn-secondary bg-gray-200 text-gray-800',
        size === 'sm' && 'px-2 py-1 text-sm',
        size === 'lg' && 'px-6 py-3 text-lg',
        isLoading && 'opacity-50 cursor-wait'
      );

      expect(result).toContain('btn');
      expect(result).toContain('btn-primary');
      expect(result).toContain('bg-blue-500');
      expect(result).toContain('px-6');
      expect(result).toContain('py-3');
      expect(result).toContain('opacity-50');
      expect(result).not.toContain('btn-secondary');
      expect(result).not.toContain('px-2');
    });

    it('should preserve important modifiers', () => {
      const result = cn('text-red-500', '!text-blue-500');
      expect(result).toContain('!text-blue-500');
    });

    it('should handle dark mode classes', () => {
      const result = cn('bg-white', 'dark:bg-gray-900', 'text-black', 'dark:text-white');
      expect(result).toContain('bg-white');
      expect(result).toContain('dark:bg-gray-900');
      expect(result).toContain('text-black');
      expect(result).toContain('dark:text-white');
    });
  });
});
