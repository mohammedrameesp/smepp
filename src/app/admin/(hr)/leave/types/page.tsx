import { redirect } from 'next/navigation';

// Leave types configuration has moved to Organization Settings > Configuration > HR
export default function AdminLeaveTypesPage() {
  redirect('/admin/organization');
}
