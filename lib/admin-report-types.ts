import type {hostMetrics} from './host-metrics';
export type HostMetrics=Awaited<ReturnType<typeof hostMetrics>>;
export type AdminReport=Omit<HostMetrics,'operations'>&{operations:HostMetrics['operations']|null;demoRecords?:{datasetId:string;profiles:number;reviews:number;events:number;activityDays:number;applications:number;ratingScenario:string;dataMode:'synthetic'}};
export type AdminSection='overview'|'retention'|'features'|'journey'|'feedback'|'operations';
export const SECTION_LABELS:Record<AdminSection,string>={overview:'Overview',retention:'Retention',features:'Feature adoption',journey:'Application journey',feedback:'Feedback & help',operations:'Operations'};
