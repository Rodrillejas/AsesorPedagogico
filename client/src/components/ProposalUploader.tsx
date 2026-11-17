import { useState, useRef } from 'react';
import type { DragEvent } from 'react';
import { UploadCloud, Eye, Sparkles, CheckCircle2 } from 'lucide-react';

interface ProposalUploaderProps {
  proposalContent: string;
  setProposalContent: (val: string) => void;
  assignmentTitle: string;
  setAssignmentTitle: (val: string) => void;
}

export const ProposalUploader = ({
  proposalContent,
  setProposalContent,
  assignmentTitle,
  setAssignmentTitle,
}: ProposalUploaderProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFileProcess = async (file: File) => {
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/rubrics/extract', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setProposalContent(data.content);
        if (!assignmentTitle) {
          setAssignmentTitle(data.title);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const loadSampleProposal = () => {
    setAssignmentTitle('Laboratorio 1: Fundamentos de IA y Modelos Multimodales');
    setProposalContent(`PROPUESTA DE LABORATORIO - INGENIERÍA DE IA & SOFTWARE AVANZADO

1. OBJETIVOS DEL EXPERIMENTO:
- Comparar y evaluar proveedores y modelos fundacionales de Inteligencia Artificial (OpenAI, Gemini, Ollama, Anthropic).
- Diseñar un mapa mental técnico que conceptualice los fundamentos de los LLMs y modelos multimodales.
- Elaborar una matriz de cartografía de modelos en formato estructurado (Excel/CSV) con comparativa de latencias, precios, tamaños de contexto y modalidades soportadas.
- Desarrollar pruebas con modelos locales (Ollama / LM Studio) y modelos de series temporales.

2. LINEAMIENTOS Y RESTRICCIONES TÉCNICAS:
- La entrega debe estar organizada en subdirectorios claros: Cartografia_modelos, Mapa_Mental, Modelos_locales, Evidence, serie_temporal, tools y vibe_coding.
- No se deben subir entornos virtuales pesados (.venv) o artefactos de caché.
- Incluir archivo de dependencias requirements.txt documentado.`);
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm transition">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm">
            1
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Propuesta del Laboratorio
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Objetivos, instrucciones y lineamientos del experimento
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={loadSampleProposal}
          className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1.5 py-1 px-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-900/40 transition"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Usar Propuesta Modelo
        </button>
      </div>

      <div className="mb-3">
        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
          Título de la Práctica / Asignación
        </label>
        <input
          type="text"
          placeholder="Ej: Laboratorio 1 - Fundamentos de IA y Modelos Locales"
          value={assignmentTitle}
          onChange={(e) => setAssignmentTitle(e.target.value)}
          className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Dropzone o editor de texto */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
          dragOver
            ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20'
            : 'border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 bg-slate-50/50 dark:bg-slate-900/40'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.md,.txt,.docx"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleFileProcess(e.target.files[0]);
            }
          }}
        />

        <div className="flex flex-col items-center gap-1.5">
          <div className="p-2.5 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
            <UploadCloud className="w-5 h-5" />
          </div>
          <div className="text-xs font-medium text-slate-700 dark:text-slate-300">
            {loading ? 'Extrayendo lineamientos...' : 'Arrastra el PDF, Word o archivo con la guía del laboratorio'}
          </div>
          <p className="text-[11px] text-slate-400">O haz clic para seleccionarlo de tu equipo</p>
        </div>
      </div>

      {proposalContent && (
        <div className="mt-3 p-3.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-900/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              Guía del laboratorio cargada ({proposalContent.split(/\s+/).length} palabras)
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-medium"
          >
            <Eye className="w-3.5 h-3.5" />
            {showPreview ? 'Ocultar' : 'Ver Guía'}
          </button>
        </div>
      )}

      {showPreview && proposalContent && (
        <div className="mt-2 p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-700 dark:text-slate-300 max-h-40 overflow-y-auto whitespace-pre-wrap">
          {proposalContent}
        </div>
      )}
    </div>
  );
};
