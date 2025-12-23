import { redirect } from 'next/navigation';

// Redirect /admin/users/new to /admin/employees/new for backwards compatibility
export default function NewUserRedirectPage() {
  redirect('/admin/employees/new');
}
