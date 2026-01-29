/**
 * @file client.test.ts
 * @description Unit tests for WhatsApp client
 */

import { prisma } from '@/lib/core/prisma';

// Mock Prisma
jest.mock('@/lib/core/prisma', () => ({
  prisma: {
    whatsAppMessageLog: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  },
}));

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('WhatsApp Client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockConfig = {
    phoneNumberId: '123456789',
    businessAccountId: '987654321',
    accessToken: 'test-access-token',
    webhookVerifyToken: 'verify-token',
    isActive: true,
  };

  describe('WhatsAppClient', () => {
    describe('sendTemplateMessage', () => {
      it('should send template message successfully', async () => {
        const { WhatsAppClient } = await import('@/lib/whatsapp/client');

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              messaging_product: 'whatsapp',
              contacts: [{ input: '+97455123456', wa_id: '97455123456' }],
              messages: [{ id: 'wamid.123' }],
            }),
        });

        const client = new WhatsAppClient(mockConfig);
        const result = await client.sendTemplateMessage({
          to: '+97455123456',
          templateName: 'leave_approval_request',
          languageCode: 'en',
          components: [
            {
              type: 'body',
              parameters: [{ type: 'text', text: 'John Doe' }],
            },
          ],
        });

        expect(result.messages[0].id).toBe('wamid.123');
        expect(mockFetch).toHaveBeenCalledWith(
          'https://graph.facebook.com/v18.0/123456789/messages',
          expect.objectContaining({
            method: 'POST',
            headers: {
              Authorization: 'Bearer test-access-token',
              'Content-Type': 'application/json',
            },
          })
        );
      });

      it('should strip + prefix from phone number', async () => {
        const { WhatsAppClient } = await import('@/lib/whatsapp/client');

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              messaging_product: 'whatsapp',
              contacts: [{ input: '97455123456', wa_id: '97455123456' }],
              messages: [{ id: 'wamid.123' }],
            }),
        });

        const client = new WhatsAppClient(mockConfig);
        await client.sendTemplateMessage({
          to: '+97455123456',
          templateName: 'test_template',
          languageCode: 'en',
          components: [],
        });

        const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(callBody.to).toBe('97455123456'); // No + prefix
      });

      it('should throw WhatsAppApiError on API failure', async () => {
        const { WhatsAppClient, WhatsAppApiError } = await import('@/lib/whatsapp/client');

        mockFetch.mockResolvedValueOnce({
          ok: false,
          statusText: 'Bad Request',
          json: () =>
            Promise.resolve({
              error: {
                message: 'Invalid template name',
                code: 132000,
              },
            }),
        });

        const client = new WhatsAppClient(mockConfig);

        await expect(
          client.sendTemplateMessage({
            to: '+97455123456',
            templateName: 'invalid_template',
            languageCode: 'en',
            components: [],
          })
        ).rejects.toThrow(WhatsAppApiError);
      });

      it('should include error code in WhatsAppApiError', async () => {
        const { WhatsAppClient, WhatsAppApiError } = await import('@/lib/whatsapp/client');

        mockFetch.mockResolvedValueOnce({
          ok: false,
          statusText: 'Bad Request',
          json: () =>
            Promise.resolve({
              error: {
                message: 'Rate limited',
                code: 131030,
              },
            }),
        });

        const client = new WhatsAppClient(mockConfig);

        try {
          await client.sendTemplateMessage({
            to: '+97455123456',
            templateName: 'test',
            languageCode: 'en',
            components: [],
          });
          fail('Should have thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(WhatsAppApiError);
          expect((error as InstanceType<typeof WhatsAppApiError>).code).toBe(131030);
        }
      });
    });

    describe('sendTextMessage', () => {
      it('should send text message successfully', async () => {
        const { WhatsAppClient } = await import('@/lib/whatsapp/client');

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              messaging_product: 'whatsapp',
              contacts: [{ input: '97455123456', wa_id: '97455123456' }],
              messages: [{ id: 'wamid.456' }],
            }),
        });

        const client = new WhatsAppClient(mockConfig);
        const result = await client.sendTextMessage('+97455123456', 'Hello World');

        expect(result.messages[0].id).toBe('wamid.456');

        const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(callBody.type).toBe('text');
        expect(callBody.text.body).toBe('Hello World');
      });

      it('should throw WhatsAppApiError on text message failure', async () => {
        const { WhatsAppClient, WhatsAppApiError } = await import('@/lib/whatsapp/client');

        mockFetch.mockResolvedValueOnce({
          ok: false,
          statusText: 'Forbidden',
          json: () =>
            Promise.resolve({
              error: {
                message: 'Number blocked',
                code: 131026,
              },
            }),
        });

        const client = new WhatsAppClient(mockConfig);

        await expect(client.sendTextMessage('+97455123456', 'Test')).rejects.toThrow(
          WhatsAppApiError
        );
      });
    });

    describe('testConnection', () => {
      it('should return true on successful connection', async () => {
        const { WhatsAppClient } = await import('@/lib/whatsapp/client');

        mockFetch.mockResolvedValueOnce({
          ok: true,
        });

        const client = new WhatsAppClient(mockConfig);
        const result = await client.testConnection();

        expect(result).toBe(true);
        expect(mockFetch).toHaveBeenCalledWith(
          'https://graph.facebook.com/v18.0/123456789',
          expect.objectContaining({
            method: 'GET',
          })
        );
      });

      it('should return false on connection failure', async () => {
        const { WhatsAppClient } = await import('@/lib/whatsapp/client');

        mockFetch.mockResolvedValueOnce({
          ok: false,
        });

        const client = new WhatsAppClient(mockConfig);
        const result = await client.testConnection();

        expect(result).toBe(false);
      });

      it('should return false on network error', async () => {
        const { WhatsAppClient } = await import('@/lib/whatsapp/client');

        mockFetch.mockRejectedValueOnce(new Error('Network error'));

        const client = new WhatsAppClient(mockConfig);
        const result = await client.testConnection();

        expect(result).toBe(false);
      });
    });

    describe('getPhoneNumbers', () => {
      it('should return phone numbers from business account', async () => {
        const { WhatsAppClient } = await import('@/lib/whatsapp/client');

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              data: [
                { id: '111', display_phone_number: '+974 5551 1111' },
                { id: '222', display_phone_number: '+974 5551 2222' },
              ],
            }),
        });

        const client = new WhatsAppClient(mockConfig);
        const result = await client.getPhoneNumbers();

        expect(result).toHaveLength(2);
        expect(result[0].id).toBe('111');
        expect(result[1].display_phone_number).toBe('+974 5551 2222');
      });

      it('should return empty array when no phone numbers', async () => {
        const { WhatsAppClient } = await import('@/lib/whatsapp/client');

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: null }),
        });

        const client = new WhatsAppClient(mockConfig);
        const result = await client.getPhoneNumbers();

        expect(result).toEqual([]);
      });
    });
  });

  describe('logWhatsAppMessage', () => {
    it('should create message log record', async () => {
      const { logWhatsAppMessage } = await import('@/lib/whatsapp/client');

      (mockPrisma.whatsAppMessageLog.create as jest.Mock).mockResolvedValue({
        id: 'log-1',
      });

      await logWhatsAppMessage({
        tenantId: 'tenant-123',
        messageId: 'wamid.123',
        recipientPhone: '+97455123456',
        templateName: 'leave_approval_request',
        status: 'sent',
        entityType: 'LEAVE_REQUEST',
        entityId: 'leave-456',
        configSource: 'PLATFORM',
      });

      expect(mockPrisma.whatsAppMessageLog.create).toHaveBeenCalledWith({
        data: {
          tenantId: 'tenant-123',
          messageId: 'wamid.123',
          recipientPhone: '+97455123456',
          templateName: 'leave_approval_request',
          status: 'sent',
          errorMessage: undefined,
          entityType: 'LEAVE_REQUEST',
          entityId: 'leave-456',
          configSource: 'PLATFORM',
        },
      });
    });

    it('should log failed message with error', async () => {
      const { logWhatsAppMessage } = await import('@/lib/whatsapp/client');

      (mockPrisma.whatsAppMessageLog.create as jest.Mock).mockResolvedValue({
        id: 'log-2',
      });

      await logWhatsAppMessage({
        tenantId: 'tenant-123',
        recipientPhone: '+97455123456',
        templateName: 'leave_approval_request',
        status: 'failed',
        errorMessage: 'Rate limited',
      });

      expect(mockPrisma.whatsAppMessageLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: 'failed',
          errorMessage: 'Rate limited',
        }),
      });
    });
  });

  describe('updateMessageStatus', () => {
    it('should update existing message status', async () => {
      const { updateMessageStatus } = await import('@/lib/whatsapp/client');

      (mockPrisma.whatsAppMessageLog.findFirst as jest.Mock).mockResolvedValue({
        id: 'log-1',
        messageId: 'wamid.123',
        status: 'sent',
      });
      (mockPrisma.whatsAppMessageLog.update as jest.Mock).mockResolvedValue({
        id: 'log-1',
        status: 'delivered',
      });

      await updateMessageStatus('wamid.123', 'delivered');

      expect(mockPrisma.whatsAppMessageLog.findFirst).toHaveBeenCalledWith({
        where: { messageId: 'wamid.123' },
      });
      expect(mockPrisma.whatsAppMessageLog.update).toHaveBeenCalledWith({
        where: { id: 'log-1' },
        data: { status: 'delivered', errorMessage: undefined },
      });
    });

    it('should update status with error message on failure', async () => {
      const { updateMessageStatus } = await import('@/lib/whatsapp/client');

      (mockPrisma.whatsAppMessageLog.findFirst as jest.Mock).mockResolvedValue({
        id: 'log-1',
        messageId: 'wamid.123',
        status: 'sent',
      });
      (mockPrisma.whatsAppMessageLog.update as jest.Mock).mockResolvedValue({
        id: 'log-1',
        status: 'failed',
      });

      await updateMessageStatus('wamid.123', 'failed', 'Delivery failed');

      expect(mockPrisma.whatsAppMessageLog.update).toHaveBeenCalledWith({
        where: { id: 'log-1' },
        data: { status: 'failed', errorMessage: 'Delivery failed' },
      });
    });

    it('should not update if message not found', async () => {
      const { updateMessageStatus } = await import('@/lib/whatsapp/client');

      (mockPrisma.whatsAppMessageLog.findFirst as jest.Mock).mockResolvedValue(null);

      await updateMessageStatus('nonexistent-id', 'delivered');

      expect(mockPrisma.whatsAppMessageLog.update).not.toHaveBeenCalled();
    });
  });

  describe('WhatsAppApiError', () => {
    it('should include error code and details', async () => {
      const { WhatsAppApiError } = await import('@/lib/whatsapp/client');

      const error = new WhatsAppApiError('Test error', 12345, { extra: 'data' });

      expect(error.message).toBe('Test error');
      expect(error.code).toBe(12345);
      expect(error.details).toEqual({ extra: 'data' });
      expect(error.name).toBe('WhatsAppApiError');
    });

    it('should work without code and details', async () => {
      const { WhatsAppApiError } = await import('@/lib/whatsapp/client');

      const error = new WhatsAppApiError('Simple error');

      expect(error.message).toBe('Simple error');
      expect(error.code).toBeUndefined();
      expect(error.details).toBeUndefined();
    });
  });
});
