/**
 * @file user-list-client.tsx
 * @description Client-side user list table component with role badges and action buttons
 * @module components/domains/system/users
 */
'use client';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { UserActions } from './user-actions';
import { formatDate } from '@/lib/date-format';

interface User {
  id: string;
  name: string | null;
  email: string;
  role: string;
  image: string | null;
  isSystemAccount: boolean;
  createdAt: Date;
  _count: {
    assets: number;
    subscriptions: number;
  };
}

interface UserListClientProps {
  users: User[];
  currentUserId: string;
}

export function UserListClient({ users, currentUserId }: UserListClientProps) {
  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'default';
      case 'EMPLOYEE':
      case 'TEMP_STAFF':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const renderUserTable = (userList: User[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Assets</TableHead>
          <TableHead>Subscriptions</TableHead>
          <TableHead>Created</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {userList.map((user) => (
          <TableRow key={user.id}>
            <TableCell className="font-medium">
              <div className="flex items-center gap-2">
                {user.image && (
                  <img
                    src={user.image}
                    alt={user.name || user.email}
                    className="w-8 h-8 rounded-full"
                  />
                )}
                <div>
                  <div className="flex items-center gap-1">
                    {user.isSystemAccount && <span className="text-lg">🏢</span>}
                    {user.name || 'No name'}
                  </div>
                  {user.name && !user.isSystemAccount && (
                    <div className="text-sm text-gray-500 font-mono">{user.email}</div>
                  )}
                </div>
              </div>
            </TableCell>
            <TableCell className="text-base font-mono">
              {!user.name && !user.isSystemAccount && user.email}
            </TableCell>
            <TableCell>
              <Badge variant={getRoleBadgeVariant(user.role)}>
                {user.role}
              </Badge>
            </TableCell>
            <TableCell>
              {user.isSystemAccount ? (
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                  🏢 System Account
                </Badge>
              ) : user.role === 'TEMP_STAFF' ? (
                <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-300">
                  Temporary Staff
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                  Regular User
                </Badge>
              )}
            </TableCell>
            <TableCell>
              <Badge variant="outline">
                {user._count.assets} assets
              </Badge>
            </TableCell>
            <TableCell>
              <Badge variant="outline">
                {user._count.subscriptions} subscriptions
              </Badge>
            </TableCell>
            <TableCell>
              {formatDate(user.createdAt)}
            </TableCell>
            <TableCell>
              <UserActions
                userId={user.id}
                userName={user.name || ''}
                userEmail={user.email}
                currentUserId={currentUserId}
                isSystemAccount={user.isSystemAccount}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <div className="w-full">
      {users.length > 0 ? (
        renderUserTable(users)
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-600">No users found</p>
        </div>
      )}
    </div>
  );
}
