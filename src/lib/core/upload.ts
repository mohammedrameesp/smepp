import { IncomingForm, File } from 'formidable';
import { NextRequest } from 'next/server';
import mime from 'mime';
import fs from 'fs/promises';

export interface ParsedUpload {
  fields: Record<string, string>;
  files: Record<string, File>;
}

const ALLOWED_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg'];
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/png', 
  'image/jpeg',
  'image/jpg'
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function parseMultipartForm(req: NextRequest): Promise<ParsedUpload> {
  return new Promise((resolve, reject) => {
    const form = new IncomingForm({
      maxFileSize: MAX_FILE_SIZE,
      maxFiles: 1,
      filter: ({ mimetype, originalFilename }) => {
        // Check file extension
        if (originalFilename) {
          const ext = '.' + originalFilename.split('.').pop()?.toLowerCase();
          if (!ALLOWED_EXTENSIONS.includes(ext)) {
            return false;
          }
        }

        // Check MIME type
        if (mimetype && !ALLOWED_MIME_TYPES.includes(mimetype)) {
          return false;
        }

        return true;
      },
    });

    // Convert the web request to Node.js request format
    const chunks: Buffer[] = [];
    const reader = req.body?.getReader();

    if (!reader) {
      reject(new Error('No request body'));
      return;
    }

    async function readStream() {
      try {
        while (true) {
          const { done, value } = await reader!.read();
          if (done) break;
          chunks.push(Buffer.from(value));
        }

        const buffer = Buffer.concat(chunks);

        // Create a proper mock IncomingMessage with all required properties
        type EventHandler = (...args: unknown[]) => void;
        const eventHandlers: Record<string, EventHandler[]> = {};

        const mockReq = {
          headers: Object.fromEntries(req.headers.entries()),
          method: req.method,
          url: req.url,
          httpVersion: '1.1',
          httpVersionMajor: 1,
          httpVersionMinor: 1,
          readable: true,
          destroyed: false,
          socket: {
            readable: true,
            writable: true,
            destroyed: false,
            on: () => {},
            once: () => {},
            emit: () => {},
            removeListener: () => {},
          },
          pipe: (dest: any) => {
            dest.write(buffer);
            dest.end();
            return dest;
          },
          on: (event: string, cb: EventHandler) => {
            if (!eventHandlers[event]) {
              eventHandlers[event] = [];
            }
            eventHandlers[event].push(cb);
            return mockReq;
          },
          once: (event: string, cb: EventHandler) => {
            if (!eventHandlers[event]) {
              eventHandlers[event] = [];
            }
            eventHandlers[event].push(cb);
            return mockReq;
          },
          emit: (event: string, ...args: any[]) => {
            const handlers = eventHandlers[event] || [];
            handlers.forEach(handler => handler(...args));
            return true;
          },
          removeListener: (event: string, cb: EventHandler) => {
            if (eventHandlers[event]) {
              eventHandlers[event] = eventHandlers[event].filter(h => h !== cb);
            }
            return mockReq;
          },
          read: () => buffer,
          pause: () => mockReq,
          resume: () => mockReq,
          isPaused: () => false,
          setEncoding: () => mockReq,
          unpipe: () => mockReq,
          unshift: () => {},
          wrap: () => mockReq,
        } as any;

        form.parse(mockReq, (err, fields, files) => {
          if (err) {
            reject(err);
            return;
          }

          // Convert fields and files to the expected format
          const parsedFields: Record<string, string> = {};
          const parsedFiles: Record<string, File> = {};

          // Handle fields
          Object.entries(fields || {}).forEach(([key, value]) => {
            if (Array.isArray(value)) {
              parsedFields[key] = value[0] || '';
            } else {
              parsedFields[key] = value || '';
            }
          });

          // Handle files
          Object.entries(files || {}).forEach(([key, file]) => {
            if (Array.isArray(file)) {
              if (file[0]) parsedFiles[key] = file[0];
            } else if (file) {
              parsedFiles[key] = file;
            }
          });

          resolve({ fields: parsedFields, files: parsedFiles });
        });
      } catch (error) {
        reject(error);
      }
    }

    readStream();
  });
}

export async function validateFile(file: File): Promise<{ valid: boolean; error?: string }> {
  try {
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return { valid: false, error: 'File size exceeds 10MB limit' };
    }

    // Check extension
    const ext = '.' + (file.originalFilename?.split('.').pop()?.toLowerCase() || '');
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return { valid: false, error: `File type ${ext} not allowed. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}` };
    }

    // Verify MIME type by file extension and declared type
    const detectedMimeType = mime.getType(file.originalFilename || '') || file.mimetype;

    if (!detectedMimeType || !ALLOWED_MIME_TYPES.includes(detectedMimeType)) {
      return { valid: false, error: `Invalid file type: ${detectedMimeType}` };
    }

    return { valid: true };
  } catch {
    return { valid: false, error: 'Failed to validate file' };
  }
}

export async function fileToBuffer(file: File): Promise<Buffer> {
  return fs.readFile(file.filepath);
}