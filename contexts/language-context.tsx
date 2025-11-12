'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useLocalStorage } from '@/hooks/use-local-storage';

type Language = 'en' | 'pt';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Translation dictionary
const translations: Record<Language, Record<string, string>> = {
  en: {
    // Settings
    'settings.title': 'Settings',
    'settings.account': 'Account',
    'settings.usage': 'Usage',
    'settings.preferences': 'Preferences',
    'settings.connectors': 'Connectors',
    'settings.memories': 'Memories',
    'settings.language': 'Language',
    'settings.language.description': 'Choose your preferred language',
    'settings.language.english': 'English',
    'settings.language.portuguese': 'Português',
    'settings.language.note': 'Select your preferred language for the interface. Changes take effect immediately.',
    
    // Profile
    'profile.fullName': 'Full Name',
    'profile.email': 'Email Address',
    'profile.notProvided': 'Not provided',
    'profile.managedBy': 'Profile information is managed through your authentication provider. Contact support to update your details.',
    
    // Preferences
    'preferences.general': 'General',
    'preferences.ordering': 'Ordering',
    'preferences.customInstructions': 'Custom Instructions',
    'preferences.customInstructions.description': 'Customize how the AI responds to you',
    'preferences.enableInstructions': 'Enable Custom Instructions',
    'preferences.enableInstructions.description': 'Toggle to enable or disable custom instructions',
    'preferences.instructions': 'Instructions',
    'preferences.instructions.description': 'Guide how the AI responds to your questions',
    'preferences.instructions.placeholder': 'Enter your custom instructions here... For example: \'Always provide code examples when explaining programming concepts\' or \'Keep responses concise and focused on practical applications\'',
    'preferences.saveInstructions': 'Save Instructions',
    'preferences.saving': 'Saving...',
    'preferences.lastUpdated': 'Last updated',
    'preferences.searchProvider': 'Search Provider',
    'preferences.searchProvider.description': 'Choose your preferred search engine',
    'preferences.searchProvider.note': 'Select your preferred search provider for web searches. Changes take effect immediately and will be used for all future searches.',
    'preferences.reorderModes': 'Reorder Search Modes',
    'preferences.reorderModes.description': 'Drag to set your preferred order',
    'preferences.reorderModels': 'Reorder Models',
    'preferences.reorderModels.description': 'Drag to set your preferred model order',
    
    // Usage
    'usage.dailySearch': 'Daily Search Usage',
    'usage.today': 'Today',
    'usage.extreme': 'Extreme',
    'usage.regularSearches': 'Regular searches',
    'usage.thisMonth': 'This month',
    'usage.activity': 'Activity',
    'usage.pastMonths': 'Past {months} Months',
    'usage.noActivity': 'No activity data',
    'usage.refresh': 'Refresh',
    
    // Common
    'common.loading': 'Loading...',
    'common.save': 'Save',
    'common.delete': 'Delete',
    'common.cancel': 'Cancel',
    'common.close': 'Close',
    'common.success': 'Success',
    'common.error': 'Error',
    
    // Navbar
    'navbar.new': 'New',
    'navbar.upgrade': 'Upgrade',
    'navbar.freePlan': 'Free Plan',
    'navbar.shared': 'Shared',
    'navbar.private': 'Private',
    
    // Chat Input
    'chat.input.placeholder': 'Ask a question...',
    'chat.input.placeholder.new': 'Ask a new question...',
    'chat.input.enhancing': '✨ Enhancing your prompt...',
    'chat.input.typewriting': '✨ Writing enhanced prompt...',
    
    // Auth
    'auth.welcomeBack': 'Welcome back',
    'auth.signInToContinue': 'Sign in to continue to Scira AI',
    'auth.social': 'Social',
    'auth.email': 'E-mail',
    'auth.magicLink': 'Magic link',
    'auth.signInWithEmail': 'Sign in with e-mail',
    'auth.signUpWithEmail': 'Create account with e-mail',
    'auth.emailLabel': 'E-mail',
    'auth.passwordLabel': 'Password',
    'auth.emailPlaceholder': 'you@example.com',
    'auth.passwordPlaceholder': 'Minimum of 8 characters',
    'auth.nameLabel': 'Name',
    'auth.namePlaceholder': 'Your name',
    'auth.continueWithoutAccount': 'Continue without account',
    'auth.magicLinkDescription': 'We will send an access link that expires in a few minutes. Just click to sign in without a password.',
    'auth.magicLinkPlaceholder': 'Enter your e-mail',
    'auth.sendMagicLink': 'Send magic link',
    'auth.newToScira': 'New to Scira?',
    'auth.createAccount': 'Create account',
    'auth.alreadyHaveAccount': 'Already have an account?',
    'auth.signIn': 'Sign in',
    'auth.waiting': 'Please wait...',
    'auth.saveConversations': 'Save conversations and sync across devices',

    // Settings Dialog
    'settings.dialog.title': 'Settings',
    
    // Profile Section
    'profile.proUser': 'pro user',
    
    // Usage Section
    'usage.refreshSuccess': 'Usage data refreshed',
    'usage.refreshError': 'Failed to refresh usage data',
    'usage.totalMessages': '{{count}} total messages in {{year}}',
    'usage.message': 'message',
    'usage.messages': 'messages',
    'usage.noMessages': 'No messages',
    'usage.messagesRange1': '1-3 messages',
    'usage.messagesRange2': '4-7 messages',
    'usage.messagesRange3': '8-12 messages',
    'usage.messagesRange4': '13+ messages',
    
    // Memories
    'memories.stored': '{{count}} {{count, plural, one {memory} other {memories}}} stored',
    'memories.noMemories': 'No memories found',
    'memories.loadMore': 'Load More',
    'memories.deleted': 'Memory deleted successfully',
    'memories.deleteError': 'Failed to delete memory',
    
    // Connectors
    'connectors.title': 'Connected Services',
    'connectors.description': 'Connect your cloud services to search across all your documents in one place',
    'connectors.beta': 'Connectors (Beta)',
    'connectors.betaDescription': 'Connectors are available in beta. Expect changes as the experience improves.',
    'connectors.connected': 'Connected',
    'connectors.notConnected': 'Not connected',
    'connectors.checking': 'Checking connection...',
    'connectors.comingSoon': 'Coming Soon',
    'connectors.connect': 'Connect',
    'connectors.connecting': 'Connecting...',
    'connectors.sync': 'Sync',
    'connectors.syncing': 'Syncing...',
    'connectors.disconnect': 'Disconnect',
    'connectors.disconnecting': 'Disconnecting...',
    'connectors.syncStarted': '{{name}} sync started',
    'connectors.disconnected': '{{name}} disconnected',
    'connectors.connectError': 'Failed to connect',
    'connectors.syncError': 'Failed to sync',
    'connectors.disconnectError': 'Failed to disconnect',
    'connectors.documentChunk': 'Document Chunk:',
    'connectors.lastSync': 'Last Sync:',
    'connectors.limit': 'Limit:',
    'connectors.syncingStatus': 'Syncing...',
    'connectors.never': 'Never',
    
    // Custom Instructions
    'instructions.saveSuccess': 'Custom instructions saved successfully',
    'instructions.saveError': 'Failed to save instructions',
    'instructions.deleteSuccess': 'Custom instructions deleted successfully',
    'instructions.deleteError': 'Failed to delete instructions',
    'instructions.enterInstructions': 'Please enter some instructions',
    
    // Search Provider
    'searchProvider.changed': 'Search provider changed to {{provider}}',
    
    // Search Modes
    'searchMode.web': 'Web',
    'searchMode.web.description': 'Search across the entire internet powered by {{provider}}',
    'searchMode.chat': 'Chat',
    'searchMode.chat.description': 'Talk to the model directly.',
    'searchMode.x': 'X',
    'searchMode.x.description': 'Search X posts',
    'searchMode.stocks': 'Stocks',
    'searchMode.stocks.description': 'Stock and currency information',
    'searchMode.connectors': 'Connectors',
    'searchMode.connectors.description': 'Search Google Drive, Notion and OneDrive documents',
    'searchMode.code': 'Code',
    'searchMode.code.description': 'Get context about languages and frameworks',
    'searchMode.academic': 'Academic',
    'searchMode.academic.description': 'Search academic papers powered by Exa',
    'searchMode.extreme': 'Extreme',
    'searchMode.extreme.description': 'Deep research with multiple sources and analysis',
    'searchMode.extreme.description.tooltip': 'Deep research with multiple sources and in-depth analysis with 3x sources',
    'searchMode.extreme.active': 'Extreme Search Active',
    'searchMode.extreme.title': 'Extreme Search',
    'searchMode.memory': 'Memory',
    'searchMode.memory.description': 'Your personal memory companion',
    'searchMode.reddit': 'Reddit',
    'searchMode.reddit.description': 'Search Reddit posts',
    'searchMode.crypto': 'Crypto',
    'searchMode.crypto.description': 'Cryptocurrency prices and information',
    'searchMode.youtube': 'YouTube',
    'searchMode.youtube.description': 'Search YouTube videos',
    'searchMode.active': '{{name}} Active',
    'searchMode.clickToSwitch': 'Click to switch search mode',
    'searchMode.switchBack': 'Switch back to search modes',
    'searchMode.choose': 'Choose search mode',
    'searchMode.signInRequired': 'Sign in Required',
    
    // Lookout
    'lookout.newFeature': 'New Feature',
    'lookout.introducing': 'Introducing Scira Lookout',
    'lookout.description': 'Automated search monitoring on your schedule',
    'lookout.setupDescription': 'Set up searches that track trends, monitor developments, and keep you informed without manual effort.',
    'lookout.scheduleSearches': 'Schedule searches to run automatically',
    'lookout.receiveNotifications': 'Receive notifications when results are ready',
    'lookout.accessHistory': 'Access comprehensive search history',
    'lookout.explore': 'Explore Lookout',
    'lookout.maybeLater': 'Maybe later',
  },
  pt: {
    // Settings
    'settings.title': 'Configurações',
    'settings.account': 'Conta',
    'settings.usage': 'Uso',
    'settings.preferences': 'Preferências',
    'settings.connectors': 'Conectores',
    'settings.memories': 'Memórias',
    'settings.language': 'Idioma',
    'settings.language.description': 'Escolha seu idioma preferido',
    'settings.language.english': 'Inglês',
    'settings.language.portuguese': 'Português',
    'settings.language.note': 'Selecione seu idioma preferido para a interface. As alterações entram em vigor imediatamente.',
    
    // Profile
    'profile.fullName': 'Nome Completo',
    'profile.email': 'Endereço de Email',
    'profile.notProvided': 'Não fornecido',
    'profile.managedBy': 'As informações do perfil são gerenciadas pelo seu provedor de autenticação. Entre em contato com o suporte para atualizar seus detalhes.',
    
    // Preferences
    'preferences.general': 'Geral',
    'preferences.ordering': 'Ordenação',
    'preferences.customInstructions': 'Instruções Personalizadas',
    'preferences.customInstructions.description': 'Personalize como a IA responde a você',
    'preferences.enableInstructions': 'Habilitar Instruções Personalizadas',
    'preferences.enableInstructions.description': 'Ative ou desative as instruções personalizadas',
    'preferences.instructions': 'Instruções',
    'preferences.instructions.description': 'Guie como a IA responde às suas perguntas',
    'preferences.instructions.placeholder': 'Digite suas instruções personalizadas aqui... Por exemplo: \'Sempre forneça exemplos de código ao explicar conceitos de programação\' ou \'Mantenha as respostas concisas e focadas em aplicações práticas\'',
    'preferences.saveInstructions': 'Salvar Instruções',
    'preferences.saving': 'Salvando...',
    'preferences.lastUpdated': 'Última atualização',
    'preferences.searchProvider': 'Provedor de Busca',
    'preferences.searchProvider.description': 'Escolha seu mecanismo de busca preferido',
    'preferences.searchProvider.note': 'Selecione seu provedor de busca preferido para buscas na web. As alterações entram em vigor imediatamente e serão usadas para todas as buscas futuras.',
    'preferences.reorderModes': 'Reordenar Modos de Busca',
    'preferences.reorderModes.description': 'Arraste para definir sua ordem preferida',
    'preferences.reorderModels': 'Reordenar Modelos',
    'preferences.reorderModels.description': 'Arraste para definir sua ordem preferida de modelos',
    
    // Usage
    'usage.dailySearch': 'Uso Diário de Busca',
    'usage.today': 'Hoje',
    'usage.extreme': 'Extremo',
    'usage.regularSearches': 'Buscas regulares',
    'usage.thisMonth': 'Este mês',
    'usage.activity': 'Atividade',
    'usage.pastMonths': 'Últimos {months} Meses',
    'usage.noActivity': 'Sem dados de atividade',
    'usage.refresh': 'Atualizar',
    
    // Common
    'common.loading': 'Carregando...',
    'common.save': 'Salvar',
    'common.delete': 'Excluir',
    'common.cancel': 'Cancelar',
    'common.close': 'Fechar',
    'common.success': 'Sucesso',
    'common.error': 'Erro',
    
    // Navbar
    'navbar.new': 'Novo',
    'navbar.upgrade': 'Atualizar',
    'navbar.freePlan': 'Plano Gratuito',
    'navbar.shared': 'Compartilhado',
    'navbar.private': 'Privado',
    
    // Chat Input
    'chat.input.placeholder': 'Faça uma pergunta...',
    'chat.input.placeholder.new': 'Faça uma nova pergunta...',
    'chat.input.enhancing': '✨ Aprimorando seu prompt...',
    'chat.input.typewriting': '✨ Escrevendo prompt aprimorado...',
    
    // Auth
    'auth.welcomeBack': 'Bem-vindo de volta',
    'auth.signInToContinue': 'Entre para continuar no Scira AI',
    'auth.social': 'Social',
    'auth.email': 'E-mail',
    'auth.magicLink': 'Magic link',
    'auth.signInWithEmail': 'Entrar com e-mail',
    'auth.signUpWithEmail': 'Criar conta com e-mail',
    'auth.emailLabel': 'E-mail',
    'auth.passwordLabel': 'Senha',
    'auth.emailPlaceholder': 'voce@exemplo.com',
    'auth.passwordPlaceholder': 'Mínimo de 8 caracteres',
    'auth.nameLabel': 'Nome',
    'auth.namePlaceholder': 'Seu nome',
    'auth.continueWithoutAccount': 'Continuar sem conta',
    'auth.magicLinkDescription': 'Enviaremos um link de acesso que expira em poucos minutos. Basta clicar para entrar sem senha.',
    'auth.magicLinkPlaceholder': 'Digite seu e-mail',
    'auth.sendMagicLink': 'Enviar magic link',
    'auth.newToScira': 'Novo no Scira?',
    'auth.createAccount': 'Criar conta',
    'auth.alreadyHaveAccount': 'Já tem uma conta?',
    'auth.signIn': 'Entrar',
    'auth.waiting': 'Aguarde...',
    'auth.saveConversations': 'Salve conversas e sincronize entre dispositivos',

    // Settings Dialog
    'settings.dialog.title': 'Configurações',
    
    // Profile Section
    'profile.proUser': 'usuário pro',
    
    // Usage Section
    'usage.refreshSuccess': 'Dados de uso atualizados',
    'usage.refreshError': 'Falha ao atualizar dados de uso',
    'usage.totalMessages': '{{count}} mensagens totais em {{year}}',
    'usage.message': 'mensagem',
    'usage.messages': 'mensagens',
    'usage.noMessages': 'Sem mensagens',
    'usage.messagesRange1': '1-3 mensagens',
    'usage.messagesRange2': '4-7 mensagens',
    'usage.messagesRange3': '8-12 mensagens',
    'usage.messagesRange4': '13+ mensagens',
    
    // Memories
    'memories.stored': '{{count}} {{count, plural, one {memória} other {memórias}}} armazenadas',
    'memories.stored.singular': '{{count}} memória armazenada',
    'memories.stored.plural': '{{count}} memórias armazenadas',
    'memories.noMemories': 'Nenhuma memória encontrada',
    'memories.loadMore': 'Carregar Mais',
    'memories.deleted': 'Memória excluída com sucesso',
    'memories.deleteError': 'Falha ao excluir memória',
    
    // Connectors
    'connectors.title': 'Serviços Conectados',
    'connectors.description': 'Conecte seus serviços em nuvem para buscar em todos os seus documentos em um só lugar',
    'connectors.beta': 'Conectores (Beta)',
    'connectors.betaDescription': 'Conectores estão disponíveis em beta. Esperem mudanças conforme a experiência melhora.',
    'connectors.connected': 'Conectado',
    'connectors.notConnected': 'Não conectado',
    'connectors.checking': 'Verificando conexão...',
    'connectors.comingSoon': 'Em Breve',
    'connectors.connect': 'Conectar',
    'connectors.connecting': 'Conectando...',
    'connectors.sync': 'Sincronizar',
    'connectors.syncing': 'Sincronizando...',
    'connectors.disconnect': 'Desconectar',
    'connectors.disconnecting': 'Desconectando...',
    'connectors.syncStarted': 'Sincronização de {{name}} iniciada',
    'connectors.disconnected': '{{name}} desconectado',
    'connectors.connectError': 'Falha ao conectar',
    'connectors.syncError': 'Falha ao sincronizar',
    'connectors.disconnectError': 'Falha ao desconectar',
    'connectors.documentChunk': 'Chunk de Documento:',
    'connectors.lastSync': 'Última Sincronização:',
    'connectors.limit': 'Limite:',
    'connectors.syncingStatus': 'Sincronizando...',
    'connectors.never': 'Nunca',
    
    // Custom Instructions
    'instructions.saveSuccess': 'Instruções personalizadas salvas com sucesso',
    'instructions.saveError': 'Falha ao salvar instruções',
    'instructions.deleteSuccess': 'Instruções personalizadas excluídas com sucesso',
    'instructions.deleteError': 'Falha ao excluir instruções',
    'instructions.enterInstructions': 'Por favor, digite algumas instruções',
    
    // Search Provider
    'searchProvider.changed': 'Provedor de busca alterado para {{provider}}',
    
    // Search Modes
    'searchMode.web': 'Web',
    'searchMode.web.description': 'Busque em toda a internet alimentado por {{provider}}',
    'searchMode.chat': 'Chat',
    'searchMode.chat.description': 'Converse diretamente com o modelo.',
    'searchMode.x': 'X',
    'searchMode.x.description': 'Buscar posts do X',
    'searchMode.stocks': 'Ações',
    'searchMode.stocks.description': 'Informações sobre ações e moedas',
    'searchMode.connectors': 'Conectores',
    'searchMode.connectors.description': 'Buscar documentos do Google Drive, Notion e OneDrive',
    'searchMode.code': 'Código',
    'searchMode.code.description': 'Obter contexto sobre linguagens e frameworks',
    'searchMode.academic': 'Acadêmico',
    'searchMode.academic.description': 'Buscar artigos acadêmicos alimentado por Exa',
    'searchMode.extreme': 'Extremo',
    'searchMode.extreme.description': 'Pesquisa profunda com múltiplas fontes e análise',
    'searchMode.extreme.description.tooltip': 'Pesquisa profunda com múltiplas fontes e análise detalhada com 3x fontes',
    'searchMode.extreme.active': 'Busca Extrema Ativa',
    'searchMode.extreme.title': 'Busca Extrema',
    'searchMode.memory': 'Memória',
    'searchMode.memory.description': 'Seu companheiro de memória pessoal',
    'searchMode.reddit': 'Reddit',
    'searchMode.reddit.description': 'Buscar posts do Reddit',
    'searchMode.crypto': 'Cripto',
    'searchMode.crypto.description': 'Preços e informações de criptomoedas',
    'searchMode.youtube': 'YouTube',
    'searchMode.youtube.description': 'Buscar vídeos do YouTube',
    'searchMode.active': '{{name}} Ativo',
    'searchMode.clickToSwitch': 'Clique para alternar modo de busca',
    'searchMode.switchBack': 'Voltar para modos de busca',
    'searchMode.choose': 'Escolher modo de busca',
    'searchMode.signInRequired': 'Login Necessário',
    
    // Lookout
    'lookout.newFeature': 'Nova Funcionalidade',
    'lookout.introducing': 'Apresentando Scira Lookout',
    'lookout.description': 'Monitoramento automatizado de buscas no seu horário',
    'lookout.setupDescription': 'Configure buscas que rastreiam tendências, monitoram desenvolvimentos e mantêm você informado sem esforço manual.',
    'lookout.scheduleSearches': 'Agende buscas para executar automaticamente',
    'lookout.receiveNotifications': 'Receba notificações quando os resultados estiverem prontos',
    'lookout.accessHistory': 'Acesse histórico completo de buscas',
    'lookout.explore': 'Explorar Lookout',
    'lookout.maybeLater': 'Talvez depois',
  },
};

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [storedLanguage, setStoredLanguage] = useLocalStorage<Language>('scira-language', 'en');
  const [language, setLanguageState] = useState<Language>(storedLanguage);

  useEffect(() => {
    setLanguageState(storedLanguage);
    // Set document language attribute
    document.documentElement.lang = storedLanguage;
  }, [storedLanguage]);

  const setLanguage = useCallback(
    (lang: Language) => {
      setStoredLanguage(lang);
      setLanguageState(lang);
      document.documentElement.lang = lang;
    },
    [setStoredLanguage],
  );

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      let text = translations[language]?.[key] || translations.en[key] || key;
      
      // Replace parameters in the format {param} or {{param}}
      if (params) {
        Object.entries(params).forEach(([paramKey, paramValue]) => {
          text = text.replace(new RegExp(`\\{\\{${paramKey}\\}\\}`, 'g'), String(paramValue));
          text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramValue));
        });
      }
      
      return text;
    },
    [language],
  );

  return <LanguageContext.Provider value={{ language, setLanguage, t }}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

