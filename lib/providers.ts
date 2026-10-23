export const PROVIDERS={
 openai:{name:'OpenAI',defaultModel:'gpt-5-mini',models:['gpt-5-mini','gpt-5'],keyUrl:'https://platform.openai.com/api-keys'},
 gemini:{name:'Google Gemini',defaultModel:'gemini-3.5-flash-lite',models:['gemini-3.5-flash-lite','gemini-3.8-flash','gemini-2.5-flash','gemini-2.5-flash-lite'],keyUrl:'https://aistudio.google.com/api-keys'},
 groq:{name:'Groq',defaultModel:'openai/gpt-oss-120b',models:['openai/gpt-oss-120b','openai/gpt-oss-20b'],keyUrl:'https://console.groq.com/keys'}
} as const;
export type Provider=keyof typeof PROVIDERS;
export type SlotSummary={slot:number;configured:boolean;provider:Provider;model:string;label:string;lastFour:string;enabled:boolean;status:string;message:string;cooldownUntil:string|null;updatedAt:string|null};
export type AIOverview={storageReady:boolean;slots:SlotSummary[];autoFallback:boolean;dailyLimit:number;usedToday:number};
