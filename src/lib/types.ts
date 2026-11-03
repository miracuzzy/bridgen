// Shapes returned by the 1Click API (https://1click.chaindefuser.com/docs/v0/openapi.yaml).
// Only fields Bridgen reads are typed. Everything is optional where the API may omit it.

export type Token = {
  assetId: string;
  decimals: number;
  blockchain: string;
  symbol: string;
  price?: number;
  priceUpdatedAt?: string;
  contractAddress?: string;
};

export type QuoteRequestBody = {
  dry: boolean;
  swapType: "EXACT_INPUT";
  slippageTolerance: number;
  originAsset: string;
  depositType: "ORIGIN_CHAIN";
  destinationAsset: string;
  amount: string;
  refundTo: string;
  refundType: "ORIGIN_CHAIN";
  recipient: string;
  recipientType: "DESTINATION_CHAIN";
  deadline: string;
};

export type QuoteData = {
  depositAddress?: string;
  depositMemo?: string;
  amountIn: string;
  amountInFormatted?: string;
  amountInUsd?: string;
  minAmountIn?: string;
  amountOut: string;
  amountOutFormatted?: string;
  amountOutUsd?: string;
  minAmountOut?: string;
  deadline?: string;
  timeWhenInactive?: string;
  timeEstimate?: number;
  refundFee?: string;
  withdrawFee?: string;
};

export type QuoteResponse = {
  quote: QuoteData;
  quoteRequest: Partial<QuoteRequestBody> & Record<string, unknown>;
  signature?: string;
  timestamp?: string;
  correlationId?: string;
};

export const SWAP_STATUSES = [
  "KNOWN_DEPOSIT_TX",
  "PENDING_DEPOSIT",
  "INCOMPLETE_DEPOSIT",
  "PROCESSING",
  "SUCCESS",
  "REFUNDED",
  "FAILED",
] as const;
export type SwapStatus = (typeof SWAP_STATUSES)[number];

export type TxDetails = { hash: string; explorerUrl?: string };

export type StatusResponse = {
  status: SwapStatus;
  updatedAt?: string;
  swapDetails?: {
    intentHashes?: string[];
    nearTxHashes?: string[];
    amountOutFormatted?: string;
    amountOutUsd?: string;
    refundedAmountFormatted?: string;
    refundReason?: string;
    depositedAmountFormatted?: string;
    originChainTxHashes?: TxDetails[];
    destinationChainTxHashes?: TxDetails[];
  };
};
