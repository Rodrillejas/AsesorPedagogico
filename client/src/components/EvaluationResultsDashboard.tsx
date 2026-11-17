import { useState } from 'react';
import {
  Download,
  FileDown,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Layers,
  Code2,
  CheckSquare,
  Square,
  Award,
  ClipboardCheck,
  TrendingUp,
} from 'lucide-react';
import type { EvaluationResultData } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface EvaluationResultsDashboardProps {
  result: EvaluationResultData;
  studentName: string;
  projectName: string;
  assignmentTitle?: string;
}

export const EvaluationResultsDashboard = ({
  result,
  studentName,
  projectName,
  assignmentTitle,
}: EvaluationResultsDashboardProps) => {
  const [completedImprovements, setCompletedImprovements] = useState<Record<number, boolean>>({});

  const toggleImprovement = (index: number) => {
    setCompletedImprovements((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const getScoreColor = (score: number, max: number) => {
    const ratio = score / max;
    if (ratio >= 0.8) return 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800';
    if (ratio >= 0.6) return 'text-amber-500 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800';
    return 'text-rose-500 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800';
  };

  const getStatusBadge = (status: 'PASS' | 'PARTIAL' | 'FAIL') => {
    switch (status) {
      case 'PASS':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5" /> APROBADO
          </span>
        );
      case 'PARTIAL':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
            <HelpCircle className="w-3.5 h-3.5" /> PARCIAL
          </span>
        );
      case 'FAIL':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
            <XCircle className="w-3.5 h-3.5" /> NO CUMPLE
          </span>
        );
    }
  };

  const getSeverityBadge = (severity: 'CRITICAL' | 'WARNING' | 'INFO') => {
    switch (severity) {
      case 'CRITICAL':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            CRÍTICO
          </span>
        );
      case 'WARNING':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            ADVERTENCIA
          </span>
        );
      case 'INFO':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            SUGERENCIA
          </span>
        );
    }
  };

  const exportToMarkdown = () => {
    const md = `# INFORME INDIVIDUAL DE LABORATORIO - EVALAI-AUDITOR

- **Laboratorio / Asignación:** ${assignmentTitle || projectName || 'Sin título'}
- **Estudiante / Equipo:** ${studentName}
- **Categoría:** ${result.category || 'General'} > ${result.subcategory || 'Práctica'}
- **Fecha de Evaluación:** ${new Date(result.createdAt).toLocaleString()}
- **Calificación Cuantificada:** ${result.overallScore} / ${result.maxScore}

---

## 1. Verificación de Requerimientos Entregados
${result.verificationNotes || 'Cotejo completado satisfactoriamente contra la rúbrica y propuesta.'}

---

## 2. Resumen Ejecutivo y Argumentación Técnica
${result.summary}

---

## 3. Desglose de Criterios (Cuantificación Matemática)
| Criterio | Ponderación | Puntaje Obtenido | Estado | Argumentación y Feedback |
| :--- | :--- | :--- | :--- | :--- |
${result.criteriaResults
  .map(
    (c) =>
      `| ${c.criterionName} | ${c.weight} pts | ${c.scoreEarned} pts | ${c.status} | ${c.feedback.replace(/\n/g, ' ')} |`,
  )
  .join('\n')}

---

## 4. Errores, Antipatrones y Oportunidades de Corrección
${
  result.negativeAspects.length === 0
    ? '_No se detectaron fallos críticos en la solución entregada._'
    : result.negativeAspects
        .map(
          (err, idx) =>
            `${idx + 1}. **[${err.severity}]** \`${err.file}\`${err.line ? ` (Línea ${err.line})` : ''}: ${err.issue}`,
        )
        .join('\n')
}

---

## 5. Recomendaciones de Mejora Accionables
${result.improvementPlan.map((item) => `- [ ] ${item}`).join('\n')}

