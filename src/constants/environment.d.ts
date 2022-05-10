export {};

declare global{
 namespace NodeJS {
    export interface ProcessEnv {
        OKAY_PUB_KEY: string;
        TWITTER_UN: string;
        TIWTTER_API_KEY: string;
        SEED_TRANSACTION: string;
    }
  }
}