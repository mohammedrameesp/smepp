/**
 * @module admin/(system)/activity/activity-log-client
 * @description Client component for activity log with filtering and pagination.
 * Fetches data from /api/activity endpoint.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TableFilterBar } from '@/components/ui/table-filter-bar';
import { formatDate } from '@/lib/core/datetime';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { ICON_SIZES } from '@/lib/constants';

interface ActivityLogEntry {
  id: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  payload: Record<string, unknown> | null;
  at: string;
  actorMember: {
    id: string;
    name: string | null;
    email: string;
  } | null;
}

interface ActivityLogResponse {
  activities: ActivityLogEntry[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

interface TeamMember {
  id: string;
  name: string | null;
  email: string;
}

interface ActivityLogClientProps {
  /** List of team members who have activity logs (for actor filter dropdown) */
  teamMembers: TeamMember[];
  /** List of entity types that have activity logs (for entity type filter dropdown) */
  entityTypes: string[];
}

const PAGE_SIZE = 20;

/**
 * Determines the badge variant based on action type.
 */
function getActionBadgeVariant(action: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (action.includes('CREATED')) return 'default';
  if (action.includes('UPDATED')) return 'secondary';
  if (action.includes('DELETED')) return 'destructive';
  if (action.includes('ALERT')) return 'outline';
  return 'secondary';
}

export function ActivityLogClient({ teamMembers, entityTypes }: ActivityLogClientProps) {
  const [activities, setActivities] = useState<ActivityLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [actorFilter, setActorFilter] = useState<string>('all');
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination state
  const [offset, setOffset] = useState(0);

  const fetchActivities = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set('limit', PAGE_SIZE.toString());
      params.set('offset', offset.toString());

      if (actorFilter && actorFilter !== 'all') {
        params.set('actor', actorFilter);
      }
      if (entityTypeFilter && entityTypeFilter !== 'all') {
        params.set('entityType', entityTypeFilter);
      }

      const response = await fetch(`/api/activity?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch activity logs');
      }

      const data: ActivityLogResponse = await response.json();
      setActivities(data.activities);
      setTotal(data.pagination.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [offset, actorFilter, entityTypeFilter]);

  // Fetch on mount and when filters change
  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  // Reset offset when filters change
  useEffect(() => {
    setOffset(0);
  }, [actorFilter, entityTypeFilter]);

  // Client-side search filtering (searches action and entity type)
  const filteredActivities = searchTerm
    ? activities.filter(
        (a) =>
          a.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
          a.entityType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          a.actorMember?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : activities;

  const hasActiveFilters = actorFilter !== 'all' || entityTypeFilter !== 'all' || searchTerm !== '';
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const clearFilters = () => {
    setActorFilter('all');
    setEntityTypeFilter('all');
    setSearchTerm('');
    setOffset(0);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity Log</CardTitle>
        <CardDescription>
          System activity and audit trail for your organization
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <TableFilterBar
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Search actions..."
          resultCount={filteredActivities.length}
          totalCount={total}
          hasActiveFilters={hasActiveFilters}
          onClearFilters={clearFilters}
        >
          {/* Actor filter */}
          <Select value={actorFilter} onValueChange={setActorFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Users" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              {teamMembers.map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  {member.name || member.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Entity type filter */}
          <Select value={entityTypeFilter} onValueChange={setEntityTypeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Entity Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Entity Types</SelectItem>
              {entityTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </TableFilterBar>

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className={`${ICON_SIZES.lg} animate-spin text-muted-foreground`} />
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="text-center py-12 text-red-600">
            <p>{error}</p>
            <Button variant="outline" onClick={fetchActivities} className="mt-4">
              Retry
            </Button>
          </div>
        )}

        {/* Table */}
        {!isLoading && !error && (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredActivities.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No activity logs found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredActivities.map((activity) => (
                    <TableRow key={activity.id}>
                      <TableCell>
                        <div className="text-sm">{formatDate(activity.at)}</div>
                        <div className="text-xs text-gray-500">
                          {new Date(activity.at).toLocaleTimeString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        {activity.actorMember ? (
                          <div>
                            <div className="font-medium">
                              {activity.actorMember.name || 'Unknown'}
                            </div>
                            <div className="text-xs text-gray-500 font-mono">
                              {activity.actorMember.email}
                            </div>
                          </div>
                        ) : (
                          <Badge variant="outline">System</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getActionBadgeVariant(activity.action)}>
                          {activity.action.replace(/_/g, ' ').toLowerCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {activity.entityType && (
                          <div>
                            <div className="font-medium">{activity.entityType}</div>
                            {activity.entityId && (
                              <div className="text-xs text-gray-500 font-mono">
                                {activity.entityId.substring(0, 8)}...
                              </div>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {activity.payload && (
                          <div className="text-xs max-w-xs">
                            {typeof activity.payload === 'object' ? (
                              Object.entries(activity.payload).slice(0, 3).map(([key, value]) => (
                                <div key={key}>
                                  <span className="text-gray-500">{key}:</span>{' '}
                                  {String(value).substring(0, 50)}
                                </div>
                              ))
                            ) : (
                              String(activity.payload).substring(0, 100)
                            )}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                    disabled={offset === 0}
                  >
                    <ChevronLeft className={ICON_SIZES.sm} />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setOffset(offset + PAGE_SIZE)}
                    disabled={!activities.length || offset + PAGE_SIZE >= total}
                  >
                    Next
                    <ChevronRight className={ICON_SIZES.sm} />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
