import { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Key,
  Play,
  Loader2,
  Moon,
  Sun,
  PlusCircle,
  Sparkles,
  PieChart,
  Bot,
  Trash2,
  Send,
  CheckCircle,
} from 'lucide-react';
import { RubricUploader } from './components/RubricUploader';
import { ProjectUploader } from './components/ProjectUploader';
import { EvaluationResultsDashboard } from './components/EvaluationResultsDashboard';
import { GlobalInfographicDashboard } from './components/GlobalInfographicDashboard';
import { ApiKeyModal } from './components/ApiKeyModal';
import type { RubricParsedResponse, UploadedCodeResponse, EvaluationResultData } from './types';
import confetti from 'canvas-confetti';

export function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'evaluate' | 'infographic'>('evaluate');
  const [apiKeyModalOpen, setApiKeyModalOpen] = useState(false);
  const [configStatus, setConfigStatus] = useState<{
    activeProvider: 'gemini' | 'openai';
    gemini: { isConfigured: boolean; maskedKey: string | null };
    openai: { isConfigured: boolean; maskedKey: string | null };
  }>({
    activeProvider: 'gemini',
    gemini: { isConfigured: false, maskedKey: null },
    openai: { isConfigured: false, maskedKey: null },
  });

  // Entradas principales del proceso
  const [semester, setSemester] = useState('Semestre 2026-2');
  const [term, setTerm] = useState('Corte 1');
  const [assignmentTitle, setAssignmentTitle] = useState('');
  const [studentName, setStudentName] = useState('');
  const [rubric, setRubric] = useState<RubricParsedResponse | null>(null);
  const [uploadedCode, setUploadedCode] = useState<UploadedCodeResponse | null>(null);

  // Estados de evaluación
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [auditProgress, setAuditProgress] = useState(0);
  const [evaluationResult, setEvaluationResult] = useState<EvaluationResultData | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    const isDark =
      localStorage.getItem('theme') === 'dark' ||
      (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
    setDarkMode(isDark);
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    if (next) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const fetchKeyStatus = async () => {
    try {
      const res = await fetch('/api/config/status');
      if (res.ok) {
        const data = await res.json();
        setConfigStatus(data);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchKeyStatus();
  }, []);

  const isAnyKeyConfigured = configStatus.gemini.isConfigured || configStatus.openai.isConfigured;
  const currentProviderLabel =
    configStatus.activeProvider === 'openai' ? 'OpenAI (GPT-4o)' : 'Google Gemini';

  // Ejecución de la evaluación con IA
  const handleRunEvaluation = async () => {
    if (!isAnyKeyConfigured) {
      setApiKeyModalOpen(true);
      setErrorMsg('Por favor configura tu API Key antes de evaluar.');
      return;
    }

    if (!rubric) {
      setErrorMsg('Debes cargar o seleccionar la rúbrica de evaluación en el Paso 1.');
      return;
    }

    if (!uploadedCode) {
      setErrorMsg('Debes subir el archivo .ZIP con el trabajo del grupo en el Paso 2.');
      return;
    }

    if (!studentName.trim()) {
      setErrorMsg('Por favor ingresa los nombres de los estudiantes del grupo.');
      return;
    }

    setErrorMsg(null);
    setIsEvaluating(true);
    setAuditProgress(15);

    const progressInterval = setInterval(() => {
      setAuditProgress((prev) => {
        if (prev >= 90) return prev;
        return prev + Math.floor(Math.random() * 12 + 5);
      });
    }, 1200);

    try {
      const payload = {
        projectName: assignmentTitle.trim() || 'Trabajo Académico',
        assignmentTitle: assignmentTitle.trim() || 'Laboratorio',
        semester: semester.trim() || 'Semestre 2026-2',
        term: term || 'Corte 1',
        studentName: studentName.trim(),
        rubricTitle: rubric.title,
        rubricContent: rubric.content,
        fileTree: uploadedCode.fileTree,
        consolidatedCode: uploadedCode.consolidatedText,
      };

      const res = await fetch('/api/evaluations/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Error durante la evaluación');
      }

      const data = await res.json();
      setAuditProgress(100);

      if (data.result) {
        setEvaluationResult(data.result);
        setNotification('¡Trabajo evaluado y guardado exitosamente en el consolidado del semestre!');
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error en la llamada a la IA');
    } finally {
      clearInterval(progressInterval);
      setIsEvaluating(false);
    }
  };

  // Botón para preparar una nueva entrega del mismo grupo u otro grupo
  const handleNextSubmission = () => {
    setEvaluationResult(null);
    setUploadedCode(null);
    setStudentName('');
    setErrorMsg(null);
    setNotification(null);
    setAuditProgress(0);
  };

  // Botón para reiniciar y borrar absolutamente todo
  const handleClearAll = async () => {
    if (!confirm('¿Estás seguro de que deseas borrar todas las evaluaciones y reiniciar el sistema desde cero?')) {
      return;
    }

    try {
      const res = await fetch('/api/evaluations/clear-all', { method: 'DELETE' });
      if (res.ok) {
        setEvaluationResult(null);
        setUploadedCode(null);
        setStudentName('');
        setAssignmentTitle('');
        setNotification('Se han borrado todas las evaluaciones previas. Puedes iniciar un nuevo proceso limpio.');
        setActiveTab('evaluate');
      }
    } catch (err) {
      setErrorMsg('Error al reiniciar las evaluaciones.');
    }
  };

  const loadSubmissionById = async (id: string) => {
    try {
      const res = await fetch(`/api/evaluations/submissions/${id}`);
      if (res.ok) {
        const data = await res.json();
        setStudentName(data.studentName);
        setAssignmentTitle(data.assignmentTitle || data.project?.name || '');
        setEvaluationResult(data.result);
        setActiveTab('evaluate');
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Barra de Navegación */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-violet-600 to-pink-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-base tracking-tight text-slate-900 dark:text-white">
                  EvalAI-Auditor Multimodal
                </h1>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 flex items-center gap-1">
                  {configStatus.activeProvider === 'openai' ? (
                    <>
                      <Bot className="w-3 h-3 text-emerald-500" /> ChatGPT
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3 h-3 text-indigo-500" /> Google Gemini
                    </>
                  )}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Sistema de Solución y Evaluación de Trabajos con Criterio Imparcial
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Pestañas: Evaluar vs Ver Infografía */}
            <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl text-xs font-semibold">
              <button
                onClick={() => setActiveTab('evaluate')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                  activeTab === 'evaluate'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Evaluar Trabajo</span>
              </button>

              <button
                onClick={() => setActiveTab('infographic')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                  activeTab === 'infographic'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <PieChart className="w-3.5 h-3.5" />
                <span>Infografía Global</span>
              </button>
            </div>

            {/* Reiniciar todo / Borrar lo realizado */}
            <button
              type="button"
              onClick={handleClearAll}
              title="Borrar todas las evaluaciones y reiniciar"
              className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition border border-rose-200/60 dark:border-rose-900/40"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            {/* Configurar API Key */}
            <button
              type="button"
              onClick={() => setApiKeyModalOpen(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                isAnyKeyConfigured
                  ? 'border-emerald-200 bg-emerald-50/70 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-300'
                  : 'border-amber-200 bg-amber-50/70 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-300 animate-pulse'
              }`}
            >
              <Key className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {isAnyKeyConfigured ? currentProviderLabel : 'Configurar Clave'}
              </span>
            </button>

            {/* Dark Mode */}
            <button
              type="button"
              onClick={toggleDarkMode}
              className="p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
              title="Cambiar tema"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>
          </div>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Notificaciones de éxito */}
        {notification && (
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-700 dark:text-emerald-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              <span>{notification}</span>
            </div>
            <button onClick={() => setNotification(null)} className="text-emerald-600 font-bold ml-2">
              ✕
            </button>
          </div>
        )}

        {/* Notificaciones de error */}
        {errorMsg && (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-center justify-between">
            <span>{errorMsg}</span>
            <button onClick={() => setErrorMsg(null)} className="text-rose-500 font-bold ml-2">
              ✕
            </button>
          </div>
        )}

        {/* PESTAÑA: EVALUAR TRABAJOS */}
        {activeTab === 'evaluate' && (
          <>
            {isEvaluating && (
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900 shadow-md animate-pulse">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400 animate-spin" />
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">
                      Evaluando solución multimodal del grupo {studentName}...
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    {auditProgress}%
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                  Verificando matriz de modelos en Excel, diagramas de mapas mentales, scripts en Python y calculando ponderaciones con criterio matemático estricto...
                </p>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-300"
                    style={{ width: `${auditProgress}%` }}
                  />
                </div>
              </div>
            )}

            {evaluationResult ? (
              <div className="space-y-6">
                {/* Botonera de Flujo Continuo: Realizar Otra Entrega o Finalizar e Ir a la Infografía */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-900/60">
                  <div className="text-xs text-indigo-900 dark:text-indigo-200 font-medium">
                    ✓ Esta entrega ya está guardada. Puedes continuar con el siguiente grupo o finalizar para analizar el consolidado.
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleNextSubmission}
                      className="px-4 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 shadow-sm transition"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Realizar Otra Entrega
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('infographic')}
                      className="px-4 py-2 text-xs font-bold rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1.5 transition"
                    >
                      <PieChart className="w-3.5 h-3.5" />
                      Finalizar y Ver Infografía Global
                    </button>
                  </div>
                </div>

                <EvaluationResultsDashboard
                  result={evaluationResult}
                  studentName={studentName}
                  projectName={assignmentTitle || 'Trabajo Académico'}
                  assignmentTitle={assignmentTitle}
                />
              </div>
            ) : (
              /* FORMULARIO DE EVALUACIÓN: 2 PASOS DIRECTOS (RÚBRICA COMPLETA + TRABAJO MULTIMODAL) */
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Paso 1: Rúbrica Completa (con objetivos, lineamientos y criterios) */}
                  <RubricUploader rubric={rubric} onRubricLoaded={(r) => setRubric(r)} />

                  {/* Paso 2: Solución del Grupo (Semestre, Corte, Nombres de Estudiantes y archivo .ZIP) */}
                  <ProjectUploader
                    uploadedCode={uploadedCode}
                    onCodeLoaded={(c) => setUploadedCode(c)}
                    studentName={studentName}
                    setStudentName={setStudentName}
                    assignmentTitle={assignmentTitle}
                    setAssignmentTitle={setAssignmentTitle}
                    semester={semester}
                    setSemester={setSemester}
                    term={term}
                    setTerm={setTerm}
                  />
                </div>

                {/* Botón de Ejecución de la Evaluación */}
                <div className="p-6 bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 rounded-3xl text-white shadow-xl flex flex-wrap items-center justify-between gap-4 border border-indigo-900/40">
                  <div>
                    <h3 className="text-lg font-bold flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-indigo-400" />
                      Auditar y Calificar Trabajo
                    </h3>
                    <p className="text-xs text-indigo-200/80">
                      {rubric && uploadedCode
                        ? `Listo para evaluar con criterio estricto ${uploadedCode.totalFiles} elementos del grupo: ${studentName || 'Grupo'}`
                        : 'Sube la rúbrica y el trabajo en .ZIP para activar la auditoría con IA'}
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={isEvaluating || !rubric || !uploadedCode || !studentName.trim()}
                    onClick={handleRunEvaluation}
                    className="px-6 py-3 rounded-2xl font-bold text-sm bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/25 flex items-center gap-2 transition-all transform active:scale-95"
                  >
                    {isEvaluating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Auditando Trabajo...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 fill-white" />
                        <span>Evaluar Trabajo con IA</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* PESTAÑA: INFOGRAFÍA GLOBAL */}
        {activeTab === 'infographic' && (
          <GlobalInfographicDashboard onSelectSubmission={loadSubmissionById} />
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200/80 dark:border-slate-800 py-6 text-center text-xs text-slate-400">
        EvalAI-Auditor Multimodal • Evaluación Imparcial con Google Gemini & OpenAI • Base de Datos PostgreSQL
      </footer>

      {/* Modal de API Key */}
      <ApiKeyModal
        isOpen={apiKeyModalOpen}
        onClose={() => {
          setApiKeyModalOpen(false);
          fetchKeyStatus();
        }}
      />
    </div>
  );
}

export default App;
