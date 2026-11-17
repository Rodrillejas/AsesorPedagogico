import { Body, Controller, Delete, Get, Post, Query } from '@nestjs/common';
import { ApiKeyService, AiProvider } from './api-key.service';

class SetKeyDto {
  provider: AiProvider;
  apiKey: string;
}

class SetActiveProviderDto {
  provider: AiProvider;
}

@Controller('api/config')
export class ApiKeyController {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  @Get('status')
  async getStatus() {
    return this.apiKeyService.getAllConfigStatus();
  }

  @Get('gemini-key')
  async getGeminiStatus() {
    const status = await this.apiKeyService.getAllConfigStatus();
    return {
      isConfigured: status.gemini.isConfigured || status.openai.isConfigured,
      maskedKey: status.activeProvider === 'openai' ? status.openai.maskedKey : status.gemini.maskedKey,
      activeProvider: status.activeProvider,
    };
  }

  @Post('key')
  async updateKey(@Body() dto: SetKeyDto) {
    const cleanKey = dto.apiKey ? dto.apiKey.trim() : '';

    if (!cleanKey || cleanKey.length < 15) {
      throw new Error(
        'La clave ingresada es demasiado corta o inválida. Las claves de Google Gemini empiezan por "AIzaSy..." o "AQ..." (de más de 35 caracteres), y las de OpenAI empiezan por "sk-".',
      );
    }

    // Auto-detección inteligente: si empieza por sk-, es OpenAI; de lo contrario es Gemini
    const detectedProvider: AiProvider = cleanKey.startsWith('sk-') ? 'openai' : (dto.provider === 'openai' ? 'openai' : 'gemini');

    await this.apiKeyService.setKey(detectedProvider, cleanKey);
    return {
      success: true,
      provider: detectedProvider,
      message: `¡Clave de ${detectedProvider === 'openai' ? 'OpenAI (ChatGPT)' : 'Google Gemini'} guardada y activada exitosamente!`,
    };
  }

  @Post('gemini-key')
  async legacyUpdateGeminiKey(@Body() dto: { apiKey: string }) {
    const cleanKey = dto.apiKey ? dto.apiKey.trim() : '';
    if (!cleanKey || cleanKey.length < 15) {
      throw new Error('La clave ingresada es demasiado corta. Debe tener más de 30 caracteres.');
    }
    const provider: AiProvider = cleanKey.startsWith('sk-') ? 'openai' : 'gemini';
    await this.apiKeyService.setKey(provider, cleanKey);
    return { success: true, message: 'Clave guardada exitosamente' };
  }

  @Post('active-provider')
  async setActiveProvider(@Body() dto: SetActiveProviderDto) {
    await this.apiKeyService.setActiveProvider(dto.provider);
    return { success: true, activeProvider: dto.provider };
  }

  @Delete('key')
  async removeKey(@Query('provider') provider: AiProvider) {
    const targetProvider = provider === 'openai' ? 'openai' : 'gemini';
    await this.apiKeyService.deleteKey(targetProvider);
    return { success: true, message: `API Key de ${targetProvider} eliminada` };
  }

  @Delete('gemini-key')
  async legacyRemoveGeminiKey() {
    await this.apiKeyService.deleteKey('gemini');
    await this.apiKeyService.deleteKey('openai');
    return { success: true, message: 'Claves eliminadas' };
  }
}
