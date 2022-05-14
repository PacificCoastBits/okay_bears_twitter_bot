export {};

declare global {
    namespace NodeJS {
        export interface ProcessEnv {
            OKAY_PUB_KEY: string;
            TWITTER_API_KEY_SECRET: string;
            TWITTER_API_KEY: string;
            TWITTER_ACCESS_TOKEN: string;
            TWITTER_ACCESS_TOKEN_SECRET: string;
            SEED_TRANSACTION: string;
        }
    }
}
