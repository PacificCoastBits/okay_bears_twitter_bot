import * as SolanaWeb3 from "@solana/web3.js";
import "dotenv/config";

import { Connection, programs } from "@metaplex/js";

import axios, { AxiosResponse } from "axios";
import log from "./utils/logger";
import twitterClient from "./utils/twitterClient";

import { MarketplaceMap } from "./constants/marketplaces";
import { BearMetadata } from "./interfaces/BearMetadata";
import { SolanaConnectionOptions } from "./interfaces/SolanaConnectionOptions";
import { BearSalesInfo } from "./interfaces/BearSalesInfo";
import { TwitterResponse } from "./interfaces/TwitterResponse";
import { MediaUpload } from "twitter-api-client";

const okayBearsPubKey = new SolanaWeb3.PublicKey(process.env.OKAY_PUB_KEY);

const url = SolanaWeb3.clusterApiUrl("mainnet-beta");
const solanaConnection = new SolanaWeb3.Connection(url, "confirmed");
const metaplexConnection = new Connection("mainnet-beta");

const {
    metadata: { Metadata },
} = programs;

const pollingInverval = 10000; //ms

//Entry
log.info("---Starting bot---");
if (VerifyEnvVars()) {
    runBot();
} else {
    log.error("Check Env Vars");
}

// TODO: Could pull the main program loop up a level but I don't think it matters too much
async function runBot() {
    log.info("---Start of Run Bot---");

    const isOkay = true;
    let signatures;
    let lastKnownSignature;

    const options = {} as SolanaConnectionOptions;

    options.until = process.env.SEED_TRANSACTION;

    //So if it's not going to be pub/sub having it in a loop is still not the best idea.
    //Consider introducing a job scheduler and having that execute on x interval then
    //just have the app suspended or in some similar state..I think I can do this all with node-cron
    while (isOkay) {
        try {
            signatures = await solanaConnection.getSignaturesForAddress(
                okayBearsPubKey,
                options
            );
            if (!signatures.length) {
                await sleepyDev(pollingInverval);
                continue;
            }
        } catch (e) {
            log.warn("Something went wrong fetching signatures ", e);
            await sleepyDev(pollingInverval);
            continue;
        }

        for (let i = signatures.length - 1; i >= 0; i--) {
            const innerRpcInterval = 5000; //ms
            try {
                const { signature } = signatures[i];
                await sleepyDev(innerRpcInterval);
                const txn = await solanaConnection.getTransaction(signature);

                //Do something better than continue over? TODO: Also this is spitting out [object, object] in some cases..Fix that
                if (txn?.meta?.err != null) {
                    log.warn(
                        `getTransaction errored with: ${getErrorMessage(
                            txn.meta.err
                        )}`
                    );
                    continue;
                }

                //potentailly add checks for 0 values? not high priority

                const blockTime = txn?.blockTime ?? 0;
                const preBalanceZeroIndex = txn?.meta?.preBalances[0] ?? 0;
                const postBalanceZeroIndex = txn?.meta?.postBalances[0] ?? 0;

                const dateString = new Date(
                    blockTime * 1000
                ).toLocaleDateString();
                const hourString = new Date(
                    blockTime * 1000
                ).toLocaleTimeString();
                const dateTimeString = `${dateString} ${hourString}`;

                const price =
                    Math.abs(preBalanceZeroIndex - postBalanceZeroIndex) /
                    SolanaWeb3.LAMPORTS_PER_SOL;

                const accounts = txn?.transaction.message.accountKeys;
                const accountsLength = accounts?.length ?? 0;

                //yeah idk dude.. I should probably look into this as opposed to just assuming it works..
                const marketplaceAccount =
                    accounts![accountsLength - 1].toString();

                const mint = txn?.meta?.postTokenBalances?.[0].mint ?? "";

                const metadata = await getMetadata(mint);
                if (!metadata) {
                    log.warn(`No metadata for mint value: ${mint}`);
                    continue;
                }

                const marketplaceAccountName =
                    MarketplaceMap.get(marketplaceAccount) ?? "Unknown";

                if (marketplaceAccountName === "Unknown") {
                    log.warn(
                        `Marketplace Account Name not found for: ${marketplaceAccount}`
                    );
                }

                const bearSalesInfo = {
                    bearMetaData: metadata,
                    timeOfSale: dateTimeString,
                    salesPrice: price,
                    signature: signature,
                    marketplaceName: MarketplaceMap.get(marketplaceAccount),
                } as BearSalesInfo;

                await handleSale(bearSalesInfo);
            } catch (e) {
                log.error("error going through transactions ", e);
                continue;
            }
        }

        lastKnownSignature = signatures[0].signature;
        if (lastKnownSignature) {
            options.until = lastKnownSignature;
        }
    }
    log.info("Exiting main program loop"); // note - if set isOkay to false - log reason why here
}

