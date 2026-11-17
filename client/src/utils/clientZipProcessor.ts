import JSZip from 'jszip';
import type { UploadedCodeResponse, FileTreeNode } from '../types';

const STRICT_IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
  '.svn',
  '.hg',
  '__pycache__',
  '.pytest_cache',
  '.mypy_cache',
  '.venv',
  'venv',
  '.idea',
  '.vscode',
  '.ds_store',
]);

const BINARY_OR_MEDIA_EXTS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico',
  '.mp4', '.mov', '.avi', '.mkv', '.mp3', '.wav',
  '.exe', '.dll', '.so', '.dylib', '.bin', '.obj', '.o',
  '.zip', '.tar', '.gz', '.7z', '.rar',
  '.woff', '.woff2', '.ttf', '.eot', '.otf',
  '.pyc', '.class',
]);

const TEXT_CODE_EXTS = new Set([
  '.py', '.js', '.ts', '.tsx', '.jsx', '.json', '.html', '.css', '.scss',
  '.md', '.txt', '.csv', '.xml', '.yaml', '.yml', '.sql', '.sh', '.bash',
  '.java', '.c', '.cpp', '.h', '.cs', '.php', '.rb', '.go', '.rs', '.kt',
  '.env.example', '.gitignore', '.dockerignore',
]);

function buildFileTree(filePaths: string[]): FileTreeNode[] {
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

export async function processZipClientSide(
  file: File,
  onProgress?: (percent: number, statusText: string) => void,
): Promise<UploadedCodeResponse> {
  onProgress?.(10, 'Leyendo archivo local en memoria...');
  const zip = new JSZip();
  const loadedZip = await zip.loadAsync(file);

  onProgress?.(30, 'Filtrando árbol de directorios y dependencias...');
  const allDetectedPaths: string[] = [];
  const filesToRead: { cleanPath: string; zipObj: JSZip.JSZipObject; ext: string }[] = [];

  loadedZip.forEach((relativePath, zipEntry) => {
    if (zipEntry.dir) return;

    const cleanPath = relativePath.replace(/\\/g, '/').replace(/^\/+/, '');
    const segments = cleanPath.split('/');

    // Ignorar .venv, node_modules, etc.
    if (segments.some((seg) => STRICT_IGNORED_DIRS.has(seg.toLowerCase()))) {
      return;
    }

    allDetectedPaths.push(cleanPath);

    const extMatch = cleanPath.match(/\.[^.]+$/);
    const ext = extMatch ? extMatch[0].toLowerCase() : '';

    filesToRead.push({ cleanPath, zipObj: zipEntry, ext });
  });

  if (allDetectedPaths.length === 0) {
    throw new Error('No se encontraron archivos válidos en el archivo comprimido');
  }

  onProgress?.(50, `Procesando ${filesToRead.length} archivos relevantes...`);

  let consolidatedText = '';
  let totalChars = 0;
  let processedCount = 0;

  for (const { cleanPath, zipObj, ext } of filesToRead) {
    processedCount++;
    if (processedCount % 20 === 0) {
      const p = Math.round(50 + (processedCount / filesToRead.length) * 45);
      onProgress?.(p, `Extrayendo archivos (${processedCount}/${filesToRead.length})...`);
    }

    // 1. Imágenes o Multimedia
    if (BINARY_OR_MEDIA_EXTS.has(ext)) {
      if (ext === '.svg') {
        try {
          const svgContent = await zipObj.async('string');
          consolidatedText += `=== FILE: ${cleanPath} ===\n[Diagrama Vectorial SVG / Mapa Mental: ${cleanPath}]\n${svgContent.slice(0, 4000)}\n=== END FILE ===\n\n`;
          totalChars += svgContent.length;
        } catch {
          consolidatedText += `=== FILE: ${cleanPath} ===\n[Diagrama Vectorial SVG: ${cleanPath}]\n=== END FILE ===\n\n`;
        }
      } else {
        consolidatedText += `=== FILE: ${cleanPath} ===\n[Evidencia Visual / Imagen detectada: ${cleanPath}]\n=== END FILE ===\n\n`;
      }
      continue;
    }

    // 2. Archivos Excel (.xlsx, .xls) o PDF o Word (.docx)
    // Para binarios complejos de oficina, si son pequeños se envían al backend o se describe su presencia
    if (ext === '.xlsx' || ext === '.xls' || ext === '.pdf' || ext === '.docx') {
      consolidatedText += `=== FILE: ${cleanPath} ===\n[Documento Técnico / Evidencia: ${cleanPath}]\n=== END FILE ===\n\n`;
      continue;
    }

    // 3. Archivos de código y texto
    try {
      const isKnownText = TEXT_CODE_EXTS.has(ext) || cleanPath.toLowerCase().endsWith('dockerfile') || cleanPath.toLowerCase().includes('requirement');
      if (isKnownText) {
        const text = await zipObj.async('string');
        consolidatedText += `=== FILE: ${cleanPath} ===\n${text}\n=== END FILE ===\n\n`;
        totalChars += text.length;
      } else {
        const text = await zipObj.async('string');
        // Chequeo si no contiene caracteres nulos excesivos
        if (!text.slice(0, 500).includes('\0')) {
          consolidatedText += `=== FILE: ${cleanPath} ===\n${text}\n=== END FILE ===\n\n`;
          totalChars += text.length;
        } else {
          consolidatedText += `=== FILE: ${cleanPath} ===\n[Archivo binario presente: ${cleanPath}]\n=== END FILE ===\n\n`;
        }
      }
    } catch {
      consolidatedText += `=== FILE: ${cleanPath} ===\n[Archivo detectado: ${cleanPath}]\n=== END FILE ===\n\n`;
    }
  }

  onProgress?.(100, '¡Extracción completada al 100%!');

  const fileTree = buildFileTree(allDetectedPaths);

  return {
    totalFiles: allDetectedPaths.length,
    totalCharacters: totalChars,
    fileTree,
    consolidatedText,
  };
}
