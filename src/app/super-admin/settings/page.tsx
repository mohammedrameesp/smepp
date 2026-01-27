import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Shield, Wrench, ChevronRight, MessageCircle } from 'lucide-react';
import { ICON_SIZES } from '@/lib/constants';

export default function SuperAdminSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Platform Settings</h2>
        <p className="text-muted-foreground">
          Configure global platform settings
        </p>
      </div>

      {/* Security Settings */}
      <Link href="/super-admin/settings/security">
        <Card className="hover:border-slate-300 hover:shadow-sm transition-all cursor-pointer">
          <CardContent className="flex items-center justify-between py-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <Shield className={`${ICON_SIZES.lg} text-blue-600`} />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Security</h3>
                <p className="text-muted-foreground text-sm">
                  Two-factor authentication and account security
                </p>
              </div>
            </div>
            <ChevronRight className={`${ICON_SIZES.md} text-slate-400`} />
          </CardContent>
        </Card>
      </Link>

      {/* WhatsApp Integration */}
      <Link href="/super-admin/settings/whatsapp">
        <Card className="hover:border-slate-300 hover:shadow-sm transition-all cursor-pointer">
          <CardContent className="flex items-center justify-between py-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
                <MessageCircle className={`${ICON_SIZES.lg} text-green-600`} />
              </div>
              <div>
                <h3 className="text-lg font-semibold">WhatsApp Integration</h3>
                <p className="text-muted-foreground text-sm">
                  Platform WhatsApp Business API configuration
                </p>
              </div>
            </div>
            <ChevronRight className={`${ICON_SIZES.md} text-slate-400`} />
          </CardContent>
        </Card>
      </Link>

      {/* Platform Settings - Coming Soon */}
      <Card className="opacity-60">
        <CardContent className="flex items-center justify-between py-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-slate-100 flex items-center justify-center">
              <Wrench className={`${ICON_SIZES.lg} text-slate-400`} />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Platform Configuration</h3>
              <p className="text-muted-foreground text-sm">
                Subscription tiers, feature flags, and global settings
              </p>
            </div>
          </div>
          <span className="text-xs font-medium px-2 py-1 bg-slate-100 text-slate-500 rounded">
            Coming Soon
          </span>
        </CardContent>
      </Card>
    </div>
  );
}
