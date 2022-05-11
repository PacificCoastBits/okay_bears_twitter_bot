export {};

declare global{
 namespace NodeJS {
    export interface ProcessEnv {
        OKAY_PUB_KEY: string;
        TWITTER_UN: string;
        TWITTER_API_KEY: string;
        SEED_TRANSACTION: string;
    }
  }
}