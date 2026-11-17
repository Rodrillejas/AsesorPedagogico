import { useState, useEffect } from 'react';
import {
  PieChart,
  TrendingUp,
  Award,
  Layers,
  AlertTriangle,
  FolderKanban,
  FileText,
  BarChart3,
  Sparkles,
  ArrowUpRight,
  BookOpen,
  Download,
  Archive,
  History,
  Trash2,
  Eye,
  Check,
  RefreshCw,
  CheckCircle2,
  Lightbulb,
  MessageSquareQuote,
  Target,
} from 'lucide-react';
import type { GlobalInfographicData, ClosedInfographicItem } from '../types';
import { exportInfographicToPdf } from '../utils/exportInfographicPdf';

export const GlobalInfographicDashboard = ({
  onSelectSubmission,
}: {
  onSelectSubmission?: (submissionId: string) => void;
}) => {
  const [data, setData] = useState<GlobalInfographicData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSemester, setSelectedSemester] = useState('TODOS');
  const [selectedTerm, setSelectedTerm] = useState('TODOS'); // 'TODOS' | 'Corte 1' | 'Corte 2' | 'Corte 3'
  const [availableSemesters, setAvailableSemesters] = useState<string[]>(['TODOS', 'Semestre 2026-2', 'Semestre 2026-1']);

  // Historial de infografías cerradas
  const [closedInfographics, setClosedInfographics] = useState<ClosedInfographicItem[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [viewingArchived, setViewingArchived] = useState<ClosedInfographicItem | null>(null);

  // Modal cerrar informe
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [reportTitle, setReportTitle] = useState('');
  const [isClosing, setIsClosing] = useState(false);
  const [closeSuccess, setCloseSuccess] = useState(false);

  const fetchInfographicData = async () => {
    setLoading(true);
    try {
      const semParam = encodeURIComponent(selectedSemester);
      const termParam = encodeURIComponent(selectedTerm);
      const res = await fetch(`/api/evaluations/infographic?semester=${semParam}&term=${termParam}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Error fetching infographic data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchClosedHistory = async () => {
    try {
      const res = await fetch('/api/evaluations/infographic/closed');
      if (res.ok) {
        const list = await res.json();
        setClosedInfographics(list);
      }
    } catch (err) {
      console.error('Error fetching closed infographics:', err);
    }
  };

  const fetchAutocomplete = async () => {
    try {
      const res = await fetch('/api/evaluations/autocomplete');
      if (res.ok) {
        const json = await res.json();
        if (json.semesters && json.semesters.length > 0) {
          const combined = Array.from(new Set(['TODOS', ...json.semesters, 'Semestre 2026-2', 'Semestre 2026-1']));
          setAvailableSemesters(combined as string[]);
        }
      }
    } catch (err) {
      console.error('Error fetching autocomplete:', err);
    }
  };

  useEffect(() => {
    fetchInfographicData();
  }, [selectedSemester, selectedTerm]);

  useEffect(() => {
    fetchClosedHistory();
    fetchAutocomplete();
  }, []);

  const handleDownloadPdf = (infographicData: GlobalInfographicData, title?: string) => {
    const semName = selectedSemester === 'TODOS' ? 'Semestre_Completo' : selectedSemester;
    const termName = selectedTerm === 'TODOS' ? 'General' : selectedTerm;
    exportInfographicToPdf(infographicData, title || `Consolidado_${semName}_${termName}`);
  };

  const handleCloseAndArchive = async () => {
    if (!data || data.totalEvaluations === 0) return;
    setIsClosing(true);
    try {
      const semLabel = selectedSemester === 'TODOS' ? 'Semestre Completo' : selectedSemester;
      const termLabel = selectedTerm === 'TODOS' ? 'Consolidado General' : selectedTerm;
      const title = reportTitle.trim() || `Consolidado ${semLabel} - ${termLabel} (${data.totalEvaluations} Laboratorios)`;

      const res = await fetch('/api/evaluations/infographic/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          semester: selectedSemester,
          term: selectedTerm,
        }),
      });

      if (res.ok) {
        // Generar descarga automática de PDF del corte o semestre evaluado
        exportInfographicToPdf(data, title);
        setCloseSuccess(true);
        setTimeout(async () => {
          setShowCloseModal(false);
          setCloseSuccess(false);
          setReportTitle('');
          await fetchClosedHistory();
          await fetchInfographicData();
        }, 1500);
      } else {
        const err = await res.json();
        alert(`Error al archivar informe: ${err.message || 'Error desconocido'}`);
      }
    } catch (err: any) {
      alert(`Error al archivar informe: ${err.message}`);
    } finally {
      setIsClosing(false);
    }
  };

  const handleDeleteClosed = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este informe archivado del historial?')) return;
    try {
      const res = await fetch(`/api/evaluations/infographic/closed/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setClosedInfographics((prev) => prev.filter((item) => item.id !== id));
        if (viewingArchived?.id === id) {
          setViewingArchived(null);
        }
      }
    } catch (err) {
      console.error('Error deleting closed infographic:', err);
    }
  };

  // Datos activos a renderizar (pueden ser los activos o uno histórico en modo visualización)
  const activeData = viewingArchived ? viewingArchived.snapshotData : data;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Barra Superior de Filtros y Acciones */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          {/* Selector de Semestre */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Semestre:</span>
            <select
              value={selectedSemester}
              onChange={(e) => {
                setSelectedSemester(e.target.value);
                setViewingArchived(null);
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              {availableSemesters.map((s) => (
                <option key={s} value={s}>
                  {s === 'TODOS' ? 'Todos los Semestres' : s}
                </option>
              ))}
            </select>
          </div>

          {/* Selector de Corte Evaluado (Corte 1, Corte 2, Corte 3, Todos) */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Corte:</span>
            <select
              value={selectedTerm}
              onChange={(e) => {
                setSelectedTerm(e.target.value);
                setViewingArchived(null);
              }}
              className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-xs font-bold text-indigo-700 dark:text-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="TODOS">Consolidado Semestral (Todos los Cortes)</option>
              <option value="Corte 1">Corte 1 (Primer Periodo)</option>
              <option value="Corte 2">Corte 2 (Segundo Periodo)</option>
              <option value="Corte 3">Corte 3 (Tercer Periodo / Final)</option>
            </select>
          </div>

          {viewingArchived && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-xs font-medium">
              <Eye className="w-3.5 h-3.5" /> Informe Histórico: {viewingArchived.title}
              <button
                onClick={() => setViewingArchived(null)}
                className="ml-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold"
              >
                ✕ Volver a datos en vivo
              </button>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Botón Ver Historial */}
          <button
            onClick={() => setShowHistoryModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition shadow-sm"
          >
            <History className="w-4 h-4 text-indigo-500" />
            Historial de Informes ({closedInfographics.length})
          </button>

          {/* Botón Descargar PDF */}
          {activeData && activeData.totalEvaluations > 0 && (
            <button
              onClick={() => handleDownloadPdf(activeData, viewingArchived?.title)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-semibold transition shadow-sm"
            >
              <Download className="w-4 h-4" />
              Descargar PDF
            </button>
          )}

          {/* Botón Cerrar y Archivar Informe del Corte o Semestre */}
          {!viewingArchived && data && data.totalEvaluations > 0 && (
            <button
              onClick={() => setShowCloseModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-sm"
            >
              <Archive className="w-4 h-4" />
              Cerrar y Archivar Informe {selectedTerm !== 'TODOS' ? selectedTerm : 'Semestre'}
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Consolidando métricas del {selectedTerm !== 'TODOS' ? selectedTerm : 'semestre completo'}...
          </p>
        </div>
      ) : !activeData || activeData.totalEvaluations === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <PieChart className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            No hay evaluaciones registradas para {selectedTerm !== 'TODOS' ? selectedTerm : 'este semestre'}
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
            Realiza entregas seleccionando este corte o cambia los filtros de semestre y corte en la barra superior.
          </p>
        </div>
      ) : (
        <>
          {/* Header Infografía */}
          <div className="p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl text-white shadow-xl flex flex-wrap items-center justify-between gap-4 border border-indigo-900/50">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-1">
                <Sparkles className="w-4 h-4" /> Consolidado Analítico Macro & Competencias
              </div>
              <h2 className="text-2xl font-extrabold tracking-tight">
                {viewingArchived
                  ? viewingArchived.title
                  : selectedTerm !== 'TODOS'
                  ? `Infografía de Desempeño: ${selectedTerm} (${selectedSemester})`
                  : `Infografía Global del Semestre: ${selectedSemester}`}
              </h2>
              <p className="text-xs text-slate-300/80 mt-1 max-w-2xl leading-relaxed">
                Métricas consolidadas, tendencias de aprendizaje, fortalezas y áreas críticas de mejora agrupadas por dominios y subcategorías de conocimiento.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleDownloadPdf(activeData, viewingArchived?.title)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-xs font-bold text-white transition shadow-sm"
              >
                <Download className="w-4 h-4 text-indigo-300" /> Exportar Informe en PDF
              </button>
            </div>
          </div>

          {/* Bloque Comparativo por Cortes (Especial para la vista de Semestre) */}
          {activeData.termStats && activeData.termStats.length > 0 && selectedTerm === 'TODOS' && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-indigo-500" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Evolución y Rendimiento por Cortes Académicos (Corte 1, 2 y 3)
                  </h3>
                </div>
                <span className="text-xs text-slate-400 font-mono">
                  Comparativa Semestral
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {activeData.termStats.map((t, idx) => (
                  <div
                    key={idx}
                    onClick={() => setSelectedTerm(t.term)}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 hover:border-indigo-400 cursor-pointer transition"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                        {t.term}
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-semibold font-mono">
                        {t.count} labs
                      </span>
                    </div>

                    <div className="text-2xl font-black text-slate-900 dark:text-white">
                      {t.averageScore.toFixed(1)}{' '}
                      <span className="text-xs font-normal text-slate-400">/ 100</span>
                    </div>

                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden mt-3">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${
                          t.averagePercentage >= 80
                            ? 'bg-emerald-500'
                            : t.averagePercentage >= 60
                            ? 'bg-indigo-600'
                            : 'bg-rose-500'
                        }`}
                        style={{ width: `${Math.min(100, t.averagePercentage)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                      <span>Rendimiento: {t.averagePercentage}%</span>
                      <span className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline">
                        Filtrar este corte →
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Métricas Clave Rápidas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Laboratorios Evaluados
                </span>
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                  <FolderKanban className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {activeData.totalEvaluations}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {selectedTerm !== 'TODOS' ? `Entregas en ${selectedTerm}` : 'Entregas en todo el semestre'}
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Promedio Obtenido
                </span>
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                  <Award className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {activeData.globalAverageScore.toFixed(1)}{' '}
                <span className="text-xs font-normal text-slate-400">/ 100</span>
              </div>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1">
                {activeData.globalAveragePercentage.toFixed(1)}% de rendimiento consolidado
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Macro-Categorías
                </span>
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                  <Layers className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {activeData.categories.length}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Áreas temáticas evaluadas</p>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Dominios de Dominio
                </span>
                <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {activeData.domainMastery.length}
              </div>
              <p className="text-[11px] text-purple-600 dark:text-purple-400 font-medium mt-1">
                Competencias técnicas medidas
              </p>
            </div>
          </div>

          {/* Gráfico y Distribución por Categorías */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-indigo-500" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Distribución por Macro-Categorías
                    </h3>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">
                    {activeData.categories.length} categorías
                  </span>
                </div>

                <div className="space-y-4">
                  {activeData.categories.map((cat, idx) => (
                    <div key={idx} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          {cat.category}
                        </span>
                        <div className="flex items-center gap-2 font-mono text-xs">
                          <span className="text-slate-400">({cat.count} labs)</span>
                          <span className="font-bold text-indigo-600 dark:text-indigo-400">
                            {cat.averageScore.toFixed(1)} / 100
                          </span>
                        </div>
                      </div>

                      {/* Barra de Progreso */}
                      <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, cat.averagePercentage)}%` }}
                        />
                      </div>

                      {/* Subcategorías pills */}
                      {cat.subcategories.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2.5">
                          {cat.subcategories.map((sub, sidx) => (
                            <span
                              key={sidx}
                              className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[10px] font-medium text-slate-600 dark:text-slate-400"
                            >
                              {sub.name} ({sub.count})
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Dominio de Competencias */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-emerald-500" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Dominio de Habilidades Técnicas
                    </h3>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">
                    Nivel Promedio
                  </span>
                </div>

                <div className="space-y-4">
                  {activeData.domainMastery.map((domain, idx) => (
                    <div key={idx} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 transition hover:border-slate-200 dark:hover:border-slate-700">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          {domain.domain}
                        </span>
                        <span
                          className={`font-mono text-xs font-bold px-2 py-0.5 rounded-md ${
                            domain.averageMastery >= 80
                              ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                              : domain.averageMastery >= 60
                              ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                              : 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                          }`}
                        >
                          {domain.averageMastery.toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-2 rounded-full transition-all duration-500 ${
                            domain.averageMastery >= 80
                              ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                              : domain.averageMastery >= 60
                              ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                              : 'bg-gradient-to-r from-rose-500 to-pink-500'
                          }`}
                          style={{ width: `${Math.min(100, domain.averageMastery)}%` }}
                        />
                      </div>
                      {domain.topSubdomains.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2.5">
                          {domain.topSubdomains.map((sub, sidx) => (
                            <span
                              key={sidx}
                              className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[10px] font-medium text-slate-600 dark:text-slate-400"
                            >
                              {sub}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Sección de Diagnóstico Pedagógico y Tendencias de Aprendizaje con Criterio de IA */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-500" />
                  Diagnóstico Pedagógico & Criterio de la IA
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Análisis consolidado de fortalezas técnicas, patrones de error recurrentes y directrices de mejora
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Tarjeta 1: Fortalezas Consolidadas */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className="p-2.5 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 shadow-sm">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                        Fortalezas Técnicas Demostradas
                      </h3>
                      <p className="text-[11px] text-slate-400">Prácticas y criterios sobresalientes</p>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    {activeData.topStrengths && activeData.topStrengths.length > 0 ? (
                      activeData.topStrengths.map((str, sidx) => (
                        <div
                          key={sidx}
                          className="p-3 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/25 border border-emerald-100 dark:border-emerald-900/40 text-xs text-slate-700 dark:text-slate-200 flex items-start justify-between gap-3 transition hover:border-emerald-300 dark:hover:border-emerald-800"
                        >
                          <div className="flex items-start gap-2.5 min-w-0">
                            <span className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">✓</span>
                            <span className="font-medium leading-relaxed">{str.strength}</span>
                          </div>
                          <span className="font-mono text-[10px] text-emerald-700 dark:text-emerald-300 font-bold bg-white dark:bg-slate-900 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800 shrink-0">
                            {str.frequency}x
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400 italic py-4 text-center">No se han registrado fortalezas agregadas.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Tarjeta 2: Falencias Críticas y Oportunidades */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className="p-2.5 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 shadow-sm">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                        Áreas Críticas y Falencias Recurrentes
                      </h3>
                      <p className="text-[11px] text-slate-400">Patrones de error detectados</p>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    {activeData.topWeaknesses && activeData.topWeaknesses.length > 0 ? (
                      activeData.topWeaknesses.map((w, widx) => (
                        <div
                          key={widx}
                          className="p-3 rounded-2xl bg-rose-50/60 dark:bg-rose-950/25 border border-rose-100 dark:border-rose-900/40 text-xs text-slate-700 dark:text-slate-200 flex items-start justify-between gap-3 transition hover:border-rose-300 dark:hover:border-rose-800"
                        >
                          <div className="flex items-start gap-2.5 min-w-0">
                            <span className="w-5 h-5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">✕</span>
                            <span className="font-medium leading-relaxed">{w.issue}</span>
                          </div>
                          <span className="font-mono text-[10px] text-rose-700 dark:text-rose-300 font-bold bg-white dark:bg-slate-900 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-800 shrink-0">
                            {w.frequency}x
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400 italic py-4 text-center">No se registran falencias críticas.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Tarjeta 3: Plan de Mejora Pedagógico */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className="p-2.5 rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shadow-sm">
                      <Lightbulb className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                        Acciones Recomendadas para el Aprendizaje
                      </h3>
                      <p className="text-[11px] text-slate-400">Directrices para la excelencia técnica</p>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    {activeData.topImprovements && activeData.topImprovements.length > 0 ? (
                      activeData.topImprovements.map((imp, iidx) => (
                        <div
                          key={iidx}
                          className="p-3 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/25 border border-indigo-100 dark:border-indigo-900/40 text-xs text-slate-700 dark:text-slate-200 flex items-start gap-2.5 transition hover:border-indigo-300 dark:hover:border-indigo-800"
                        >
                          <span className="text-indigo-500 font-bold shrink-0 mt-0.5">💡</span>
                          <span className="font-medium leading-relaxed">{imp.improvement}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400 italic py-4 text-center">Sin recomendaciones agregadas aún.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Retroalimentación Pedagógica Específica y Tendencias por Estudiante / Grupo */}
          {activeData.pedagogicalInsights && activeData.pedagogicalInsights.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/20">
                    <MessageSquareQuote className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Mensajes de Retroalimentación & Criterio de la IA por Trabajo
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Orientaciones y tendencias de aprendizaje formuladas con criterio pedagógico riguroso
                    </p>
                  </div>
                </div>
                <span className="hidden sm:inline-flex px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  {activeData.pedagogicalInsights.length} evaluaciones detalladas
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeData.pedagogicalInsights.map((insight, idx) => (
                  <div
                    key={idx}
                    className="p-5 rounded-2xl bg-gradient-to-b from-slate-50 to-white dark:from-slate-800/80 dark:to-slate-900/80 border border-slate-200/80 dark:border-slate-700/80 shadow-xs space-y-3 transition hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs uppercase shadow-xs">
                          {insight.student.charAt(0)}
                        </div>
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {insight.student}
                        </span>
                      </div>
                      <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold border border-indigo-200 dark:border-indigo-800 truncate max-w-[200px]">
                        {insight.assignment}
                      </span>
                    </div>

                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-800 dark:text-amber-300 font-medium">
                      <Target className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span><strong>Tendencia:</strong> {insight.trend}</span>
                    </div>

                    <div className="relative pl-3 border-l-2 border-indigo-500/80 bg-slate-50/50 dark:bg-slate-950/30 rounded-r-xl p-3">
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed italic">
                        "{insight.feedback}"
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Historial de Trabajos del Periodo */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-500" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Trabajos y Laboratorios Consolidados ({activeData.submissions.length})
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {selectedTerm !== 'TODOS' ? `Mostrando únicamente los laboratorios de ${selectedTerm}` : 'Mostrando laboratorios de todos los cortes del semestre'}
                  </p>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase tracking-wider">
                    <th className="pb-3 font-semibold">Laboratorio / Asignación</th>
                    <th className="pb-3 font-semibold">Estudiante / Equipo</th>
                    <th className="pb-3 font-semibold text-center">Corte</th>
                    <th className="pb-3 font-semibold">Categoría</th>
                    <th className="pb-3 font-semibold text-center">Calificación</th>
                    <th className="pb-3 font-semibold text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {activeData.submissions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                      <td className="py-3.5 pr-4 font-semibold text-slate-900 dark:text-white">
                        {sub.assignmentTitle || sub.projectName}
                      </td>
                      <td className="py-3.5 pr-4 text-slate-600 dark:text-slate-300">
                        {sub.studentName}
                      </td>
                      <td className="py-3.5 px-2 text-center">
                        <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-[11px] font-bold">
                          {sub.term || 'Corte 1'}
                        </span>
                      </td>
                      <td className="py-3.5 pr-4 text-slate-500 dark:text-slate-400">
                        <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-medium">
                          {sub.category || 'General'}
                        </span>
                      </td>
                      <td className="py-3.5 px-2 text-center font-mono font-bold text-slate-800 dark:text-slate-200">
                        {sub.score ?? 0} / {sub.maxScore ?? 100}
                      </td>
                      <td className="py-3.5 pl-4 text-right">
                        {onSelectSubmission && (
                          <button
                            onClick={() => onSelectSubmission(sub.id)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                          >
                            Ver Informe <ArrowUpRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Modal Historial de Infografías Archivadas */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Archive className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Historial de Infografías Globales Archivadas
                </h3>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <div className="py-4 space-y-3">
              {closedInfographics.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  No hay informes consolidados archivados previamente.
                </div>
              ) : (
                closedInfographics.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex flex-wrap items-center justify-between gap-3 hover:border-indigo-400 transition"
                  >
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        {item.title}
                      </h4>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400 font-mono">
                        <span>Periodo: {item.semester}</span>
                        {item.term && <span>• Corte: {item.term}</span>}
                        <span>•</span>
                        <span>{item.totalEvaluations} Labs</span>
                        <span>•</span>
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">
                          Promedio: {item.averageScore.toFixed(1)} / 100 ({item.averagePercentage.toFixed(1)}%)
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-1">
                        Cerrado el {new Date(item.createdAt).toLocaleString('es-ES')}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setViewingArchived(item);
                          setShowHistoryModal(false);
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 text-xs font-semibold hover:bg-indigo-100"
                        title="Ver en pantalla"
                      >
                        <Eye className="w-3.5 h-3.5" /> Ver
                      </button>
                      <button
                        onClick={() => handleDownloadPdf(item.snapshotData, item.title)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-300"
                        title="Descargar PDF"
                      >
                        <Download className="w-3.5 h-3.5" /> PDF
                      </button>
                      <button
                        onClick={() => handleDeleteClosed(item.id)}
                        className="inline-flex items-center p-1.5 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                        title="Eliminar del historial"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmación Cerrar y Archivar Informe */}
      {showCloseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600">
                <Archive className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Cerrar y Archivar Informe {selectedTerm !== 'TODOS' ? selectedTerm : 'Semestre'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Consolidará los {data?.totalEvaluations} laboratorios del filtro actual.
                </p>
              </div>
            </div>

            <div className="space-y-3 my-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Título del Informe Consolidado:
                </label>
                <input
                  type="text"
                  value={reportTitle}
                  onChange={(e) => setReportTitle(e.target.value)}
                  placeholder={`Consolidado ${selectedSemester} - ${selectedTerm}`}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500 font-medium"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 text-[11px] text-amber-800 dark:text-amber-300">
                <p className="font-semibold mb-1">¿Qué sucederá al archivar?</p>
                <ul className="list-disc pl-4 space-y-0.5">
                  <li>Se generará y descargará automáticamente el <strong>PDF estructurado</strong> del informe.</li>
                  <li>Se guardará en el <strong>Historial de Informes</strong> para consultas futuras.</li>
                  <li>Los laboratorios continuarán disponibles en el sistema para consulta individual o comparativa global.</li>
                </ul>
              </div>
            </div>

            {closeSuccess ? (
              <div className="p-3 rounded-xl bg-emerald-50 text-emerald-700 font-bold text-xs text-center flex items-center justify-center gap-2">
                <Check className="w-4 h-4" /> ¡Informe consolidado y archivado con éxito!
              </div>
            ) : (
              <div className="flex items-center justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCloseModal(false)}
                  disabled={isClosing}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleCloseAndArchive}
                  disabled={isClosing}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-sm disabled:opacity-50"
                >
                  {isClosing ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Archivando Informe...
                    </>
                  ) : (
                    <>
                      <Archive className="w-3.5 h-3.5" /> Confirmar y Descargar PDF
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
