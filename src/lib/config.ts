/**
 * Application configuration based on environment
 */

export interface AppConfig {
  apiBaseUrl: string;
  sseBaseUrl: string;
  environment: 'development' | 'test' | 'production';
  isDevelopment: boolean;
  isProduction: boolean;
  isTest: boolean;
}

const getEnvironment = (): AppConfig['environment'] => {
  const nodeEnv = process.env.NODE_ENV;
  
  if (nodeEnv === 'production') return 'production';
  if (nodeEnv === 'test') return 'test';
  return 'development';
};

const environment = getEnvironment();

export const config: AppConfig = {
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || 
    (environment === 'production' 
      ? 'https://your-production-api.com/api'
      : 'https://infinite-wasp-terminally.ngrok-free.app/webhook-test'
    ),
  
  sseBaseUrl: process.env.NEXT_PUBLIC_SSE_BASE_URL || 
    (environment === 'production' 
      ? 'https://your-production-sse.com'
      : 'https://sse-estimation-tool.onrender.com'
    ),
  
  environment,
  isDevelopment: environment === 'development',
  isProduction: environment === 'production',
  isTest: environment === 'test',
};

// Validation helper
export const validateConfig = (): void => {
  const requiredVars = ['apiBaseUrl', 'sseBaseUrl'];
  
  for (const variable of requiredVars) {
    if (!config[variable as keyof AppConfig]) {
      throw new Error(`Missing required environment variable: ${variable}`);
    }
  }
  
  console.log(`🌍 Running in ${config.environment} environment`);
  console.log(`📡 API Base URL: ${config.apiBaseUrl}`);
  console.log(`🔄 SSE Base URL: ${config.sseBaseUrl}`);
};

export default config; 