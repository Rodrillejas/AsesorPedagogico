import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import * as AdmZip from 'adm-zip';
import * as path from 'path';
import * as pdfParse from 'pdf-parse';
import * as xlsx from 'xlsx';
import * as mammoth from 'mammoth';
import {
  ConsolidatedCode,
  FileTreeNode,
  STRICT_IGNORED_DIRS,
  EXECUTABLE_EXTENSIONS,
} from './file-filter.util';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB por archivo

  // Extensiones de texto y código comunes
  private readonly CODE_TEXT_EXTS = new Set([
    '.py', '.js', '.ts', '.tsx', '.jsx', '.json', '.html', '.css', '.scss',
    '.md', '.txt', '.csv', '.xml', '.yaml', '.yml', '.sql', '.sh', '.bash',
    '.java', '.c', '.cpp', '.h', '.cs', '.php', '.rb', '.go', '.rs', '.kt',
    '.env.example', '.gitignore', '.dockerignore', 'dockerfile',
  ]);

  async processZipBuffer(buffer: Buffer): Promise<ConsolidatedCode> {
    if (!buffer || buffer.length === 0) {
      throw new BadRequestException('Archivo zip vacío o no proporcionado');
    }

    const t0 = Date.now();
    let zip: AdmZip;
    try {
      zip = new AdmZip(buffer);
    } catch (err: any) {
      this.logger.error(`Error al analizar zip: ${err.message}`);
      throw new BadRequestException('Formato de archivo zip no válido');
    }

    const zipEntries = zip.getEntries();
    const allDetectedPaths: string[] = [];
    const filesToProcess: { cleanPath: string; entry: AdmZip.IZipEntry; ext: string }[] = [];

    // FASE 1: Filtrado ultrarrápido a nivel de metadatos (sin descomprimir payloads innecesarios)
    for (const entry of zipEntries) {
      if (entry.isDirectory) continue;

      const rawPath = entry.entryName;
      const normalizedPath = path.normalize(rawPath).replace(/^(\.\.(\/|\\|$))+/, '');
      if (normalizedPath.startsWith('..') || path.isAbsolute(normalizedPath)) {
        continue;
      }

      const cleanPath = normalizedPath.replace(/\\/g, '/');
      const segments = cleanPath.split('/');

      // Omitir inmediatamente dependencias pesadas (.venv, node_modules, .git, etc.)
      if (segments.some((seg) => STRICT_IGNORED_DIRS.has(seg.toLowerCase()))) {
        continue;
      }

      allDetectedPaths.push(cleanPath);

      const ext = path.extname(cleanPath).toLowerCase();
      if (EXECUTABLE_EXTENSIONS.has(ext)) {
        continue;
      }

      filesToProcess.push({ cleanPath, entry, ext });
    }

    if (allDetectedPaths.length === 0) {
      throw new BadRequestException('No se encontraron archivos válidos en el archivo comprimido');
    }

    this.logger.log(`Archivos detectados: ${allDetectedPaths.length}. Procesando ${filesToProcess.length} archivos relevantes...`);

    const filesMap = new Map<string, string>();
    let totalChars = 0;

    // FASE 2: Extracción y procesamiento concurrente controlado
    // Usamos chunks o Promise.all para que no se bloquee de forma serial
    const BATCH_SIZE = 15;
    for (let i = 0; i < filesToProcess.length; i += BATCH_SIZE) {
      const batch = filesToProcess.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(async ({ cleanPath, entry, ext }) => {
          try {
            if (entry.header.size > this.MAX_FILE_SIZE) {
              filesMap.set(cleanPath, `[Archivo de gran tamaño detectado: ${entry.header.size} bytes]`);
              return;
            }

            // Descomprimir solo los datos de este archivo
            const fileData = entry.getData();

            // 1. Archivos de imagen (PNG, JPG, SVG, WebP)
            if (ext === '.png' || ext === '.jpg' || ext === '.jpeg' || ext === '.svg' || ext === '.webp') {
              if (ext === '.svg') {
                const svgContent = fileData.toString('utf8');
                filesMap.set(
                  cleanPath,
                  `[Diagrama Vectorial SVG / Mapa Mental: ${cleanPath} (${fileData.length} bytes)]\n${svgContent.slice(0, 4000)}`,
                );
              } else {
                filesMap.set(
                  cleanPath,
                  `[Evidencia Visual / Mapa Mental Imagen: ${cleanPath} (${fileData.length} bytes)]`,
                );
              }
              return;
            }

            // 2. Archivos Excel (.xlsx, .xls) -> Convertir hojas a CSV de forma eficiente
            if (ext === '.xlsx' || ext === '.xls') {
              try {
                const workbook = xlsx.read(fileData, { type: 'buffer', cellFormula: false, cellHTML: false });
                let sheetContent = '';
                for (const sheetName of workbook.SheetNames) {
                  const sheet = workbook.Sheets[sheetName];
                  const csv = xlsx.utils.sheet_to_csv(sheet);
                  // Limitar a primeras 250 líneas si la hoja es gigantesca
                  const lines = csv.split('\n');
                  const truncatedCsv = lines.slice(0, 250).join('\n');
                  sheetContent += `--- HOJA EXCEL: ${sheetName} (${lines.length} filas) ---\n${truncatedCsv}\n`;
                }
                filesMap.set(cleanPath, sheetContent);
                totalChars += sheetContent.length;
              } catch {
                filesMap.set(cleanPath, `[Hoja de cálculo Excel detectada: ${cleanPath}]`);
              }
              return;
            }

            // 3. Archivos PDF (.pdf) -> Extraer texto optimizado
            if (ext === '.pdf') {
              try {
                const pdfData = await pdfParse(fileData, { max: 10 }); // Máximo 10 páginas relevantes de informe
                const pdfText = pdfData.text ? pdfData.text.trim().slice(0, 15000) : '[PDF sin texto seleccionable]';
                filesMap.set(cleanPath, `[Documento PDF: ${cleanPath} - ${pdfData.numpages} páginas]\n${pdfText}`);
                totalChars += pdfText.length;
              } catch {
                filesMap.set(cleanPath, `[Documento PDF detectado: ${cleanPath}]`);
              }
              return;
            }

            // 4. Archivos Word (.docx)
            if (ext === '.docx') {
              try {
                const docxResult = await mammoth.extractRawText({ buffer: fileData });
                const docxText = docxResult.value ? docxResult.value.trim().slice(0, 15000) : '[Documento Word sin texto]';
                filesMap.set(cleanPath, `[Documento Word: ${cleanPath}]\n${docxText}`);
                totalChars += docxText.length;
              } catch {
                filesMap.set(cleanPath, `[Documento Word detectado: ${cleanPath}]`);
              }
              return;
            }

            // 5. Archivos de código y texto
            const filenameLower = path.basename(cleanPath).toLowerCase();
            const isKnownText = this.CODE_TEXT_EXTS.has(ext) || filenameLower === 'dockerfile' || filenameLower.startsWith('requirements');

            if (isKnownText) {
              const content = fileData.toString('utf8');
              filesMap.set(cleanPath, content);
              totalChars += content.length;
            } else {
              // Inspección rápida de binario en primeros 512 bytes
              const isBinary = fileData.slice(0, 512).some((b) => b === 0);
              if (!isBinary) {
                const content = fileData.toString('utf8');
                filesMap.set(cleanPath, content);
                totalChars += content.length;
              } else {
                filesMap.set(cleanPath, `[Archivo binario presente: ${cleanPath}]`);
              }
            }
          } catch (err: any) {
            this.logger.warn(`No se pudo procesar ${cleanPath}: ${err.message}`);
          }
        }),
      );
    }

    // FASE 3: Construcción ágil del árbol jerárquico
    const fileTree = this.buildFileTree(allDetectedPaths);

    // Consolidar contexto estructurado para la IA
    let consolidatedText = '';
    for (const [filePath, content] of filesMap.entries()) {
      consolidatedText += `=== FILE: ${filePath} ===\n${content}\n=== END FILE ===\n\n`;
    }

    const elapsed = Date.now() - t0;
    this.logger.log(`Procesamiento de ZIP completado en ${elapsed}ms (${allDetectedPaths.length} archivos).`);

    return {
      totalFiles: allDetectedPaths.length,
      totalCharacters: totalChars,
      fileTree,
      consolidatedText,
    };
  }

  async processUploadedFiles(files: Express.Multer.File[]): Promise<ConsolidatedCode> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No se recibieron archivos');
    }

    const filesMap = new Map<string, string>();
    const allPaths: string[] = [];

    for (const file of files) {
      const originalPath = (file as any).originalname || file.filename;
      const cleanPath = path.normalize(originalPath).replace(/^(\.\.(\/|\\|$))+/, '').replace(/\\/g, '/');
      allPaths.push(cleanPath);
      filesMap.set(cleanPath, file.buffer.toString('utf8'));
    }

    const fileTree = this.buildFileTree(allPaths);
    let consolidatedText = '';
    for (const [filePath, content] of filesMap.entries()) {
      consolidatedText += `=== FILE: ${filePath} ===\n${content}\n=== END FILE ===\n\n`;
    }

    return {
      totalFiles: allPaths.length,
      totalCharacters: consolidatedText.length,
      fileTree,
      consolidatedText,
    };
  }

  private buildFileTree(filePaths: string[]): FileTreeNode[] {
    const rootNodes: FileTreeNode[] = [];

    for (const filePath of filePaths) {
      const parts = filePath.split('/');
      let currentLevel = rootNodes;
      let currentPath = '';

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        const isFile = i === parts.length - 1;

        let node = currentLevel.find((n) => n.name === part);

        if (!node) {
          node = {
            name: part,
            path: currentPath,
            type: isFile ? 'file' : 'directory',
            ...(isFile ? {} : { children: [] }),
          };
          currentLevel.push(node);
        }

        if (!isFile && node.children) {
          currentLevel = node.children;
        }
      }
    }

    return rootNodes;
  }
}
