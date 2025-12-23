import { redirect } from 'next/navigation';

interface Props {
  params: Promise<{ id: string }>;
}

// Redirect /admin/users/[id]/edit to /admin/employees/[id]/edit for backwards compatibility
export default async function UserEditRedirectPage({ params }: Props) {
  const { id } = await params;
  redirect(`/admin/employees/${id}/edit`);
}
