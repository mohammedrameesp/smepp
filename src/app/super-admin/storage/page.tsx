/**
 * @module app/super-admin/storage/page
 * @description Super admin storage analytics page. Displays platform-wide file storage
 * usage statistics including total storage, file counts, and per-organization breakdown.
 * Shows storage metrics sorted by usage with last upload timestamps. Uses Supabase
 * for file storage backend.
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  HardDrive,
  Image,
  Building2,
  Calendar,
  Loader2,
  FolderOpen,
  TrendingUp,
} from 'lucide-react';
import { ICON_SIZES } from '@/lib/constants';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { roundTo } from '@/lib/utils/math-utils';

interface OrganizationStorage {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  createdAt: string;
  fileCount: number;
  totalSize: number;
  lastUpload: string | null;
}

interface StorageStats {
  summary: {
    totalFiles: number;
    totalStorage: number;
    totalOrganizations: number;
    organizationsWithFiles: number;
  };
  organizations: OrganizationStorage[];
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${roundTo(bytes / Math.pow(k, i), 2)} ${sizes[i]}`;
}

export default function SuperAdminStoragePage() {
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const res = await fetch('/api/super-admin/storage');
        if (!res.ok) {
          throw new Error('Failed to load storage stats');
        }
        const data = await res.json();
        setStats(data);
      } catch (error) {
        toast.error('Failed to load storage statistics');
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    }
    loadStats();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className={`${ICON_SIZES.xl} animate-spin text-muted-foreground`} />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Storage</h2>
          <p className="text-muted-foreground">Failed to load storage statistics</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Storage</h2>
        <p className="text-muted-foreground">
          Platform-wide file storage usage and statistics
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-50">
                <HardDrive className={`${ICON_SIZES.lg} text-blue-600`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Storage</p>
                <p className="text-2xl font-bold">{formatBytes(stats.summary.totalStorage)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-green-50">
                <Image className={`${ICON_SIZES.lg} text-green-600`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Files</p>
                <p className="text-2xl font-bold">{stats.summary.totalFiles.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-purple-50">
                <Building2 className={`${ICON_SIZES.lg} text-purple-600`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Organizations</p>
                <p className="text-2xl font-bold">{stats.summary.totalOrganizations}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-amber-50">
                <TrendingUp className={`${ICON_SIZES.lg} text-amber-600`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active (with files)</p>
                <p className="text-2xl font-bold">{stats.summary.organizationsWithFiles}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Organization Storage Table */}
      <Card>
        <CardHeader>
          <CardTitle>Storage by Organization</CardTitle>
          <CardDescription>
            File uploads and storage usage per organization (sorted by usage)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stats.organizations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <FolderOpen className={`${ICON_SIZES['3xl']} text-muted-foreground mb-4`} />
              <h3 className="text-lg font-semibold mb-2">No organizations</h3>
              <p className="text-muted-foreground">
                Organizations will appear here when created
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 font-medium text-muted-foreground">Organization</th>
                    <th className="pb-3 font-medium text-muted-foreground text-right">Files</th>
                    <th className="pb-3 font-medium text-muted-foreground text-right">Storage</th>
                    <th className="pb-3 font-medium text-muted-foreground text-right">Avg Size</th>
                    <th className="pb-3 font-medium text-muted-foreground">Last Upload</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.organizations.map((org) => (
                    <tr key={org.id} className="border-b last:border-0">
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          {org.logoUrl ? (
                            <img
                              src={org.logoUrl}
                              alt={org.name}
                              className="h-8 w-8 rounded object-contain bg-gray-100"
                            />
                          ) : (
                            <div className="h-8 w-8 rounded bg-slate-100 flex items-center justify-center">
                              <Building2 className={`${ICON_SIZES.sm} text-slate-400`} />
                            </div>
                          )}
                          <div>
                            <p className="font-medium">{org.name}</p>
                            <p className="text-sm text-muted-foreground">{org.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 text-right">
                        {org.fileCount > 0 ? (
                          <Badge variant="secondary">{org.fileCount.toLocaleString()}</Badge>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </td>
                      <td className="py-4 text-right font-mono text-sm">
                        {org.totalSize > 0 ? (
                          formatBytes(org.totalSize)
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="py-4 text-right font-mono text-sm">
                        {org.fileCount > 0 ? (
                          formatBytes(org.totalSize / org.fileCount)
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="py-4">
                        {org.lastUpload ? (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Calendar className={ICON_SIZES.xs} />
                            {formatDistanceToNow(new Date(org.lastUpload), { addSuffix: true })}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">Never</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/*
 * =============================================================================
 * CODE REVIEW SUMMARY
 * =============================================================================
 *
 * File: src/app/super-admin/storage/page.tsx
 * Type: Client Component - Storage Analytics Dashboard
 *
 * FUNCTIONALITY:
 * - Display platform-wide storage summary (total storage, files, orgs)
 * - Per-organization storage breakdown table
 * - Metrics: file count, storage used, average file size, last upload
 * - Human-readable byte formatting (B, KB, MB, GB, TB)
 *
 * ARCHITECTURE:
 * - Single API call on mount for all storage data
 * - Local formatBytes utility for byte conversion
 * - Uses date-fns for relative time formatting
 *
 * DATA DISPLAY:
 * [OK] Organizations sorted by storage usage (implied by API)
 * [OK] Graceful handling of organizations with no files
 * [OK] Empty state when no organizations exist
 *
 * PERFORMANCE:
 * [OK] Uses roundTo utility for consistent decimal precision
 * [OK] Single API call minimizes network requests
 *
 * IMPROVEMENTS SUGGESTED:
 * [MEDIUM] Add storage limit/quota visualization per organization
 * [MEDIUM] Add file type breakdown (images, documents, etc.)
 * [LOW] Add sorting controls for the organization table
 * [LOW] Add search/filter for large organization lists
 * [LOW] Consider server component with streaming for large datasets
 * [LOW] Add refresh button to reload statistics
 *
 * =============================================================================
 */
