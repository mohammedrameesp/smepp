import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, X } from 'lucide-react';
import { TIER_CONFIG, MODULE_METADATA } from '@/lib/multi-tenant/feature-flags';

const PLANS = [
  {
    tier: 'FREE' as const,
    popular: false,
    cta: 'Get Started Free',
    ctaVariant: 'outline' as const,
  },
  {
    tier: 'STARTER' as const,
    popular: false,
    cta: 'Start Free Trial',
    ctaVariant: 'default' as const,
  },
  {
    tier: 'PROFESSIONAL' as const,
    popular: true,
    cta: 'Start Free Trial',
    ctaVariant: 'default' as const,
  },
  {
    tier: 'ENTERPRISE' as const,
    popular: false,
    cta: 'Contact Sales',
    ctaVariant: 'outline' as const,
  },
];

const ALL_MODULES = [
  'assets',
  'subscriptions',
  'suppliers',
  'employees',
  'leave',
  'payroll',
  'purchase_requests',
  'approvals',
  'projects',
  'company_documents',
];

export default function PricingPage() {
  return (
    <div className="py-20">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-4">
            Pricing
          </Badge>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Start free and upgrade as your business grows. No hidden fees, no
            surprises.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {PLANS.map((plan) => {
            const config = TIER_CONFIG[plan.tier];
            return (
              <Card
                key={plan.tier}
                className={`relative ${
                  plan.popular ? 'border-blue-500 border-2 shadow-lg' : ''
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-blue-500">Most Popular</Badge>
                  </div>
                )}
                <CardHeader className="text-center pb-4">
                  <CardTitle className="text-xl">{config.name}</CardTitle>
                  <CardDescription>{config.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">
                      ${config.monthlyPrice}
                    </span>
                    {config.monthlyPrice > 0 && (
                      <span className="text-gray-500">/month</span>
                    )}
                  </div>
                  {config.monthlyPrice > 0 && (
                    <p className="text-sm text-gray-500 mt-1">
                      or ${config.yearlyPrice}/year (save 2 months)
                    </p>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button
                    className="w-full"
                    variant={plan.ctaVariant}
                    asChild
                  >
                    <Link href="/signup">{plan.cta}</Link>
                  </Button>

                  <div className="pt-4 border-t space-y-3">
                    <p className="font-medium text-sm text-gray-900">Includes:</p>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        <span>
                          {config.maxUsers === -1
                            ? 'Unlimited users'
                            : `Up to ${config.maxUsers} users`}
                        </span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        <span>
                          {config.maxAssets === -1
                            ? 'Unlimited assets'
                            : `Up to ${config.maxAssets} assets`}
                        </span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        <span>
                          {config.maxSubscriptions === -1
                            ? 'Unlimited subscriptions'
                            : `Up to ${config.maxSubscriptions} subscriptions`}
                        </span>
                      </li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Feature Comparison */}
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">
            Compare Features
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-4 px-4 font-medium">Module</th>
                  {PLANS.map((plan) => (
                    <th
                      key={plan.tier}
                      className="text-center py-4 px-4 font-medium"
                    >
                      {TIER_CONFIG[plan.tier].name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ALL_MODULES.map((module) => {
                  const meta = MODULE_METADATA[module];
                  return (
                    <tr key={module} className="border-b">
                      <td className="py-4 px-4">
                        <div className="font-medium">{meta?.name || module}</div>
                        <div className="text-sm text-gray-500">
                          {meta?.description}
                        </div>
                      </td>
                      {PLANS.map((plan) => {
                        const hasModule =
                          TIER_CONFIG[plan.tier].modules.includes(module);
                        return (
                          <td key={plan.tier} className="text-center py-4 px-4">
                            {hasModule ? (
                              <Check className="h-5 w-5 text-green-500 mx-auto" />
                            ) : (
                              <X className="h-5 w-5 text-gray-300 mx-auto" />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ */}
        <div className="max-w-3xl mx-auto mt-20">
          <h2 className="text-2xl font-bold text-center mb-8">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-lg mb-2">
                Can I change plans later?
              </h3>
              <p className="text-gray-600">
                Yes! You can upgrade or downgrade your plan at any time. Changes
                take effect immediately, and we&apos;ll prorate your billing.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2">
                What happens when I reach my limits?
              </h3>
              <p className="text-gray-600">
                We&apos;ll notify you when you&apos;re approaching your limits.
                You can upgrade to add more capacity, or we&apos;ll help you
                optimize your usage.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2">
                Is there a free trial for paid plans?
              </h3>
              <p className="text-gray-600">
                Yes, all paid plans come with a 14-day free trial. No credit
                card required to start.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2">
                Do you offer discounts for annual billing?
              </h3>
              <p className="text-gray-600">
                Yes! When you pay annually, you get 2 months free compared to
                monthly billing.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
