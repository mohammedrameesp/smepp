import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Wrench } from 'lucide-react';

export default function SuperAdminSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Platform Settings</h2>
        <p className="text-muted-foreground">
          Configure global platform settings
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
            <Wrench className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Coming Soon</h3>
          <p className="text-muted-foreground text-center max-w-md">
            Platform settings like subscription tiers, feature flags, and global configurations will be available here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
