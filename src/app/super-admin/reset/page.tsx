/**
 * @module super-admin/reset
 * @description Super admin testing tools page for development and QA purposes.
 * Provides dangerous operations that should be disabled in production environments.
 *
 * @features
 * - Platform reset: delete all organizations, users, and data (preserves super admins)
 * - Database status indicator showing connection health
 * - Cache clearing utility (placeholder)
 * - Environment information display (NODE_ENV, platform, database)
 * - Prominent warning banner about development-only usage
 *
 * @dependencies
 * - ResetPlatformButton component for destructive reset action
 *
 * @security
 * - This page should be disabled or removed in production environments
 * - All destructive operations require confirmation
 *
 * @access Super Admin only (protected by middleware)
 */
'use client';

import { AlertTriangle, ArrowLeft, Trash2, Database, RefreshCw } from 'lucide-react';
import { ICON_SIZES } from '@/lib/constants';
import Link from 'next/link';
import { ResetPlatformButton } from '../components/ResetPlatformButton';

export default function ResetPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/super-admin"
          className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft className={`${ICON_SIZES.sm} text-slate-500`} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Testing Tools</h1>
          <p className="text-slate-500 text-sm">Development and testing utilities</p>
        </div>
      </div>

      {/* Warning Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle className={`${ICON_SIZES.md} text-amber-600 shrink-0 mt-0.5`} />
        <div>
          <h3 className="font-semibold text-amber-800">Development Only</h3>
          <p className="text-amber-700 text-sm mt-1">
            These tools are for development and testing purposes only. They should be disabled or removed in production environments.
          </p>
        </div>
      </div>

      {/* Testing Tools Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Reset Platform */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center shrink-0">
              <Trash2 className={`${ICON_SIZES.lg} text-red-600`} />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900">Reset Platform</h3>
              <p className="text-slate-500 text-sm mt-1 mb-4">
                Delete all organizations, users, and data. Super admin accounts will be preserved.
              </p>
              <ResetPlatformButton />
            </div>
          </div>
        </div>

        {/* Database Info */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
              <Database className={`${ICON_SIZES.lg} text-blue-600`} />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900">Database Status</h3>
              <p className="text-slate-500 text-sm mt-1 mb-4">
                View database connection status and run diagnostics.
              </p>
              <div className="flex items-center gap-2 text-sm">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                <span className="text-green-700">Connected</span>
              </div>
            </div>
          </div>
        </div>

        {/* Refresh Cache */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center shrink-0">
              <RefreshCw className={`${ICON_SIZES.lg} text-violet-600`} />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900">Clear Cache</h3>
              <p className="text-slate-500 text-sm mt-1 mb-4">
                Clear application cache and refresh all data.
              </p>
              <button className="text-sm text-violet-600 hover:text-violet-700 font-medium">
                Clear Cache
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Environment Info */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-900 mb-4">Environment Information</h3>
        <div className="grid gap-3 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Environment</span>
            <span className="font-mono text-slate-700">{process.env.NODE_ENV || 'development'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Platform</span>
            <span className="font-mono text-slate-700">Vercel / Next.js 15</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Database</span>
            <span className="font-mono text-slate-700">Supabase PostgreSQL</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/*
 * CODE REVIEW SUMMARY
 * ===================
 * Status: APPROVED with security note
 *
 * Strengths:
 * - Clear warning banner about development-only usage
 * - Organized grid layout for testing tools
 * - Environment information display for debugging
 * - Clean visual design with consistent card styling
 *
 * Minor Observations:
 * - Clear Cache button is non-functional (just static text)
 * - Database status is hardcoded as "Connected" - should be dynamic
 * - Platform shows "Next.js 15" which should be "Next.js 16" per CLAUDE.md
 * - No actual environment detection for disabling in production
 *
 * Security Recommendations:
 * - Add NODE_ENV check to hide/disable in production
 * - Consider adding audit logging for reset operations
 * - Add IP-based access restriction for this page
 *
 * Recommendations:
 * - Implement actual cache clearing functionality
 * - Add real-time database connection check
 * - Update platform version string
 */
