export default function SuperAdminLoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Minimal layout for login page - no sidebar/header
  return <>{children}</>;
}
