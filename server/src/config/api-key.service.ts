import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

export type AiProvider = 'gemini' | 'openai';

export interface KeyConfigStatus {
  provider: AiProvider;
  isConfigured: boolean;
  maskedKey: string | null;
}

@Injectable()
export class ApiKeyService {
  private readonly logger = new Logger(ApiKeyService.name);
  private static readonly GEMINI_KEY_NAME = 'GEMINI_API_KEY';
  private static readonly OPENAI_KEY_NAME = 'OPENAI_API_KEY';
  private static readonly ACTIVE_PROVIDER_KEY = 'ACTIVE_AI_PROVIDER';

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async getActiveProvider(): Promise<AiProvider> {
    try {
      const stored = await this.prisma.appConfig.findUnique({
        where: { key: ApiKeyService.ACTIVE_PROVIDER_KEY },
      });
      if (stored && (stored.value === 'openai' || stored.value === 'gemini')) {
        return stored.value as AiProvider;
      }
    } catch (err) {
      this.logger.warn(`Error reading active provider: ${err.message}`);
    }

    // Default: Si tiene clave de OpenAI y no de Gemini, usar openai; de lo contrario gemini
    const openaiKey = await this.getKeyForProvider('openai');
    const geminiKey = await this.getKeyForProvider('gemini');
    if (openaiKey && !geminiKey) return 'openai';
    return 'gemini';
  }

  async setActiveProvider(provider: AiProvider): Promise<void> {
    await this.prisma.appConfig.upsert({
      where: { key: ApiKeyService.ACTIVE_PROVIDER_KEY },
      update: { value: provider },
      create: { key: ApiKeyService.ACTIVE_PROVIDER_KEY, value: provider },
    });
  }

  async getKeyForProvider(provider: AiProvider): Promise<string | null> {
    const keyName =
      provider === 'openai'
        ? ApiKeyService.OPENAI_KEY_NAME
        : ApiKeyService.GEMINI_KEY_NAME;

    try {
      const stored = await this.prisma.appConfig.findUnique({
        where: { key: keyName },
      });
      if (stored && stored.value && stored.value.trim().length > 0) {
        return stored.value.trim();
      }
    } catch (err) {
      this.logger.warn(`Error reading key ${keyName}: ${err.message}`);
    }

    const envKey = this.configService.get<string>(keyName);
    if (envKey && envKey.trim().length > 0) {
      return envKey.trim();
    }

    return null;
  }

  async getActiveKey(): Promise<{ provider: AiProvider; apiKey: string | null }> {
    const provider = await this.getActiveProvider();
    let apiKey = await this.getKeyForProvider(provider);

    // Fallback inteligente al otro proveedor si el actual no tiene clave configurada
    if (!apiKey) {
      const altProvider: AiProvider = provider === 'gemini' ? 'openai' : 'gemini';
      const altKey = await this.getKeyForProvider(altProvider);
      if (altKey) {
        return { provider: altProvider, apiKey: altKey };
      }
    }

    return { provider, apiKey };
  }

  async getAllConfigStatus(): Promise<{
    activeProvider: AiProvider;
    gemini: KeyConfigStatus;
    openai: KeyConfigStatus;
  }> {
    const activeProvider = await this.getActiveProvider();
    const geminiKey = await this.getKeyForProvider('gemini');
    const openaiKey = await this.getKeyForProvider('openai');

    return {
      activeProvider,
      gemini: {
        provider: 'gemini',
        isConfigured: !!geminiKey,
        maskedKey: this.maskKey(geminiKey),
      },
      openai: {
        provider: 'openai',
        isConfigured: !!openaiKey,
        maskedKey: this.maskKey(openaiKey),
      },
    };
  }

  async setKey(provider: AiProvider, key: string): Promise<void> {
    const cleanKey = key?.trim() || '';
    const keyName =
      provider === 'openai'
        ? ApiKeyService.OPENAI_KEY_NAME
        : ApiKeyService.GEMINI_KEY_NAME;

    await this.prisma.appConfig.upsert({
      where: { key: keyName },
      update: { value: cleanKey },
      create: { key: keyName, value: cleanKey },
    });

    // Auto-activar el proveedor para el que se acaba de guardar clave
    await this.setActiveProvider(provider);
  }

  async deleteKey(provider: AiProvider): Promise<void> {
    const keyName =
      provider === 'openai'
        ? ApiKeyService.OPENAI_KEY_NAME
        : ApiKeyService.GEMINI_KEY_NAME;

    await this.prisma.appConfig.deleteMany({
      where: { key: keyName },
    });
  }

  private maskKey(key: string | null): string | null {
    if (!key) return null;
    const len = key.length;
    if (len <= 8) return '********';
    return `${key.slice(0, 4)}${'*'.repeat(Math.max(4, len - 8))}${key.slice(-4)}`;
  }
}
