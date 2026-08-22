import fs from 'fs';
import path from 'path';
import { config } from '../../config/env';
import { getFirebaseAdmin } from '../../config/firebaseAdmin';

export interface StoredFile {
  storagePath: string;
  url?: string;
}

export class StorageService {
  /**
   * Saves an uploaded buffer to either Firebase Storage or Local disk.
   */
  static async saveFile(
    companyId: string,
    fileName: string,
    buffer: Buffer,
    mimeType: string
  ): Promise<StoredFile> {
    const safeFileName = `${Date.now()}_${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const destinationPath = `companies/${companyId}/documents/${safeFileName}`;

    if (config.storage.provider === 'firebase' && config.firebase.storageBucket) {
      try {
        const adminApp = getFirebaseAdmin();
        const bucket = adminApp.storage().bucket();
        const file = bucket.file(destinationPath);

        await file.save(buffer, {
          contentType: mimeType,
          resumable: false,
          metadata: {
            companyId,
            originalName: fileName,
          },
        });

        console.log(`[StorageService] Uploaded ${fileName} to Firebase Storage: ${destinationPath}`);
        return { storagePath: destinationPath };
      } catch (err: any) {
        console.warn(`[StorageService] Firebase Storage upload failed, falling back to local:`, err.message);
      }
    }

    // Default: Local disk storage
    const targetDir = path.resolve(config.storage.localDir, companyId);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const localFilePath = path.join(targetDir, safeFileName);
    fs.writeFileSync(localFilePath, buffer);

    console.log(`[StorageService] Saved ${fileName} to local disk: ${localFilePath}`);
    return {
      storagePath: localFilePath,
    };
  }

  /**
   * Reads file content as buffer.
   */
  static async readFile(storagePath: string): Promise<Buffer> {
    if (fs.existsSync(storagePath)) {
      return fs.readFileSync(storagePath);
    }

    if (config.storage.provider === 'firebase') {
      const adminApp = getFirebaseAdmin();
      const bucket = adminApp.storage().bucket();
      const file = bucket.file(storagePath);
      const [buffer] = await file.download();
      return buffer;
    }

    throw new Error(`File not found at storage path: ${storagePath}`);
  }

  /**
   * Deletes a stored file.
   */
  static async deleteFile(storagePath: string): Promise<void> {
    try {
      if (fs.existsSync(storagePath)) {
        fs.unlinkSync(storagePath);
        return;
      }

      if (config.storage.provider === 'firebase') {
        const adminApp = getFirebaseAdmin();
        const bucket = adminApp.storage().bucket();
        await bucket.file(storagePath).delete();
      }
    } catch (err: any) {
      console.warn(`[StorageService] Could not delete file: ${err.message}`);
    }
  }
}
