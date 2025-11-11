'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Todo {
  id: number;
  title: string;
  completed?: boolean;
}

export default function TodosPage() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const getTodos = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase.from('todos').select('*');

        if (error) {
          console.error('Error fetching todos:', error.message);
          setError(error.message);
          return;
        }

        if (data) {
          setTodos(data);
        }
      } catch (err) {
        console.error('Error fetching todos:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    getTodos();
  }, []);

  if (loading) {
    return (
      <main style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
        <h1>Todo List</h1>
        <p>Loading todos...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
        <h1>Todo List</h1>
        <p style={{ color: 'red' }}>Error: {error}</p>
      </main>
    );
  }

  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1>Todo List</h1>
      {todos.length === 0 ? (
        <p>No todos found</p>
      ) : (
        <ul>
          {todos.map((todo) => (
            <li key={todo.id} style={{ padding: '0.5rem 0' }}>
              {todo.title}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
