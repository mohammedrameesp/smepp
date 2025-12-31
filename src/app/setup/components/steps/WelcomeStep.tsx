'use client';

/**
 * @file WelcomeStep.tsx
 * @description Step 7 - Completion summary and redirect
 * @module setup/steps
 */

import { CheckCircle, Check, Loader2, PartyPopper } from 'lucide-react';
import { motion } from 'framer-motion';

interface WelcomeStepProps {
  orgName: string;
  selectedModules: string[];
  inviteCount: number;
  currencies: string[];
  isRedirecting?: boolean;
}

const MODULE_NAMES: Record<string, string> = {
  assets: 'Assets',
  subscriptions: 'Subscriptions',
  suppliers: 'Suppliers',
  employees: 'Employees',
  leave: 'Leave Management',
  payroll: 'Payroll',
  projects: 'Projects',
  'purchase-requests': 'Purchase Requests',
  documents: 'Company Documents',
};

export function WelcomeStep({
  orgName,
  selectedModules,
  inviteCount,
  currencies,
  isRedirecting = true,
}: WelcomeStepProps) {
  const moduleNames = selectedModules
    .map((id) => MODULE_NAMES[id])
    .filter(Boolean);

  return (
    <div className="max-w-md mx-auto text-center">
      {/* Success animation */}
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{
          type: 'spring',
          stiffness: 200,
          damping: 15,
          delay: 0.1,
        }}
        className="relative"
      >
        <div className="w-24 h-24 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle className="w-12 h-12 text-green-600" />
        </div>
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="absolute -top-2 -right-4"
        >
          <PartyPopper className="w-8 h-8 text-amber-500" />
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h1 className="text-3xl font-bold text-slate-900 mb-3">
          You're all set!
        </h1>
        <p className="text-slate-600 mb-8">
          Welcome to <span className="font-semibold">{orgName}</span>.
          <br />
          Your workspace is ready to use.
        </p>
      </motion.div>

      {/* Summary card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-white rounded-2xl border border-slate-200 p-6 text-left mb-8"
      >
        <h3 className="font-semibold text-slate-900 mb-4">Setup Summary</h3>
        <div className="space-y-3">
          {/* Modules */}
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
              <Check className="w-4 h-4 text-slate-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900">
                {selectedModules.length} modules enabled
              </p>
              <p className="text-xs text-slate-500">
                {moduleNames.slice(0, 3).join(', ')}
                {moduleNames.length > 3 && ` +${moduleNames.length - 3} more`}
              </p>
            </div>
          </div>

          {/* Invites */}
          {inviteCount > 0 && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <Check className="w-4 h-4 text-slate-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">
                  {inviteCount} team invitation{inviteCount !== 1 ? 's' : ''} sent
                </p>
                <p className="text-xs text-slate-500">
                  They'll receive an email shortly
                </p>
              </div>
            </div>
          )}

          {/* Currencies */}
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
              <Check className="w-4 h-4 text-slate-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900">
                Currencies configured
              </p>
              <p className="text-xs text-slate-500">
                QAR (Primary)
                {currencies.length > 0 && `, ${currencies.join(', ')}`}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Redirecting indicator */}
      {isRedirecting && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="flex items-center justify-center gap-2 text-slate-600"
        >
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Redirecting to your dashboard...</span>
        </motion.div>
      )}
    </div>
  );
}
