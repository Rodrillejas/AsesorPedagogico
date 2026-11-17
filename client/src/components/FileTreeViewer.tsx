import { useState } from 'react';
import { Folder, FolderOpen, FileCode, ChevronRight, ChevronDown } from 'lucide-react';
import type { FileTreeNode } from '../types';

interface FileTreeViewerProps {
  tree: FileTreeNode[];
}

const TreeNodeItem = ({ node, level = 0 }: { node: FileTreeNode; level?: number }) => {
  const [isOpen, setIsOpen] = useState(level < 2); // Auto-expand first 2 levels
  const isDir = node.type === 'directory';

  return (
    <div>
      <div
        onClick={() => isDir && setIsOpen(!isOpen)}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        className={`flex items-center gap-2 py-1.5 px-2 rounded-lg text-xs font-mono transition-colors ${
          isDir
            ? 'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium'
            : 'text-slate-600 dark:text-slate-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20'
        }`}
      >
        {isDir ? (
          <>
            <span className="text-slate-400">
              {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </span>
            {isOpen ? (
              <FolderOpen className="w-4 h-4 text-amber-500" />
            ) : (
              <Folder className="w-4 h-4 text-amber-500" />
            )}
            <span className="truncate">{node.name}</span>
            <span className="ml-auto text-[10px] text-slate-400">
              {node.children?.length ?? 0} elementos
            </span>
          </>
        ) : (
          <>
            <span className="w-3.5" />
            <FileCode className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
            <span className="truncate">{node.name}</span>
          </>
        )}
      </div>

      {isDir && isOpen && node.children && (
        <div className="border-l border-slate-200 dark:border-slate-800 ml-4">
          {node.children.map((child) => (
            <TreeNodeItem key={child.path} node={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

export const FileTreeViewer = ({ tree }: FileTreeViewerProps) => {
  if (!tree || tree.length === 0) {
    return (
      <div className="p-8 text-center text-xs text-slate-400">
        No hay archivos para visualizar
      </div>
    );
  }

  return (
    <div className="max-h-96 overflow-y-auto rounded-xl bg-slate-50 dark:bg-slate-900/60 p-2 border border-slate-200/80 dark:border-slate-800/80">
      {tree.map((node) => (
        <TreeNodeItem key={node.path} node={node} />
      ))}
    </div>
  );
};
