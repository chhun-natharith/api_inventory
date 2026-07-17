import { unlinkSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * Delete a file from the filesystem
 */
export function deleteFile(filePath: string): boolean {
  try {
    if (existsSync(filePath)) {
      unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Error deleting file: ${filePath}`, error);
    return false;
  }
}

/**
 * Get the public URL path for uploaded files
 */
export function getPublicFileUrl(filePath: string): string {
  // Remove the uploads base path and return relative path
  const uploadsIndex = filePath.indexOf('uploads');
  if (uploadsIndex !== -1) {
    return '/' + filePath.substring(uploadsIndex);
  }
  return filePath;
}

/**
 * Get the full file path from relative path
 */
export function getFullFilePath(relativePath: string): string {
  if (relativePath.startsWith('/uploads')) {
    return join(process.cwd(), relativePath.substring(1));
  }
  return relativePath;
}
