export const env = {
    JWT_SECRET: process.env.JWT_SECRET ?? 'super_secret_key',
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN ?? '1d',
    GEMINI_API_KEY: process.env.GEMINI_API_KEY ?? '',
};
