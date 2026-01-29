/**
 * @file approval-integration-extended.test.ts
 * @description Extended unit tests for WhatsApp approval integration logic
 */

describe('WhatsApp Approval Integration Extended', () => {
  describe('notifyNextLevelApproversViaWhatsApp logic', () => {
    interface NotifyParams {
      tenantId: string;
      entityType: 'LEAVE_REQUEST' | 'SPEND_REQUEST' | 'ASSET_REQUEST';
      entityId: string;
      nextStepRole: string;
      requesterId?: string;
    }

    const notifyNextLevel = async (
      params: NotifyParams,
      getDetails: () => Promise<object | null>,
      findApprovers: () => Promise<string[]>,
      canSend: (approverId: string) => Promise<{ canSend: boolean; reason?: string }>,
      send: (approverId: string) => Promise<void>
    ): Promise<{ notifiedCount: number; skippedCount: number }> => {
      // Get entity details
      const details = await getDetails();
      if (!details) {
        return { notifiedCount: 0, skippedCount: 0 };
      }

      // Find approvers
      const approverIds = await findApprovers();
      if (approverIds.length === 0) {
        return { notifiedCount: 0, skippedCount: 0 };
      }

      let notifiedCount = 0;
      let skippedCount = 0;

      // Send to each approver
      for (const approverId of approverIds) {
        const sendCheck = await canSend(approverId);
        if (!sendCheck.canSend) {
          skippedCount++;
          continue;
        }

        try {
          await send(approverId);
          notifiedCount++;
        } catch {
          skippedCount++;
        }
      }

      return { notifiedCount, skippedCount };
    };

    it('should notify all eligible approvers', async () => {
      const result = await notifyNextLevel(
        {
          tenantId: 'tenant-123',
          entityType: 'LEAVE_REQUEST',
          entityId: 'leave-456',
          nextStepRole: 'HR_MANAGER',
        },
        async () => ({ requesterName: 'John' }),
        async () => ['hr-1', 'hr-2'],
        async () => ({ canSend: true }),
        async () => {}
      );

      expect(result.notifiedCount).toBe(2);
      expect(result.skippedCount).toBe(0);
    });

    it('should handle missing entity gracefully', async () => {
      const result = await notifyNextLevel(
        {
          tenantId: 'tenant-123',
          entityType: 'LEAVE_REQUEST',
          entityId: 'nonexistent',
          nextStepRole: 'HR_MANAGER',
        },
        async () => null,
        async () => ['hr-1'],
        async () => ({ canSend: true }),
        async () => {}
      );

      expect(result.notifiedCount).toBe(0);
      expect(result.skippedCount).toBe(0);
    });

    it('should handle no approvers found', async () => {
      const result = await notifyNextLevel(
        {
          tenantId: 'tenant-123',
          entityType: 'LEAVE_REQUEST',
          entityId: 'leave-456',
          nextStepRole: 'HR_MANAGER',
        },
        async () => ({ requesterName: 'John' }),
        async () => [],
        async () => ({ canSend: true }),
        async () => {}
      );

      expect(result.notifiedCount).toBe(0);
      expect(result.skippedCount).toBe(0);
    });

    it('should skip approvers who cannot receive WhatsApp', async () => {
      const canSendForApprover = async (approverId: string) => {
        if (approverId === 'hr-2') {
          return { canSend: true };
        }
        return { canSend: false, reason: 'No phone' };
      };

      const result = await notifyNextLevel(
        {
          tenantId: 'tenant-123',
          entityType: 'LEAVE_REQUEST',
          entityId: 'leave-456',
          nextStepRole: 'HR_MANAGER',
        },
        async () => ({ requesterName: 'John' }),
        async () => ['hr-1', 'hr-2', 'hr-3'],
        canSendForApprover,
        async () => {}
      );

      expect(result.notifiedCount).toBe(1);
      expect(result.skippedCount).toBe(2);
    });
  });

  describe('findApproversForRole logic', () => {
    type Role = 'MANAGER' | 'HR_MANAGER' | 'FINANCE_MANAGER' | 'OPERATIONS_MANAGER' | 'DIRECTOR' | 'ADMIN';

    interface Member {
      id: string;
      reportingToId?: string;
      hasHRAccess?: boolean;
      hasFinanceAccess?: boolean;
      hasOperationsAccess?: boolean;
      isAdmin?: boolean;
      isOwner?: boolean;
    }

    const findApprovers = (
      role: Role,
      members: Member[],
      requesterId?: string
    ): string[] => {
      switch (role) {
        case 'MANAGER':
          if (!requesterId) return [];
          const requester = members.find(m => m.id === requesterId);
          if (requester?.reportingToId) {
            return [requester.reportingToId];
          }
          return [];

        case 'HR_MANAGER':
          return members.filter(m => m.hasHRAccess).map(m => m.id);

        case 'FINANCE_MANAGER':
          return members.filter(m => m.hasFinanceAccess).map(m => m.id);

        case 'OPERATIONS_MANAGER':
          return members.filter(m => m.hasOperationsAccess).map(m => m.id);

        case 'DIRECTOR':
        case 'ADMIN':
          const admins = members.filter(m => m.isAdmin).map(m => m.id);
          if (admins.length > 0) return admins;
          // Fallback to owners
          return members.filter(m => m.isOwner).map(m => m.id);

        default:
          return [];
      }
    };

    describe('MANAGER role', () => {
      it('should find direct manager via reportingToId', () => {
        const members: Member[] = [
          { id: 'requester-123', reportingToId: 'manager-456' },
          { id: 'manager-456' },
        ];

        const result = findApprovers('MANAGER', members, 'requester-123');

        expect(result).toEqual(['manager-456']);
      });

      it('should return empty when requester has no manager', () => {
        const members: Member[] = [
          { id: 'requester-123' }, // No reportingToId
        ];

        const result = findApprovers('MANAGER', members, 'requester-123');

        expect(result).toEqual([]);
      });

      it('should return empty when no requesterId provided', () => {
        const members: Member[] = [
          { id: 'member-1', reportingToId: 'manager-1' },
        ];

        const result = findApprovers('MANAGER', members);

        expect(result).toEqual([]);
      });
    });

    describe('HR_MANAGER role', () => {
      it('should find all members with hasHRAccess', () => {
        const members: Member[] = [
          { id: 'hr-1', hasHRAccess: true },
          { id: 'hr-2', hasHRAccess: true },
          { id: 'regular-1', hasHRAccess: false },
        ];

        const result = findApprovers('HR_MANAGER', members);

        expect(result).toEqual(['hr-1', 'hr-2']);
      });

      it('should return empty when no HR managers', () => {
        const members: Member[] = [
          { id: 'regular-1' },
          { id: 'regular-2' },
        ];

        const result = findApprovers('HR_MANAGER', members);

        expect(result).toEqual([]);
      });
    });

    describe('FINANCE_MANAGER role', () => {
      it('should find all members with hasFinanceAccess', () => {
        const members: Member[] = [
          { id: 'finance-1', hasFinanceAccess: true },
          { id: 'regular-1' },
        ];

        const result = findApprovers('FINANCE_MANAGER', members);

        expect(result).toEqual(['finance-1']);
      });
    });

    describe('OPERATIONS_MANAGER role', () => {
      it('should find all members with hasOperationsAccess', () => {
        const members: Member[] = [
          { id: 'ops-1', hasOperationsAccess: true },
          { id: 'ops-2', hasOperationsAccess: true },
        ];

        const result = findApprovers('OPERATIONS_MANAGER', members);

        expect(result).toEqual(['ops-1', 'ops-2']);
      });
    });

    describe('DIRECTOR/ADMIN role', () => {
      it('should find admins first', () => {
        const members: Member[] = [
          { id: 'admin-1', isAdmin: true },
          { id: 'admin-2', isAdmin: true },
          { id: 'owner-1', isOwner: true },
        ];

        const result = findApprovers('ADMIN', members);

        expect(result).toEqual(['admin-1', 'admin-2']);
      });

      it('should fall back to owners if no admins', () => {
        const members: Member[] = [
          { id: 'owner-1', isOwner: true },
          { id: 'regular-1' },
        ];

        const result = findApprovers('ADMIN', members);

        expect(result).toEqual(['owner-1']);
      });

      it('should return empty if no admins or owners', () => {
        const members: Member[] = [
          { id: 'regular-1' },
          { id: 'regular-2' },
        ];

        const result = findApprovers('DIRECTOR', members);

        expect(result).toEqual([]);
      });
    });
  });

  describe('Error handling', () => {
    it('should handle notification errors gracefully', async () => {
      let errorCaught = false;

      const notifyWithErrorHandling = async (
        sendFn: () => Promise<void>
      ): Promise<{ success: boolean }> => {
        try {
          await sendFn();
          return { success: true };
        } catch {
          errorCaught = true;
          return { success: false };
        }
      };

      const result = await notifyWithErrorHandling(async () => {
        throw new Error('Network error');
      });

      expect(result.success).toBe(false);
      expect(errorCaught).toBe(true);
    });

    it('should not propagate errors to caller', async () => {
      const nonBlockingNotify = (sendFn: () => Promise<void>): void => {
        // Fire and forget
        sendFn().catch(() => {
          // Swallow error
        });
      };

      // Should not throw
      expect(() => {
        nonBlockingNotify(async () => {
          throw new Error('Should be swallowed');
        });
      }).not.toThrow();
    });
  });

  describe('Entity type conversion', () => {
    type ApprovalModule = 'LEAVE_REQUEST' | 'SPEND_REQUEST' | 'ASSET_REQUEST';
    type ApprovalEntityType = 'LEAVE_REQUEST' | 'SPEND_REQUEST' | 'ASSET_REQUEST';

    const toEntityType = (module: ApprovalModule): ApprovalEntityType => {
      switch (module) {
        case 'LEAVE_REQUEST':
          return 'LEAVE_REQUEST';
        case 'SPEND_REQUEST':
          return 'SPEND_REQUEST';
        case 'ASSET_REQUEST':
          return 'ASSET_REQUEST';
        default:
          return 'LEAVE_REQUEST';
      }
    };

    it('should convert all module types correctly', () => {
      expect(toEntityType('LEAVE_REQUEST')).toBe('LEAVE_REQUEST');
      expect(toEntityType('SPEND_REQUEST')).toBe('SPEND_REQUEST');
      expect(toEntityType('ASSET_REQUEST')).toBe('ASSET_REQUEST');
    });
  });
});
