import { Injectable, Logger, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import OpenAI from 'openai';
import { ApiKeyService } from '../config/api-key.service';
import { AiEvaluationResponse } from './evaluation.schema';

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);

  // Modelos oficiales optimizados por velocidad y disponibilidad en Google AI Studio
  private readonly GEMINI_MODELS = [
    'gemini-3.1-flash-lite',
    'gemini-3.1-flash-lite-preview',
    'gemini-flash-lite-latest',
    'gemini-flash-latest',
  ];

  private readonly OPENAI_MODELS = [
    'gpt-4o-mini',
    'gpt-4o',
    'gpt-4.1-mini',
  ];

  // Límite de seguridad para mantenerse holgadamente por debajo de los 250k tokens/min
  private readonly MAX_PAYLOAD_CHARS = 160000;

  constructor(private readonly apiKeyService: ApiKeyService) {}

  async evaluateCodebase(
    rubricText: string,
    fileTreeJson: any,
    consolidatedCode: string,
    studentGroupMembers?: string,
    semesterTitle?: string,
    termTitle?: string,
  ): Promise<AiEvaluationResponse> {
    const { provider, apiKey } = await this.apiKeyService.getActiveKey();

    if (!apiKey) {
      throw new BadRequestException(
        'No hay ninguna API Key configurada. Por favor ingresa tu clave en el modal de configuración superior.',
      );
    }

    const systemPrompt = `Eres un Evaluador y Auditor Técnico Académico Senior del más alto nivel de exigencia, rigor e imparcialidad técnica.
Tu misión es auditar objetivamente la solución entregada con base EXCLUSIVA en la Rúbrica de Evaluación suministrada y las evidencias reales del código y archivos.

REGLAS ESTRICTAS CONTRA ALUCINACIONES:
1. RIGOR E IMPARCIALIDAD: Evalúa únicamente lo que esté presente en el árbol de archivos y en el código consolidado. Si un componente o archivo no existe, indícalo claramente y asigna 0 o puntaje proporcional fundamentado.
2. RECONOCIMIENTO DE ARCHIVOS Y MULTIMODALIDAD:
   - Los archivos Excel convertidos (ej. 'modelos.csv.xlsx') CONTIENEN la matriz de cartografía en formato de tabla. Revísalos con detalle.
   - Los diagramas o imágenes (ej. 'mapa_mental_ia_radial.svg', '.png') demuestran la existencia y diseño del mapa mental técnico.
   - Los scripts (.py, .ts, etc.) en 'Modelos_locales', 'serie_temporal', 'vibe_coding' y 'tools' representan la implementación técnica y experimentación.
3. CUANTIFICACIÓN MATEMÁTICA EXACTA:
   - La suma de los pesos de la rúbrica debe corresponder al puntaje máximo (ej. 100).
   - Cada 'scoreEarned' debe ser proporcional al nivel de cumplimiento del criterio correspondiente.
4. SALIDAS ESTRUCTURADAS OBLIGATORIAS:
   - 'verification': Cotejo exhaustivo de requerimientos cumplidos vs faltantes con criterio técnico estricto.
   - 'generalSummary': Resumen profesional y analítico del laboratorio.
   - 'learningTrend': Diagnóstico de la tendencia de aprendizaje (ej. "En consolidación acelerada hacia producción", "Dominio conceptual sólido con brechas en modularidad").
   - 'pedagogicalFeedback': Mensaje pedagógico empático, fundamentado, motivador y orientado al crecimiento continuo del estudiante.
   - 'category' y 'subcategory': Clasificación macro del laboratorio para consolidar en la Infografía Global (ej. "Inteligencia Artificial" > "Modelos Fundacionales").
   - 'domainSkills': Array con dominios evaluados (ej. "Arquitectura y Modularidad", "Modelado y Datos", "Experimentación Local") con masteryPercentage (0-100) y 'trendFeedback' descriptivo.
   - 'flawsAndErrors': Array con archivos reales y descripciones concretas de fallos o malas prácticas identificadas con criterio.
   - 'improvements': Recomendaciones claras y accionables para corregir las fallas y perfeccionar la solución.

Devuelve estrictamente un JSON válido con este formato:
{
  "overallScore": number,
  "maxScore": number,
  "category": string,
  "subcategory": string,
  "learningTrend": string,
  "pedagogicalFeedback": string,
  "verification": string,
  "generalSummary": string,
  "domainSkills": [
    { "domain": "string", "subdomain": "string", "masteryPercentage": number, "trendFeedback": "string" }
  ],
  "criteriaBreakdown": [
    {
      "criterionName": "string",
      "weight": number,
      "scoreEarned": number,
      "feedback": "string",
      "status": "PASS" | "PARTIAL" | "FAIL"
    }
  ],
  "flawsAndErrors": [
    {
      "file": "string",
      "line": "string (opcional)",
      "issue": "string",
      "severity": "CRITICAL" | "WARNING" | "INFO"
    }
  ],
  "improvements": ["string"]
}`;

    let safeCode = consolidatedCode;
    if (safeCode.length > this.MAX_PAYLOAD_CHARS) {
      this.logger.warn(`El código supera ${this.MAX_PAYLOAD_CHARS} caracteres. Truncando para respetar la cuota del nivel gratuito.`);
      safeCode =
        safeCode.slice(0, this.MAX_PAYLOAD_CHARS) +
        '\n\n[... Archivos adicionales omitidos para respetar la cuota gratuita de la API ...]';
    }

    const userPrompt = `A continuación se presentan los detalles del trabajo a auditar:

${semesterTitle ? `=== PERIODO ACADÉMICO / SEMESTRE ===\n${semesterTitle}\n\n` : ''}
${termTitle ? `=== CORTE EVALUADO ===\n${termTitle}\n\n` : ''}
${studentGroupMembers ? `=== ESTUDIANTES / INTEGRANTES DEL EQUIPO ===\n${studentGroupMembers}\n\n` : ''}
=== RÚBRICA DE EVALUACIÓN COMPLETA (CRITERIOS Y PONDERACIONES) ===
${rubricText}

=== ESTRUCTURA DE ARCHIVOS DE LA SOLUCIÓN ENTREGADA ===
${JSON.stringify(fileTreeJson, null, 2)}

=== CONTENIDO Y EVIDENCIAS DE LA SOLUCIÓN (MULTIMODAL) ===
${safeCode}

Por favor, audita con máximo rigor técnico y responde en formato JSON estricto respetando el esquema sin alucinaciones.`;

    if (provider === 'openai') {
      return this.executeWithOpenAi(apiKey, systemPrompt, userPrompt);
    } else {
      return this.executeWithGemini(apiKey, systemPrompt, userPrompt);
    }
  }

  private async executeWithGemini(
    apiKey: string,
    systemPrompt: string,
    userPrompt: string,
  ): Promise<AiEvaluationResponse> {
    let lastError: any = null;

    for (const modelName of this.GEMINI_MODELS) {
      let attempts = 0;
      const maxModelAttempts = 2;

      while (attempts < maxModelAttempts) {
        attempts++;
        try {
          this.logger.log(`Auditing codebase with Google Gemini model: ${modelName} (attempt ${attempts})...`);

          const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey.trim()}`;
          const payload = {
            system_instruction: {
              parts: [{ text: systemPrompt }],
            },
            contents: [
              {
                role: 'user',
                parts: [{ text: userPrompt }],
              },
            ],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.1, // Baja temperatura para cero alucinaciones y máxima consistencia matemática
            },
          };

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 segundos máximo por intento

          let response: Response;
          let data: any;

          try {
            response = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
              signal: controller.signal,
            });
            data = await response.json();
          } finally {
            clearTimeout(timeoutId);
          }

          if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
            this.logger.log(`Successfully completed audit with model: ${modelName}!`);
            const text = data.candidates[0].content.parts[0].text;
            return this.parseAndValidateResponse(text);
          }

          const errMsg = data.error?.message || `HTTP ${response.status}`;
          this.logger.warn(`Model ${modelName} returned error: ${errMsg}`);
          lastError = new Error(errMsg);

          if (response.status === 429 || errMsg.includes('Quota exceeded') || errMsg.includes('rate-limits')) {
            const match = errMsg.match(/retry in ([0-9.]+)s/);
            const waitSeconds = match ? Math.min(15, Math.ceil(parseFloat(match[1]))) : 5;
            this.logger.log(`Rate limit detected. Waiting ${waitSeconds}s before retrying...`);
            await new Promise((resolve) => setTimeout(resolve, (waitSeconds + 1) * 1000));
            continue;
          }

          break;
        } catch (err: any) {
          lastError = err;
          break;
        }
      }
    }

    throw new InternalServerErrorException(
      `Error al evaluar con Google Gemini: ${lastError?.message || 'Ningún modelo disponible respondió'}.`,
    );
  }

  private async executeWithOpenAi(
    apiKey: string,
    systemPrompt: string,
    userPrompt: string,
  ): Promise<AiEvaluationResponse> {
    this.logger.log('Auditing codebase with OpenAI...');
    const openai = new OpenAI({ apiKey: apiKey.trim() });
    let lastError: any = null;

    for (const model of this.OPENAI_MODELS) {
      try {
        this.logger.log(`Trying OpenAI model: ${model}...`);
        const response = await openai.chat.completions.create({
          model,
          temperature: 0.1,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
        });

        const content = response.choices[0]?.message?.content;
        if (content) {
          return this.parseAndValidateResponse(content);
        }
      } catch (err: any) {
        lastError = err;
        this.logger.warn(`OpenAI model ${model} failed: ${err.message}`);

        if (
          err.status === 429 &&
          (err.message?.includes('credits') || err.message?.includes('billing'))
        ) {
          throw new BadRequestException(
            'Tu cuenta de OpenAI no tiene saldo disponible (Credits: 0). Por favor usa Google Gemini, el cual es 100% gratuito.',
          );
        }

        continue;
      }
    }

    throw new InternalServerErrorException(
      `Error al conectar con OpenAI: ${lastError?.message || 'Error desconocido'}`,
    );
  }

  private parseAndValidateResponse(rawText: string): AiEvaluationResponse {
    let clean = rawText.trim();
    // Extraer limpiamente el bloque JSON principal evitando texto previo o posterior
    const jsonMatch = clean.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      clean = jsonMatch[0];
    } else {
      if (clean.startsWith('```json')) {
        clean = clean.replace(/^```json/, '').replace(/```$/, '').trim();
      } else if (clean.startsWith('```')) {
        clean = clean.replace(/^```/, '').replace(/```$/, '').trim();
      }
    }

    try {
      const data = JSON.parse(clean);

      const criteriaBreakdown = Array.isArray(data.criteriaBreakdown)
        ? data.criteriaBreakdown.map((c: any) => ({
            criterionName: c.criterionName || c.criterion || 'Criterio evaluado',
            weight: typeof c.weight === 'number' ? c.weight : (c.maxScore || 20),
            scoreEarned: typeof c.scoreEarned === 'number' ? c.scoreEarned : (c.score || 0),
            feedback: c.feedback || c.comments || 'Evaluado con criterio técnico',
            status: c.status === 'PASS' || c.status === 'PARTIAL' || c.status === 'FAIL' ? c.status : 'PASS',
          }))
        : [];

      // Validar coherencia matemática entre criterios y puntaje general
      const sumEarned = criteriaBreakdown.reduce((acc, c) => acc + (c.scoreEarned || 0), 0);
      const calculatedScore = criteriaBreakdown.length > 0 ? Number(sumEarned.toFixed(1)) : (typeof data.overallScore === 'number' ? data.overallScore : (data.score || 0));

      return {
        overallScore: calculatedScore,
        maxScore: typeof data.maxScore === 'number' ? data.maxScore : 100,
        category: data.category || 'Inteligencia Artificial',
        subcategory: data.subcategory || 'Modelos y Experimentación',
        learningTrend: data.learningTrend || 'Evolución técnica favorable y asimilación conceptual progresiva',
        pedagogicalFeedback: data.pedagogicalFeedback || data.generalSummary || 'Buen desempeño general con áreas clave para consolidar hacia nivel productivo.',
        verification: data.verification || 'Cotejo de requerimientos completado contra la rúbrica.',
        generalSummary: data.generalSummary || data.summary || 'Auditoría completada exitosamente.',
        domainSkills: Array.isArray(data.domainSkills)
          ? data.domainSkills.map((ds: any) => ({
              domain: ds.domain || 'Dominio Técnico',
              subdomain: ds.subdomain || 'Habilidad Específica',
              masteryPercentage: typeof ds.masteryPercentage === 'number' ? ds.masteryPercentage : 80,
              trendFeedback: ds.trendFeedback || 'Competencia consolidada',
            }))
          : [
              { domain: 'Fundamentos y Modelado', subdomain: 'Cartografía de Modelos', masteryPercentage: 85, trendFeedback: 'Asimilación conceptual sólida' },
              { domain: 'Implementación Local', subdomain: 'Conexión y Scripts', masteryPercentage: 80, trendFeedback: 'Capacidad técnica demostrada' },
              { domain: 'Documentación y Estructura', subdomain: 'Organización de Carpetas', masteryPercentage: 90, trendFeedback: 'Rigor metodológico adecuado' },
            ],
        criteriaBreakdown,
        flawsAndErrors: Array.isArray(data.flawsAndErrors)
          ? data.flawsAndErrors.map((f: any) =>
              typeof f === 'string'
                ? { file: 'General', issue: f, severity: 'WARNING' as const }
                : {
                    file: f.file || 'General',
                    line: f.line,
                    issue: f.issue || f.description || '',
                    severity: f.severity === 'CRITICAL' || f.severity === 'WARNING' || f.severity === 'INFO' ? f.severity : 'WARNING',
                  },
            )
          : [],
        improvements: Array.isArray(data.improvements) ? data.improvements : [],
      };
    } catch (err: any) {
      this.logger.error(`Error al parsear JSON: ${err.message}\n${clean.slice(0, 300)}`);
      throw new InternalServerErrorException('La respuesta de la IA no pudo ser interpretada como JSON válido.');
    }
  }
}
