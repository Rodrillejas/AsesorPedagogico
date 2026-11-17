import { useRef, useState } from 'react';
import type { DragEvent } from 'react';
import { UploadCloud, CheckCircle2, AlertCircle, Eye, Sparkles } from 'lucide-react';
import type { RubricParsedResponse } from '../types';

interface RubricUploaderProps {
  rubric: RubricParsedResponse | null;
  onRubricLoaded: (rubric: RubricParsedResponse) => void;
}

export const RubricUploader = ({ rubric, onRubricLoaded }: RubricUploaderProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFileProcess = async (file: File) => {
    const validExtensions = ['.pdf', '.md', '.txt', '.docx'];
    const hasValidExt = validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext));

    if (!hasValidExt) {
      setError('Formato no válido. Sube un archivo .PDF, .MD o .TXT');
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/rubrics/extract', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Error al procesar la rúbrica');
      }

      const data: RubricParsedResponse = await res.json();
      onRubricLoaded(data);
    } catch (err: any) {
      setError(err.message || 'Error al subir el archivo');
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

  const loadSampleRubric = () => {
    const sample: RubricParsedResponse = {
      title: 'Rúbrica de Evaluación de Laboratorio de IA y Soluciones Multimodales',
      wordCount: 220,
      content: `RÚBRICA DE EVALUACIÓN TÉCNICA - LABORATORIO DE IA Y DESARROLLO

1. COMPONENTE 0 - MAPA MENTAL: FUNDAMENTOS DE MODELOS DE IA (Ponderación: 15 pts)
- Presentación de mapa mental técnico conceptual (SVG/PNG/PDF) con los principios de LLMs, embeddings y multimodalidad.
- Calidad de la abstracción técnica y claridad del esquema.

2. COMPONENTE 1 - CARTOGRAFÍA DEL ECOSISTEMA DE MODELOS DE IA (Ponderación: 20 pts)
- Matriz comparativa estructurada (en formato CSV o Excel) de modelos propietarios y abiertos.
- Evaluación de métricas clave: latencia, ventana de contexto, costos por millón de tokens y capacidades multimodales.

3. COMPONENTE 2 - EXPERIMENTACIÓN CON MODELOS LOCALES Y VIBE CODING (Ponderación: 35 pts)
- Implementación de scripts funcionales conectando con modelos locales (Ollama / LM Studio).
- Pruebas de series temporales y registro estructurado de respuestas y prompts utilizados.

4. COMPONENTE 3 - ESTRUCTURA, EVIDENCIAS Y REPRODUCIBILIDAD (Ponderación: 30 pts)
- Organización estricta de carpetas (Cartografia_modelos, Mapa_Mental, Modelos_locales, Evidence, serie_temporal, vibe_coding, tools).
- Documentación de dependencias (requirements.txt) y evidencias de ejecución completas.`,
    };
    onRubricLoaded(sample);
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm transition">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-violet-100 dark:bg-violet-950/70 text-violet-600 dark:text-violet-400 flex items-center justify-center font-bold text-sm">
            2
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Rúbrica de Evaluación
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Matriz de criterios y ponderaciones para la cuantificación matemática
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={loadSampleRubric}
          className="text-xs font-medium text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 flex items-center gap-1.5 py-1 px-2.5 rounded-lg bg-violet-50 dark:bg-violet-950/40 border border-violet-200/60 dark:border-violet-900/40 transition"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Usar Rúbrica Modelo
        </button>
      </div>

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
            ? 'border-violet-500 bg-violet-50/50 dark:bg-violet-950/20'
            : 'border-slate-200 dark:border-slate-800 hover:border-violet-400 dark:hover:border-violet-600 bg-slate-50/50 dark:bg-slate-900/40'
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
          <div className="p-2.5 rounded-full bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400">
            <UploadCloud className="w-5 h-5" />
          </div>
          <div className="text-xs font-medium text-slate-700 dark:text-slate-300">
            {loading ? 'Extrayendo criterios de la rúbrica...' : 'Haz clic o arrastra tu archivo de rúbrica (PDF, MD o TXT)'}
          </div>
          <p className="text-[11px] text-slate-400">Ponderaciones numéricas y descriptores de desempeño</p>
        </div>
      </div>

      {error && (
        <div className="mt-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {rubric && (
        <div className="mt-3 p-3.5 rounded-xl bg-violet-50/60 dark:bg-violet-950/30 border border-violet-200/80 dark:border-violet-900/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <div>
                <h4 className="text-xs font-semibold text-slate-900 dark:text-white">
                  {rubric.title}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {rubric.wordCount} palabras extraídas
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className="text-xs text-violet-700 dark:text-violet-300 hover:underline flex items-center gap-1 font-medium"
            >
              <Eye className="w-3.5 h-3.5" />
              {showPreview ? 'Ocultar' : 'Ver Criterios'}
            </button>
          </div>

          {showPreview && (
            <div className="mt-2 p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-700 dark:text-slate-300 max-h-40 overflow-y-auto whitespace-pre-wrap">
              {rubric.content}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
