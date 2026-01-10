/**
 * @file use-users.ts
 * @description Hook for fetching organization users
 * @module hooks
 */

'use client';

import { useState, useEffect } from 'react';

interface User {
  id: string;
  name: string | null;
  email: string;
}

/**
 * Hook for fetching organization users.
 *
 * @example
 * const { users, loading, error } = useUsers();
 *
 * if (loading) return <Spinner />;
 * if (error) return <Error message={error} />;
 *
 * return (
 *   <Select>
 *     {users.map(user => (
 *       <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
 *     ))}
 *   </Select>
 * );
 */
export function useUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/users');
        if (!response.ok) throw new Error('Failed to fetch users');
        const data = await response.json();
        setUsers(Array.isArray(data) ? data : data.users || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch users');
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  return { users, loading, error };
}
