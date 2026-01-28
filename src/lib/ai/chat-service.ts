import OpenAI from 'openai';
import { prisma } from '@/lib/core/prisma';
import { chatFunctions, executeFunction } from './functions';
import { canAccessFunction } from './permissions';
import { Role } from '@prisma/client';
import { AI_MODEL, MODEL_PRICING, AI_ENV, validateOpenAIConfig } from './config';

/**
 * Sanitize conversation title to prevent XSS
 * Escapes HTML entities and truncates to a reasonable length
 */
function sanitizeTitle(title: string): string {
  // Escape HTML entities
  const escaped = title
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  // Truncate to 100 characters
  return escaped.slice(0, 100);
}

/**
 * Get chat retention period for an organization
 * Returns number of days, or null for no automatic expiration
 */
async function getOrganizationRetentionDays(tenantId: string): Promise<number | null> {
  const org = await prisma.organization.findUnique({
    where: { id: tenantId },
    select: { chatRetentionDays: true },
  });

  // Return org setting if set, otherwise default to 90 days
  // Return null if explicitly set to 0 (no automatic deletion)
  if (org?.chatRetentionDays === 0) {
    return null;
  }
  return org?.chatRetentionDays || 90;
}

// Lazy initialization to avoid build-time errors when OPENAI_API_KEY is not set
let openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openai) {
    validateOpenAIConfig();
    openai = new OpenAI({
      apiKey: AI_ENV.OPENAI_API_KEY,
    });
  }
  return openai;
}

export interface ChatContext {
  userId: string;
  userRole: Role;
  tenantId: string;
  tenantSlug: string;
}

export interface ChatResponse {
  message: string;
  conversationId: string;
  functionCalls?: {
    name: string;
    args: Record<string, unknown>;
    result: unknown;
  }[];
}

/**
 * Calculate cost in USD for token usage
 */
function calculateCost(promptTokens: number, completionTokens: number, model: string): number {
  const pricing = MODEL_PRICING[model] || MODEL_PRICING[AI_MODEL];
  return (promptTokens * pricing.input) + (completionTokens * pricing.output);
}

/**
 * Record AI usage for billing/tracking purposes
 */
async function recordUsage(
  tenantId: string,
  userId: string,
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number },
  model: string
): Promise<void> {
  try {
    await prisma.aIChatUsage.create({
      data: {
        tenantId,
        memberId: userId,
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
        model,
        costUsd: calculateCost(usage.prompt_tokens, usage.completion_tokens, model),
      },
    });
  } catch (error) {
    // Log but don't fail the chat request if usage tracking fails
    console.error('Failed to record AI usage:', error);
  }
}

/**
 * Build a role-aware system prompt for the AI assistant
 * Provides different capabilities and guidance based on user's role
 */
function buildSystemPrompt(context: ChatContext): string {
  const isAdmin = context.userRole === Role.DIRECTOR;

  return `You are Durj Assistant, an AI helper for business management. You help users query company data efficiently.

## Your Capabilities

Employees & HR
- Search employees by name, email, or employee code
- View employee details, leave balances, pending leave requests
- View expiring documents (QID, passport, health card, visa)
- Get leave type policies and entitlements
${isAdmin ? '- View salary details and payroll information' : ''}
${isAdmin ? '- View employee loans and advances' : ''}

Assets & Equipment
- Search assets by model, brand, type, or status
- View assets assigned to employees
- Check depreciation values
- View maintenance history for assets

Subscriptions & Software
- List subscriptions, costs, and renewal dates
- Find who uses specific services

Spend Requests & Suppliers
- View spend request summaries and status
- Search suppliers by name or category

Organization
- View organization settings (timezone, currency, enabled modules)
${isAdmin ? `
Admin Access
You have admin privileges. You can access sensitive data including:
- Employee salaries and allowances
- Payroll runs and totals
- Employee loans and advances
` : `
Access Level
You have standard access. Salary, payroll, and loan data requires admin privileges.
`}
Response Style
- Write naturally without markdown formatting (no **bold** or bullet lists)
- Keep responses concise and friendly
- Format numbers with commas (15,000 QAR)
- Format dates naturally (January 15, 2024)
- Only show asset tags or IDs if specifically asked

Search Tips
- Assets: Search by brand (Dell, Apple) or type (Laptop, Monitor)
- Employees: Use name or employee code
- Subscriptions: Use service name (Microsoft 365, Slack)
- Suppliers: Search by name or category

Limitations
- Query only - cannot create, update, or delete data
- Results limited to prevent overload
- Rate limits apply to protect resources`;
}

/**
 * Process a chat message and return a response
 */
