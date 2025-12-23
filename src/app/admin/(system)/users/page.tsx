import { redirect } from 'next/navigation';

// Redirect /admin/users to /admin/employees for backwards compatibility
export default function UsersRedirectPage() {
  redirect('/admin/employees');
}
