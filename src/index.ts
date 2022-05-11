import * as SolanaWeb3 from "@solana/web3.js";
import "dotenv/config";

import { Connection, programs } from "@metaplex/js";
import axios from "axios";
import log from "./Utils/logger";

import { MarketplaceMap } from "./constants/marketplaces";
import { BearMetadata } from "./interfaces/BearMetadata";
import { SolanaConnectionOptions } from "./interfaces/SolanaConnectionOptions";

require("dotenv").config();

const twitterUN = process.env.TWITTER_UN;
const ta = process.env.TWITTER_API_KEY;
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

// TODO:there is a lot going on in here I should break it down. - do this last after smaller refactors
async function runBot() {
    log.info("---Start of Run Bot---");

    let isOkay = true;
    let signatures;
    let lastKnownSignature;

    let options = {} as SolanaConnectionOptions;

    options.until = process.env.SEED_TRANSACTION;

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
                let { signature } = signatures[i];
                await sleepyDev(innerRpcInterval);
                const txn = await solanaConnection.getTransaction(signature);

                let isGreen = false;

                //Do something better than continue over?
                if (txn?.meta?.err != null) {
                    log.warn("getTransaction errored with: ", txn.meta.err);
                    continue;
                }

                //TODO: potentailly add checks for 0 values? not high priority

                let blockTime = txn?.blockTime ?? 0;
                let preBalanceZeroIndex = txn?.meta?.preBalances[0] ?? 0;
                let postBalanceZeroIndex = txn?.meta?.postBalances[0] ?? 0;

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
                let accountsLength = accounts?.length ?? 0;

                const marketplaceAccount =
                    accounts![accountsLength - 1].toString();

                let mint = txn?.meta?.postTokenBalances![0].mint ?? "";

                if (MarketplaceMap.get(marketplaceAccount)) {
                    const metadata = await getMetadata(mint);
                    if (!metadata) {
                        log.warn(`No metadata for mint value: ${mint}`);
                        continue;
                    }

                    isGreen =
                        metadata.attributes.find((x) => x.trait_type === "Fur")
                            ?.value === "Green"
                            ? true
                            : false;

                    if (isGreen) {
                        printSalesInfo(
                            dateTimeString,
                            price,
                            signature,
                            metadata.name,
                            MarketplaceMap.get(marketplaceAccount) ?? "",
                            metadata.image
                        );
                        // TODO: (after refactors)
                        // await postSaleToTwitter()
                    } else {
                        log.info("Bear was not Green");
                    }
                } else {
                    log.warn(`Marketplace not found: ${marketplaceAccount}`);
                }
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
    if (!process.env.TWITTER_API_KEY || !process.env.TWITTER_UN) {
        log.error("Missing Twitter Info");
        return false;
    }
    if (!process.env.SEED_TRANSACTION) {
        log.error("No Seed Transactions Configured");
        return false;
    }
    return true;
}

const postSaleToTwitter = async (salesInfo: string) => {};

const getMetadata = async (tokenPubKey: string) => {
    try {
        const addr = await Metadata.getPDA(tokenPubKey);
        const resp = await Metadata.load(metaplexConnection, addr);
        const { data } = await axios.get<BearMetadata>(resp.data.data.uri);

        return data;
    } catch (error) {
        log.error("fetching metadata: ", error);
    }
};

const printSalesInfo = (
    date: string,
    price: number,
    signature: string,
    title: string,
    marketplace: string,
    imageURL: string
) => {
    log.info("-------------------------------------------");
    log.info(`Sale at ${date} ---> ${price} SOL`);
    log.info(`Signature: ${signature}`);
    log.info(`Name: ${title}`);
    log.info(`Image: ${imageURL}`);
    log.info(`Marketplace: ${marketplace}`);
    log.info("-------------------------------------------");
};

const sleepyDev = (ms: number) => new Promise((res) => setTimeout(res, ms));
