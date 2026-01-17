/**
 * Test page to debug admin access - bypasses admin layout
 */
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';

export const dynamic = 'force-dynamic';

export default async function AdminAccessTestPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-red-600">No Session</h1>
        <p>You are not logged in.</p>
      </div>
    );
  }

  // Exact same logic as admin layout
  const isAdmin = session.user.isOwner || session.user.isAdmin;
  const hasAdminAccess = isAdmin ||
                         session.user.hasFinanceAccess ||
                         session.user.hasHRAccess ||
                         session.user.hasOperationsAccess ||
                         session.user.canApprove;

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Admin Access Test</h1>

      <div className={`p-4 rounded-lg mb-6 ${hasAdminAccess ? 'bg-green-100 border border-green-300' : 'bg-red-100 border border-red-300'}`}>
        <h2 className="font-bold text-lg">
          {hasAdminAccess ? '✅ SHOULD HAVE ACCESS' : '❌ WOULD BE REDIRECTED'}
        </h2>
        <p className="text-sm mt-1">
          hasAdminAccess = {String(hasAdminAccess)}
        </p>
      </div>

      <div className="bg-slate-100 p-4 rounded-lg">
        <h3 className="font-bold mb-2">Session Data:</h3>
        <pre className="text-xs overflow-auto">
{JSON.stringify({
  email: session.user.email,
  name: session.user.name,
  isTeamMember: session.user.isTeamMember,
  isOwner: session.user.isOwner,
  isAdmin: session.user.isAdmin,
  hasFinanceAccess: session.user.hasFinanceAccess,
  hasHRAccess: session.user.hasHRAccess,
  hasOperationsAccess: session.user.hasOperationsAccess,
  canApprove: session.user.canApprove,
}, null, 2)}
        </pre>
      </div>

      <div className="mt-6 bg-blue-50 p-4 rounded-lg">
        <h3 className="font-bold mb-2">Access Check Breakdown:</h3>
        <ul className="text-sm space-y-1">
          <li>isOwner: {String(session.user.isOwner)} → {session.user.isOwner ? '✅' : '❌'}</li>
          <li>isAdmin: {String(session.user.isAdmin)} → {session.user.isAdmin ? '✅' : '❌'}</li>
          <li>hasFinanceAccess: {String(session.user.hasFinanceAccess)} → {session.user.hasFinanceAccess ? '✅' : '❌'}</li>
          <li>hasHRAccess: {String(session.user.hasHRAccess)} → {session.user.hasHRAccess ? '✅' : '❌'}</li>
          <li>hasOperationsAccess: {String(session.user.hasOperationsAccess)} → {session.user.hasOperationsAccess ? '✅' : '❌'}</li>
          <li><strong>canApprove: {String(session.user.canApprove)} → {session.user.canApprove ? '✅' : '❌'}</strong></li>
        </ul>
        <p className="mt-4 font-bold">
          Combined (isAdmin || hasFinance || hasHR || hasOps || canApprove) = {String(hasAdminAccess)}
        </p>
      </div>

      <div className="mt-6">
        <a href="/admin" className="text-blue-600 hover:underline">
          Try accessing /admin →
        </a>
      </div>
    </div>
  );
}