---
*Informe generado automáticamente por el Motor de Evaluación Multimodal de EvalAI-Auditor.*
`;

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Informe_${studentName.replace(/\s+/g, '_')}_${Date.now()}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportToPdf = () => {
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.setTextColor(30, 41, 59);
    doc.text('INFORME DE EVALUACION DE LABORATORIO', 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Laboratorio: ${assignmentTitle || projectName || 'N/A'}`, 14, 28);
    doc.text(`Estudiante / Equipo: ${studentName}`, 14, 34);
    doc.text(`Dominio: ${result.category || 'General'} - ${result.subcategory || 'Práctica'}`, 14, 40);
    doc.text(`Fecha: ${new Date(result.createdAt).toLocaleString()}`, 14, 46);

    // Score box
    doc.setDrawColor(203, 213, 225);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(138, 14, 58, 34, 3, 3, 'FD');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text('CALIFICACION GLOBAL', 142, 22);
    doc.setFontSize(20);
    doc.setTextColor(37, 99, 235);
    doc.text(`${result.overallScore} / ${result.maxScore}`, 142, 34);
    doc.setFontSize(9);
    doc.setTextColor(16, 185, 129);
    doc.text(`${Math.round((result.overallScore / result.maxScore) * 100)}% de maestría`, 142, 42);

    // Verificación
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text('1. Verificacion de Entregables (Cotejo Tecnico)', 14, 58);
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    const splitVerif = doc.splitTextToSize(result.verificationNotes || result.summary, 180);
    doc.text(splitVerif, 14, 64);

    let currentY = 64 + splitVerif.length * 4.2 + 8;

    // Resumen
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text('2. Resumen y Argumentacion', 14, currentY);
    currentY += 6;
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    const splitSummary = doc.splitTextToSize(result.summary, 180);
    doc.text(splitSummary, 14, currentY);
    currentY += splitSummary.length * 4.2 + 8;

    // Tabla de criterios
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text('3. Cuantificacion por Criterio', 14, currentY);
    currentY += 4;

    const tableRows = result.criteriaResults.map((c) => [
      c.criterionName,
      `${c.scoreEarned} / ${c.weight}`,
      c.status,
      c.feedback,
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['Criterio', 'Puntaje', 'Estado', 'Feedback Tecnico']],
      body: tableRows,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [79, 70, 229] },
      columnStyles: {
        0: { cellWidth: 42 },
        1: { cellWidth: 20 },
        2: { cellWidth: 22 },
        3: { cellWidth: 96 },
      },
    });

    doc.save(`Informe_${studentName.replace(/\s+/g, '_')}_${Date.now()}.pdf`);
  };

  const percentage = Math.round((result.overallScore / result.maxScore) * 100);

  return (
    <div className="space-y-6">
      {/* Top Header & Export Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1">
            <Award className="w-4 h-4" /> Informe Individual de Laboratorio
            {result.category && (
              <span className="ml-2 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                {result.category} &gt; {result.subcategory}
              </span>
            )}
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {assignmentTitle || projectName || 'Evaluación Técnica de Laboratorio'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Estudiante / Equipo: <span className="font-semibold text-slate-700 dark:text-slate-300">{studentName}</span> • Fecha: {new Date(result.createdAt).toLocaleString()}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={exportToMarkdown}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition"
          >
            <Download className="w-3.5 h-3.5" />
            Exportar Markdown
          </button>
          <button
            type="button"
            onClick={exportToPdf}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 shadow-sm transition"
          >
            <FileDown className="w-3.5 h-3.5" />
            Descargar Informe PDF
          </button>
        </div>
      </div>

      {/* Salida 1: Cuantificación Global y Salida 2: Verificación */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Cuantificación Matemática Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between items-center text-center">
          <div className="w-full">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Salida 3: Cuantificación Numérica
            </div>
            <div
              className={`inline-flex items-baseline gap-1 px-6 py-4 rounded-2xl border ${getScoreColor(
                result.overallScore,
                result.maxScore,
              )}`}
            >
              <span className="text-5xl font-extrabold tracking-tight">{result.overallScore}</span>
              <span className="text-lg font-bold text-slate-400">/ {result.maxScore}</span>
            </div>
          </div>

          <div className="w-full mt-4">
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>Porcentaje de cumplimiento</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{percentage}%</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  percentage >= 80 ? 'bg-emerald-500' : percentage >= 60 ? 'bg-amber-500' : 'bg-rose-500'
                }`}
                style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
              />
            </div>
          </div>
        </div>

        {/* Salida 1: Verificación de Requerimientos */}
        <div className="md:col-span-2 bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <ClipboardCheck className="w-4 h-4 text-emerald-500" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
                Salida 1: Verificación de Requerimientos (Cotejo Técnico)
              </h3>
            </div>
            <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300 whitespace-pre-line">
              {result.verificationNotes || result.summary}
            </p>
          </div>

          {result.positiveAspects && result.positiveAspects.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Elementos Cumplidos con Éxito
              </div>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs text-slate-600 dark:text-slate-400">
                {result.positiveAspects.slice(0, 4).map((pos, i) => (
                  <li key={i} className="truncate">• {pos}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Competencias por Dominio (Infografía individual de habilidades) */}
      {result.domainSkills && result.domainSkills.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-indigo-500" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
              Nivel de Maestría por Dominios Técnicos
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {result.domainSkills.map((skill, idx) => (
              <div key={idx} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{skill.domain}</span>
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{skill.masteryPercentage}%</span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">{skill.subdomain}</div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full"
                    style={{ width: `${skill.masteryPercentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Salida 2: Desglose por Criterios de la Rúbrica con Argumentación */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 mb-4">
          <Layers className="w-4 h-4 text-indigo-500" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
            Desglose Matemático y Feedback por Criterios
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase tracking-wider">
                <th className="pb-3 font-semibold">Criterio de la Rúbrica</th>
                <th className="pb-3 font-semibold text-center w-28">Puntaje</th>
                <th className="pb-3 font-semibold text-center w-32">Estado</th>
                <th className="pb-3 font-semibold">Argumentación Técnica y Justificación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {result.criteriaResults.map((c, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                  <td className="py-3.5 pr-4 font-semibold text-slate-800 dark:text-slate-200">
                    {c.criterionName}
                  </td>
                  <td className="py-3.5 px-2 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                    {c.scoreEarned} / {c.weight}
                  </td>
                  <td className="py-3.5 px-2 text-center">
                    {getStatusBadge(c.status)}
                  </td>
                  <td className="py-3.5 pl-4 text-slate-600 dark:text-slate-300 leading-relaxed">
                    {c.feedback}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Errores y Antipatrones Detectados */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-500" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
              Errores, Antipatrones y Oportunidades de Corrección ({result.negativeAspects.length})
            </h3>
          </div>
        </div>

        {result.negativeAspects.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            🎉 ¡Excelente trabajo! No se detectaron fallos críticos o malas prácticas graves en la solución.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {result.negativeAspects.map((flaw, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl border border-rose-100 dark:border-rose-950/80 bg-rose-50/30 dark:bg-rose-950/20 flex flex-col justify-between space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-700 dark:text-slate-300 truncate">
                    <Code2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span className="font-semibold text-slate-900 dark:text-white truncate">
                      {flaw.file}
                    </span>
                    {flaw.line && (
                      <span className="text-slate-400">:(línea {flaw.line})</span>
                    )}
                  </div>
                  {getSeverityBadge(flaw.severity)}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {flaw.issue}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Salida 2: Recomendaciones de Mejoras y Argumentación */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <CheckSquare className="w-4 h-4 text-emerald-500" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
            Salida 2: Recomendaciones de Mejoras y Plan de Refactorización
          </h3>
        </div>

        <div className="space-y-2">
          {result.improvementPlan.map((item, idx) => {
            const isDone = !!completedImprovements[idx];
            return (
              <div
                key={idx}
                onClick={() => toggleImprovement(idx)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                  isDone
                    ? 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-60'
                    : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700'
                }`}
              >
                <button type="button" className="mt-0.5 text-indigo-600 dark:text-indigo-400 shrink-0">
                  {isDone ? <CheckSquare className="w-4 h-4 text-emerald-500" /> : <Square className="w-4 h-4 text-slate-400" />}
                </button>
                <span
                  className={`text-xs leading-relaxed ${
                    isDone ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {item}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
