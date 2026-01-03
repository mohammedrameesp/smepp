import { redirect } from 'next/navigation';

// Redirect /admin/users to /admin/employees for backwards compatibility
// Team page is now the central hub for managing organization members
export default function UsersRedirectPage() {
  redirect('/admin/employees');
}
