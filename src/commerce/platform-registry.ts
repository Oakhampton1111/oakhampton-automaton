export type PlatformMode = "bid" | "catalog" | "bounty" | "community" | "owned";
export type DiscoveryMethod = "api" | "email_alert" | "rss" | "browser";

export interface PlatformDefinition {
  id: string;
  regions: string[];
  languages: string[];
  currencies: string[];
  modes: PlatformMode[];
  discovery: DiscoveryMethod[];
  aiAssistance: "allowed" | "disclosed" | "restricted" | "prohibited";
  automatedSubmission: "allowed" | "approval_required" | "prohibited";
  offPlatformContact: boolean;
  identityVerification: boolean;
  feeBps: number;
  minimumFeeCents: number;
}

export const GLOBAL_PLATFORM_REGISTRY: PlatformDefinition[] = [
  { id:"upwork",regions:["global"],languages:["en"],currencies:["USD"],modes:["bid","catalog"],discovery:["email_alert","browser"],aiAssistance:"disclosed",automatedSubmission:"approval_required",offPlatformContact:false,identityVerification:true,feeBps:1000,minimumFeeCents:0 },
  { id:"fiverr",regions:["global"],languages:["en","es","de","fr"],currencies:["USD"],modes:["catalog"],discovery:["email_alert","browser"],aiAssistance:"disclosed",automatedSubmission:"approval_required",offPlatformContact:false,identityVerification:true,feeBps:2000,minimumFeeCents:0 },
  { id:"freelancer",regions:["global"],languages:["multi"],currencies:["USD","AUD","EUR","GBP","CAD","NZD","SGD","JPY","BRL","MXN","INR"],modes:["bid"],discovery:["email_alert","browser"],aiAssistance:"disclosed",automatedSubmission:"approval_required",offPlatformContact:false,identityVerification:true,feeBps:1000,minimumFeeCents:500 },
  { id:"contra",regions:["global"],languages:["en"],currencies:["USD"],modes:["bid","catalog"],discovery:["email_alert","browser"],aiAssistance:"allowed",automatedSubmission:"approval_required",offPlatformContact:true,identityVerification:true,feeBps:0,minimumFeeCents:0 },
  { id:"peopleperhour",regions:["global","uk","eu"],languages:["en"],currencies:["GBP","EUR","USD"],modes:["bid","catalog"],discovery:["email_alert","browser"],aiAssistance:"disclosed",automatedSubmission:"approval_required",offPlatformContact:false,identityVerification:true,feeBps:2000,minimumFeeCents:0 },
  { id:"guru",regions:["global"],languages:["en"],currencies:["USD"],modes:["bid"],discovery:["email_alert","browser"],aiAssistance:"disclosed",automatedSubmission:"approval_required",offPlatformContact:false,identityVerification:true,feeBps:900,minimumFeeCents:0 },
  { id:"workana",regions:["latam","spain","global"],languages:["es","pt","en"],currencies:["USD"],modes:["bid"],discovery:["email_alert","browser"],aiAssistance:"disclosed",automatedSubmission:"approval_required",offPlatformContact:false,identityVerification:true,feeBps:2000,minimumFeeCents:0 },
  { id:"malt",regions:["eu","uk","uae"],languages:["en","fr","de","es","nl"],currencies:["EUR","GBP","AED"],modes:["bid"],discovery:["email_alert","browser"],aiAssistance:"disclosed",automatedSubmission:"approval_required",offPlatformContact:false,identityVerification:true,feeBps:1000,minimumFeeCents:0 },
  { id:"lancers",regions:["japan"],languages:["ja"],currencies:["JPY"],modes:["bid","catalog"],discovery:["email_alert","browser"],aiAssistance:"disclosed",automatedSubmission:"approval_required",offPlatformContact:false,identityVerification:true,feeBps:1650,minimumFeeCents:0 },
  { id:"crowdworks",regions:["japan"],languages:["ja"],currencies:["JPY"],modes:["bid"],discovery:["email_alert","browser"],aiAssistance:"disclosed",automatedSubmission:"approval_required",offPlatformContact:false,identityVerification:true,feeBps:2000,minimumFeeCents:0 },
  { id:"airtasker",regions:["australia","uk","us"],languages:["en"],currencies:["AUD","GBP","USD"],modes:["bid"],discovery:["email_alert","browser"],aiAssistance:"disclosed",automatedSubmission:"approval_required",offPlatformContact:false,identityVerification:true,feeBps:2250,minimumFeeCents:0 },
  { id:"algora",regions:["global"],languages:["en"],currencies:["USD"],modes:["bounty"],discovery:["api","browser"],aiAssistance:"allowed",automatedSubmission:"approval_required",offPlatformContact:true,identityVerification:true,feeBps:0,minimumFeeCents:0 },
  { id:"superteam-earn",regions:["global"],languages:["en"],currencies:["USDC","USDG","SOL"],modes:["bounty","bid"],discovery:["api"],aiAssistance:"allowed",automatedSubmission:"allowed",offPlatformContact:true,identityVerification:true,feeBps:0,minimumFeeCents:0 },
  { id:"gitcoin",regions:["global"],languages:["en"],currencies:["USDC","ETH","USD"],modes:["bounty"],discovery:["browser"],aiAssistance:"disclosed",automatedSubmission:"approval_required",offPlatformContact:true,identityVerification:true,feeBps:0,minimumFeeCents:0 },
  { id:"bountycaster",regions:["global"],languages:["en"],currencies:["USDC","ETH","USD"],modes:["bounty"],discovery:["browser"],aiAssistance:"allowed",automatedSubmission:"approval_required",offPlatformContact:true,identityVerification:true,feeBps:0,minimumFeeCents:0 },
  { id:"clawfreelance",regions:["global"],languages:["en"],currencies:["USDC","ETH","USD"],modes:["bounty","bid"],discovery:["api","browser"],aiAssistance:"allowed",automatedSubmission:"approval_required",offPlatformContact:true,identityVerification:false,feeBps:0,minimumFeeCents:0 },
  { id:"skarnfall",regions:["global"],languages:["en"],currencies:["USD"],modes:["bounty","bid"],discovery:["api"],aiAssistance:"allowed",automatedSubmission:"approval_required",offPlatformContact:true,identityVerification:false,feeBps:0,minimumFeeCents:0 },
  { id:"taskmarket",regions:["global"],languages:["en"],currencies:["USDC","USD"],modes:["bounty"],discovery:["api","browser"],aiAssistance:"allowed",automatedSubmission:"approval_required",offPlatformContact:true,identityVerification:false,feeBps:0,minimumFeeCents:0 },
  { id:"clawmolt",regions:["global"],languages:["en"],currencies:["USDC","USD"],modes:["bounty","catalog"],discovery:["api","browser"],aiAssistance:"allowed",automatedSubmission:"approval_required",offPlatformContact:true,identityVerification:false,feeBps:0,minimumFeeCents:0 },
  { id:"taskforce",regions:["global"],languages:["en"],currencies:["USD"],modes:["bid"],discovery:["browser"],aiAssistance:"allowed",automatedSubmission:"approval_required",offPlatformContact:true,identityVerification:false,feeBps:0,minimumFeeCents:0 },
  { id:"hackerone",regions:["global"],languages:["en"],currencies:["USD"],modes:["bounty"],discovery:["browser"],aiAssistance:"allowed",automatedSubmission:"approval_required",offPlatformContact:false,identityVerification:true,feeBps:0,minimumFeeCents:0 },
  { id:"web3-career",regions:["global"],languages:["en"],currencies:["USD"],modes:["bid"],discovery:["api","browser"],aiAssistance:"disclosed",automatedSubmission:"approval_required",offPlatformContact:true,identityVerification:false,feeBps:0,minimumFeeCents:0 },
  { id:"crypto-jobs",regions:["global"],languages:["en"],currencies:["USD"],modes:["bid"],discovery:["browser"],aiAssistance:"disclosed",automatedSubmission:"approval_required",offPlatformContact:true,identityVerification:false,feeBps:0,minimumFeeCents:0 },
  { id:"blockchain-jobs-board",regions:["global"],languages:["en"],currencies:["USD"],modes:["bid"],discovery:["browser"],aiAssistance:"disclosed",automatedSubmission:"approval_required",offPlatformContact:true,identityVerification:false,feeBps:0,minimumFeeCents:0 },
  { id:"satoshi-jobs",regions:["global"],languages:["en"],currencies:["USD","USDC"],modes:["bid","bounty"],discovery:["browser"],aiAssistance:"disclosed",automatedSubmission:"approval_required",offPlatformContact:true,identityVerification:false,feeBps:0,minimumFeeCents:0 },
  { id:"coinbase-bounties",regions:["global"],languages:["en"],currencies:["USDC","ETH"],modes:["bounty"],discovery:["browser"],aiAssistance:"disclosed",automatedSubmission:"approval_required",offPlatformContact:false,identityVerification:true,feeBps:0,minimumFeeCents:0 },
  { id:"bounties-sh",regions:["global"],languages:["en"],currencies:["USD","USDC"],modes:["bounty"],discovery:["browser"],aiAssistance:"disclosed",automatedSubmission:"approval_required",offPlatformContact:false,identityVerification:true,feeBps:0,minimumFeeCents:0 },  { id:"remoteok",regions:["global"],languages:["en"],currencies:["USD"],modes:["bid"],discovery:["api"],aiAssistance:"disclosed",automatedSubmission:"approval_required",offPlatformContact:true,identityVerification:false,feeBps:0,minimumFeeCents:0 },
  { id:"remotive",regions:["global"],languages:["en"],currencies:["USD"],modes:["bid"],discovery:["api"],aiAssistance:"disclosed",automatedSubmission:"approval_required",offPlatformContact:true,identityVerification:false,feeBps:0,minimumFeeCents:0 },
  { id:"arbeitnow",regions:["global","eu"],languages:["en","de"],currencies:["EUR","USD"],modes:["bid"],discovery:["api"],aiAssistance:"disclosed",automatedSubmission:"approval_required",offPlatformContact:true,identityVerification:false,feeBps:0,minimumFeeCents:0 },
  { id:"dealwork",regions:["global"],languages:["en"],currencies:["USD","USDC"],modes:["bid","bounty"],discovery:["api"],aiAssistance:"allowed",automatedSubmission:"allowed",offPlatformContact:true,identityVerification:false,feeBps:0,minimumFeeCents:0 },
  { id:"opentask",regions:["global"],languages:["en"],currencies:["USD","USDC"],modes:["bid","bounty"],discovery:["api"],aiAssistance:"allowed",automatedSubmission:"allowed",offPlatformContact:true,identityVerification:false,feeBps:0,minimumFeeCents:0 },
  { id:"ugig",regions:["global"],languages:["en"],currencies:["USD","USDC","SOL","ETH","BTC"],modes:["bid","catalog","community"],discovery:["api"],aiAssistance:"allowed",automatedSubmission:"allowed",offPlatformContact:true,identityVerification:false,feeBps:0,minimumFeeCents:0 },
  { id:"pinch",regions:["global"],languages:["en"],currencies:["USDC","ETH"],modes:["bid","bounty"],discovery:["api"],aiAssistance:"allowed",automatedSubmission:"allowed",offPlatformContact:true,identityVerification:false,feeBps:0,minimumFeeCents:0 },
  { id:"mcp-hive",regions:["global"],languages:["en"],currencies:["USD","USDC"],modes:["catalog","owned"],discovery:["api"],aiAssistance:"allowed",automatedSubmission:"approval_required",offPlatformContact:true,identityVerification:false,feeBps:0,minimumFeeCents:0 },
  { id:"circle-agent-marketplace",regions:["global"],languages:["en"],currencies:["USDC"],modes:["catalog","owned"],discovery:["api"],aiAssistance:"allowed",automatedSubmission:"approval_required",offPlatformContact:true,identityVerification:true,feeBps:0,minimumFeeCents:0 },
  { id:"reddit",regions:["global"],languages:["multi"],currencies:[],modes:["community"],discovery:["browser"],aiAssistance:"disclosed",automatedSubmission:"prohibited",offPlatformContact:true,identityVerification:false,feeBps:0,minimumFeeCents:0 },
  { id:"here-now",regions:["global"],languages:["multi"],currencies:[],modes:["owned"],discovery:["api"],aiAssistance:"allowed",automatedSubmission:"approval_required",offPlatformContact:true,identityVerification:false,feeBps:0,minimumFeeCents:0 },
  { id:"agentmail-commerce",regions:["global"],languages:["multi"],currencies:["AUD","USD","USDC"],modes:["owned"],discovery:["email_alert"],aiAssistance:"allowed",automatedSubmission:"approval_required",offPlatformContact:true,identityVerification:false,feeBps:0,minimumFeeCents:0 },
];

export class PlatformRegistry {
  private readonly map = new Map<string, PlatformDefinition>();
  constructor(definitions: PlatformDefinition[] = GLOBAL_PLATFORM_REGISTRY) {
    for (const item of definitions) {
      if (this.map.has(item.id)) throw new Error(`duplicate platform: ${item.id}`);
      if (item.feeBps < 0 || item.feeBps > 10_000) throw new Error(`invalid fee: ${item.id}`);
      this.map.set(item.id, Object.freeze({ ...item }));
    }
  }
  get(id: string): PlatformDefinition { const value=this.map.get(id); if(!value) throw new Error(`unknown platform: ${id}`); return value; }
  list(): PlatformDefinition[] { return [...this.map.values()]; }
  supports(id:string, language:string, currency:string):boolean { const p=this.get(id); return (p.languages.includes(language)||p.languages.includes("multi"))&&p.currencies.includes(currency); }
}
