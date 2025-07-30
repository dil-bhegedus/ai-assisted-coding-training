import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TodoProvider } from '../contexts/TodoContext';
import { useTodo } from '../hooks/useTodo';

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

const TestComponent = () => {
  const { todos, addTodo, toggleTodoCompletion, deleteTodo } = useTodo();

  return (
    <div>
      <button data-testid="add-todo" onClick={() => addTodo('Test Todo', 'Test Description')}>
        Add Todo
      </button>
      <div data-testid="todo-count">{todos.length}</div>
      {todos.map(todo => (
        <div key={todo.id} data-testid={`todo-item-${todo.id}`}>
          <span data-testid={`todo-title-${todo.id}`}>{todo.title}</span>
          <span data-testid={`todo-desc-${todo.id}`}>{todo.description}</span>
          <span data-testid={`todo-completed-${todo.id}`}>
            {todo.completed ? 'Completed' : 'Not completed'}
          </span>
          <button data-testid={`toggle-${todo.id}`} onClick={() => toggleTodoCompletion(todo.id)}>
            Toggle
          </button>
          <button data-testid={`delete-${todo.id}`} onClick={() => deleteTodo(todo.id)}>
            Delete
          </button>
        </div>
      ))}
    </div>
  );
};

describe('TodoContext with SessionStorage', () => {
  beforeEach(() => {
    sessionStorageMock.clear();
    vi.clearAllMocks();
  });

  it('provides empty todos array initially when no storage data exists', () => {
    render(
      <TodoProvider>
        <TestComponent />
      </TodoProvider>
    );

    expect(screen.getByTestId('todo-count').textContent).toBe('0');
  });

  it('loads existing todos from sessionStorage on initialization', async () => {
    const existingTodos = [
      {
        id: 'existing-1',
        title: 'Existing Todo',
        description: 'Existing Description',
        completed: false,
        createdAt: new Date('2023-01-01').toISOString(),
      },
    ];

    sessionStorageMock.setItem('todos', JSON.stringify(existingTodos));

    render(
      <TodoProvider>
        <TestComponent />
      </TodoProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('todo-count').textContent).toBe('1');
      expect(screen.getByText('Existing Todo')).toBeInTheDocument();
    });
  });

  it('saves new todos to sessionStorage', async () => {
    const user = userEvent.setup();

    render(
      <TodoProvider>
        <TestComponent />
      </TodoProvider>
    );

    await user.click(screen.getByTestId('add-todo'));

    await waitFor(() => {
      expect(sessionStorageMock.setItem).toHaveBeenCalledWith(
        'todos',
        expect.stringContaining('Test Todo')
      );
    });
  });

  it('handles corrupted storage data gracefully', () => {
    sessionStorageMock.setItem('todos', 'invalid json');
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    render(
      <TodoProvider>
        <TestComponent />
      </TodoProvider>
    );

    expect(screen.getByTestId('todo-count').textContent).toBe('0');
    expect(sessionStorageMock.removeItem).toHaveBeenCalledWith('todos');

    consoleSpy.mockRestore();
  });

  it('shows toast notification on storage quota error', async () => {
    const user = userEvent.setup();
    const quotaError = new Error('Quota exceeded');
    quotaError.name = 'QuotaExceededError';
    
    sessionStorageMock.setItem.mockImplementation(() => {
      throw quotaError;
    });

    render(
      <TodoProvider>
        <TestComponent />
      </TodoProvider>
    );

    await user.click(screen.getByTestId('add-todo'));

    await waitFor(() => {
      expect(screen.getByText(/storage quota exceeded/i)).toBeInTheDocument();
    });
  });

  it('persists todo state changes across operations', async () => {
    const user = userEvent.setup();

    render(
      <TodoProvider>
        <TestComponent />
      </TodoProvider>
    );

    // Add a todo
    await user.click(screen.getByTestId('add-todo'));

    await waitFor(() => {
      expect(screen.getByTestId('todo-count').textContent).toBe('1');
    });

    // Get the todo ID
    const todoElement = screen.getByText('Test Todo').closest('[data-testid^="todo-item-"]');
    const todoId = todoElement?.getAttribute('data-testid')?.replace('todo-item-', '');

    expect(todoId).toBeDefined();

    // Toggle completion
    await user.click(screen.getByTestId(`toggle-${todoId}`));

    await waitFor(() => {
      expect(screen.getByTestId(`todo-completed-${todoId}`).textContent).toBe('Completed');
    });

    // Verify storage was called multiple times (for add and toggle)
    expect(sessionStorageMock.setItem).toHaveBeenCalledTimes(2);
  });

  it('removes todos from storage when deleted', async () => {
    const user = userEvent.setup();

    render(
      <TodoProvider>
        <TestComponent />
      </TodoProvider>
    );

    // Add a todo
    await user.click(screen.getByTestId('add-todo'));

    await waitFor(() => {
      expect(screen.getByTestId('todo-count').textContent).toBe('1');
    });

    // Get the todo ID
    const todoElement = screen.getByText('Test Todo').closest('[data-testid^="todo-item-"]');
    const todoId = todoElement?.getAttribute('data-testid')?.replace('todo-item-', '');

    // Delete the todo
    await user.click(screen.getByTestId(`delete-${todoId}`));

    await waitFor(() => {
      expect(screen.getByTestId('todo-count').textContent).toBe('0');
    });

    // Verify storage reflects the deletion
    expect(sessionStorageMock.setItem).toHaveBeenLastCalledWith('todos', '[]');
  });
});