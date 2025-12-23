export interface UploadParams {
  file: File;
  entityType: 'asset' | 'subscription';
  entityId: string;
  projectCode?: string;
}

export interface UploadResponse {
  success: boolean;
  filePath?: string;
  message?: string;
  error?: string;
}

export interface SignedUrlParams {
  path: string;
  expiresInSec?: number;
}

export interface SignedUrlResponse {
  url: string;
  expiresIn: number;
}

export async function getSignedUrl(params: SignedUrlParams): Promise<SignedUrlResponse | { error: string }> {
  try {
    const response = await fetch('/api/storage/signed-url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    return await response.json();
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to get signed URL',
    };
  }
}