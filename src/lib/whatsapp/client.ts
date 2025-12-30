/**
 * WhatsApp Business API Client
 *
 * Handles communication with Meta Cloud API for sending
 * WhatsApp template messages.
 */

import { prisma } from '@/lib/core/prisma';
import type {
  WhatsAppTemplateMessage,
  MetaSendMessageResponse,
  WhatsAppConfigData,
} from './types';

const META_API_VERSION = 'v18.0';
const META_API_BASE = `https://graph.facebook.com/${META_API_VERSION}`;

export class WhatsAppClient {
  private config: WhatsAppConfigData;

  constructor(config: WhatsAppConfigData) {
    this.config = config;
  }

  /**
   * Send a template message to a WhatsApp user
   */
  async sendTemplateMessage(
    message: WhatsAppTemplateMessage
  ): Promise<MetaSendMessageResponse> {
    const url = `${META_API_BASE}/${this.config.phoneNumberId}/messages`;

    const body = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: message.to,
      type: 'template',
      template: {
        name: message.templateName,
        language: {
          code: message.languageCode,
        },
        components: message.components,
      },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new WhatsAppApiError(
        `Failed to send message: ${error.error?.message || response.statusText}`,
        error.error?.code,
        error
      );
    }

    return response.json();
  }

  /**
   * Send a simple text message (for confirmations)
   */
  async sendTextMessage(to: string, text: string): Promise<MetaSendMessageResponse> {
    const url = `${META_API_BASE}/${this.config.phoneNumberId}/messages`;

    const body = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: {
        preview_url: false,
        body: text,
      },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new WhatsAppApiError(
        `Failed to send text message: ${error.error?.message || response.statusText}`,
        error.error?.code,
        error
      );
    }

    return response.json();
  }

  /**
   * Test the connection by getting business profile
   */
  async testConnection(): Promise<boolean> {
    const url = `${META_API_BASE}/${this.config.phoneNumberId}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
        },
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get phone number ID from business account
   * Useful for configuration verification
   */
  async getPhoneNumbers(): Promise<Array<{ id: string; display_phone_number: string }>> {
    const url = `${META_API_BASE}/${this.config.businessAccountId}/phone_numbers`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.config.accessToken}`,
      },
    });

    if (!response.ok) {
      throw new WhatsAppApiError('Failed to get phone numbers', undefined, await response.json());
    }

    const data = await response.json();
    return data.data || [];
  }
}

/**
 * Custom error class for WhatsApp API errors
 */
export class WhatsAppApiError extends Error {
  code?: number;
  details?: unknown;

  constructor(message: string, code?: number, details?: unknown) {
    super(message);
    this.name = 'WhatsAppApiError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Log a WhatsApp message for audit trail
 */
export async function logWhatsAppMessage(params: {
  tenantId: string;
  messageId?: string;
  recipientPhone: string;
  templateName: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  errorMessage?: string;
  entityType?: string;
  entityId?: string;
  configSource?: 'PLATFORM' | 'CUSTOM';
}): Promise<void> {
  await prisma.whatsAppMessageLog.create({
    data: {
      tenantId: params.tenantId,
      messageId: params.messageId,
      recipientPhone: params.recipientPhone,
      templateName: params.templateName,
      status: params.status,
      errorMessage: params.errorMessage,
      entityType: params.entityType,
      entityId: params.entityId,
      configSource: params.configSource,
    },
  });
}

/**
 * Update message status from webhook
 */
export async function updateMessageStatus(
  messageId: string,
  status: 'sent' | 'delivered' | 'read' | 'failed',
  errorMessage?: string
): Promise<void> {
  // Find by messageId and update status
  const existing = await prisma.whatsAppMessageLog.findFirst({
    where: { messageId },
  });

  if (existing) {
    await prisma.whatsAppMessageLog.update({
      where: { id: existing.id },
      data: { status, errorMessage },
    });
  }
}
