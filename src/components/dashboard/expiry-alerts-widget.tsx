'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, XCircle, User } from 'lucide-react';

interface ExpiringDocument {
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  documentType: 'QID' | 'Passport' | 'Health Card' | 'Driving License';
  expiryDate: string;
  status: 'expired' | 'expiring';
  daysRemaining: number;
}

interface ExpiryAlertsWidgetProps {
  isAdmin?: boolean;
}

const DISPLAY_COUNT = 2;

export function ExpiryAlertsWidget({ isAdmin = false }: ExpiryAlertsWidgetProps) {
  const [alerts, setAlerts] = useState<ExpiringDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  const fetchExpiryAlerts = useCallback(async () => {
    try {
      setIsLoading(true);
      const endpoint = isAdmin ? '/api/employees/expiry-alerts' : '/api/users/me/expiry-alerts';
      const response = await fetch(endpoint);

      if (!response.ok) {
        throw new Error('Failed to fetch expiry alerts');
      }

      const data = await response.json();
      setAlerts(data.alerts || []);
    } catch (error) {
      console.error('Error fetching expiry alerts:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchExpiryAlerts();
  }, [fetchExpiryAlerts]);

  const getDocumentBadge = (type: string) => {
    const colors: Record<string, string> = {
      QID: 'bg-blue-100 text-blue-800',
      Passport: 'bg-purple-100 text-purple-800',
      'Health Card': 'bg-green-100 text-green-800',
      'Driving License': 'bg-orange-100 text-orange-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const expiredCount = alerts.filter((a) => a.status === 'expired').length;
  const expiringCount = alerts.filter((a) => a.status === 'expiring').length;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Document Expiry Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (alerts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-green-500" />
            Document Expiry Alerts
          </CardTitle>
          <CardDescription>Track expiring and expired documents</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-gray-500 py-4">
            No documents expiring within 30 days
          </p>
        </CardContent>
      </Card>
    );
  }

  const displayedAlerts = showAll ? alerts : alerts.slice(0, DISPLAY_COUNT);
  const remainingCount = alerts.length - DISPLAY_COUNT;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              Document Expiry Alerts
              {!showAll && remainingCount > 0 && (
                <Badge variant="secondary" className="text-xs ml-1">
                  +{remainingCount}
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="text-xs">
              {expiredCount > 0 && (
                <span className="text-red-600 font-medium">{expiredCount} expired</span>
              )}
              {expiredCount > 0 && expiringCount > 0 && ' | '}
              {expiringCount > 0 && (
                <span className="text-yellow-600 font-medium">{expiringCount} expiring</span>
              )}
            </CardDescription>
          </div>
          {isAdmin && alerts.length > DISPLAY_COUNT && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7"
              onClick={() => setShowAll(!showAll)}
            >
              {showAll ? 'Show Less' : 'View All'}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <div className={`space-y-2 ${showAll ? 'max-h-64 overflow-y-auto' : ''}`}>
          {displayedAlerts.map((alert, index) => (
            <div
              key={`${alert.employeeId}-${alert.documentType}-${index}`}
              className={`p-3 rounded-lg border ${
                alert.status === 'expired'
                  ? 'bg-red-50 border-red-200'
                  : 'bg-yellow-50 border-yellow-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                  <User className="h-4 w-4 text-gray-500" />
                </div>
                <div className="flex-1 min-w-0">
                  {isAdmin ? (
                    <Link
                      href={`/admin/employees/${alert.employeeId}`}
                      className="font-medium text-sm text-gray-900 hover:underline truncate block"
                    >
                      {alert.employeeName || alert.employeeEmail}
                    </Link>
                  ) : (
                    <span className="font-medium text-sm text-gray-900 truncate block">
                      {alert.documentType}
                    </span>
                  )}
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    {isAdmin && (
                      <Badge variant="outline" className={`text-xs ${getDocumentBadge(alert.documentType)}`}>
                        {alert.documentType}
                      </Badge>
                    )}
                    {alert.status === 'expired' ? (
                      <Badge variant="destructive" className="flex items-center gap-1 text-xs">
                        <XCircle className="h-3 w-3" />
                        Expired {Math.abs(alert.daysRemaining)}d ago
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="bg-yellow-100 text-yellow-800 border-yellow-300 text-xs"
                      >
                        Expires in {alert.daysRemaining} days
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        {/* Link to full document expiry page for admin */}
        {isAdmin && (
          <div className="mt-3 pt-3 border-t">
            <Link href="/admin/employees/document-expiry">
              <Button variant="outline" size="sm" className="w-full text-xs">
                View All Document Expiries
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
