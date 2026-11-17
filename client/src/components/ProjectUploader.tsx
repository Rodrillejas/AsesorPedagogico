import { useRef, useState, useEffect } from 'react';
import type { DragEvent } from 'react';
import { Archive, FolderTree, AlertCircle, CheckCircle2, ChevronDown, ChevronUp, Users, BookOpen, Calendar, Zap, Loader2 } from 'lucide-react';
import type { UploadedCodeResponse } from '../types';
import { FileTreeViewer } from './FileTreeViewer';
import { processZipClientSide } from '../utils/clientZipProcessor';

interface ProjectUploaderProps {
  uploadedCode: UploadedCodeResponse | null;
  onCodeLoaded: (data: UploadedCodeResponse) => void;
  studentName: string;
  setStudentName: (val: string) => void;
  assignmentTitle: string;
  setAssignmentTitle: (val: string) => void;
  semester: string;
  setSemester: (val: string) => void;
  term: string;
  setTerm: (val: string) => void;
}

export const ProjectUploader = ({
  uploadedCode,
  onCodeLoaded,
  studentName,
  setStudentName,
  assignmentTitle,
  setAssignmentTitle,
  semester,
  setSemester,
  term,
  setTerm,
}: ProjectUploaderProps) => {
  const zipInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [progressText, setProgressText] = useState<string>('');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [showTree, setShowTree] = useState(true);
  const [dragOver, setDragOver] = useState(false);

  // Opciones de autocompletado y guardado en memoria local
  const [savedSemesters, setSavedSemesters] = useState<string[]>([]);
  const [savedStudents, setSavedStudents] = useState<string[]>([]);

  useEffect(() => {
    // Cargar listas guardadas de semestres y grupos de localStorage
    const localSems = localStorage.getItem('evalai_saved_semesters');
    const localStudents = localStorage.getItem('evalai_saved_students');

    const defaultSems = ['Semestre 2026-2', 'Semestre 2026-1', '8vo Semestre Profundización'];
    if (localSems) {
      try {
        const parsed = JSON.parse(localSems);
        setSavedSemesters(Array.from(new Set([...defaultSems, ...parsed])));
      } catch {
        setSavedSemesters(defaultSems);
      }
    } else {
      setSavedSemesters(defaultSems);
    }

    if (localStudents) {
      try {
        setSavedStudents(JSON.parse(localStudents));
      } catch {
        setSavedStudents([]);
      }
    }

    // Traer sugerencias adicionales del servidor
    fetch('/api/evaluations/autocomplete')
      .then((r) => r.json())
      .then((data) => {
        if (data.semesters) {
          setSavedSemesters((prev) => Array.from(new Set([...prev, ...data.semesters])));
        }
        if (data.students) {
          setSavedStudents((prev) => Array.from(new Set([...prev, ...data.students])));
        }
      })
      .catch(() => {});
  }, []);

  const handleSemesterChange = (val: string) => {
    setSemester(val);
    if (val.trim() && !savedSemesters.includes(val.trim())) {
      const updated = [val.trim(), ...savedSemesters].slice(0, 10);
      setSavedSemesters(updated);
      localStorage.setItem('evalai_saved_semesters', JSON.stringify(updated));
    }
  };

  const handleStudentChange = (val: string) => {
    setStudentName(val);
    if (val.trim().length > 3 && !savedStudents.includes(val.trim())) {
      const updated = [val.trim(), ...savedStudents].slice(0, 15);
      setSavedStudents(updated);
      localStorage.setItem('evalai_saved_students', JSON.stringify(updated));
    }
  };

  const handleZipUpload = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.zip')) {
      setError('Por favor selecciona un archivo comprimido .ZIP');
      return;
    }

    setLoading(true);
    setError(null);
    setProgressPercent(10);
    setProgressText('Iniciando extracción ultrarrápida...');

    try {
      // 1. Intentar extracción en el navegador (0 segundos de red, no satura el túnel de Cloudflare)
      const data: UploadedCodeResponse = await processZipClientSide(file, (percent, status) => {
        setProgressPercent(percent);
        setProgressText(status);
      });

      onCodeLoaded(data);

      if (!assignmentTitle) {
        const cleanTitle = file.name.replace(/\.zip$/i, '').replace(/[-_]/g, ' ');
        setAssignmentTitle(cleanTitle);
      }
    } catch (clientErr: any) {
      console.warn('Extracción client-side falló, recurriendo al servidor:', clientErr);
      setProgressText('Procesando a través del servidor...');

      // 2. Fallback de respaldo al servidor si el navegador tuviese alguna restricción
      const formData = new FormData();
      formData.append('file', file);

      try {
        const res = await fetch('/api/upload/zip', {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.message || 'Error al procesar el archivo zip');
        }

        const serverData: UploadedCodeResponse = await res.json();
        onCodeLoaded(serverData);

        if (!assignmentTitle) {
          const cleanTitle = file.name.replace(/\.zip$/i, '').replace(/[-_]/g, ' ');
          setAssignmentTitle(cleanTitle);
        }
      } catch (err: any) {
        setError(err.message || 'Error al descomprimir y procesar la solución multimodal');
      }
    } finally {
      setLoading(false);
      setProgressPercent(0);
      setProgressText('');
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleZipUpload(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm transition space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm">
          2
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Solución del Trabajo y Datos del Grupo
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Selecciona o digita el semestre, integrantes del grupo y sube el archivo .ZIP
          </p>
        </div>
      </div>

      {/* Datalists nativos para autocompletado y selección de opciones previamente digitadas */}
      <datalist id="saved-semesters-list">
        {savedSemesters.map((s, idx) => (
          <option key={idx} value={s} />
        ))}
      </datalist>

      <datalist id="saved-students-list">
        {savedStudents.map((st, idx) => (
          <option key={idx} value={st} />
        ))}
      </datalist>

      {/* Inputs organizados en 2 filas limpias y espaciosas */}
      <div className="space-y-3">
        {/* Fila 1: Semestre y Corte Evaluado */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-indigo-500" /> Semestre Académico <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              list="saved-semesters-list"
              required
              placeholder="Ej: Semestre 2026-2"
              value={semester}
              onChange={(e) => handleSemesterChange(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-blue-500" /> Corte Evaluado <span className="text-rose-500">*</span>
            </label>
            <select
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="Corte 1">Corte 1 (Primer Periodo)</option>
              <option value="Corte 2">Corte 2 (Segundo Periodo)</option>
              <option value="Corte 3">Corte 3 (Tercer Periodo / Final)</option>
            </select>
          </div>
        </div>

        {/* Fila 2: Título del Trabajo y Estudiantes del Grupo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5 text-indigo-500" /> Título del Trabajo / Lab <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Ej: Lab 1 - Fundamentos IA"
              value={assignmentTitle}
              onChange={(e) => setAssignmentTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-indigo-500" /> Estudiantes del Grupo <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              list="saved-students-list"
              required
              placeholder="Ej: Juan Cuellar, Santiago Vinasco, David Rodriguez"
              value={studentName}
              onChange={(e) => handleStudentChange(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            />
          </div>
        </div>
      </div>

      {/* Dropzone para el archivo .ZIP */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => zipInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
          dragOver
            ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20'
            : 'border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-600 bg-slate-50/50 dark:bg-slate-900/40'
        }`}
      >
        <input
          ref={zipInputRef}
          type="file"
          accept=".zip"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleZipUpload(e.target.files[0]);
            }
          }}
        />

        <div className="flex flex-col items-center gap-2">
          <div className="p-3 rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
            {loading ? <Loader2 className="w-6 h-6 animate-spin text-blue-600" /> : <Archive className="w-6 h-6" />}
          </div>
          <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            {loading ? (
              <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                <Zap className="w-4 h-4 animate-bounce" /> {progressText || 'Extrayendo solución en memoria...'} ({progressPercent}%)
              </span>
            ) : (
              'Arrastra o haz clic para cargar el archivo .ZIP del trabajo'
            )}
          </div>
          {loading && (
            <div className="w-full max-w-xs bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden mt-1">
              <div
                className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          )}
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Extracción instantánea en memoria: detecta código, matrices (.xlsx/.csv), documentos y mapas mentales sin lentitud.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Árbol y resumen de solución cargada */}
      {uploadedCode && (
        <div className="space-y-3 pt-1">
          <div className="p-3.5 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  Solución multimodal lista para auditar
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {uploadedCode.totalFiles} elementos detectados • {(uploadedCode.totalCharacters / 1000).toFixed(1)}k caracteres consolidados
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowTree(!showTree)}
              className="text-xs text-blue-700 dark:text-blue-300 hover:underline flex items-center gap-1 font-semibold"
            >
              <FolderTree className="w-3.5 h-3.5" />
              {showTree ? 'Ocultar Árbol' : 'Ver Árbol'}
              {showTree ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>

          {showTree && (
            <div>
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 px-1">
                Estructura de la solución multimodal detectada:
              </div>
              <FileTreeViewer tree={uploadedCode.fileTree} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
