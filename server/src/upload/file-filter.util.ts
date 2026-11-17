export interface FileTreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  children?: FileTreeNode[];
}

export interface ConsolidatedCode {
  totalFiles: number;
  totalCharacters: number;
  fileTree: FileTreeNode[];
  consolidatedText: string;
}

// ÚNICAMENTE ignorar dependencias internas gigantes de entorno (.venv, node_modules)
export const STRICT_IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
  '.svn',
  '.hg',
  '__pycache__',
  '.pytest_cache',
  '.mypy_cache',
  '.venv',
  'venv',
]);

// Binarios ejecutables puros que no aportan contenido evaluable
export const EXECUTABLE_EXTENSIONS = new Set([
  '.exe', '.dll', '.so', '.dylib', '.bin', '.obj', '.o', '.a', '.lib',
  '.zip', '.tar', '.gz', '.7z', '.rar',
  '.mp3', '.mp4', '.wav', '.mov', '.avi', '.mkv',
  '.woff', '.woff2', '.ttf', '.eot', '.otf',
  '.pyc', '.class'
]);
