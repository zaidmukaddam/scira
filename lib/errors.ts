export type ErrorType =
  | 'bad_request'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'rate_limit'
  | 'upgrade_required'
  | 'model_restricted'
  | 'offline';

export type Surface =
  | 'chat'
  | 'auth'
  | 'api'
  | 'stream'
  | 'database'
  | 'history'
  | 'model';

export type ErrorCode = `${ErrorType}:${Surface}`;

export type ErrorVisibility = 'response' | 'log' | 'none';

export const visibilityBySurface: Record<Surface, ErrorVisibility> = {
  database: 'log',
  chat: 'response',
  auth: 'response',
  stream: 'response',
  api: 'response',
  history: 'response',
  model: 'response',
};

export class ChatSDKError extends Error {
  public type: ErrorType;
  public surface: Surface;
  public statusCode: number;

  constructor(errorCode: ErrorCode, cause?: string, t?: (content: string) => string) {
    super();

    const [type, surface] = errorCode.split(':');

    this.type = type as ErrorType;
    this.cause = cause;
    this.surface = surface as Surface;
    this.message = t ? getMessageByErrorCode(errorCode, t) : getMessageByErrorCode(errorCode, (s) => s);
    this.statusCode = getStatusCodeByType(this.type);
  }

  public toResponse(t?: (content: string) => string) {
    const code: ErrorCode = `${this.type}:${this.surface}`;
    const visibility = visibilityBySurface[this.surface];

    const { message, cause, statusCode } = this;

    if (visibility === 'log') {
      console.error({
        code,
        message,
        cause,
      });

      const fallbackMessage = t ? t('Something went wrong. Please try again later.') : 'Something went wrong. Please try again later.';
      return Response.json(
        { code: '', message: fallbackMessage },
        { status: statusCode },
      );
    }

    return Response.json({ code, message, cause }, { status: statusCode });
  }
}

export function getMessageByErrorCode(errorCode: ErrorCode, t: (content: string) => string): string {
  if (errorCode.includes('database')) {
    return t('An error occurred while executing a database query.');
  }

  switch (errorCode) {
    case 'bad_request:api':
      return t("The request couldn't be processed. Please check your input and try again.");
    case 'rate_limit:api':
      return t('You have reached your daily limit for this feature. Upgrade to Pro for unlimited access.');

    case 'unauthorized:auth':
      return t('You need to sign in before continuing.');
    case 'forbidden:auth':
      return t('Your account does not have access to this feature.');
    case 'upgrade_required:auth':
      return t('This feature requires a Pro subscription. Sign in and upgrade to continue.');

    case 'rate_limit:chat':
      return t('You have exceeded your maximum number of messages for the day. Please try again later.');
    case 'upgrade_required:chat':
      return t('You have reached your daily search limit. Upgrade to Pro for unlimited searches.');
    case 'not_found:chat':
      return t('The requested chat was not found. Please check the chat ID and try again.');
    case 'forbidden:chat':
      return t('This chat belongs to another user. Please check the chat ID and try again.');
    case 'unauthorized:chat':
      return t('You need to sign in to view this chat. Please sign in and try again.');
    case 'offline:chat':
      return t("We're having trouble sending your message. Please check your internet connection and try again.");

    case 'unauthorized:model':
      return t('You need to sign in to access this AI model.');
    case 'forbidden:model':
      return t('This AI model requires a Pro subscription.');
    case 'model_restricted:model':
      return t('Access to this AI model is restricted. Please upgrade to Pro or contact support.');
    case 'upgrade_required:model':
      return t('This premium AI model is only available with a Pro subscription.');
    case 'rate_limit:model':
      return t('You have reached the usage limit for this AI model. Upgrade to Pro for unlimited access.');

    case 'forbidden:api':
      return t('Access denied');

    default:
      return t('Something went wrong. Please try again later.');
  }
}

function getStatusCodeByType(type: ErrorType) {
  switch (type) {
    case 'bad_request':
      return 400;
    case 'unauthorized':
      return 401;
    case 'forbidden':
      return 403;
    case 'not_found':
      return 404;
    case 'rate_limit':
      return 429;
    case 'upgrade_required':
      return 402; // Payment Required
    case 'model_restricted':
      return 403;
    case 'offline':
      return 503;
    default:
      return 500;
  }
}

// Utility functions for error handling
export function isAuthError(error: ChatSDKError): boolean {
  return error.surface === 'auth';
}

export function isUpgradeRequiredError(error: ChatSDKError): boolean {
  return error.type === 'upgrade_required';
}

export function isModelError(error: ChatSDKError): boolean {
  return error.surface === 'model';
}

export function isSignInRequired(error: ChatSDKError): boolean {
  return error.type === 'unauthorized' && (error.surface === 'auth' || error.surface === 'chat' || error.surface === 'model');
}

export function isProRequired(error: ChatSDKError): boolean {
  return error.type === 'upgrade_required' || error.type === 'forbidden' || error.type === 'model_restricted';
}

export function isRateLimited(error: ChatSDKError): boolean {
  return error.type === 'rate_limit';
}

// Helper function to get error action suggestions
export function getErrorActions(error: ChatSDKError, t: (content: string) => string): {
  primary?: { label: string; action: string };
  secondary?: { label: string; action: string };
} {
  if (isSignInRequired(error)) {
    return {
      primary: { label: t('Sign In'), action: 'signin' },
      secondary: { label: t('Try Again'), action: 'retry' }
    };
  }

  if (isProRequired(error)) {
    return {
      primary: { label: t('Upgrade to Pro'), action: 'upgrade' },
      secondary: { label: t('Check Again'), action: 'refresh' }
    };
  }

  if (isRateLimited(error)) {
    return {
      primary: { label: t('Upgrade to Pro'), action: 'upgrade' },
      secondary: { label: t('Try Again Later'), action: 'retry' }
    };
  }

  return {
    primary: { label: t('Try Again'), action: 'retry' }
  };
}

// Helper function to get error icon type
export function getErrorIcon(error: ChatSDKError): 'warning' | 'error' | 'upgrade' | 'auth' {
  if (isSignInRequired(error)) return 'auth';
  if (isProRequired(error) || isRateLimited(error)) return 'upgrade';
  if (error.type === 'offline') return 'warning';
  return 'error';
}