export async function processChat(
  message: string,
  context: ChatContext,
  conversationId?: string
): Promise<ChatResponse> {
  // Get or create conversation
  let conversation = conversationId
    ? await prisma.chatConversation.findUnique({
        where: { id: conversationId },
        include: { messages: { orderBy: { createdAt: 'asc' }, take: 20 } },
      })
    : null;

  if (!conversation) {
    // Calculate expiration based on organization settings or default (90 days)
    const retentionDays = await getOrganizationRetentionDays(context.tenantId);
    const expiresAt = retentionDays
      ? new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000)
      : null;

    const created = await prisma.chatConversation.create({
      data: {
        tenantId: context.tenantId,
        memberId: context.userId,
        title: sanitizeTitle(message), // Use sanitized first message as title
        expiresAt,
      },
    });
    conversation = { ...created, messages: [] };
  }

  // Save user message
  await prisma.chatMessage.create({
    data: {
      conversationId: conversation.id,
      role: 'user',
      content: message,
    },
  });

  // Build message history for context
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: buildSystemPrompt(context) },
    ...conversation.messages.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user', content: message },
  ];

  // Filter functions based on user permissions
  const availableFunctions = chatFunctions.filter((fn) =>
    canAccessFunction(fn.name, context.userRole)
  );

  // Call OpenAI with function calling
  const response = await getOpenAI().chat.completions.create({
    model: AI_MODEL,
    messages,
    tools: availableFunctions.map((fn) => ({
      type: 'function' as const,
      function: {
        name: fn.name,
        description: fn.description,
        parameters: fn.parameters,
      },
    })),
    tool_choice: 'auto',
  });

  // Record usage from initial API call
  if (response.usage) {
    await recordUsage(context.tenantId, context.userId, response.usage, AI_MODEL);
  }

  const responseMessage = response.choices[0].message;
  const functionCalls: ChatResponse['functionCalls'] = [];

  // Handle function calls
  if (responseMessage.tool_calls) {
    const toolResults: OpenAI.Chat.ChatCompletionMessageParam[] = [];

    for (const toolCall of responseMessage.tool_calls) {
      if (toolCall.type !== 'function') continue;
      const functionName = toolCall.function.name;
      const functionArgs = JSON.parse(toolCall.function.arguments);

      // Execute the function
      const result = await executeFunction(functionName, functionArgs, context);

      functionCalls.push({
        name: functionName,
        args: functionArgs,
        result,
      });

      toolResults.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: JSON.stringify(result),
      });
    }

    // Get final response with function results
    const finalResponse = await getOpenAI().chat.completions.create({
      model: AI_MODEL,
      messages: [
        ...messages,
        responseMessage,
        ...toolResults,
      ],
    });

    // Record usage from final API call
    if (finalResponse.usage) {
      await recordUsage(context.tenantId, context.userId, finalResponse.usage, AI_MODEL);
    }

    const finalMessage = finalResponse.choices[0].message.content || 'I was unable to process that request.';

    // Save assistant response
    await prisma.chatMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'assistant',
        content: finalMessage,
        functionCalls: functionCalls.length > 0 ? JSON.parse(JSON.stringify(functionCalls)) : undefined,
      },
    });

    return {
      message: finalMessage,
      conversationId: conversation.id,
      functionCalls,
    };
  }

  // No function calls, just a regular response
  const assistantMessage = responseMessage.content || 'I was unable to process that request.';

  await prisma.chatMessage.create({
    data: {
      conversationId: conversation.id,
      role: 'assistant',
      content: assistantMessage,
    },
  });

  return {
    message: assistantMessage,
    conversationId: conversation.id,
  };
}

/**
 * Get conversation history for a user
 */
