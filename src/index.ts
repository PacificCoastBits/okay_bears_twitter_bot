import * as SolanaWeb3 from "@solana/web3.js";
import { Connection, programs } from "@metaplex/js";
import axios from "axios";

import { MarketplaceMap } from "./constants/marketplaces";
import { BearMetadata } from "./interfaces/BearMetadata";

const okayBearsPubKey = new SolanaWeb3.PublicKey(
  "3xVDoLaecZwXXtN59o6T3Gfxwjcgf8Hc9RfoqBn995P9"
); //new PublicKey(process.env.OKAY_BEARS_PUB_KEY);

const url = SolanaWeb3.clusterApiUrl("mainnet-beta");
const solanaConnection = new SolanaWeb3.Connection(url, "confirmed");
const metaplexConnection = new Connection("mainnet-beta");

const {
  metadata: { Metadata },
} = programs;

interface Options {
  until: string | undefined;
}

const pollingInverval = 10000; //ms
//Probably toss in a const file

//Entry
console.log("---Starting bot---");
if (VerifyEnvVars()) {
  runBot();
} else {
  console.log("Error: Check Env Vars");
}

async function runBot() {
  console.log("---Start of Run Bot---");

  let signatures;
  let lastKnownSignature;

  let options = {} as Options; // what options get passed here
  //seed this with last sales tx when I launch the bot
  options.until =
    "5WbCp1iPYHW37LoozivhdMpj1EHxjibRGku6kiA9GH9Vn2GNpBPbHCoF3bRE7QYpumQyYJuWEmfdi6XKLAK4viSg"; // recent tras sig so we don't have to go to the dawn of time
  //prob do something a little better than run till then end of time with no breaks...
  while (true) {
    try {
      signatures = await solanaConnection.getSignaturesForAddress(
        okayBearsPubKey,
        options
      );
      if (!signatures.length) {
        await Timer(pollingInverval);
        continue;
      }
    } catch (e) {
      console.log("Error fetching sigs ", e);
      continue;
    }

    for (let i = signatures.length - 1; i >= 0; i--) {
      console.log("Dev-Log: iterations:", i);
      const innerRpcInterval = 5000; //ms
      try {
        let { signature } = signatures[i];
        await Timer(innerRpcInterval);
        const txn = await solanaConnection.getTransaction(signature);
        var isGreen = false;

        if (txn != null) {
          if (txn?.meta && txn?.meta?.err != null) {
            continue;
          } // probably log or something..

          // do something better than this here like build a helper function to pull this numeric shit out
          // or just confirm the objects in question are not null before the maths
          let blockTime = txn?.blockTime ?? 0;
          let preBalanceZeroIndex = txn?.meta?.preBalances[0] ?? 0;
          let postBalanceZeroIndex = txn?.meta?.postBalances[0] ?? 0;

          const dateString = new Date(blockTime * 1000).toLocaleDateString();
          const hourString = new Date(blockTime * 1000).toLocaleTimeString();
          const dateTimeString = `${dateString} ${hourString}`;

          const price =
            Math.abs(preBalanceZeroIndex - postBalanceZeroIndex) /
            SolanaWeb3.LAMPORTS_PER_SOL;

          const accounts = txn?.transaction.message.accountKeys;
          let accountsLength = accounts?.length ?? 0;

          const marketplaceAccount = accounts![accountsLength - 1].toString();

          let mint = txn?.meta?.postTokenBalances![0].mint ?? "";

          if (MarketplaceMap.get(marketplaceAccount)) {
            const metadata = await getMetadata(mint); // again use of ! to tell compiler wont be null + null coalescing since getMaetaData takes string - fix hackfest that this is
            if (!metadata) {
              console.log("Error: No metadata");
              continue;
            }

            // looping here with nested  is dumb. Make it a Dict and search the keys for 'Green'
            for (let attribute of metadata.attributes) {
              if (attribute.trait_type === "Fur") {
                if (attribute.value === "Green") {
                  isGreen = true;
                }
              }
            }
            if (isGreen) {
              printSalesInfo(
                dateTimeString,
                price,
                signature,
                metadata.name,
                MarketplaceMap.get(marketplaceAccount) ?? "",
                metadata.image
              ); // fix this
              // await postSaleToTwitter()
            } else {
              console.log("Info: Bear was not Green");
            }
          } else {
            console.log("Error - marketplace not found");
          }
        }
      } catch (e) {
        console.log("error going through sigs ", e);
        continue;
      }
    }

    lastKnownSignature = signatures[0].signature;
    if (lastKnownSignature) {
      options.until = lastKnownSignature;
    }
  }
}

function VerifyEnvVars(): boolean {
  return true;
}

const Timer = (ms: number) => new Promise((res) => setTimeout(res, ms));

const getMetadata = async (tokenPubKey: string) => {
  try {
    const addr = await Metadata.getPDA(tokenPubKey);
    const resp = await Metadata.load(metaplexConnection, addr);
    const { data } = await axios.get<BearMetadata>(resp.data.data.uri);

    return data;
  } catch (error) {
    console.log("error fetching metadata: ", error);
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
  console.log("-------------------------------------------");
  console.log(`Sale at ${date} ---> ${price} SOL`);
  console.log("Signature: ", signature);
  console.log("Name: ", title);
  console.log("Image: ", imageURL);
  console.log("Marketplace: ", marketplace);
  console.log("-------------------------------------------");
};
