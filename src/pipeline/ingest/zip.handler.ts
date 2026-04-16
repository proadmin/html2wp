import { createWriteStream, mkdirSync, rmSync, statSync } from 'fs';
import { join, relative, extname } from 'path';
import { createReadStream } from 'fs';
import * as unzip from 'unzip-stream';
import { logger } from '../../utils/logger.js';
import * as fs from 'fs/promises';

export interface FileManifest {
  files: Array<{
    path: string;
    type: 'html' | 'css' | 'js' | 'image' | 'font' | 'other';
    size: number;
  }>;
  extractDir: string;
}

export class ZipHandler {
  private readonly htmlExtensions = ['.html', '.htm'];
  private readonly cssExtensions = ['.css', '.scss', '.sass', '.less'];
  private readonly jsExtensions = ['.js', '.mjs', '.cjs'];
  private readonly imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.ico'];
  private readonly fontExtensions = ['.woff', '.woff2', '.ttf', '.eot', '.otf'];

  async extract(zipPath: string, outputDir: string): Promise<FileManifest> {
    logger.info(`Extracting ZIP: ${zipPath}`);

    // Clean output directory
    rmSync(outputDir, { recursive: true, force: true });
    mkdirSync(outputDir, { recursive: true });

    try {
      await this.extractZip(zipPath, outputDir);
      const files = await this.scanDirectory(outputDir, outputDir);

      logger.info(`Extracted ${files.length} files`);

      return {
        files,
        extractDir: outputDir
      };
    } catch (error) {
      logger.error('ZIP extraction failed', error);
      throw new Error('Invalid ZIP file');
    }
  }

  private async extractZip(zipPath: string, outputDir: string): Promise<void> {
    return new Promise((resolve, reject) => {
      createReadStream(zipPath)
        .pipe(unzip.Extract({ path: outputDir }))
        .on('close', resolve)
        .on('error', reject);
    });
  }

  private async scanDirectory(dir: string, baseDir: string): Promise<FileManifest['files']> {
    const files: FileManifest['files'] = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        const subFiles = await this.scanDirectory(fullPath, baseDir);
        files.push(...subFiles);
      } else if (entry.isFile()) {
        const relativePath = relative(baseDir, fullPath);
        const stats = statSync(fullPath);

        files.push({
          path: relativePath,
          type: this.getFileType(entry.name),
          size: stats.size
        });
      }
    }

    return files;
  }

  private getFileType(filename: string): FileManifest['files'][number]['type'] {
    const ext = extname(filename).toLowerCase();

    if (this.htmlExtensions.includes(ext)) return 'html';
    if (this.cssExtensions.includes(ext)) return 'css';
    if (this.jsExtensions.includes(ext)) return 'js';
    if (this.imageExtensions.includes(ext)) return 'image';
    if (this.fontExtensions.includes(ext)) return 'font';
    return 'other';
  }
}
