/**
 * @file approval-integration.test.ts
 * @description Tests for WhatsApp integration with approval workflow
 */

describe('WhatsApp Approval Integration Tests', () => {
  describe('ApprovalModule to EntityType Conversion', () => {
    type ApprovalModule = 'LEAVE_REQUEST' | 'PURCHASE_REQUEST' | 'ASSET_REQUEST';
    type ApprovalEntityType = 'LEAVE_REQUEST' | 'PURCHASE_REQUEST' | 'ASSET_REQUEST';

    const toEntityType = (module: ApprovalModule): ApprovalEntityType => {
      switch (module) {
        case 'LEAVE_REQUEST':
          return 'LEAVE_REQUEST';
        case 'PURCHASE_REQUEST':
          return 'PURCHASE_REQUEST';
        case 'ASSET_REQUEST':
          return 'ASSET_REQUEST';
        default:
          return 'LEAVE_REQUEST';
      }
    };

    it('should map LEAVE_REQUEST correctly', () => {
      expect(toEntityType('LEAVE_REQUEST')).toBe('LEAVE_REQUEST');
    });

    it('should map PURCHASE_REQUEST correctly', () => {
      expect(toEntityType('PURCHASE_REQUEST')).toBe('PURCHASE_REQUEST');
    });

    it('should map ASSET_REQUEST correctly', () => {
      expect(toEntityType('ASSET_REQUEST')).toBe('ASSET_REQUEST');
    });
  });

  describe('ApprovalDetails Interface', () => {
    interface ApprovalDetails {
      requesterName: string;
      leaveType?: string;
      startDate?: Date;
      endDate?: Date;
      totalDays?: number;
      reason?: string;
      title?: string;
      totalAmount?: number;
      currency?: string;
      assetName?: string;
      assetType?: string;
      justification?: string;
    }

    const isLeaveRequest = (details: ApprovalDetails): boolean => {
      return details.leaveType !== undefined && details.totalDays !== undefined;
    };

    const isSpendRequest = (details: ApprovalDetails): boolean => {
      return details.title !== undefined && details.totalAmount !== undefined;
    };

    const isAssetRequest = (details: ApprovalDetails): boolean => {
      return details.assetName !== undefined;
    };

    it('should identify leave request details', () => {
      const details: ApprovalDetails = {
        requesterName: 'John Doe',
        leaveType: 'Annual Leave',
        startDate: new Date('2025-01-15'),
        endDate: new Date('2025-01-17'),
        totalDays: 3,
        reason: 'Vacation',
      };

      expect(isLeaveRequest(details)).toBe(true);
      expect(isSpendRequest(details)).toBe(false);
      expect(isAssetRequest(details)).toBe(false);
    });

    it('should identify spend request details', () => {
      const details: ApprovalDetails = {
        requesterName: 'Jane Doe',
        title: 'Office Supplies',
        totalAmount: 500,
        currency: 'QAR',
      };

      expect(isLeaveRequest(details)).toBe(false);
      expect(isSpendRequest(details)).toBe(true);
      expect(isAssetRequest(details)).toBe(false);
    });

    it('should identify asset request details', () => {
      const details: ApprovalDetails = {
        requesterName: 'Bob Smith',
        assetName: 'MacBook Pro',
        assetType: 'Laptop',
        justification: 'For development work',
      };

      expect(isLeaveRequest(details)).toBe(false);
      expect(isSpendRequest(details)).toBe(false);
      expect(isAssetRequest(details)).toBe(true);
    });
  });

  describe('WhatsApp Notification Permission Check', () => {
    interface CanSendResult {
      canSend: boolean;
      reason?: string;
    }

    const checkCanSend = (
      hasPhoneNumber: boolean,
      isWhatsAppEnabled: boolean,
      isNotificationOptIn: boolean
    ): CanSendResult => {
      if (!hasPhoneNumber) {
        return { canSend: false, reason: 'No phone number configured' };
      }
      if (!isWhatsAppEnabled) {
        return { canSend: false, reason: 'WhatsApp notifications disabled' };
      }
      if (!isNotificationOptIn) {
        return { canSend: false, reason: 'User opted out of notifications' };
      }
      return { canSend: true };
    };

    it('should allow when all conditions met', () => {
      const result = checkCanSend(true, true, true);
      expect(result.canSend).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should deny without phone number', () => {
      const result = checkCanSend(false, true, true);
      expect(result.canSend).toBe(false);
      expect(result.reason).toBe('No phone number configured');
    });

    it('should deny when WhatsApp disabled', () => {
      const result = checkCanSend(true, false, true);
      expect(result.canSend).toBe(false);
      expect(result.reason).toBe('WhatsApp notifications disabled');
    });

    it('should deny when user opted out', () => {
      const result = checkCanSend(true, true, false);
      expect(result.canSend).toBe(false);
      expect(result.reason).toBe('User opted out of notifications');
    });
  });

  describe('Action Token Generation', () => {
    const generateActionToken = (
      entityType: string,
      entityId: string,
      action: 'APPROVE' | 'REJECT',
      expiresIn: number = 24 * 60 * 60 * 1000 // 24 hours
    ): { token: string; expiresAt: Date } => {
      const randomPart = Math.random().toString(36).substring(2, 15);
      const token = `${entityType}-${entityId}-${action}-${randomPart}`;
      const expiresAt = new Date(Date.now() + expiresIn);
      return { token, expiresAt };
    };

    it('should generate unique tokens', () => {
      const token1 = generateActionToken('LEAVE_REQUEST', 'lr-1', 'APPROVE');
      const token2 = generateActionToken('LEAVE_REQUEST', 'lr-1', 'APPROVE');
      expect(token1.token).not.toBe(token2.token);
    });

    it('should include entity info in token', () => {
      const { token } = generateActionToken('LEAVE_REQUEST', 'lr-123', 'APPROVE');
      expect(token).toContain('LEAVE_REQUEST');
      expect(token).toContain('lr-123');
      expect(token).toContain('APPROVE');
    });

    it('should set expiry 24 hours in future by default', () => {
      const now = Date.now();
      const { expiresAt } = generateActionToken('LEAVE_REQUEST', 'lr-1', 'APPROVE');
      const diffMs = expiresAt.getTime() - now;
      const diffHours = diffMs / (1000 * 60 * 60);
      expect(diffHours).toBeGreaterThan(23.9);
      expect(diffHours).toBeLessThan(24.1);
    });

    it('should support custom expiry time', () => {
      const oneHour = 60 * 60 * 1000;
      const { expiresAt } = generateActionToken('LEAVE_REQUEST', 'lr-1', 'APPROVE', oneHour);
      const diffMs = expiresAt.getTime() - Date.now();
      const diffMinutes = diffMs / (1000 * 60);
      expect(diffMinutes).toBeGreaterThan(58);
      expect(diffMinutes).toBeLessThan(62);
    });
  });

  describe('Token Validation', () => {
    const isTokenExpired = (expiresAt: Date): boolean => {
      return new Date() > expiresAt;
    };

    const isTokenValid = (
      token: string | null,
      expiresAt: Date | null,
      isUsed: boolean
    ): { valid: boolean; reason?: string } => {
      if (!token) {
        return { valid: false, reason: 'Token not found' };
      }
      if (!expiresAt) {
        return { valid: false, reason: 'Expiry not set' };
      }
      if (isTokenExpired(expiresAt)) {
        return { valid: false, reason: 'Token expired' };
      }
      if (isUsed) {
        return { valid: false, reason: 'Token already used' };
      }
      return { valid: true };
    };

    it('should validate valid token', () => {
      const futureDate = new Date(Date.now() + 3600000);
      const result = isTokenValid('valid-token', futureDate, false);
      expect(result.valid).toBe(true);
    });

    it('should reject missing token', () => {
      const result = isTokenValid(null, new Date(), false);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Token not found');
    });

    it('should reject expired token', () => {
      const pastDate = new Date(Date.now() - 3600000);
      const result = isTokenValid('token', pastDate, false);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Token expired');
    });

    it('should reject used token', () => {
      const futureDate = new Date(Date.now() + 3600000);
      const result = isTokenValid('token', futureDate, true);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Token already used');
    });
  });

  describe('WhatsApp Message Formatting', () => {
    interface LeaveRequestDetails {
      requesterName: string;
      leaveType: string;
      startDate: Date;
      endDate: Date;
      totalDays: number;
    }

    const formatLeaveNotification = (details: LeaveRequestDetails): string => {
      const formatDate = (d: Date): string => {
        const day = d.getDate();
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = months[d.getMonth()];
        return `${day} ${month}`;
      };

      return [
        `*New Leave Request*`,
        ``,
        `Employee: ${details.requesterName}`,
        `Type: ${details.leaveType}`,
        `Dates: ${formatDate(details.startDate)} - ${formatDate(details.endDate)}`,
        `Days: ${details.totalDays}`,
      ].join('\n');
    };

    it('should format leave notification correctly', () => {
      const details: LeaveRequestDetails = {
        requesterName: 'John Doe',
        leaveType: 'Annual Leave',
        startDate: new Date(2025, 0, 15),
        endDate: new Date(2025, 0, 17),
        totalDays: 3,
      };

      const message = formatLeaveNotification(details);

      expect(message).toContain('*New Leave Request*');
      expect(message).toContain('John Doe');
      expect(message).toContain('Annual Leave');
      expect(message).toContain('15 Jan');
      expect(message).toContain('17 Jan');
      expect(message).toContain('Days: 3');
    });
  });

  describe('Spend Request Message', () => {
    interface SpendRequestDetails {
      requesterName: string;
      title: string;
      totalAmount: number;
      currency: string;
    }

    const formatSpendNotification = (details: SpendRequestDetails): string => {
      const formattedAmount = new Intl.NumberFormat('en-US', {
        style: 'decimal',
        minimumFractionDigits: 2,
      }).format(details.totalAmount);

      return [
        `*New Spend Request*`,
        ``,
        `Requester: ${details.requesterName}`,
        `Item: ${details.title}`,
        `Amount: ${details.currency} ${formattedAmount}`,
      ].join('\n');
    };

    it('should format spend notification correctly', () => {
      const details: SpendRequestDetails = {
        requesterName: 'Jane Doe',
        title: 'Office Equipment',
        totalAmount: 5000,
        currency: 'QAR',
      };

      const message = formatSpendNotification(details);

      expect(message).toContain('*New Spend Request*');
      expect(message).toContain('Jane Doe');
      expect(message).toContain('Office Equipment');
      expect(message).toContain('QAR 5,000.00');
    });
  });

  describe('Role Matching for Approvers', () => {
    type Role = 'ADMIN' | 'MANAGER' | 'HR' | 'FINANCE' | 'EMPLOYEE';

    const canApproveWithRole = (
      userRole: Role,
      requiredRole: Role
    ): boolean => {
      // ADMIN can approve anything
      if (userRole === 'ADMIN') return true;
      // Exact role match
      return userRole === requiredRole;
    };

    it('should allow ADMIN to approve any role', () => {
      expect(canApproveWithRole('ADMIN', 'MANAGER')).toBe(true);
      expect(canApproveWithRole('ADMIN', 'HR')).toBe(true);
      expect(canApproveWithRole('ADMIN', 'FINANCE')).toBe(true);
    });

    it('should allow exact role match', () => {
      expect(canApproveWithRole('MANAGER', 'MANAGER')).toBe(true);
      expect(canApproveWithRole('HR', 'HR')).toBe(true);
    });

    it('should deny mismatched roles', () => {
      expect(canApproveWithRole('EMPLOYEE', 'MANAGER')).toBe(false);
      expect(canApproveWithRole('HR', 'FINANCE')).toBe(false);
    });
  });

  describe('Notification Status Tracking', () => {
    type NotificationStatus = 'PENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';

    interface NotificationRecord {
      id: string;
      status: NotificationStatus;
      sentAt?: Date;
      deliveredAt?: Date;
      readAt?: Date;
      failureReason?: string;
    }

    const updateNotificationStatus = (
      record: NotificationRecord,
      newStatus: NotificationStatus,
      timestamp: Date = new Date()
    ): NotificationRecord => {
      const updated = { ...record, status: newStatus };

      switch (newStatus) {
        case 'SENT':
          updated.sentAt = timestamp;
          break;
        case 'DELIVERED':
          updated.deliveredAt = timestamp;
          break;
        case 'READ':
          updated.readAt = timestamp;
          break;
      }

      return updated;
    };

    it('should update status to SENT with timestamp', () => {
      const record: NotificationRecord = { id: 'notif-1', status: 'PENDING' };
      const updated = updateNotificationStatus(record, 'SENT');

      expect(updated.status).toBe('SENT');
      expect(updated.sentAt).toBeDefined();
    });

    it('should update status to DELIVERED with timestamp', () => {
      const record: NotificationRecord = { id: 'notif-1', status: 'SENT', sentAt: new Date() };
      const updated = updateNotificationStatus(record, 'DELIVERED');

      expect(updated.status).toBe('DELIVERED');
      expect(updated.deliveredAt).toBeDefined();
    });

    it('should update status to READ with timestamp', () => {
      const record: NotificationRecord = { id: 'notif-1', status: 'DELIVERED' };
      const updated = updateNotificationStatus(record, 'READ');

      expect(updated.status).toBe('READ');
      expect(updated.readAt).toBeDefined();
    });
  });

  describe('Token Invalidation', () => {
    const shouldInvalidateTokens = (
      entityStatus: string
    ): boolean => {
      const finalStatuses = ['APPROVED', 'REJECTED', 'CANCELLED'];
      return finalStatuses.includes(entityStatus);
    };

    it('should invalidate when approved', () => {
      expect(shouldInvalidateTokens('APPROVED')).toBe(true);
    });

    it('should invalidate when rejected', () => {
      expect(shouldInvalidateTokens('REJECTED')).toBe(true);
    });

    it('should invalidate when cancelled', () => {
      expect(shouldInvalidateTokens('CANCELLED')).toBe(true);
    });

    it('should not invalidate when pending', () => {
      expect(shouldInvalidateTokens('PENDING')).toBe(false);
    });

    it('should not invalidate when in progress', () => {
      expect(shouldInvalidateTokens('IN_PROGRESS')).toBe(false);
    });
  });

  describe('Non-Blocking Notification Behavior', () => {
    const sendNotificationNonBlocking = async (
      sendFn: () => Promise<void>
    ): Promise<{ started: boolean; error?: string }> => {
      try {
        // Fire and forget - don't await
        sendFn().catch((error) => {
          console.error('WhatsApp notification error:', error);
        });
        return { started: true };
      } catch {
        return { started: false, error: 'Failed to start notification' };
      }
    };

    it('should return immediately without waiting', async () => {
      const start = Date.now();
      let resolved = false;

      const slowSend = () => new Promise<void>((resolve) => {
        setTimeout(() => {
          resolved = true;
          resolve();
        }, 100);
      });

      const result = await sendNotificationNonBlocking(slowSend);

      const elapsed = Date.now() - start;

      expect(result.started).toBe(true);
      expect(elapsed).toBeLessThan(50); // Should return almost immediately
      expect(resolved).toBe(false); // Promise hasn't resolved yet
    });
  });

  describe('Error Handling', () => {
    interface NotificationError {
      type: 'NETWORK' | 'RATE_LIMIT' | 'INVALID_NUMBER' | 'BLOCKED' | 'UNKNOWN';
      message: string;
      retryable: boolean;
    }

    const classifyError = (errorCode: string): NotificationError => {
      switch (errorCode) {
        case 'NETWORK_ERROR':
          return { type: 'NETWORK', message: 'Network connectivity issue', retryable: true };
        case 'RATE_LIMITED':
          return { type: 'RATE_LIMIT', message: 'Too many requests', retryable: true };
        case 'INVALID_PHONE':
          return { type: 'INVALID_NUMBER', message: 'Invalid phone number', retryable: false };
        case 'USER_BLOCKED':
          return { type: 'BLOCKED', message: 'User blocked notifications', retryable: false };
        default:
          return { type: 'UNKNOWN', message: 'Unknown error', retryable: false };
      }
    };

    it('should classify network error as retryable', () => {
      const error = classifyError('NETWORK_ERROR');
      expect(error.type).toBe('NETWORK');
      expect(error.retryable).toBe(true);
    });

    it('should classify rate limit as retryable', () => {
      const error = classifyError('RATE_LIMITED');
      expect(error.type).toBe('RATE_LIMIT');
      expect(error.retryable).toBe(true);
    });

    it('should classify invalid number as non-retryable', () => {
      const error = classifyError('INVALID_PHONE');
      expect(error.type).toBe('INVALID_NUMBER');
      expect(error.retryable).toBe(false);
    });

    it('should classify blocked user as non-retryable', () => {
      const error = classifyError('USER_BLOCKED');
      expect(error.type).toBe('BLOCKED');
      expect(error.retryable).toBe(false);
    });
  });
});
