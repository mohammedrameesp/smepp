'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Shield,
  Smartphone,
  Key,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  Copy,
  Check,
} from 'lucide-react';

interface TwoFactorStatus {
  twoFactorEnabled: boolean;
  backupCodesCount: number;
}

interface SetupData {
  qrCodeDataUrl: string;
  manualEntryKey: string;
}

export default function SecuritySettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // State
  const [twoFactorStatus, setTwoFactorStatus] = useState<TwoFactorStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Setup dialog
  const [showSetupDialog, setShowSetupDialog] = useState(false);
  const [setupStep, setSetupStep] = useState<'qr' | 'verify' | 'backup'>('qr');
  const [setupData, setSetupData] = useState<SetupData | null>(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [setupError, setSetupError] = useState('');

  // Disable dialog
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [disableCode, setDisableCode] = useState('');
  const [isDisabling, setIsDisabling] = useState(false);

  // Regenerate codes dialog
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);
  const [regenerateCode, setRegenerateCode] = useState('');
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [newBackupCodes, setNewBackupCodes] = useState<string[]>([]);

  // Copy state
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Redirect if not super admin
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/super-admin/login');
    } else if (status === 'authenticated' && !session?.user?.isSuperAdmin) {
      router.push('/');
    }
  }, [status, session, router]);

  // Fetch 2FA status
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.isSuperAdmin) {
      fetchStatus();
    }
  }, [status, session]);

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/super-admin/auth/setup-2fa');
      if (response.ok) {
        const data = await response.json();
        setTwoFactorStatus(data);
      }
    } catch {
      setError('Failed to fetch 2FA status');
    } finally {
      setIsLoading(false);
    }
  };

  // Start 2FA setup
  const handleStartSetup = async () => {
    setIsSettingUp(true);
    setSetupError('');

    try {
      const response = await fetch('/api/super-admin/auth/setup-2fa', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        setSetupError(data.error || 'Failed to start setup');
        return;
      }

      setSetupData(data);
      setSetupStep('qr');
      setShowSetupDialog(true);
    } catch {
      setSetupError('Failed to start 2FA setup');
    } finally {
      setIsSettingUp(false);
    }
  };

  // Verify and enable 2FA
  const handleVerifyAndEnable = async () => {
    setIsSettingUp(true);
    setSetupError('');

    try {
      const response = await fetch('/api/super-admin/auth/enable-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: verifyCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        setSetupError(data.error || 'Verification failed');
        return;
      }

      setBackupCodes(data.backupCodes);
      setSetupStep('backup');
    } catch {
      setSetupError('Verification failed');
    } finally {
      setIsSettingUp(false);
    }
  };

  // Complete setup
  const handleCompleteSetup = () => {
    setShowSetupDialog(false);
    setSetupStep('qr');
    setSetupData(null);
    setVerifyCode('');
    setBackupCodes([]);
    fetchStatus();
  };

  // Disable 2FA
  const handleDisable2FA = async () => {
    setIsDisabling(true);
    setSetupError('');

    try {
      const response = await fetch('/api/super-admin/auth/enable-2fa', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: disableCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        setSetupError(data.error || 'Failed to disable 2FA');
        return;
      }

      setShowDisableDialog(false);
      setDisableCode('');
      fetchStatus();
    } catch {
      setSetupError('Failed to disable 2FA');
    } finally {
      setIsDisabling(false);
    }
  };

  // Regenerate backup codes
  const handleRegenerateCodes = async () => {
    setIsRegenerating(true);
    setSetupError('');

    try {
      const response = await fetch('/api/super-admin/auth/backup-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: regenerateCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        setSetupError(data.error || 'Failed to regenerate codes');
        return;
      }

      setNewBackupCodes(data.backupCodes);
      setRegenerateCode('');
    } catch {
      setSetupError('Failed to regenerate codes');
    } finally {
      setIsRegenerating(false);
    }
  };

  // Copy backup code
  const copyToClipboard = (code: string, index: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Copy all backup codes
  const copyAllCodes = (codes: string[]) => {
    navigator.clipboard.writeText(codes.join('\n'));
    setCopiedIndex(-1);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!session?.user?.isSuperAdmin) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Security Settings</h2>
        <p className="text-slate-500">Manage your account security and two-factor authentication</p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
          {error}
        </div>
      )}

      {/* 2FA Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${twoFactorStatus?.twoFactorEnabled ? 'bg-green-100' : 'bg-slate-100'}`}>
                <Shield className={`w-5 h-5 ${twoFactorStatus?.twoFactorEnabled ? 'text-green-600' : 'text-slate-500'}`} />
              </div>
              <div>
                <CardTitle>Two-Factor Authentication</CardTitle>
                <CardDescription>
                  Add an extra layer of security to your account
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {twoFactorStatus?.twoFactorEnabled ? (
                <span className="flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                  <CheckCircle className="w-4 h-4" />
                  Enabled
                </span>
              ) : (
                <span className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-sm font-medium">
                  <XCircle className="w-4 h-4" />
                  Disabled
                </span>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {twoFactorStatus?.twoFactorEnabled ? (
            <>
              <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
                <Smartphone className="w-5 h-5 text-slate-500" />
                <div>
                  <p className="font-medium text-slate-700">Authenticator App</p>
                  <p className="text-sm text-slate-500">
                    Using an authenticator app for verification codes
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
                <Key className="w-5 h-5 text-slate-500" />
                <div className="flex-1">
                  <p className="font-medium text-slate-700">Backup Codes</p>
                  <p className="text-sm text-slate-500">
                    {twoFactorStatus.backupCodesCount} backup codes remaining
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowRegenerateDialog(true)}
                >
                  Regenerate
                </Button>
              </div>

              <div className="pt-4 border-t">
                <Button
                  variant="destructive"
                  onClick={() => setShowDisableDialog(true)}
                >
                  Disable Two-Factor Authentication
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-slate-600">
                Two-factor authentication adds an extra layer of security to your account.
                In addition to your password, you&apos;ll need to enter a code from your
                authenticator app when signing in.
              </p>

              <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-800">Recommended for Super Admins</p>
                  <p className="text-sm text-amber-700">
                    As a super administrator, enabling 2FA is strongly recommended to protect
                    platform-wide access.
                  </p>
                </div>
              </div>

              <Button onClick={handleStartSetup} disabled={isSettingUp}>
                {isSettingUp ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Setting up...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4 mr-2" />
                    Enable Two-Factor Authentication
                  </>
                )}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Setup Dialog */}
      <Dialog open={showSetupDialog} onOpenChange={setShowSetupDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {setupStep === 'qr' && 'Scan QR Code'}
              {setupStep === 'verify' && 'Verify Setup'}
              {setupStep === 'backup' && 'Save Backup Codes'}
            </DialogTitle>
            <DialogDescription>
              {setupStep === 'qr' && 'Scan this QR code with your authenticator app'}
              {setupStep === 'verify' && 'Enter the 6-digit code from your authenticator app'}
              {setupStep === 'backup' && 'Save these codes in a safe place - you can only see them once'}
            </DialogDescription>
          </DialogHeader>

          {setupError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {setupError}
            </div>
          )}

          {setupStep === 'qr' && setupData && (
            <div className="space-y-4">
              <div className="flex justify-center p-4 bg-white rounded-lg border">
                <img src={setupData.qrCodeDataUrl} alt="2FA QR Code" className="w-48 h-48" />
              </div>

              <div>
                <Label className="text-xs text-slate-500">Or enter this code manually:</Label>
                <div className="mt-1 p-3 bg-slate-50 rounded-lg font-mono text-sm text-center tracking-wider">
                  {setupData.manualEntryKey}
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowSetupDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setSetupStep('verify')}>
                  Continue
                </Button>
              </DialogFooter>
            </div>
          )}

          {setupStep === 'verify' && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="verify-code">Verification Code</Label>
                <Input
                  id="verify-code"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))}
                  className="mt-1 text-center text-2xl tracking-widest font-mono"
                />
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setSetupStep('qr')}>
                  Back
                </Button>
                <Button
                  onClick={handleVerifyAndEnable}
                  disabled={verifyCode.length !== 6 || isSettingUp}
                >
                  {isSettingUp ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Verify & Enable'
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}

          {setupStep === 'backup' && backupCodes.length > 0 && (
            <div className="space-y-4">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                  <p className="text-sm text-amber-800">
                    Store these codes securely. Each code can only be used once.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {backupCodes.map((code, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-slate-50 rounded font-mono text-sm"
                  >
                    <span>{code}</span>
                    <button
                      onClick={() => copyToClipboard(code, index)}
                      className="p-1 hover:bg-slate-200 rounded"
                    >
                      {copiedIndex === index ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4 text-slate-400" />
                      )}
                    </button>
                  </div>
                ))}
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => copyAllCodes(backupCodes)}
              >
                {copiedIndex === -1 ? (
                  <>
                    <Check className="w-4 h-4 mr-2 text-green-600" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy All Codes
                  </>
                )}
              </Button>

              <DialogFooter>
                <Button onClick={handleCompleteSetup}>
                  I&apos;ve saved my codes
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Disable 2FA Dialog */}
      <Dialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disable Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              Enter your current authenticator code to disable 2FA. This will make your account less secure.
            </DialogDescription>
          </DialogHeader>

          {setupError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {setupError}
            </div>
          )}

          <div>
            <Label htmlFor="disable-code">Verification Code</Label>
            <Input
              id="disable-code"
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              value={disableCode}
              onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, ''))}
              className="mt-1 text-center text-2xl tracking-widest font-mono"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDisableDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDisable2FA}
              disabled={disableCode.length !== 6 || isDisabling}
            >
              {isDisabling ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Disable 2FA'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Regenerate Backup Codes Dialog */}
      <Dialog open={showRegenerateDialog} onOpenChange={setShowRegenerateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Regenerate Backup Codes</DialogTitle>
            <DialogDescription>
              {newBackupCodes.length > 0
                ? 'Your new backup codes are ready. Save them in a safe place.'
                : 'This will invalidate your current backup codes. Enter your authenticator code to continue.'}
            </DialogDescription>
          </DialogHeader>

          {setupError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {setupError}
            </div>
          )}

          {newBackupCodes.length === 0 ? (
            <>
              <div>
                <Label htmlFor="regenerate-code">Verification Code</Label>
                <Input
                  id="regenerate-code"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  value={regenerateCode}
                  onChange={(e) => setRegenerateCode(e.target.value.replace(/\D/g, ''))}
                  className="mt-1 text-center text-2xl tracking-widest font-mono"
                />
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowRegenerateDialog(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleRegenerateCodes}
                  disabled={regenerateCode.length !== 6 || isRegenerating}
                >
                  {isRegenerating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Regenerate Codes'
                  )}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2">
                {newBackupCodes.map((code, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-slate-50 rounded font-mono text-sm"
                  >
                    <span>{code}</span>
                    <button
                      onClick={() => copyToClipboard(code, index)}
                      className="p-1 hover:bg-slate-200 rounded"
                    >
                      {copiedIndex === index ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4 text-slate-400" />
                      )}
                    </button>
                  </div>
                ))}
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => copyAllCodes(newBackupCodes)}
              >
                {copiedIndex === -1 ? (
                  <>
                    <Check className="w-4 h-4 mr-2 text-green-600" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy All Codes
                  </>
                )}
              </Button>

              <DialogFooter>
                <Button
                  onClick={() => {
                    setShowRegenerateDialog(false);
                    setNewBackupCodes([]);
                    fetchStatus();
                  }}
                >
                  Done
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
