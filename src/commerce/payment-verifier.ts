import { createPublicClient, decodeEventLog, http, type Address, type Hex, type Log } from "viem";
import { base, baseSepolia } from "viem/chains";

const TRANSFER_ABI=[{type:"event",name:"Transfer",inputs:[{indexed:true,name:"from",type:"address"},{indexed:true,name:"to",type:"address"},{indexed:false,name:"value",type:"uint256"}]}] as const;
export const PAYMENT_NETWORKS={
  "eip155:8453":{chain:base,token:"0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as Address},
  "eip155:84532":{chain:baseSepolia,token:"0x036CbD53842c5426634e7929541eC2318f3dCF7e" as Address},
} as const;

export function extractIncomingUsdc(logs:readonly Log[],token:Address,recipient:Address){
 let micros=0n;
 for(const log of logs){if(log.address.toLowerCase()!==token.toLowerCase())continue;try{const decoded=decodeEventLog({abi:TRANSFER_ABI,data:log.data,topics:log.topics});if(decoded.eventName==="Transfer"&&decoded.args.to.toLowerCase()===recipient.toLowerCase())micros+=decoded.args.value;}catch{}}
 return micros;
}

export async function verifyIncomingUsdc(input:{transactionHash:Hex;recipient:Address;network:keyof typeof PAYMENT_NETWORKS;expectedAmountCents?:number;minimumConfirmations?:number;rpcUrl?:string}){
 const spec=PAYMENT_NETWORKS[input.network];if(!spec)throw new Error("UNSUPPORTED_PAYMENT_NETWORK");
 const client=createPublicClient({chain:spec.chain,transport:http(input.rpcUrl,{timeout:10000})});
 const [receipt,head]=await Promise.all([client.getTransactionReceipt({hash:input.transactionHash}),client.getBlockNumber()]);
 if(receipt.status!=="success")throw new Error("PAYMENT_TRANSACTION_FAILED");
 const confirmations=Number(head-receipt.blockNumber+1n),minimum=input.minimumConfirmations??3;if(confirmations<minimum)throw new Error(`PAYMENT_CONFIRMATIONS_PENDING:${confirmations}/${minimum}`);
 const amountMicros=extractIncomingUsdc(receipt.logs,spec.token,input.recipient);if(amountMicros<=0n)throw new Error("PAYMENT_TRANSFER_NOT_FOUND");
 const amountCents=Number(amountMicros/10000n);if(input.expectedAmountCents!==undefined&&amountMicros!==BigInt(input.expectedAmountCents)*10000n)throw new Error("PAYMENT_AMOUNT_MISMATCH");
 return{transactionHash:input.transactionHash,network:input.network,token:spec.token,recipient:input.recipient,amountMicros:amountMicros.toString(),amountCents,blockNumber:receipt.blockNumber.toString(),confirmations};
}
