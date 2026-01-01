import { redirect } from 'next/navigation';

// Redirect /admin/users to /admin/team for backwards compatibility
// Team page is now the central hub for managing organization members
export default function UsersRedirectPage() {
  redirect('/admin/team');
}
