import OpenAI from 'openai';
import { prisma } from '@/lib/core/prisma';
import { chatFunctions, executeFunction } from './functions';
import { canAccessFunction } from './permissions';
import { Role } from '@prisma/client';

// Lazy initialization to avoid build-time errors when OPENAI_API_KEY is not set
let openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
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

// Model pricing per token (as of Dec 2024)
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'gpt-4o-mini': {
    input: 0.00000015,  // $0.15 per 1M tokens
    output: 0.0000006,  // $0.60 per 1M tokens
  },
  'gpt-4o': {
    input: 0.0000025,   // $2.50 per 1M tokens
    output: 0.00001,    // $10 per 1M tokens
  },
};

/**
 * Calculate cost in USD for token usage
 */
function calculateCost(promptTokens: number, completionTokens: number, model: string): number {
  const pricing = MODEL_PRICING[model] || MODEL_PRICING['gpt-4o-mini'];
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
        userId,
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

const SYSTEM_PROMPT = `You are a helpful AI assistant for Durj, a business management platform. You help users query company data like employees, salaries, subscriptions, and assets.

Response style:
- Write in natural, conversational language. No markdown formatting like **bold** or bullet points.
- Keep responses brief and friendly.
- Format numbers with commas (e.g., 15,000 QAR).
- Format dates naturally (e.g., January 15, 2024).
- Only show asset tags, serial numbers, or technical IDs if the user specifically asks for them.
- When listing items, use simple sentences or short paragraphs, not bullet lists.

Available data you can query:
- Employees: names, roles, departments, joining dates, salaries (you have admin access)
- Subscriptions: software services, who uses them, costs
- Assets: equipment, laptops, devices assigned to employees
- Leave: pending requests, balances
- Documents: expiring QIDs, passports

When searching for assets, try searching by model name, brand, or type. For example, if looking for ThinkPad laptops, search by model or brand.`;

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
    const created = await prisma.chatConversation.create({
      data: {
        tenantId: context.tenantId,
        userId: context.userId,
        title: message.slice(0, 100), // Use first message as title
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
    { role: 'system', content: SYSTEM_PROMPT },
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

  const MODEL = 'gpt-4o-mini';

  // Call OpenAI with function calling
  const response = await getOpenAI().chat.completions.create({
    model: MODEL,
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
    await recordUsage(context.tenantId, context.userId, response.usage, MODEL);
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
      model: MODEL,
      messages: [
        ...messages,
        responseMessage,
        ...toolResults,
      ],
    });

    // Record usage from final API call
    if (finalResponse.usage) {
      await recordUsage(context.tenantId, context.userId, finalResponse.usage, MODEL);
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
export async function getConversations(userId: string, tenantId: string) {
  return prisma.chatConversation.findMany({
    where: { userId, tenantId },
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
 * Get messages for a conversation
 */
export async function getConversationMessages(conversationId: string, userId: string) {
  const conversation = await prisma.chatConversation.findUnique({
    where: { id: conversationId },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!conversation || conversation.userId !== userId) {
    return null;
  }

  return conversation;
}

/**
 * Delete a conversation
 */
export async function deleteConversation(conversationId: string, userId: string) {
  const conversation = await prisma.chatConversation.findUnique({
    where: { id: conversationId },
  });

  if (!conversation || conversation.userId !== userId) {
    return false;
  }

  await prisma.chatConversation.delete({
    where: { id: conversationId },
  });

  return true;
}
