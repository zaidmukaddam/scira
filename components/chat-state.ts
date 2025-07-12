export interface ChatState {
  // UI state
  hasSubmitted: boolean;
  hasManuallyScrolled: boolean;
  showUpgradeDialog: boolean;
  showSignInPrompt: boolean;
  hasShownUpgradeDialog: boolean;
  hasShownSignInPrompt: boolean;
  commandDialogOpen: boolean;
  anyDialogOpen: boolean;

  // Chat data
  suggestedQuestions: string[];
  attachments: Attachment[];
  selectedVisibilityType: 'public' | 'private';
}

interface Attachment {
  name: string;
  contentType: string;
  url: string;
  size: number;
}

export type ChatAction =
  | { type: 'SET_HAS_SUBMITTED'; payload: boolean }
  | { type: 'SET_HAS_MANUALLY_SCROLLED'; payload: boolean }
  | { type: 'SET_SHOW_UPGRADE_DIALOG'; payload: boolean }
  | { type: 'SET_SHOW_SIGNIN_PROMPT'; payload: boolean }
  | { type: 'SET_HAS_SHOWN_UPGRADE_DIALOG'; payload: boolean }
  | { type: 'SET_HAS_SHOWN_SIGNIN_PROMPT'; payload: boolean }
  | { type: 'SET_COMMAND_DIALOG_OPEN'; payload: boolean }
  | { type: 'SET_ANY_DIALOG_OPEN'; payload: boolean }
  | { type: 'SET_SUGGESTED_QUESTIONS'; payload: string[] }
  | { type: 'SET_ATTACHMENTS'; payload: Attachment[] }
  | { type: 'SET_VISIBILITY_TYPE'; payload: 'public' | 'private' }
  | { type: 'RESET_SUGGESTED_QUESTIONS' }
  | { type: 'RESET_UI_STATE' };

export const chatReducer = (state: ChatState, action: ChatAction): ChatState => {
  switch (action.type) {
    case 'SET_HAS_SUBMITTED':
      return { ...state, hasSubmitted: action.payload };

    case 'SET_HAS_MANUALLY_SCROLLED':
      return { ...state, hasManuallyScrolled: action.payload };

    case 'SET_SHOW_UPGRADE_DIALOG':
      return { ...state, showUpgradeDialog: action.payload };

    case 'SET_SHOW_SIGNIN_PROMPT':
      return { ...state, showSignInPrompt: action.payload };

    case 'SET_HAS_SHOWN_UPGRADE_DIALOG':
      return { ...state, hasShownUpgradeDialog: action.payload };

    case 'SET_HAS_SHOWN_SIGNIN_PROMPT':
      return { ...state, hasShownSignInPrompt: action.payload };

    case 'SET_COMMAND_DIALOG_OPEN':
      return { ...state, commandDialogOpen: action.payload };

    case 'SET_ANY_DIALOG_OPEN':
      return { ...state, anyDialogOpen: action.payload };

    case 'SET_SUGGESTED_QUESTIONS':
      return { ...state, suggestedQuestions: action.payload };

    case 'SET_ATTACHMENTS':
      return { ...state, attachments: action.payload };

    case 'SET_VISIBILITY_TYPE':
      return { ...state, selectedVisibilityType: action.payload };

    case 'RESET_SUGGESTED_QUESTIONS':
      return { ...state, suggestedQuestions: [] };

    case 'RESET_UI_STATE':
      return {
        ...state,
        hasSubmitted: false,
        hasManuallyScrolled: false,
        showUpgradeDialog: false,
        showSignInPrompt: false,
      };

    default:
      return state;
  }
};

export const createInitialState = (
  initialVisibility: 'public' | 'private' = 'private',
  hasShownUpgradeDialog: boolean = false,
  hasShownSignInPrompt: boolean = false
): ChatState => ({
  hasSubmitted: false,
  hasManuallyScrolled: false,
  showUpgradeDialog: false,
  showSignInPrompt: false,
  hasShownUpgradeDialog,
  hasShownSignInPrompt,
  commandDialogOpen: false,
  anyDialogOpen: false,
  suggestedQuestions: [],
  attachments: [],
  selectedVisibilityType: initialVisibility,
}); 