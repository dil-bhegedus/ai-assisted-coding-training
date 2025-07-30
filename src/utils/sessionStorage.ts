import type { Todo } from '../types/Todo';

const STORAGE_KEY = 'todos';

/**
 * Validates that the given data is a valid todos array
 */
export const isValidTodos = (data: unknown): data is Todo[] => {
  if (!Array.isArray(data)) {
    return false;
  }

  return data.every((item: unknown) => {
    return (
      typeof item === 'object' &&
      item !== null &&
      typeof (item as any).id === 'string' &&
      typeof (item as any).title === 'string' &&
      typeof (item as any).description === 'string' &&
      typeof (item as any).completed === 'boolean' &&
      (item as any).createdAt !== undefined
    );
  });
};

/**
 * Loads todos from sessionStorage
 * Returns empty array if no data, invalid data, or parse error
 */
export const loadTodos = (): Todo[] => {
  try {
    const stored = window.sessionStorage.getItem(STORAGE_KEY);
    
    if (!stored) {
      return [];
    }

    const parsed = JSON.parse(stored);
    
    if (!isValidTodos(parsed)) {
      console.warn('Invalid todos data found in sessionStorage, clearing and starting fresh');
      window.sessionStorage.removeItem(STORAGE_KEY);
      return [];
    }

    // Convert createdAt strings back to Date objects
    return parsed.map(todo => ({
      ...todo,
      createdAt: new Date(todo.createdAt)
    }));
    
  } catch (error) {
    console.warn('Failed to load todos from sessionStorage:', error);
    // Clear corrupted data
    try {
      window.sessionStorage.removeItem(STORAGE_KEY);
    } catch (clearError) {
      console.warn('Failed to clear corrupted sessionStorage data:', clearError);
    }
    return [];
  }
};

/**
 * Saves todos to sessionStorage
 * Returns error message if save failed, null if successful
 */
export const saveTodos = (todos: Todo[]): string | null => {
  try {
    const serialized = JSON.stringify(todos);
    window.sessionStorage.setItem(STORAGE_KEY, serialized);
    return null;
  } catch (error) {
    if (error instanceof Error && error.name === 'QuotaExceededError') {
      const message = 'Storage quota exceeded – your latest changes may not be saved.';
      console.warn(message, error);
      return message;
    }
    
    const message = 'Failed to save todos to storage';
    console.warn(message, error);
    return message;
  }
};