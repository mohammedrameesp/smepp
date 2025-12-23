import { sbUpload, sbPublicUrl, sbSignedUrl, sbRemove, UploadParams } from './supabase';

// Generic storage interface - can be swapped for other providers later
export async function storageUpload(params: UploadParams) {
  return sbUpload(params);
}

export async function storagePublicUrl(path: string) {
  return sbPublicUrl(path);
}

export async function storageSignedUrl(path: string, expiresInSec: number = 3600) {
  return sbSignedUrl(path, expiresInSec);
}

export async function storageRemove(path: string) {
  return sbRemove(path);
}

// Helper function to upload a File object
export async function uploadFile(file: File, folder: string): Promise<string> {
  const timestamp = Date.now();
  const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const fileName = `${timestamp}.${extension}`;
  const filePath = `${folder}/${fileName}`;

  // Convert File to Buffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  await storageUpload({
    path: filePath,
    bytes: buffer,
    contentType: file.type,
  });

  return filePath;
}

export type { UploadParams };