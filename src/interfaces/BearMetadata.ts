export interface BearMetadata {
  name: string;
  symbol: string;
  description: string;
  seller_fee_basis_points: number;
  image: string;
  external_url: string;
  attributes: Attribute[];
}

interface Attribute {
  trait_type: string;
  value: string;
}
