import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { GlobalInfographicData } from '../types';

export const exportInfographicToPdf = (data: GlobalInfographicData, customTitle?: string) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const semesterStr = data.semester && data.semester !== 'TODOS' ? data.semester : (data.submissions[0]?.semester || 'Semestre Académico');
  const termStr = data.term && data.term !== 'TODOS' ? data.term : 'Consolidado General (Todos los Cortes)';
  const periodLabel = `${semesterStr} | ${termStr}`;

  // Primary Header
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 210, 36, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('CONSOLIDADO ANALÍTICO E INFOGRAFÍA ACADÉMICA', 14, 15);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(199, 210, 254); // indigo-200
  doc.text(`Sistema EvalAI-Auditor | Periodo: ${periodLabel} | Fecha: ${new Date().toLocaleDateString('es-ES')}`, 14, 24);
  doc.text(`Total Evaluaciones: ${data.totalEvaluations} | Promedio Global: ${data.globalAverageScore.toFixed(1)} / 100 (${data.globalAveragePercentage.toFixed(1)}%)`, 14, 30);

  let currentY = 44;

  // Resumen Ejecutivo Cards
  doc.setFillColor(248, 250, 252); // slate-50
  doc.roundedRect(14, currentY, 58, 20, 2, 2, 'F');
  doc.roundedRect(76, currentY, 58, 20, 2, 2, 'F');
  doc.roundedRect(138, currentY, 58, 20, 2, 2, 'F');

  doc.setTextColor(100, 116, 139);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('ENTREGAS AUDITADAS', 18, currentY + 6);
  doc.text('PROMEDIO GENERAL', 80, currentY + 6);
  doc.text('TASA DE DOMINIO', 142, currentY + 6);

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(13);
  doc.text(`${data.totalEvaluations} Laboratorios`, 18, currentY + 14);
  doc.text(`${data.globalAverageScore.toFixed(1)} / 100`, 80, currentY + 14);
  doc.text(`${data.globalAveragePercentage.toFixed(1)}%`, 142, currentY + 14);

  currentY += 28;

  // Sección 0: Comparativa por Cortes (si está disponible y se visualiza todo el semestre)
  if (data.termStats && data.termStats.length > 0) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('COMPARATIVA DE RENDIMIENTO POR CORTES ACADÉMICOS', 14, currentY);
    currentY += 4;

    const termRows = data.termStats.map((t) => [
      t.term,
      `${t.count} laboratorios`,
      `${t.averageScore.toFixed(1)} / 100`,
      `${t.averagePercentage.toFixed(1)}%`,
      t.count > 0 ? (t.averagePercentage >= 70 ? 'CUMPLIMIENTO ESPERADO' : 'REQUIERE REFUERZO') : 'Sin evaluaciones',
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['Corte Evaluado', 'Entregas', 'Promedio Obtenido', 'Tasa de Aprobación', 'Diagnóstico']],
      body: termRows,
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
      styles: { fontSize: 8, cellPadding: 2.5 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 35 },
        1: { halign: 'center', cellWidth: 30 },
        2: { halign: 'center', cellWidth: 35 },
        3: { halign: 'center', cellWidth: 35 },
        4: { cellWidth: 'auto' },
      },
    });

    currentY = (doc as any).lastAutoTable.finalY + 10;
  }

  // Sección 1: Distribución por Macro-Categorías
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('1. RENDIMIENTO POR MACRO-CATEGORÍAS DE APRENDIZAJE', 14, currentY);
  currentY += 4;

  const categoryRows = data.categories.map((c) => [
    c.category,
    `${c.count} (${((c.count / (data.totalEvaluations || 1)) * 100).toFixed(0)}%)`,
    `${c.averageScore.toFixed(1)} / 100`,
    `${c.averagePercentage.toFixed(1)}%`,
    c.subcategories.map((s) => `${s.name} (${s.count})`).join(', ') || 'N/A',
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [['Categoría de Conocimiento', 'Entregas', 'Promedio', 'Dominio (%)', 'Subcategorías Detectadas']],
    body: categoryRows,
    theme: 'grid',
    headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    styles: { fontSize: 8, cellPadding: 2.5 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 40 },
      1: { halign: 'center', cellWidth: 22 },
      2: { halign: 'center', cellWidth: 22 },
      3: { halign: 'center', cellWidth: 22 },
      4: { cellWidth: 'auto' },
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + 10;

  // Sección 2: Dominio de Habilidades Técnicas
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('2. DOMINIO DE HABILIDADES TÉCNICAS (ÁREAS Y SUBDOMINIOS)', 14, currentY);
  currentY += 4;

  const domainRows = data.domainMastery.map((d) => [
    d.domain,
    `${d.averageMastery.toFixed(1)}%`,
    d.averageMastery >= 80 ? 'NIVEL ALTO' : d.averageMastery >= 60 ? 'NIVEL MEDIO' : 'REQUIERE REFUERZO',
    d.topSubdomains.join(', ') || 'General',
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [['Dominio Técnico Evaluado', 'Dominio (%)', 'Nivel de Competencia', 'Subdominios Clave']],
    body: domainRows,
    theme: 'grid',
    headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    styles: { fontSize: 8, cellPadding: 2.5 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 45 },
      1: { halign: 'center', cellWidth: 25 },
      2: { halign: 'center', cellWidth: 35 },
      3: { cellWidth: 'auto' },
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + 10;

  // Sección 2.5: Fortalezas Técnicas Sobresalientes
  if (data.topStrengths && data.topStrengths.length > 0) {
    if (currentY > 230) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('3. FORTALEZAS TÉCNICAS DESTACADAS', 14, currentY);
    currentY += 4;

    const strengthRows = data.topStrengths.map((s, i) => [
      `#${i + 1}`,
      s.strength,
      `${s.frequency} recurrencia${s.frequency > 1 ? 's' : ''}`,
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['#', 'Práctica o Criterio Sobresaliente', 'Frecuencia']],
      body: strengthRows,
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
      styles: { fontSize: 8, cellPadding: 2.5 },
      columnStyles: {
        0: { halign: 'center', cellWidth: 12 },
        1: { cellWidth: 'auto' },
        2: { halign: 'center', cellWidth: 30 },
      },
    });

    currentY = (doc as any).lastAutoTable.finalY + 10;
  }

  // Sección 3: Brechas Comunes y Áreas de Oportunidad
  if (data.topWeaknesses && data.topWeaknesses.length > 0) {
    if (currentY > 230) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('4. BRECHAS COMUNES Y ÁREAS DE MEJORA IDENTIFICADAS', 14, currentY);
    currentY += 4;

    const weaknessRows = data.topWeaknesses.map((w, i) => [
      `#${i + 1}`,
      w.issue,
      `${w.frequency} ocurrencia${w.frequency > 1 ? 's' : ''}`,
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['#', 'Falla o Falencia Técnica Recurrente', 'Frecuencia']],
      body: weaknessRows,
      theme: 'grid',
      headStyles: { fillColor: [225, 29, 72], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
      styles: { fontSize: 8, cellPadding: 2.5 },
      columnStyles: {
        0: { halign: 'center', cellWidth: 12 },
        1: { cellWidth: 'auto' },
        2: { halign: 'center', cellWidth: 30 },
      },
    });

    currentY = (doc as any).lastAutoTable.finalY + 10;
  }

  // Sección 3.5: Retroalimentación Pedagógica y Tendencias
  if (data.pedagogicalInsights && data.pedagogicalInsights.length > 0) {
    if (currentY > 220) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('5. RETROALIMENTACIÓN PEDAGÓGICA Y TENDENCIAS POR ESTUDIANTE', 14, currentY);
    currentY += 4;

    const insightRows = data.pedagogicalInsights.map((ins, i) => [
      (i + 1).toString(),
      ins.student,
      ins.assignment,
      ins.trend,
      ins.feedback.length > 130 ? `${ins.feedback.slice(0, 130)}...` : ins.feedback,
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['#', 'Estudiante / Equipo', 'Trabajo', 'Tendencia', 'Mensaje Pedagógico']],
      body: insightRows,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
      styles: { fontSize: 7.5, cellPadding: 2 },
      columnStyles: {
        0: { halign: 'center', cellWidth: 8 },
        1: { cellWidth: 35 },
        2: { cellWidth: 35 },
        3: { cellWidth: 35 },
        4: { cellWidth: 'auto' },
      },
    });

    currentY = (doc as any).lastAutoTable.finalY + 10;
  }

  // Sección 6: Listado Consolidado de Trabajos
  if (currentY > 220) {
    doc.addPage();
    currentY = 20;
  }

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('6. DETALLE DE TRABAJOS Y EQUIPOS EVALUADOS', 14, currentY);
  currentY += 4;

  const submissionRows = data.submissions.map((sub, i) => [
    (i + 1).toString(),
    sub.assignmentTitle || sub.projectName,
    sub.studentName,
    sub.term || 'Corte 1',
    sub.category || 'General',
    `${sub.score ?? 0} / ${sub.maxScore ?? 100}`,
    new Date(sub.date).toLocaleDateString('es-ES'),
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [['#', 'Laboratorio / Proyecto', 'Estudiantes / Grupo', 'Corte', 'Categoría', 'Nota', 'Fecha']],
    body: submissionRows,
    theme: 'grid',
    headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    styles: { fontSize: 8, cellPadding: 2 },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { cellWidth: 46 },
      2: { cellWidth: 46 },
      3: { halign: 'center', cellWidth: 20 },
      4: { cellWidth: 26 },
      5: { halign: 'center', cellWidth: 20 },
      6: { halign: 'center', cellWidth: 16 },
    },
  });

  // Guardar archivo PDF
  const sanitizedTitle = (customTitle || `Consolidado_${semesterStr}_${termStr}`)
    .replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`${sanitizedTitle}.pdf`);
};