export async function getConversations(memberId: string, tenantId: string) {
  return prisma.chatConversation.findMany({
    where: { memberId, tenantId },
    orderBy: { updatedAt: 'desc' },
    take: 20,
    select: {
      id: true,
      title: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

/**
 * Get messages for a conversation with pagination support
 */
export async function getConversationMessages(
  conversationId: string,
  memberId: string,
  options?: {
    cursor?: string; // Message ID to start after
    limit?: number;  // Number of messages to fetch (default 50, max 100)
  }
) {
  const limit = Math.min(options?.limit || 50, 100);

  const conversation = await prisma.chatConversation.findUnique({
    where: { id: conversationId },
    select: {
      id: true,
      tenantId: true,
      memberId: true,
      title: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!conversation || conversation.memberId !== memberId) {
    return null;
  }

  // Fetch messages with cursor-based pagination
  const messages = await prisma.chatMessage.findMany({
    where: {
      conversationId,
      ...(options?.cursor && {
        id: { gt: options.cursor },
      }),
    },
    orderBy: { createdAt: 'asc' },
    take: limit + 1, // Fetch one extra to check if there are more
  });

  const hasMore = messages.length > limit;
  const paginatedMessages = hasMore ? messages.slice(0, limit) : messages;
  const nextCursor = hasMore && paginatedMessages.length > 0
    ? paginatedMessages[paginatedMessages.length - 1].id
    : undefined;

  return {
    ...conversation,
    messages: paginatedMessages,
    pagination: {
      hasMore,
      nextCursor,
      limit,
    },
  };
}

/**
 * Delete a conversation
 */
export async function deleteConversation(conversationId: string, memberId: string) {
  const conversation = await prisma.chatConversation.findUnique({
    where: { id: conversationId },
  });

  if (!conversation || conversation.memberId !== memberId) {
    return false;
  }

  await prisma.chatConversation.delete({
    where: { id: conversationId },
  });

  return true;
}

/**
 * Process a chat message with streaming response
 * Returns an async generator that yields chunks of the response
 */
export async function* processChatStream(
  message: string,
  context: ChatContext,
  conversationId?: string
): AsyncGenerator<{ type: 'chunk' | 'done' | 'error'; content?: string; conversationId?: string; functionCalls?: ChatResponse['functionCalls'] }> {
  // Get or create conversation
  let conversation = conversationId
    ? await prisma.chatConversation.findUnique({
        where: { id: conversationId },
        include: { messages: { orderBy: { createdAt: 'asc' }, take: 20 } },
      })
    : null;

  if (!conversation) {
    const created = await prisma.chatConversation.create({
      data: {
        tenantId: context.tenantId,
        memberId: context.userId,
        title: sanitizeTitle(message),
      },
    });
    conversation = { ...created, messages: [] };
  }

  // Save user message
  await prisma.chatMessage.create({
    data: {
      conversationId: conversation.id,
      role: 'user',
      content: message,
    },
  });

  // Build message history for context
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: buildSystemPrompt(context) },
    ...conversation.messages.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user', content: message },
  ];

  // Filter functions based on user permissions
  const availableFunctions = chatFunctions.filter((fn) =>
    canAccessFunction(fn.name, context.userRole)
  );

  try {
    // First, call OpenAI without streaming to check for function calls
    const initialResponse = await getOpenAI().chat.completions.create({
      model: AI_MODEL,
      messages,
      tools: availableFunctions.map((fn) => ({
        type: 'function' as const,
        function: {
          name: fn.name,
          description: fn.description,
          parameters: fn.parameters,
        },
      })),
      tool_choice: 'auto',
    });

    const responseMessage = initialResponse.choices[0].message;
    const functionCalls: ChatResponse['functionCalls'] = [];

    // Handle function calls if present
    if (responseMessage.tool_calls) {
      const toolResults: OpenAI.Chat.ChatCompletionMessageParam[] = [];

      for (const toolCall of responseMessage.tool_calls) {
        if (toolCall.type !== 'function') continue;
        const functionName = toolCall.function.name;
        const functionArgs = JSON.parse(toolCall.function.arguments);

        const result = await executeFunction(functionName, functionArgs, context);

        functionCalls.push({
          name: functionName,
          args: functionArgs,
          result,
        });

        toolResults.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(result),
        });
      }

      // Now stream the final response
      const stream = await getOpenAI().chat.completions.create({
        model: AI_MODEL,
        messages: [...messages, responseMessage, ...toolResults],
        stream: true,
      });

      let fullContent = '';
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          fullContent += content;
          yield { type: 'chunk', content };
        }
      }

      // Save the complete response
      await prisma.chatMessage.create({
        data: {
          conversationId: conversation.id,
          role: 'assistant',
          content: fullContent,
          functionCalls: functionCalls.length > 0 ? JSON.parse(JSON.stringify(functionCalls)) : undefined,
        },
      });

      yield { type: 'done', conversationId: conversation.id, functionCalls };
    } else {
      // No function calls, stream the response directly
      const stream = await getOpenAI().chat.completions.create({
        model: AI_MODEL,
        messages,
        stream: true,
      });

      let fullContent = '';
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          fullContent += content;
          yield { type: 'chunk', content };
        }
      }

      // Save the complete response
      await prisma.chatMessage.create({
        data: {
          conversationId: conversation.id,
          role: 'assistant',
          content: fullContent,
        },
      });

      yield { type: 'done', conversationId: conversation.id };
    }
  } catch (error) {
    yield { type: 'error', content: error instanceof Error ? error.message : 'Unknown error' };
  }
}

