import React, { useState, useEffect } from 'react';
import { Key, CheckCircle, Trash2, ShieldCheck, Eye, EyeOff, Loader2, Bot, AlertCircle } from 'lucide-react';

export type AiProvider = 'gemini' | 'openai';

interface ProviderStatus {
  provider: AiProvider;
  isConfigured: boolean;
  maskedKey: string | null;
}

export const ApiKeyModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  const [selectedProvider, setSelectedProvider] = useState<AiProvider>('gemini');
  const [keyInput, setKeyInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showInput, setShowInput] = useState(true); // Mostrar por defecto para que el usuario vea exactamente qué pega
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [configStatus, setConfigStatus] = useState<{
    activeProvider: AiProvider;
    gemini: ProviderStatus;
    openai: ProviderStatus;
  }>({
    activeProvider: 'gemini',
    gemini: { provider: 'gemini', isConfigured: false, maskedKey: null },
    openai: { provider: 'openai', isConfigured: false, maskedKey: null },
  });

  const fetchKeyStatus = async () => {
    try {
      const res = await fetch('/api/config/status');
      if (res.ok) {
        const data = await res.json();
        setConfigStatus(data);
        if (data.activeProvider) {
          setSelectedProvider(data.activeProvider);
        }
      }
    } catch {
      setStatusMessage({ type: 'error', text: 'Error al conectar con el servidor' });
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchKeyStatus();
      setKeyInput('');
      setStatusMessage(null);
    }
  }, [isOpen]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = keyInput.trim();

    if (!clean) {
      setStatusMessage({ type: 'error', text: 'Por favor pega tu API Key antes de guardar.' });
      return;
    }

    if (clean.length < 20) {
      setStatusMessage({
        type: 'error',
        text: 'La clave ingresada es demasiado corta. Asegúrate de copiar la clave completa desde Google AI Studio o OpenAI.',
      });
      return;
    }

    setLoading(true);
    setStatusMessage(null);

    // Detección automática por prefijo
    let targetProvider = selectedProvider;
    if (clean.startsWith('sk-')) {
      targetProvider = 'openai';
      setSelectedProvider('openai');
    } else {
      targetProvider = 'gemini';
      setSelectedProvider('gemini');
    }

    try {
      const res = await fetch('/api/config/key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: targetProvider,
          apiKey: clean,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setStatusMessage({
          type: 'success',
          text: data.message || '¡Clave guardada y activada con éxito!',
        });
        setKeyInput('');
        await fetchKeyStatus();
      } else {
        setStatusMessage({ type: 'error', text: data.message || 'Error al guardar la clave' });
      }
    } catch {
      setStatusMessage({ type: 'error', text: 'Fallo de red al conectar con el servidor local' });
    } finally {
      setLoading(false);
    }
  };

  const handleSetActiveProvider = async (provider: AiProvider) => {
    try {
      const res = await fetch('/api/config/active-provider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider }),
      });
      if (res.ok) {
        setSelectedProvider(provider);
        await fetchKeyStatus();
      }
    } catch {
      // ignore
    }
  };

  const handleDelete = async (provider: AiProvider) => {
    if (!confirm(`¿Eliminar la clave guardada de ${provider === 'openai' ? 'OpenAI' : 'Google Gemini'}?`)) return;
    setLoading(true);
    setStatusMessage(null);
    try {
      const res = await fetch(`/api/config/key?provider=${provider}`, { method: 'DELETE' });
      if (res.ok) {
        setStatusMessage({ type: 'success', text: `Clave eliminada exitosamente` });
        await fetchKeyStatus();
      }
    } catch {
      setStatusMessage({ type: 'error', text: 'Error al eliminar la clave' });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const currentProviderStatus = selectedProvider === 'openai' ? configStatus.openai : configStatus.gemini;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-slate-900 dark:text-white">
                Configurar API Key de Inteligencia Artificial
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pega tu clave para auditar el código automáticamente
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Selector de Proveedor */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                setSelectedProvider('gemini');
                handleSetActiveProvider('gemini');
              }}
              className={`p-3 rounded-xl border text-left transition flex items-center gap-3 ${
                selectedProvider === 'gemini'
                  ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 font-bold text-xs">
                G
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  Google Gemini
                  {configStatus.gemini.isConfigured && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  )}
                </div>
                <div className="text-[11px] text-slate-500">100% Gratuito (AI Studio)</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedProvider('openai');
                handleSetActiveProvider('openai');
              }}
              className={`p-3 rounded-xl border text-left transition flex items-center gap-3 ${
                selectedProvider === 'openai'
                  ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 font-bold text-xs">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  OpenAI (ChatGPT)
                  {configStatus.openai.isConfigured && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  )}
                </div>
                <div className="text-[11px] text-slate-500">Requiere saldo prepagado</div>
              </div>
            </button>
          </div>

          {/* Estado de clave actual */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
            <div className="flex items-center gap-2.5">
              <ShieldCheck
                className={`w-5 h-5 ${
                  currentProviderStatus.isConfigured ? 'text-emerald-500' : 'text-amber-500'
                }`}
              />
              <div>
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Proveedor seleccionado: <span className="font-semibold text-slate-800 dark:text-slate-200 uppercase">{selectedProvider}</span>
                </div>
                <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {currentProviderStatus.isConfigured ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-mono text-xs">
                      {currentProviderStatus.maskedKey} (Activa)
                    </span>
                  ) : (
                    <span className="text-amber-600 dark:text-amber-400 text-xs">
                      Sin clave guardada para {selectedProvider}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {currentProviderStatus.isConfigured && (
              <button
                type="button"
                onClick={() => handleDelete(selectedProvider)}
                disabled={loading}
                title="Eliminar clave"
                className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>

          {statusMessage && (
            <div
              className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Pega tu API Key de {selectedProvider === 'openai' ? 'OpenAI (sk-...)' : 'Google Gemini (AQ... o AIzaSy...)'}
              </label>
              <div className="relative">
                <input
                  type={showInput ? 'text' : 'password'}
                  placeholder={selectedProvider === 'openai' ? 'sk-proj-...' : 'AQ... o AIzaSy...'}
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 pr-10 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowInput(!showInput)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showInput ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                Al pegar la clave y hacer clic en <strong>"Guardar y Activar"</strong>, se almacenará en la base de datos y se activará inmediatamente para tus auditorías.
              </p>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Cerrar
              </button>
              <button
                type="submit"
                disabled={loading || !keyInput.trim()}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white flex items-center gap-1.5 shadow-sm transition"
              >
                {loading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle className="w-3.5 h-3.5" />
                )}
                Guardar y Activar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
