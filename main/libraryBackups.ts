import { app } from 'electron';
import path from 'node:path';
import { LibraryBackupService } from './LibraryBackupService.js';

/** The backup service for this install. Created on demand, so `app` is read after startup. */
export function libraryBackups(): LibraryBackupService {
  return new LibraryBackupService(path.join(app.getPath('userData'), 'backups'));
}
