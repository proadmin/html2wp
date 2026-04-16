import { readdir, stat } from 'fs/promises';
import { join, relative, extname } from 'path';
import { logger } from '../../utils/logger.js';
import type { FileManifest } from './zip.handler.js';

export class LocalHandler {
  async scan(sourceDir: string, outputDir: string): Promise<FileManifest> {
    logger.info(`Scanning local directory: ${sourceDir}`);

    const files = await this.scanDirectory(sourceDir, sourceDir);

    logger.info(`Found ${files.length} files`);

    return {
      files,
      extractDir: sourceDir
    };
  }

  private async scanDirectory(dir: string, baseDir: string): Promise<FileManifest['files']> {
    const files: FileManifest['files'] = [];
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        const subFiles = await this.scanDirectory(fullPath, baseDir);
        files.push(...subFiles);
      } else if (entry.isFile()) {
        const relativePath = relative(baseDir, fullPath);
        const fileStat = await stat(fullPath);

        files.push({
          path: relativePath,
          type: this.getFileType(entry.name),
          size: fileStat.size
        });
      }
    }

    return files;
  }

  private getFileType(filename: string): FileManifest['files'][number]['type'] {
    const ext = extname(filename).toLowerCase();

    if (['html', 'htm'].includes(ext || '')) return 'html';
    if (['css', 'scss', 'sass', 'less'].includes(ext || '')) return 'css';
    if (['js', 'mjs', 'cjs'].includes(ext || '')) return 'js';
    if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'ico'].includes(ext || '')) return 'image';
    if (['woff', 'woff2', 'ttf', 'eot', 'otf'].includes(ext || '')) return 'font';
    return 'other';
  }
}
