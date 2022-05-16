import { BearMetadata } from "./BearMetadata";

export interface BearSalesInfo {
    bearMetaData: BearMetadata;
    timeOfSale: string;
    salesPrice: number;
    signature: string;
    marketplaceName: string;
}
