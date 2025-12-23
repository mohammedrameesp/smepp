import { redirect } from 'next/navigation';

interface Props {
  params: Promise<{ id: string }>;
}

// Redirect /admin/users/[id] to /admin/employees/[id] for backwards compatibility
export default async function UserDetailRedirectPage({ params }: Props) {
  const { id } = await params;
  redirect(`/admin/employees/${id}`);
}
