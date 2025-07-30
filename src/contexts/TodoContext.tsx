import React, { useState, useEffect } from 'react';
import type { Todo } from '../types/Todo';
import { v4 as uuidv4 } from 'uuid';
import { TodoContext } from './TodoContextType';
import { loadTodos, saveTodos } from '../utils/sessionStorage';
import { Toast } from '../components/Toast';

export const TodoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);

  // Load todos from sessionStorage on initialization
  useEffect(() => {
    const savedTodos = loadTodos();
    setTodos(savedTodos);
    setIsInitialized(true);
  }, []);

  // Save todos to sessionStorage whenever todos change (after initialization)
  useEffect(() => {
    if (!isInitialized) {
      return;
    }
    
    const error = saveTodos(todos);
    if (error) {
      setStorageError(error);
    }
  }, [todos, isInitialized]);

  const addTodo = (title: string, description: string) => {
    const newTodo: Todo = {
      id: uuidv4(),
      title,
      description,
      completed: false,
      createdAt: new Date(),
    };
    setTodos(prevTodos => [...prevTodos, newTodo]);
  };

  const editTodo = (id: string, updates: Partial<Todo>) => {
    setTodos(todos.map(todo => (todo.id === id ? { ...todo, ...updates } : todo)));
  };

  const toggleTodoCompletion = (id: string) => {
    setTodos(todos.map(todo => (todo.id === id ? { ...todo, completed: !todo.completed } : todo)));
  };

  const deleteTodo = (id: string) => {
    setTodos(todos.filter(todo => todo.id !== id));
  };

  const handleCloseStorageError = () => {
    setStorageError(null);
  };

  return (
    <TodoContext.Provider value={{ todos, addTodo, editTodo, toggleTodoCompletion, deleteTodo }}>
      {children}
      {storageError && (
        <Toast 
          message={storageError} 
          severity="warning" 
          onClose={handleCloseStorageError}
        />
      )}
    </TodoContext.Provider>
  );
};

// No re-exports to avoid react-refresh/only-export-components error