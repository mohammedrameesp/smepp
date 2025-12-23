import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';
import logger from '@/lib/log';
import { formatErrorResponse } from '@/lib/http/errors';
import { z } from 'zod';

const brandingSchema = z.object({
  logoUrl: z.string().url().optional(),
  primaryColor: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  secondaryColor: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  companyName: z.string().max(100).optional(),
});

export async function GET() {
  try {
    const settings = await prisma.appSetting.findMany({
      where: {
        key: {
          in: ['branding.logoUrl', 'branding.primaryColor', 'branding.secondaryColor', 'branding.companyName']
        }
      }
    });

    const branding = settings.reduce((acc, setting) => {
      const key = setting.key.replace('branding.', '');
      acc[key] = setting.value;
      return acc;
    }, {} as Record<string, string>);

    return NextResponse.json({
      logoUrl: branding.logoUrl || null,
      primaryColor: branding.primaryColor || '#3B82F6',
      secondaryColor: branding.secondaryColor || '#6B7280',
      companyName: branding.companyName || 'Be Creative Portal',
    });

  } catch (error) {
    logger.error({ error }, 'Failed to fetch branding settings');
    return formatErrorResponse('Failed to fetch branding settings', 500);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== Role.ADMIN) {
      return formatErrorResponse('Admin access required', 403);
    }

    const body = await request.json();
    const validation = brandingSchema.safeParse(body);
    
    if (!validation.success) {
      return formatErrorResponse('Invalid branding data', 400, validation.error.issues);
    }

    const { logoUrl, primaryColor, secondaryColor, companyName } = validation.data;

    // Update each setting if provided
    const updates = [];
    
    if (logoUrl !== undefined) {
      updates.push(
        prisma.appSetting.upsert({
          where: { key: 'branding.logoUrl' },
          update: { value: logoUrl },
          create: { key: 'branding.logoUrl', value: logoUrl },
        })
      );
    }
    
    if (primaryColor !== undefined) {
      updates.push(
        prisma.appSetting.upsert({
          where: { key: 'branding.primaryColor' },
          update: { value: primaryColor },
          create: { key: 'branding.primaryColor', value: primaryColor },
        })
      );
    }
    
    if (secondaryColor !== undefined) {
      updates.push(
        prisma.appSetting.upsert({
          where: { key: 'branding.secondaryColor' },
          update: { value: secondaryColor },
          create: { key: 'branding.secondaryColor', value: secondaryColor },
        })
      );
    }
    
    if (companyName !== undefined) {
      updates.push(
        prisma.appSetting.upsert({
          where: { key: 'branding.companyName' },
          update: { value: companyName },
          create: { key: 'branding.companyName', value: companyName },
        })
      );
    }

    await prisma.$transaction(updates);

    // Log the activity
    await prisma.activityLog.create({
      data: {
        actorUserId: session.user.id,
        action: 'BRANDING_UPDATED',
        payload: validation.data,
      },
    });

    logger.info({ 
      userId: session.user.id, 
      settings: validation.data 
    }, 'Branding settings updated');

    return NextResponse.json({ success: true });

  } catch (error) {
    logger.error({ error }, 'Failed to update branding settings');
    return formatErrorResponse('Failed to update branding settings', 500);
  }
}