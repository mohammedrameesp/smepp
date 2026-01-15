'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  Building2,
  Users,
  Mail,
  Calendar,
  Loader2,
  Check,
  RefreshCw,
  ExternalLink,
  Clock,
  AlertCircle,
  Pencil,
  Trash2,
  UserPlus,
  Package,
  CreditCard,
  Truck,
  CalendarDays,
  DollarSign,
  ShoppingCart,
  FileCheck,
  FileText,
  Activity,
  Shield,
  Key,
  Globe,
  X,
  Plus,
  ChevronDown,
  Settings,
  Eye,
  EyeOff,
  Sparkles,
  MessageCircle,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { formatDistanceToNow, format } from 'date-fns';

interface Organization {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  subscriptionTier: string;
  enabledModules: string[];
  aiChatEnabled: boolean;
  aiTokenBudgetMonthly: number | null;
  createdAt: string;
  industry: string | null;
  companySize: string | null;
  internalNotes: string | null;
  _count: {
    teamMembers: number;
    assets: number;
  };
  teamMembers: Array<{
    id: string;
    name: string | null;
    email: string;
    role: string;
    isOwner: boolean;
    joinedAt: string;
  }>;
}

interface ModuleInsights {
  assets: { total: number; requests: number; pendingRequests: number };
  subscriptions: { total: number };
  suppliers: { total: number; pending: number };
  employees: { total: number };
  leave: { totalRequests: number; pending: number };
  payroll: { totalRuns: number };
  'purchase-requests': { total: number; pending: number };
  documents: { total: number };
}

interface RecentActivity {
  id: string;
  action: string;
  entityType: string;
  at: string;
  actorUser: { name: string | null; email: string } | null;
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  expiresAt: string;
  createdAt: string;
  isExpired: boolean;
}

interface AuthConfig {
  allowedAuthMethods: string[];
  allowedEmailDomains: string[];
  enforceDomainRestriction: boolean;
  hasCustomGoogleOAuth: boolean;
  hasCustomAzureOAuth: boolean;
  customGoogleClientId: string | null;
  customAzureClientId: string | null;
  customAzureTenantId: string | null;
}

interface EmailConfig {
  customSmtpHost: string | null;
  customSmtpPort: number | null;
  customSmtpUser: string | null;
  customSmtpSecure: boolean;
  customEmailFrom: string | null;
  customEmailName: string | null;
  hasSmtpPassword: boolean;
  isConfigured: boolean;
}

interface AIUsageStats {
  organizationId: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  totalCostUsd: number;
  apiCallCount: number;
}

interface WhatsAppStatus {
  source: 'NONE' | 'PLATFORM' | 'CUSTOM';
  platformEnabled: boolean;
  platformAvailable: boolean;
  hasCustomConfig: boolean;
  customConfigActive: boolean;
  stats?: {
    messagesSentThisMonth: number;
    messagesDelivered: number;
    messagesFailed: number;
  };
}

interface CustomDomainStatus {
  domain: string | null;
  verified: boolean;
  verifiedAt: string | null;
  txtValue: string | null;
  isActive: boolean;
}

const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || 'localhost:3000';
const AUTH_METHODS = [
  { id: 'credentials', label: 'Email & Password', icon: Mail },
  { id: 'google', label: 'Google Workspace SSO', icon: Globe },
  { id: 'azure-ad', label: 'Microsoft SSO', icon: Key },
] as const;

