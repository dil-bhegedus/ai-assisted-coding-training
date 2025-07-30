import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadTodos, saveTodos, isValidTodos } from '../utils/sessionStorage';
import type { Todo } from '../types/Todo';

// Mock sessionStorage
const sessionStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
});

describe('sessionStorage utilities', () => {
  beforeEach(() => {
    sessionStorageMock.clear();
    vi.clearAllMocks();
  });

  describe('isValidTodos', () => {
    it('validates correct todo array', () => {
      const validTodos: Todo[] = [
        {
          id: '1',
          title: 'Test Todo',
          description: 'Test Description',
          completed: false,
          createdAt: new Date(),
        },
      ];

      expect(isValidTodos(validTodos)).toBe(true);
    });

    it('rejects non-array values', () => {
      expect(isValidTodos(null)).toBe(false);
      expect(isValidTodos(undefined)).toBe(false);
      expect(isValidTodos('string')).toBe(false);
      expect(isValidTodos({})).toBe(false);
    });

    it('rejects array with invalid todo objects', () => {
      const invalidTodos = [
        {
          id: '1',
          title: 'Test Todo',
          // missing description
          completed: false,
          createdAt: new Date(),
        },
      ];

      expect(isValidTodos(invalidTodos)).toBe(false);
    });

    it('rejects array with objects having wrong types', () => {
      const invalidTodos = [
        {
          id: 1, // should be string
          title: 'Test Todo',
          description: 'Test Description',
          completed: false,
          createdAt: new Date(),
        },
      ];

      expect(isValidTodos(invalidTodos)).toBe(false);
    });
  });

  describe('loadTodos', () => {
    it('returns empty array when no data exists', () => {
      const result = loadTodos();
      expect(result).toEqual([]);
    });

    it('loads valid todos from storage', () => {
      const todos: Todo[] = [
        {
          id: '1',
          title: 'Test Todo',
          description: 'Test Description',
          completed: false,
          createdAt: new Date('2023-01-01'),
        },
      ];

      sessionStorageMock.setItem('todos', JSON.stringify(todos));

      const result = loadTodos();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
      expect(result[0].title).toBe('Test Todo');
      expect(result[0].createdAt).toBeInstanceOf(Date);
    });

    it('handles corrupted JSON data gracefully', () => {
      sessionStorageMock.setItem('todos', 'invalid json');

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = loadTodos();
      expect(result).toEqual([]);
      expect(sessionStorageMock.removeItem).toHaveBeenCalledWith('todos');
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to load todos from sessionStorage:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('handles invalid todo data gracefully', () => {
      const invalidData = [{ id: 1, title: 'Invalid' }];
      sessionStorageMock.setItem('todos', JSON.stringify(invalidData));

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = loadTodos();
      expect(result).toEqual([]);
      expect(sessionStorageMock.removeItem).toHaveBeenCalledWith('todos');
      expect(consoleSpy).toHaveBeenCalledWith(
        'Invalid todos data found in sessionStorage, clearing and starting fresh'
      );

      consoleSpy.mockRestore();
    });

    it('handles storage access errors gracefully', () => {
      sessionStorageMock.getItem.mockImplementation(() => {
        throw new Error('Storage access denied');
      });

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = loadTodos();
      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to load todos from sessionStorage:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('saveTodos', () => {
    it('saves todos successfully', () => {
      const todos: Todo[] = [
        {
          id: '1',
          title: 'Test Todo',
          description: 'Test Description',
          completed: false,
          createdAt: new Date(),
        },
      ];

      const result = saveTodos(todos);
      expect(result).toBeNull();
      expect(sessionStorageMock.setItem).toHaveBeenCalledWith(
        'todos',
        JSON.stringify(todos)
      );
    });

    it('handles QuotaExceededError', () => {
      const quotaError = new Error('Quota exceeded');
      quotaError.name = 'QuotaExceededError';
      
      sessionStorageMock.setItem.mockImplementation(() => {
        throw quotaError;
      });

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const todos: Todo[] = [
        {
          id: '1',
          title: 'Test Todo',
          description: 'Test Description',
          completed: false,
          createdAt: new Date(),
        },
      ];

      const result = saveTodos(todos);
      expect(result).toBe('Storage quota exceeded – your latest changes may not be saved.');
      expect(consoleSpy).toHaveBeenCalledWith(
        'Storage quota exceeded – your latest changes may not be saved.',
        quotaError
      );

      consoleSpy.mockRestore();
    });

    it('handles other storage errors', () => {
      const genericError = new Error('Generic storage error');
      
      sessionStorageMock.setItem.mockImplementation(() => {
        throw genericError;
      });

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const todos: Todo[] = [
        {
          id: '1',
          title: 'Test Todo',
          description: 'Test Description',
          completed: false,
          createdAt: new Date(),
        },
      ];

      const result = saveTodos(todos);
      expect(result).toBe('Failed to save todos to storage');
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to save todos to storage',
        genericError
      );

      consoleSpy.mockRestore();
    });
  });
});