function VerifyEnvVars(): boolean {
    if (!process.env.OKAY_PUB_KEY) {
        log.error("Missing Project PubKey");
        return false;
    }
    if (
        !process.env.TWITTER_API_KEY ||
        !process.env.TWITTER_API_KEY_SECRET ||
        !process.env.TWITTER_ACCESS_TOKEN ||
        !process.env.TWITTER_ACCESS_TOKEN_SECRET
    ) {
        log.error("Missing Twitter Info");
        return false;
    }
    if (!process.env.SEED_TRANSACTION) {
        log.error("No Seed Transactions Configured");
        return false;
    }
    return true;
}

function getErrorMessage(error: unknown) {
    if (error instanceof Error) return error.message;
    return String(error);
}

const handleSale = async (bearSalesInfo: BearSalesInfo) => {
    const isGreen = // true; For Testing
        bearSalesInfo.bearMetaData.attributes.find(
            (x) => x.trait_type === "Fur"
        )?.value === "Green"
            ? true
            : false;

    if (isGreen) {
        printSalesInfo(bearSalesInfo);
        await postSaleToTwitter(bearSalesInfo);
    } else {
        log.info("Bear was not Green");
    }
};

const postSaleToTwitter = async (bearSalesInfo: BearSalesInfo) => {
    try {
        const image: AxiosResponse = await axios.get(
            bearSalesInfo.bearMetaData.image,
            {
                responseType: "arraybuffer",
            }
        );

        const media: MediaUpload = await twitterClient.media.mediaUpload({
            media: Buffer.from(image.data, "binary").toString("base64"),
        });

        //signature should be solscan link.. not just the tx
        const tweet = `Okay Bears Green Sale! ${bearSalesInfo.bearMetaData.name} \n Time Of Sale: ${bearSalesInfo.timeOfSale}\n Marketplace: ${bearSalesInfo.marketplaceName}\n Price:${bearSalesInfo.salesPrice} SOL \n Txn: ${bearSalesInfo.signature}.`;

        const res = await twitterClient.tweets.statusesUpdate({
            status: tweet,
            media_ids: media.media_id_string,
        });
        log.info("Tweet sent!", res); //TODO: Look as res - see if there is anything we want to pull out to log
        // This catch block is a little messy it could probably be cleaned up by just building an error handler that's more than a basic function
    } catch (e) {
        //I should probably expand on TwitterResponse interface so I don't have to log json but it works
        const errorResponse = <TwitterResponse>e;
        if (errorResponse) {
            log.error(`Something went wrong tweeting: ${errorResponse.data}`);
        } else {
            log.error(`Something went wrong tweeting: ${getErrorMessage(e)}`);
        }
    }
};

const getMetadata = async (tokenPubKey: string) => {
    try {
        const addr = await Metadata.getPDA(tokenPubKey);
        const resp = await Metadata.load(metaplexConnection, addr);
        const { data } = await axios.get<BearMetadata>(resp.data.data.uri);

        return data;
    } catch (e) {
        log.error(`fetching metadata: ${getErrorMessage(e)}`);
    }
};

const printSalesInfo = (bearSalesInfo: BearSalesInfo) => {
    log.info("-------------------------------------------");
    log.info(
        `Sale at ${bearSalesInfo.timeOfSale} ---> ${bearSalesInfo.salesPrice} SOL`
    );
    log.info(`Signature: ${bearSalesInfo.signature}`);
    log.info(`Name: ${bearSalesInfo.bearMetaData.name}`);
    log.info(`Image: ${bearSalesInfo.bearMetaData.image}`);
    log.info(`Marketplace: ${bearSalesInfo.marketplaceName}`);
    log.info("-------------------------------------------");
};

const sleepyDev = (ms: number) =>
    new Promise((res) => {
        setTimeout(res, ms);
        log.info(`Dev Sleeping for ${ms} ms`);
    });