export default function OrganizationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.id as string;

  const [org, setOrg] = useState<Organization | null>(null);
  const [moduleInsights, setModuleInsights] = useState<ModuleInsights | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [updating, setUpdating] = useState(false);

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Invite dialog state
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<string>('MEMBER');
  const [inviting, setInviting] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  // Impersonation state
  const [impersonating, setImpersonating] = useState(false);

  // Auth config state
  const [authConfig, setAuthConfig] = useState<AuthConfig | null>(null);
  const [savingAuthConfig, setSavingAuthConfig] = useState(false);
  const [newDomain, setNewDomain] = useState('');

  // OAuth credentials state
  const [oauthSectionOpen, setOauthSectionOpen] = useState(false);
  const [googleClientId, setGoogleClientId] = useState('');
  const [googleClientSecret, setGoogleClientSecret] = useState('');
  const [azureClientId, setAzureClientId] = useState('');
  const [azureClientSecret, setAzureClientSecret] = useState('');
  const [azureTenantId, setAzureTenantId] = useState('');
  const [savingGoogleOAuth, setSavingGoogleOAuth] = useState(false);
  const [savingAzureOAuth, setSavingAzureOAuth] = useState(false);
  const [showGoogleSecret, setShowGoogleSecret] = useState(false);
  const [showAzureSecret, setShowAzureSecret] = useState(false);
  const [oauthSuccess, setOauthSuccess] = useState<string | null>(null);

  // Email config state
  const [emailConfig, setEmailConfig] = useState<EmailConfig | null>(null);
  const [emailSectionOpen, setEmailSectionOpen] = useState(false);
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPassword, setSmtpPassword] = useState('');
  const [smtpSecure, setSmtpSecure] = useState(true);
  const [emailFrom, setEmailFrom] = useState('');
  const [emailName, setEmailName] = useState('');
  const [savingEmailConfig, setSavingEmailConfig] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState('');
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);

  // AI Chat toggle state
  const [togglingAiChat, setTogglingAiChat] = useState(false);

  // AI Token Budget state
  const [aiTokenBudget, setAiTokenBudget] = useState<string>('');
  const [savingAiBudget, setSavingAiBudget] = useState(false);

  // AI Usage stats state
  const [aiUsage, setAiUsage] = useState<AIUsageStats | null>(null);
  const [aiUsageLoading, setAiUsageLoading] = useState(false);

  // WhatsApp state
  const [whatsAppStatus, setWhatsAppStatus] = useState<WhatsAppStatus | null>(null);
  const [togglingWhatsAppPlatform, setTogglingWhatsAppPlatform] = useState(false);

  // Custom Domain state
  const [customDomainStatus, setCustomDomainStatus] = useState<CustomDomainStatus | null>(null);
  const [newCustomDomain, setNewCustomDomain] = useState('');
  const [settingDomain, setSettingDomain] = useState(false);
  const [verifyingDomain, setVerifyingDomain] = useState(false);
  const [removingDomain, setRemovingDomain] = useState(false);
  const [domainError, setDomainError] = useState<string | null>(null);
  const [domainSuccess, setDomainSuccess] = useState<string | null>(null);
  const [verificationResult, setVerificationResult] = useState<{ verified: boolean; error?: string; txtRecordsFound?: string[] } | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [orgRes, invRes, authRes, emailRes] = await Promise.all([
          fetch(`/api/super-admin/organizations/${orgId}`),
          fetch(`/api/super-admin/organizations/${orgId}/invitations`),
          fetch(`/api/super-admin/organizations/${orgId}/auth-config`),
          fetch(`/api/super-admin/organizations/${orgId}/email-config`),
        ]);

        if (!orgRes.ok) {
          throw new Error('Organization not found');
        }

        const orgData = await orgRes.json();
        setOrg(orgData.organization);
        setModuleInsights(orgData.moduleInsights || null);
        setRecentActivity(orgData.recentActivity || []);
        // Initialize AI budget field
        if (orgData.organization?.aiTokenBudgetMonthly) {
          setAiTokenBudget(orgData.organization.aiTokenBudgetMonthly.toString());
        }

        if (invRes.ok) {
          const invData = await invRes.json();
          setInvitations(invData.invitations || []);
        }

        if (authRes.ok) {
          const authData = await authRes.json();
          setAuthConfig(authData.authConfig);
          // Initialize OAuth credentials from config
          if (authData.authConfig?.customGoogleClientId) {
            setGoogleClientId(authData.authConfig.customGoogleClientId);
          }
          if (authData.authConfig?.customAzureClientId) {
            setAzureClientId(authData.authConfig.customAzureClientId);
          }
          if (authData.authConfig?.customAzureTenantId) {
            setAzureTenantId(authData.authConfig.customAzureTenantId);
          }
        }

        if (emailRes.ok) {
          const emailData = await emailRes.json();
          setEmailConfig(emailData.emailConfig);
          // Initialize email form fields from config
          if (emailData.emailConfig?.customSmtpHost) {
            setSmtpHost(emailData.emailConfig.customSmtpHost);
          }
          if (emailData.emailConfig?.customSmtpPort) {
            setSmtpPort(emailData.emailConfig.customSmtpPort.toString());
          }
          if (emailData.emailConfig?.customSmtpUser) {
            setSmtpUser(emailData.emailConfig.customSmtpUser);
          }
          if (emailData.emailConfig?.customSmtpSecure !== undefined) {
            setSmtpSecure(emailData.emailConfig.customSmtpSecure);
          }
          if (emailData.emailConfig?.customEmailFrom) {
            setEmailFrom(emailData.emailConfig.customEmailFrom);
          }
          if (emailData.emailConfig?.customEmailName) {
            setEmailName(emailData.emailConfig.customEmailName);
          }
        }

        // Fetch AI usage stats
        setAiUsageLoading(true);
        const usageRes = await fetch(`/api/super-admin/ai-usage?orgId=${orgId}&period=month`);
        if (usageRes.ok) {
          const usageData = await usageRes.json();
          if (usageData.organizations && usageData.organizations.length > 0) {
            setAiUsage(usageData.organizations[0]);
          }
        }
        setAiUsageLoading(false);

        // Fetch WhatsApp status
        const whatsAppRes = await fetch(`/api/super-admin/organizations/${orgId}/whatsapp`);
        if (whatsAppRes.ok) {
          const whatsAppData = await whatsAppRes.json();
          setWhatsAppStatus(whatsAppData.whatsApp);
        }

        // Fetch Custom Domain status
        const customDomainRes = await fetch(`/api/super-admin/organizations/${orgId}/custom-domain`);
        if (customDomainRes.ok) {
          const customDomainData = await customDomainRes.json();
          setCustomDomainStatus(customDomainData.customDomain);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load organization');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [orgId]);

  const handleResendInvitation = async (invitationId: string) => {
    setResendingId(invitationId);
    try {
      const response = await fetch(`/api/super-admin/invitations/${invitationId}/resend`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to resend invitation');
      }

      const data = await response.json();

      // Update the invitation in state
      setInvitations(prev =>
        prev.map(inv =>
          inv.id === invitationId
            ? { ...inv, expiresAt: data.invitation.expiresAt, isExpired: false }
            : inv
        )
      );

      // Copy to clipboard
      if (data.invitation.inviteUrl) {
        await navigator.clipboard.writeText(data.invitation.inviteUrl);
        setCopiedUrl(invitationId);
        setTimeout(() => setCopiedUrl(null), 3000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend');
    } finally {
      setResendingId(null);
    }
  };

  const openEditDialog = () => {
    if (org) {
      setEditName(org.name);
      setEditDialogOpen(true);
    }
  };

  const handleEditOrg = async () => {
    setUpdating(true);
    setError(null);
    try {
      const response = await fetch(`/api/super-admin/organizations/${orgId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update organization');
      }

      const data = await response.json();
      setOrg(prev => prev ? { ...prev, ...data.organization } : null);
      setEditDialogOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteOrg = async () => {
    if (deleteConfirmText !== org?.slug) return;

    setDeleting(true);
    setError(null);
    try {
      const response = await fetch(`/api/super-admin/organizations/${orgId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete organization');
      }

      router.push('/super-admin');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
      setDeleting(false);
    }
  };

  const handleVisitPortal = async () => {
    setImpersonating(true);
    setError(null);
    try {
      const response = await fetch('/api/super-admin/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: orgId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to start impersonation');
      }

      const data = await response.json();

      // Open the portal URL in a new tab
      window.open(data.portalUrl, '_blank');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to visit portal');
    } finally {
      setImpersonating(false);
    }
  };

  const handleInviteUser = async () => {
    if (!inviteEmail.trim()) return;

    setInviting(true);
    setError(null);
    setInviteSuccess(null);
    try {
      const response = await fetch(`/api/super-admin/organizations/${orgId}/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail.trim().toLowerCase(),
          role: inviteRole,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send invitation');
      }

      // Add new invitation to list
      setInvitations(prev => [
        {
          id: data.invitation.id,
          email: data.invitation.email,
          role: data.invitation.role,
          expiresAt: data.invitation.expiresAt,
          createdAt: new Date().toISOString(),
          isExpired: false,
        },
        ...prev,
      ]);

      // Copy invite URL to clipboard
      if (data.invitation.inviteUrl) {
        await navigator.clipboard.writeText(data.invitation.inviteUrl);
        setInviteSuccess('Invitation sent! Link copied to clipboard.');
      } else {
        setInviteSuccess('Invitation sent!');
      }

      setInviteEmail('');
      setInviteRole('MEMBER');

      // Close dialog after short delay
      setTimeout(() => {
        setInviteDialogOpen(false);
        setInviteSuccess(null);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invitation');
    } finally {
      setInviting(false);
    }
  };

  // Auth config handlers
  const handleToggleAuthMethod = async (methodId: string, enabled: boolean) => {
    if (!authConfig) return;

    let currentMethods = authConfig.allowedAuthMethods.length === 0
      ? ['credentials'] // Default: only email/password
      : [...authConfig.allowedAuthMethods];

    let newMethods: string[];

    if (enabled) {
      // Adding a method
      newMethods = [...currentMethods, methodId];

      // Google and Microsoft SSO are mutually exclusive
      if (methodId === 'google') {
        newMethods = newMethods.filter(m => m !== 'azure-ad');
      } else if (methodId === 'azure-ad') {
        newMethods = newMethods.filter(m => m !== 'google');
      }
    } else {
      // Removing a method
      newMethods = currentMethods.filter((m) => m !== methodId);
    }

    // Must have at least one method enabled
    if (newMethods.length === 0) {
      return; // Don't allow disabling all methods
    }

    // Remove duplicates
    newMethods = [...new Set(newMethods)];

    await updateAuthConfig({ allowedAuthMethods: newMethods });
  };

  const handleToggleDomainRestriction = async (enabled: boolean) => {
    await updateAuthConfig({ enforceDomainRestriction: enabled });
  };

  const handleAddDomain = async () => {
    if (!newDomain.trim() || !authConfig) return;

    const domain = newDomain.trim().toLowerCase();
    // Basic domain validation
    if (!/^[a-zA-Z0-9][a-zA-Z0-9.-]*\.[a-zA-Z]{2,}$/.test(domain)) {
      setError('Invalid domain format');
      return;
    }

    if (authConfig.allowedEmailDomains.includes(domain)) {
      setError('Domain already added');
      return;
    }

    await updateAuthConfig({
      allowedEmailDomains: [...authConfig.allowedEmailDomains, domain],
    });
    setNewDomain('');
  };

  const handleRemoveDomain = async (domain: string) => {
    if (!authConfig) return;
    await updateAuthConfig({
      allowedEmailDomains: authConfig.allowedEmailDomains.filter((d) => d !== domain),
    });
  };

  const updateAuthConfig = async (updates: Partial<AuthConfig>) => {
    setSavingAuthConfig(true);
    setError(null);
    try {
      const response = await fetch(`/api/super-admin/organizations/${orgId}/auth-config`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update auth configuration');
      }

      const data = await response.json();
      setAuthConfig(data.authConfig);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setSavingAuthConfig(false);
    }
  };

  const handleSaveGoogleOAuth = async () => {
    if (!googleClientId.trim()) {
      setError('Google Client ID is required');
      return;
    }

    setSavingGoogleOAuth(true);
    setError(null);
    setOauthSuccess(null);
    try {
      const response = await fetch(`/api/super-admin/organizations/${orgId}/auth-config`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customGoogleClientId: googleClientId.trim(),
          customGoogleClientSecret: googleClientSecret || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save Google OAuth configuration');
      }

      const data = await response.json();
      setAuthConfig(data.authConfig);
      setGoogleClientSecret(''); // Clear secret field after save
      setOauthSuccess('Google OAuth configuration saved successfully');
      setTimeout(() => setOauthSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save Google OAuth');
    } finally {
      setSavingGoogleOAuth(false);
    }
  };

  const handleSaveAzureOAuth = async () => {
    if (!azureClientId.trim()) {
      setError('Azure Client ID is required');
      return;
    }

    setSavingAzureOAuth(true);
    setError(null);
    setOauthSuccess(null);
    try {
      const response = await fetch(`/api/super-admin/organizations/${orgId}/auth-config`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customAzureClientId: azureClientId.trim(),
          customAzureClientSecret: azureClientSecret || undefined,
          customAzureTenantId: azureTenantId.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save Azure OAuth configuration');
      }

      const data = await response.json();
      setAuthConfig(data.authConfig);
      setAzureClientSecret(''); // Clear secret field after save
      setOauthSuccess('Azure OAuth configuration saved successfully');
      setTimeout(() => setOauthSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save Azure OAuth');
    } finally {
      setSavingAzureOAuth(false);
    }
  };

  const handleClearGoogleOAuth = async () => {
    setSavingGoogleOAuth(true);
    setError(null);
    try {
      const response = await fetch(`/api/super-admin/organizations/${orgId}/auth-config`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customGoogleClientId: null,
          customGoogleClientSecret: null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to clear Google OAuth configuration');
      }

      const data = await response.json();
      setAuthConfig(data.authConfig);
      setGoogleClientId('');
      setGoogleClientSecret('');
      setOauthSuccess('Google OAuth configuration cleared');
      setTimeout(() => setOauthSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear Google OAuth');
    } finally {
      setSavingGoogleOAuth(false);
    }
  };

  const handleClearAzureOAuth = async () => {
    setSavingAzureOAuth(true);
    setError(null);
    try {
      const response = await fetch(`/api/super-admin/organizations/${orgId}/auth-config`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customAzureClientId: null,
          customAzureClientSecret: null,
          customAzureTenantId: null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to clear Azure OAuth configuration');
      }

      const data = await response.json();
      setAuthConfig(data.authConfig);
      setAzureClientId('');
      setAzureClientSecret('');
      setAzureTenantId('');
      setOauthSuccess('Azure OAuth configuration cleared');
      setTimeout(() => setOauthSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear Azure OAuth');
    } finally {
      setSavingAzureOAuth(false);
    }
  };

  const handleToggleAiChat = async (enabled: boolean) => {
    setTogglingAiChat(true);
    setError(null);
    try {
      const response = await fetch(`/api/super-admin/organizations/${orgId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aiChatEnabled: enabled }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update AI chat setting');
      }

      setOrg(prev => prev ? { ...prev, aiChatEnabled: enabled } : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setTogglingAiChat(false);
    }
  };

  const handleSaveAiBudget = async () => {
    setSavingAiBudget(true);
    setError(null);
    try {
      const budgetValue = aiTokenBudget.trim() ? parseInt(aiTokenBudget, 10) : null;

      const response = await fetch(`/api/super-admin/organizations/${orgId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aiTokenBudgetMonthly: budgetValue }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update AI budget');
      }

      setOrg(prev => prev ? { ...prev, aiTokenBudgetMonthly: budgetValue } : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setSavingAiBudget(false);
    }
  };

  const handleToggleWhatsAppPlatform = async (enabled: boolean) => {
    setTogglingWhatsAppPlatform(true);
    setError(null);
    try {
      const response = await fetch(`/api/super-admin/organizations/${orgId}/whatsapp`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ whatsAppPlatformEnabled: enabled }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update WhatsApp setting');
      }

      const data = await response.json();
      setWhatsAppStatus(data.whatsApp);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setTogglingWhatsAppPlatform(false);
    }
  };

  // Custom Domain handlers
  const handleSetCustomDomain = async () => {
    if (!newCustomDomain.trim()) return;

    setSettingDomain(true);
    setDomainError(null);
    setDomainSuccess(null);
    setVerificationResult(null);
    try {
      const response = await fetch(`/api/super-admin/organizations/${orgId}/custom-domain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customDomain: newCustomDomain.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to set custom domain');
      }

      setCustomDomainStatus({
        domain: data.customDomain.domain,
        verified: false,
        verifiedAt: null,
        txtValue: data.customDomain.txtValue,
        isActive: false,
      });
      setNewCustomDomain('');
      setDomainSuccess('Custom domain set. Add the TXT record to verify ownership.');
      setTimeout(() => setDomainSuccess(null), 5000);
    } catch (err) {
      setDomainError(err instanceof Error ? err.message : 'Failed to set domain');
    } finally {
      setSettingDomain(false);
    }
  };

  const handleVerifyDomain = async () => {
    setVerifyingDomain(true);
    setDomainError(null);
    setVerificationResult(null);
    try {
      const response = await fetch(`/api/super-admin/organizations/${orgId}/custom-domain`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify' }),
      });

      const data = await response.json();

      if (data.verified) {
        setCustomDomainStatus(prev => prev ? {
          ...prev,
          verified: true,
          verifiedAt: data.verifiedAt,
          isActive: true,
        } : null);
        setVerificationResult({ verified: true });
        setDomainSuccess('Domain verified successfully!');
        setTimeout(() => setDomainSuccess(null), 5000);
      } else {
        setVerificationResult({
          verified: false,
          error: data.error,
          txtRecordsFound: data.txtRecordsFound,
        });
      }
    } catch (err) {
      setDomainError(err instanceof Error ? err.message : 'Failed to verify domain');
    } finally {
      setVerifyingDomain(false);
    }
  };

  const handleRemoveCustomDomain = async () => {
    setRemovingDomain(true);
    setDomainError(null);
    try {
      const response = await fetch(`/api/super-admin/organizations/${orgId}/custom-domain`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to remove custom domain');
      }

      setCustomDomainStatus({
        domain: null,
        verified: false,
        verifiedAt: null,
        txtValue: null,
        isActive: false,
      });
      setVerificationResult(null);
      setDomainSuccess('Custom domain removed');
      setTimeout(() => setDomainSuccess(null), 3000);
    } catch (err) {
      setDomainError(err instanceof Error ? err.message : 'Failed to remove domain');
    } finally {
      setRemovingDomain(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setDomainSuccess('Copied to clipboard!');
      setTimeout(() => setDomainSuccess(null), 2000);
    } catch {
      setDomainError('Failed to copy');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !org) {
    return (
      <div className="max-w-2xl mx-auto">
        <Alert variant="error">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error || 'Organization not found'}</AlertDescription>
        </Alert>
        <div className="mt-4">
          <Link href="/super-admin">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const owner = org.teamMembers?.find(m => m.isOwner);

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <div>
        <Link
          href="/super-admin"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Dashboard
        </Link>
      </div>

      {/* Organization Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          {org.logoUrl ? (
            <img
              src={org.logoUrl}
              alt={org.name}
              className="h-16 w-16 rounded-xl object-contain bg-gray-100"
            />
          ) : (
            <div className="h-16 w-16 rounded-xl bg-blue-100 flex items-center justify-center">
              <Building2 className="h-8 w-8 text-blue-600" />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold">{org.name}</h1>
            <p className="text-muted-foreground font-mono">{org.slug}.{APP_DOMAIN.split(':')[0]}</p>
            <div className="flex items-center gap-3 mt-2">
              <Badge variant={org.subscriptionTier === 'FREE' ? 'secondary' : 'default'}>
                {org.subscriptionTier}
              </Badge>
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Created {formatDistanceToNow(new Date(org.createdAt), { addSuffix: true })}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={openEditDialog}>
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button
            variant="outline"
            onClick={() => setInviteDialogOpen(true)}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Invite User
          </Button>
          <Button
            variant="default"
            onClick={handleVisitPortal}
            disabled={impersonating}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {impersonating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <ExternalLink className="h-4 w-4 mr-2" />
                Visit Portal
              </>
            )}
          </Button>
          <Button
            variant="outline"
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Members</CardDescription>
            <CardTitle className="text-2xl">{org._count.teamMembers}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Assets</CardDescription>
            <CardTitle className="text-2xl">{org._count.assets}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Owner</CardDescription>
            <CardTitle className="text-lg truncate">{owner?.email || 'No owner'}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending Invitations</CardDescription>
            <CardTitle className="text-2xl">{invitations.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Internal Notes (Super Admin Only) */}
      {org.internalNotes && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-amber-800 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Internal Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-amber-900 whitespace-pre-wrap">{org.internalNotes}</p>
          </CardContent>
        </Card>
      )}

      {/* Installed Modules */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Installed Modules
          </CardTitle>
          <CardDescription>Modules enabled for this organization</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {(org.enabledModules || []).length === 0 ? (
              <p className="text-muted-foreground">No modules installed</p>
            ) : (
              (org.enabledModules || []).map((moduleId) => {
                const moduleConfig: Record<string, { name: string; icon: React.ReactNode; color: string }> = {
                  assets: { name: 'Assets', icon: <Package className="h-3 w-3" />, color: 'bg-blue-100 text-blue-800' },
                  subscriptions: { name: 'Subscriptions', icon: <CreditCard className="h-3 w-3" />, color: 'bg-purple-100 text-purple-800' },
                  suppliers: { name: 'Suppliers', icon: <Truck className="h-3 w-3" />, color: 'bg-green-100 text-green-800' },
                  employees: { name: 'Employees', icon: <Users className="h-3 w-3" />, color: 'bg-orange-100 text-orange-800' },
                  leave: { name: 'Leave', icon: <CalendarDays className="h-3 w-3" />, color: 'bg-teal-100 text-teal-800' },
                  payroll: { name: 'Payroll', icon: <DollarSign className="h-3 w-3" />, color: 'bg-emerald-100 text-emerald-800' },
                  'purchase-requests': { name: 'Purchase Requests', icon: <ShoppingCart className="h-3 w-3" />, color: 'bg-pink-100 text-pink-800' },
                  documents: { name: 'Company Documents', icon: <FileCheck className="h-3 w-3" />, color: 'bg-amber-100 text-amber-800' },
                };
                const config = moduleConfig[moduleId] || { name: moduleId, icon: <Package className="h-3 w-3" />, color: 'bg-gray-100 text-gray-800' };
                return (
                  <Badge key={moduleId} variant="secondary" className={`${config.color} flex items-center gap-1`}>
                    {config.icon}
                    {config.name}
                  </Badge>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* AI Features */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AI Features
          </CardTitle>
          <CardDescription>Control AI-powered features for this organization</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-medium">AI Chat Assistant</p>
                <p className="text-sm text-muted-foreground">
                  Allow users to query company data using natural language
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {togglingAiChat && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              <Switch
                checked={org.aiChatEnabled}
                onCheckedChange={handleToggleAiChat}
                disabled={togglingAiChat}
              />
            </div>
          </div>

          {/* AI Token Budget */}
          {org.aiChatEnabled && (
            <div className="mt-4 p-4 border rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Monthly Token Budget</p>
                  <p className="text-sm text-muted-foreground">
                    Set a custom monthly token limit (leave empty for tier default: {org.subscriptionTier === 'PLUS' ? '500,000' : '100,000'})
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    placeholder={org.subscriptionTier === 'PLUS' ? '500000' : '100000'}
                    value={aiTokenBudget}
                    onChange={(e) => setAiTokenBudget(e.target.value)}
                    className="w-32"
                    disabled={savingAiBudget}
                  />
                  <Button
                    size="sm"
                    onClick={handleSaveAiBudget}
                    disabled={savingAiBudget}
                  >
                    {savingAiBudget ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* AI Usage Stats */}
          {org.aiChatEnabled && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-gray-700">Usage This Month</h4>
                {aiUsageLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              </div>
              {aiUsage ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">API Calls</p>
                    <p className="text-lg font-semibold">{aiUsage.apiCallCount.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Tokens</p>
                    <p className="text-lg font-semibold">{aiUsage.totalTokens.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Prompt Tokens</p>
                    <p className="text-lg font-semibold">{aiUsage.promptTokens.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Cost (USD)</p>
                    <p className="text-lg font-semibold text-green-600">
                      ${aiUsage.totalCostUsd.toFixed(4)}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No usage data yet</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* WhatsApp Integration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            WhatsApp Integration
            {togglingWhatsAppPlatform && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </CardTitle>
          <CardDescription>Control WhatsApp notification access for this organization</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {whatsAppStatus ? (
            <>
              {/* Current Status */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                    whatsAppStatus.source !== 'NONE' ? 'bg-green-100' : 'bg-slate-100'
                  }`}>
                    <MessageCircle className={`h-5 w-5 ${
                      whatsAppStatus.source !== 'NONE' ? 'text-green-600' : 'text-slate-500'
                    }`} />
                  </div>
                  <div>
                    <p className="font-medium">WhatsApp Status</p>
                    <p className="text-sm text-muted-foreground">
                      {whatsAppStatus.source === 'NONE' && 'Disabled'}
                      {whatsAppStatus.source === 'PLATFORM' && 'Using Platform WhatsApp'}
                      {whatsAppStatus.source === 'CUSTOM' && 'Using Custom WhatsApp'}
                    </p>
                  </div>
                </div>
                <Badge variant={whatsAppStatus.source !== 'NONE' ? 'default' : 'secondary'}>
                  {whatsAppStatus.source}
                </Badge>
              </div>

              {/* Platform Access Toggle */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">Allow Platform WhatsApp</p>
                  <p className="text-sm text-muted-foreground">
                    {whatsAppStatus.platformAvailable
                      ? 'Enable this organization to use the platform WhatsApp account'
                      : 'Platform WhatsApp is not configured yet'}
                  </p>
                </div>
                <Switch
                  checked={whatsAppStatus.platformEnabled}
                  onCheckedChange={handleToggleWhatsAppPlatform}
                  disabled={togglingWhatsAppPlatform || !whatsAppStatus.platformAvailable}
                />
              </div>

              {/* Custom Config Status */}
              {whatsAppStatus.hasCustomConfig && (
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div>
                    <p className="font-medium">Custom WhatsApp Config</p>
                    <p className="text-sm text-muted-foreground">
                      Organization has their own WhatsApp Business API configured
                    </p>
                  </div>
                  <Badge variant={whatsAppStatus.customConfigActive ? 'default' : 'secondary'}>
                    {whatsAppStatus.customConfigActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              )}

              {/* Usage Stats */}
              {whatsAppStatus.stats && whatsAppStatus.source !== 'NONE' && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Usage This Month</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Messages Sent</p>
                      <p className="text-lg font-semibold">{whatsAppStatus.stats.messagesSentThisMonth.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Delivered</p>
                      <p className="text-lg font-semibold text-green-600">{whatsAppStatus.stats.messagesDelivered.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Failed</p>
                      <p className="text-lg font-semibold text-red-600">{whatsAppStatus.stats.messagesFailed.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Loading WhatsApp status...</p>
          )}
        </CardContent>
      </Card>

      {/* Custom Domain */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Custom Domain
            {(settingDomain || verifyingDomain || removingDomain) && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </CardTitle>
          <CardDescription>
            Configure a custom domain for this organization (e.g., app.company.com)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {domainError && (
            <Alert variant="error">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{domainError}</AlertDescription>
            </Alert>
          )}

          {domainSuccess && (
            <Alert className="border-green-200 bg-green-50 text-green-800">
              <Check className="h-4 w-4" />
              <AlertDescription>{domainSuccess}</AlertDescription>
            </Alert>
          )}

          {customDomainStatus?.domain ? (
            <>
              {/* Current Domain Status */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                    customDomainStatus.isActive ? 'bg-green-100' : 'bg-amber-100'
                  }`}>
                    <Globe className={`h-5 w-5 ${
                      customDomainStatus.isActive ? 'text-green-600' : 'text-amber-600'
                    }`} />
                  </div>
                  <div>
                    <p className="font-medium font-mono">{customDomainStatus.domain}</p>
                    <p className="text-sm text-muted-foreground">
                      {customDomainStatus.isActive ? 'Active and ready' : 'Pending verification'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={customDomainStatus.isActive ? 'default' : 'secondary'}>
                    {customDomainStatus.verified ? 'Verified' : 'Pending'}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveCustomDomain}
                    disabled={removingDomain}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Verification Instructions */}
              {!customDomainStatus.verified && customDomainStatus.txtValue && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-3">
                  <h4 className="font-medium text-amber-900">DNS Verification Required</h4>
                  <p className="text-sm text-amber-800">
                    Add a TXT record in your DNS provider with these values:
                  </p>
                  <div className="bg-white rounded border border-amber-200 overflow-hidden">
                    <table className="w-full text-sm">
                      <tbody>
                        <tr className="border-b border-amber-100">
                          <td className="px-3 py-2 font-medium text-amber-800 w-20">Type</td>
                          <td className="px-3 py-2 font-mono">TXT</td>
                        </tr>
                        <tr className="border-b border-amber-100">
                          <td className="px-3 py-2 font-medium text-amber-800 w-20">Name</td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <code className="font-mono text-xs bg-amber-50 px-2 py-1 rounded flex-1 truncate">
                                _durj-verification.{customDomainStatus.domain?.split('.')[0]}
                              </code>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2"
                                onClick={() => copyToClipboard(`_durj-verification.${customDomainStatus.domain?.split('.')[0]}`)}
                              >
                                Copy
                              </Button>
                            </div>
                          </td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2 font-medium text-amber-800 w-20">Value</td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <code className="font-mono text-xs bg-amber-50 px-2 py-1 rounded flex-1 truncate">
                                {customDomainStatus.txtValue}
                              </code>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2"
                                onClick={() => copyToClipboard(customDomainStatus.txtValue || '')}
                              >
                                Copy
                              </Button>
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-amber-700">
                    Note: DNS changes may take up to 48 hours to propagate. Your DNS provider will automatically append your domain.
                  </p>
                </div>
              )}

              {/* Verification Result */}
              {verificationResult && !verificationResult.verified && (
                <Alert variant="error">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <p className="font-medium">{verificationResult.error}</p>
                    {verificationResult.txtRecordsFound && verificationResult.txtRecordsFound.length > 0 && (
                      <div className="mt-2 text-sm">
                        <p>TXT records found:</p>
                        <ul className="list-disc list-inside mt-1">
                          {verificationResult.txtRecordsFound.map((record, i) => (
                            <li key={i} className="font-mono text-xs truncate">{record}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">Verify Domain</p>
                  <p className="text-sm text-muted-foreground">
                    Check if TXT record is configured correctly
                  </p>
                </div>
                <Button
                  onClick={handleVerifyDomain}
                  disabled={verifyingDomain || customDomainStatus.verified}
                  variant="outline"
                >
                  {verifyingDomain ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : customDomainStatus.verified ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Verified
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Verify Now
                    </>
                  )}
                </Button>
              </div>

              {/* SSL Setup Instructions */}
              {customDomainStatus.isActive && (
                <Alert className="border-blue-200 bg-blue-50 text-blue-800">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <p className="font-medium">Vercel Setup Required</p>
                    <p className="text-sm mt-1">
                      Add this domain to your Vercel project for SSL:
                    </p>
                    <ol className="list-decimal list-inside text-sm mt-2 space-y-1">
                      <li>Go to Vercel Dashboard → Project → Settings → Domains</li>
                      <li>Add domain: <code className="bg-blue-100 px-1 rounded">{customDomainStatus.domain}</code></li>
                      <li>Add CNAME record: <code className="bg-blue-100 px-1 rounded">{customDomainStatus.domain}</code> → <code className="bg-blue-100 px-1 rounded">cname.vercel-dns.com</code></li>
                    </ol>
                  </AlertDescription>
                </Alert>
              )}

              {/* Verified Info */}
              {customDomainStatus.verified && customDomainStatus.verifiedAt && (
                <p className="text-xs text-muted-foreground">
                  Verified on {format(new Date(customDomainStatus.verifiedAt), 'MMM d, yyyy')}
                </p>
              )}
            </>
          ) : (
            <>
              {/* Set New Domain */}
              <div className="space-y-3">
                <Label>Custom Domain</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="app.company.com"
                    value={newCustomDomain}
                    onChange={(e) => setNewCustomDomain(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSetCustomDomain()}
                    disabled={settingDomain}
                    className="font-mono"
                  />
                  <Button
                    onClick={handleSetCustomDomain}
                    disabled={settingDomain || !newCustomDomain.trim()}
                  >
                    {settingDomain ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Set Domain'
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Enter the domain you want to use (e.g., app.company.com, hr.acme.qa)
                </p>
              </div>
            </>
          )}

          {/* Standard Subdomain Info */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-muted-foreground">
              Standard subdomain: <code className="font-mono bg-gray-200 px-1 rounded">{org?.slug}.{APP_DOMAIN.split(':')[0]}</code>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Both subdomain and custom domain will work simultaneously when configured.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Authentication Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Authentication Settings
            {savingAuthConfig && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </CardTitle>
          <CardDescription>Configure login methods and restrictions for this organization</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {authConfig ? (
            <>
              {/* Allowed Auth Methods */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Allowed Login Methods</Label>
                <p className="text-xs text-muted-foreground">
                  At least one method must be enabled. Google and Microsoft SSO are mutually exclusive.
                </p>
                <div className="space-y-2">
                  {AUTH_METHODS.map((method) => {
                    // Default to credentials only if empty
                    const effectiveMethods = authConfig.allowedAuthMethods.length === 0
                      ? ['credentials']
                      : authConfig.allowedAuthMethods;
                    const isEnabled = effectiveMethods.includes(method.id);
                    const IconComponent = method.icon;
                    // Can't disable if it's the only method enabled
                    const isOnlyMethod = effectiveMethods.length === 1 && effectiveMethods[0] === method.id;
                    const isDisabled = savingAuthConfig || isOnlyMethod;
                    return (
                      <div key={method.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <IconComponent className="h-4 w-4 text-muted-foreground" />
                          <span>{method.label}</span>
                        </div>
                        <Switch
                          checked={isEnabled}
                          onCheckedChange={(checked) => handleToggleAuthMethod(method.id, checked)}
                          disabled={isDisabled}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Email Domain Restrictions */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Email Domain Restrictions</Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Restrict which email domains can login
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {authConfig.enforceDomainRestriction ? 'Enforced' : 'Not enforced'}
                    </span>
                    <Switch
                      checked={authConfig.enforceDomainRestriction}
                      onCheckedChange={handleToggleDomainRestriction}
                      disabled={savingAuthConfig || authConfig.allowedEmailDomains.length === 0}
                    />
                  </div>
                </div>

                {/* Domain List */}
                <div className="flex flex-wrap gap-2">
                  {authConfig.allowedEmailDomains.map((domain) => (
                    <Badge key={domain} variant="secondary" className="px-3 py-1">
                      @{domain}
                      <button
                        onClick={() => handleRemoveDomain(domain)}
                        className="ml-2 hover:text-red-600"
                        disabled={savingAuthConfig}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>

                {/* Add Domain Input */}
                <div className="flex gap-2">
                  <Input
                    placeholder="company.com"
                    value={newDomain}
                    onChange={(e) => setNewDomain(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddDomain()}
                    className="max-w-xs"
                    disabled={savingAuthConfig}
                  />
                  <Button
                    variant="outline"
                    onClick={handleAddDomain}
                    disabled={savingAuthConfig || !newDomain.trim()}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Domain
                  </Button>
                </div>
              </div>

              {/* Custom OAuth Configuration */}
              <Collapsible open={oauthSectionOpen} onOpenChange={setOauthSectionOpen}>
                <CollapsibleTrigger className="flex items-center justify-between w-full p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <div className="flex items-center gap-2">
                    <Settings className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Custom OAuth Apps (Enterprise)</span>
                    {(authConfig.hasCustomGoogleOAuth || authConfig.hasCustomAzureOAuth) && (
                      <Badge variant="outline" className="ml-2 bg-green-50 text-green-700 border-green-200">
                        Configured
                      </Badge>
                    )}
                  </div>
                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${oauthSectionOpen ? 'rotate-180' : ''}`} />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 pt-4">
                  <p className="text-sm text-muted-foreground">
                    Configure custom OAuth apps to use your organization&apos;s own Google Workspace or Azure AD credentials instead of the platform&apos;s shared app.
                  </p>

                  {oauthSuccess && (
                    <Alert className="border-green-200 bg-green-50 text-green-800">
                      <Check className="h-4 w-4" />
                      <AlertDescription>{oauthSuccess}</AlertDescription>
                    </Alert>
                  )}

                  {/* Google OAuth Configuration - only show if Google SSO is enabled */}
                  {authConfig.allowedAuthMethods.includes('google') && (
                  <div className="p-4 border rounded-lg space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <svg className="h-5 w-5" viewBox="0 0 24 24">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                        </svg>
                        <h4 className="font-medium">Google OAuth</h4>
                        {authConfig.hasCustomGoogleOAuth && (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            Active
                          </Badge>
                        )}
                      </div>
                      {authConfig.hasCustomGoogleOAuth && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleClearGoogleOAuth}
                          disabled={savingGoogleOAuth}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Clear
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="google-client-id">Client ID</Label>
                        <Input
                          id="google-client-id"
                          placeholder="xxxxx.apps.googleusercontent.com"
                          value={googleClientId}
                          onChange={(e) => setGoogleClientId(e.target.value)}
                          disabled={savingGoogleOAuth}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="google-client-secret">Client Secret</Label>
                        <div className="relative">
                          <Input
                            id="google-client-secret"
                            type={showGoogleSecret ? 'text' : 'password'}
                            placeholder={authConfig.hasCustomGoogleOAuth ? '••••••••••••' : 'Enter client secret'}
                            value={googleClientSecret}
                            onChange={(e) => setGoogleClientSecret(e.target.value)}
                            disabled={savingGoogleOAuth}
                            className="pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowGoogleSecret(!showGoogleSecret)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showGoogleSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Leave blank to keep existing secret
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button
                        onClick={handleSaveGoogleOAuth}
                        disabled={savingGoogleOAuth || !googleClientId.trim()}
                        size="sm"
                      >
                        {savingGoogleOAuth ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          'Save Google OAuth'
                        )}
                      </Button>
                    </div>
                  </div>
                  )}

                  {/* Azure AD OAuth Configuration - only show if Microsoft SSO is enabled */}
                  {authConfig.allowedAuthMethods.includes('azure-ad') && (
                  <div className="p-4 border rounded-lg space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <svg className="h-5 w-5" viewBox="0 0 23 23">
                          <path fill="#f3f3f3" d="M0 0h23v23H0z"/>
                          <path fill="#f35325" d="M1 1h10v10H1z"/>
                          <path fill="#81bc06" d="M12 1h10v10H12z"/>
                          <path fill="#05a6f0" d="M1 12h10v10H1z"/>
                          <path fill="#ffba08" d="M12 12h10v10H12z"/>
                        </svg>
                        <h4 className="font-medium">Microsoft Azure AD</h4>
                        {authConfig.hasCustomAzureOAuth && (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            Active
                          </Badge>
                        )}
                      </div>
                      {authConfig.hasCustomAzureOAuth && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleClearAzureOAuth}
                          disabled={savingAzureOAuth}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Clear
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="azure-client-id">Client ID (Application ID)</Label>
                        <Input
                          id="azure-client-id"
                          placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                          value={azureClientId}
                          onChange={(e) => setAzureClientId(e.target.value)}
                          disabled={savingAzureOAuth}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="azure-client-secret">Client Secret</Label>
                        <div className="relative">
                          <Input
                            id="azure-client-secret"
                            type={showAzureSecret ? 'text' : 'password'}
                            placeholder={authConfig.hasCustomAzureOAuth ? '••••••••••••' : 'Enter client secret'}
                            value={azureClientSecret}
                            onChange={(e) => setAzureClientSecret(e.target.value)}
                            disabled={savingAzureOAuth}
                            className="pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowAzureSecret(!showAzureSecret)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showAzureSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Leave blank to keep existing secret
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="azure-tenant-id">Tenant ID</Label>
                        <Input
                          id="azure-tenant-id"
                          placeholder="common, organizations, or tenant GUID"
                          value={azureTenantId}
                          onChange={(e) => setAzureTenantId(e.target.value)}
                          disabled={savingAzureOAuth}
                        />
                        <p className="text-xs text-muted-foreground">
                          Use &quot;common&quot; for multi-tenant apps
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button
                        onClick={handleSaveAzureOAuth}
                        disabled={savingAzureOAuth || !azureClientId.trim()}
                        size="sm"
                      >
                        {savingAzureOAuth ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          'Save Azure OAuth'
                        )}
                      </Button>
                    </div>
                  </div>
                  )}

                  {/* Message when no SSO method is enabled */}
                  {!authConfig.allowedAuthMethods.includes('google') && !authConfig.allowedAuthMethods.includes('azure-ad') && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Enable Google or Microsoft SSO in Authentication Settings above to configure custom OAuth credentials.
                    </p>
                  )}
                </CollapsibleContent>
              </Collapsible>
            </>
          ) : (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Email Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Configuration
          </CardTitle>
          <CardDescription>
            Configure custom SMTP for white-label emails from organization&apos;s own domain
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Collapsible open={emailSectionOpen} onOpenChange={setEmailSectionOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  <span>Custom SMTP Settings</span>
                </div>
                <div className="flex items-center gap-2">
                  {emailConfig?.isConfigured && (
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      <Check className="h-3 w-3 mr-1" />
                      Configured
                    </Badge>
                  )}
                  <ChevronDown className={`h-4 w-4 transition-transform ${emailSectionOpen ? 'rotate-180' : ''}`} />
                </div>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4 space-y-4">
              {emailSuccess && (
                <Alert className="bg-green-50 border-green-200">
                  <Check className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">{emailSuccess}</AlertDescription>
                </Alert>
              )}
              {emailError && (
                <Alert variant="error">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{emailError}</AlertDescription>
                </Alert>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="smtpHost">SMTP Host</Label>
                  <Input
                    id="smtpHost"
                    placeholder="smtp.gmail.com"
                    value={smtpHost}
                    onChange={(e) => setSmtpHost(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">e.g., smtp.gmail.com, smtp.office365.com</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="smtpPort">SMTP Port</Label>
                  <Input
                    id="smtpPort"
                    type="number"
                    placeholder="587"
                    value={smtpPort}
                    onChange={(e) => setSmtpPort(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Common: 587 (TLS), 465 (SSL)</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="smtpUser">SMTP Username</Label>
                  <Input
                    id="smtpUser"
                    placeholder="notifications@company.com"
                    value={smtpUser}
                    onChange={(e) => setSmtpUser(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="smtpPassword">SMTP Password</Label>
                  <div className="relative">
                    <Input
                      id="smtpPassword"
                      type={showSmtpPassword ? 'text' : 'password'}
                      placeholder={emailConfig?.hasSmtpPassword ? '••••••••••••' : 'Enter password or app password'}
                      value={smtpPassword}
                      onChange={(e) => setSmtpPassword(e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                      onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                    >
                      {showSmtpPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">For Gmail, use an App Password</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="emailFrom">From Email</Label>
                  <Input
                    id="emailFrom"
                    type="email"
                    placeholder="notifications@company.com"
                    value={emailFrom}
                    onChange={(e) => setEmailFrom(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="emailName">From Name (optional)</Label>
                  <Input
                    id="emailName"
                    placeholder="Company Notifications"
                    value={emailName}
                    onChange={(e) => setEmailName(e.target.value)}
                  />
                </div>

                <div className="flex items-center gap-2 md:col-span-2">
                  <Switch
                    id="smtpSecure"
                    checked={smtpSecure}
                    onCheckedChange={setSmtpSecure}
                  />
                  <Label htmlFor="smtpSecure">Use TLS/SSL</Label>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={async () => {
                    setSavingEmailConfig(true);
                    setEmailSuccess(null);
                    setEmailError(null);
                    try {
                      const response = await fetch(`/api/super-admin/organizations/${orgId}/email-config`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          customSmtpHost: smtpHost || null,
                          customSmtpPort: smtpPort ? parseInt(smtpPort) : null,
                          customSmtpUser: smtpUser || null,
                          customSmtpPassword: smtpPassword || undefined,
                          customSmtpSecure: smtpSecure,
                          customEmailFrom: emailFrom || null,
                          customEmailName: emailName || null,
                        }),
                      });
                      const data = await response.json();
                      if (!response.ok) throw new Error(data.error || 'Failed to save');
                      setEmailConfig(data.emailConfig);
                      setSmtpPassword(''); // Clear password field after save
                      setEmailSuccess('Email configuration saved successfully');
                      setTimeout(() => setEmailSuccess(null), 3000);
                    } catch (err) {
                      setEmailError(err instanceof Error ? err.message : 'Failed to save');
                    } finally {
                      setSavingEmailConfig(false);
                    }
                  }}
                  disabled={savingEmailConfig || !smtpHost || !smtpPort || !smtpUser || !emailFrom}
                >
                  {savingEmailConfig ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Configuration'
                  )}
                </Button>

                {emailConfig?.isConfigured && (
                  <>
                    <div className="flex-1" />
                    <Input
                      placeholder="test@email.com"
                      value={testEmailAddress}
                      onChange={(e) => setTestEmailAddress(e.target.value)}
                      className="w-48"
                    />
                    <Button
                      variant="outline"
                      onClick={async () => {
                        setTestingEmail(true);
                        setEmailSuccess(null);
                        setEmailError(null);
                        try {
                          const response = await fetch(`/api/super-admin/organizations/${orgId}/email-config`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ testEmail: testEmailAddress }),
                          });
                          const data = await response.json();
                          if (!response.ok) throw new Error(data.details || data.error || 'Failed to send');
                          setEmailSuccess(data.message);
                          setTimeout(() => setEmailSuccess(null), 5000);
                        } catch (err) {
                          setEmailError(err instanceof Error ? err.message : 'Failed to send test email');
                        } finally {
                          setTestingEmail(false);
                        }
                      }}
                      disabled={testingEmail || !testEmailAddress}
                    >
                      {testingEmail ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        'Send Test Email'
                      )}
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={async () => {
                        if (!confirm('Clear email configuration?')) return;
                        try {
                          const response = await fetch(`/api/super-admin/organizations/${orgId}/email-config`, {
                            method: 'DELETE',
                          });
                          if (!response.ok) throw new Error('Failed to clear');
                          setEmailConfig(null);
                          setSmtpHost('');
                          setSmtpPort('587');
                          setSmtpUser('');
                          setSmtpPassword('');
                          setEmailFrom('');
                          setEmailName('');
                          setEmailSuccess('Email configuration cleared');
                          setTimeout(() => setEmailSuccess(null), 3000);
                        } catch (err) {
                          setEmailError(err instanceof Error ? err.message : 'Failed to clear');
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>

              {emailConfig?.isConfigured && (
                <div className="bg-green-50 p-3 rounded-lg border border-green-200 text-sm">
                  <p className="text-green-800">
                    <strong>Emails will be sent from:</strong> {emailConfig.customEmailName ? `"${emailConfig.customEmailName}" <${emailConfig.customEmailFrom}>` : emailConfig.customEmailFrom}
                  </p>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>

      {/* Module Insights */}
      {moduleInsights && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Module Usage Insights
            </CardTitle>
            <CardDescription>Usage statistics per module</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {(org.enabledModules || []).includes('assets') && (
                <div className="p-4 rounded-lg bg-blue-50 border border-blue-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Package className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-blue-900">Assets</span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-blue-700">Total</span>
                      <span className="font-semibold text-blue-900">{moduleInsights.assets.total}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">Requests</span>
                      <span className="font-semibold text-blue-900">{moduleInsights.assets.requests}</span>
                    </div>
                    {moduleInsights.assets.pendingRequests > 0 && (
                      <div className="flex justify-between">
                        <span className="text-orange-600">Pending</span>
                        <span className="font-semibold text-orange-700">{moduleInsights.assets.pendingRequests}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {(org.enabledModules || []).includes('subscriptions') && (
                <div className="p-4 rounded-lg bg-purple-50 border border-purple-100">
                  <div className="flex items-center gap-2 mb-2">
                    <CreditCard className="h-4 w-4 text-purple-600" />
                    <span className="font-medium text-purple-900">Subscriptions</span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-purple-700">Total</span>
                      <span className="font-semibold text-purple-900">{moduleInsights.subscriptions.total}</span>
                    </div>
                  </div>
                </div>
              )}

              {(org.enabledModules || []).includes('suppliers') && (
                <div className="p-4 rounded-lg bg-green-50 border border-green-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Truck className="h-4 w-4 text-green-600" />
                    <span className="font-medium text-green-900">Suppliers</span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-green-700">Total</span>
                      <span className="font-semibold text-green-900">{moduleInsights.suppliers.total}</span>
                    </div>
                    {moduleInsights.suppliers.pending > 0 && (
                      <div className="flex justify-between">
                        <span className="text-orange-600">Pending</span>
                        <span className="font-semibold text-orange-700">{moduleInsights.suppliers.pending}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {(org.enabledModules || []).includes('employees') && (
                <div className="p-4 rounded-lg bg-orange-50 border border-orange-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-4 w-4 text-orange-600" />
                    <span className="font-medium text-orange-900">Employees</span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-orange-700">HR Profiles</span>
                      <span className="font-semibold text-orange-900">{moduleInsights.employees.total}</span>
                    </div>
                  </div>
                </div>
              )}

              {(org.enabledModules || []).includes('leave') && (
                <div className="p-4 rounded-lg bg-teal-50 border border-teal-100">
                  <div className="flex items-center gap-2 mb-2">
                    <CalendarDays className="h-4 w-4 text-teal-600" />
                    <span className="font-medium text-teal-900">Leave</span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-teal-700">Requests</span>
                      <span className="font-semibold text-teal-900">{moduleInsights.leave.totalRequests}</span>
                    </div>
                    {moduleInsights.leave.pending > 0 && (
                      <div className="flex justify-between">
                        <span className="text-orange-600">Pending</span>
                        <span className="font-semibold text-orange-700">{moduleInsights.leave.pending}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {(org.enabledModules || []).includes('payroll') && (
                <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-100">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="h-4 w-4 text-emerald-600" />
                    <span className="font-medium text-emerald-900">Payroll</span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-emerald-700">Payroll Runs</span>
                      <span className="font-semibold text-emerald-900">{moduleInsights.payroll.totalRuns}</span>
                    </div>
                  </div>
                </div>
              )}

              {(org.enabledModules || []).includes('purchase-requests') && (
                <div className="p-4 rounded-lg bg-pink-50 border border-pink-100">
                  <div className="flex items-center gap-2 mb-2">
                    <ShoppingCart className="h-4 w-4 text-pink-600" />
                    <span className="font-medium text-pink-900">Purchase Requests</span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-pink-700">Total</span>
                      <span className="font-semibold text-pink-900">{moduleInsights['purchase-requests'].total}</span>
                    </div>
                    {moduleInsights['purchase-requests'].pending > 0 && (
                      <div className="flex justify-between">
                        <span className="text-orange-600">Pending</span>
                        <span className="font-semibold text-orange-700">{moduleInsights['purchase-requests'].pending}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {(org.enabledModules || []).includes('documents') && (
                <div className="p-4 rounded-lg bg-amber-50 border border-amber-100">
                  <div className="flex items-center gap-2 mb-2">
                    <FileCheck className="h-4 w-4 text-amber-600" />
                    <span className="font-medium text-amber-900">Documents</span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-amber-700">Total</span>
                      <span className="font-semibold text-amber-900">{moduleInsights.documents.total}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      {recentActivity.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>Last 10 actions in this organization</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium text-sm">
                      {activity.action.replace(/_/g, ' ')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {activity.actorUser?.name || activity.actorUser?.email || 'System'}
                      {' • '}
                      {activity.entityType}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(activity.at), { addSuffix: true })}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Members */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Members
          </CardTitle>
          <CardDescription>Users in this organization</CardDescription>
        </CardHeader>
        <CardContent>
          {(org.teamMembers?.length || 0) === 0 ? (
            <p className="text-muted-foreground text-center py-4">No members yet</p>
          ) : (
            <div className="divide-y">
              {org.teamMembers?.map((member) => (
                <div key={member.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      {member.name || member.email}
                      {member.isOwner && (
                        <Badge variant="outline" className="ml-2">Owner</Badge>
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground">{member.email}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary">{member.role}</Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      Joined {formatDistanceToNow(new Date(member.joinedAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Pending Invitations
          </CardTitle>
          <CardDescription>Invitations waiting to be accepted</CardDescription>
        </CardHeader>
        <CardContent>
          {invitations.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No pending invitations</p>
          ) : (
            <div className="divide-y">
              {invitations.map((inv) => (
                <div key={inv.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{inv.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary">{inv.role}</Badge>
                      {inv.isExpired ? (
                        <span className="text-xs text-red-600 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Expired
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Expires {format(new Date(inv.expiresAt), 'MMM d, yyyy')}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleResendInvitation(inv.id)}
                    disabled={resendingId === inv.id}
                  >
                    {resendingId === inv.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : copiedUrl === inv.id ? (
                      <>
                        <Check className="h-4 w-4 mr-1 text-green-600" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-1" />
                        {inv.isExpired ? 'Regenerate' : 'Resend & Copy'}
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Organization Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Organization</DialogTitle>
            <DialogDescription>
              Update organization settings
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Organization Name</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Organization name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} disabled={updating}>
              Cancel
            </Button>
            <Button onClick={handleEditOrg} disabled={updating || !editName.trim()}>
              {updating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite User Dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite User</DialogTitle>
            <DialogDescription>
              Send an invitation to join {org.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {inviteSuccess && (
              <Alert className="border-green-200 bg-green-50 text-green-800">
                <Check className="h-4 w-4" />
                <AlertDescription>{inviteSuccess}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email Address</Label>
              <Input
                id="invite-email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="user@example.com"
                disabled={inviting || !!inviteSuccess}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-role">Role</Label>
              <Select
                value={inviteRole}
                onValueChange={setInviteRole}
                disabled={inviting || !!inviteSuccess}
              >
                <SelectTrigger id="invite-role">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OWNER">Owner</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="MANAGER">Manager</SelectItem>
                  <SelectItem value="MEMBER">Member</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {inviteRole === 'OWNER' && 'Full control over the organization'}
                {inviteRole === 'ADMIN' && 'Can manage users and settings'}
                {inviteRole === 'MANAGER' && 'Can manage team members'}
                {inviteRole === 'MEMBER' && 'Standard access to organization features'}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteDialogOpen(false)} disabled={inviting}>
              Cancel
            </Button>
            <Button
              onClick={handleInviteUser}
              disabled={inviting || !inviteEmail.trim() || !!inviteSuccess}
            >
              {inviting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Send Invitation
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Organization Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">Delete Organization</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the organization and all associated data.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Alert variant="error">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Deleting this organization will remove:
                <ul className="mt-2 list-disc list-inside text-sm">
                  <li>{org._count.teamMembers} member(s)</li>
                  <li>{org._count.assets} asset(s)</li>
                  <li>{invitations.length} pending invitation(s)</li>
                  <li>All organization data</li>
                </ul>
              </AlertDescription>
            </Alert>
            <div className="space-y-2">
              <Label htmlFor="delete-confirm">
                Type <span className="font-mono font-bold">{org.slug}</span> to confirm
              </Label>
              <Input
                id="delete-confirm"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder={org.slug}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteOrg}
              disabled={deleting || deleteConfirmText !== org.slug}
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Organization
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
