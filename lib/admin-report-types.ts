import type {hostMetrics} from './host-metrics';
import type {AdminReportDetail} from './admin-report-data';
export type HostMetrics=Awaited<ReturnType<typeof hostMetrics>>;
export type AdminReport=Omit<HostMetrics,'operations'>&{operations:HostMetrics['operations']|null;detail?:AdminReportDetail};
export type AdminSection='overview'|'retention'|'features'|'journey'|'feedback'|'operations';
export const SECTION_LABELS:Record<AdminSection,string>={overview:'Overview',retention:'Retention',features:'Feature adoption',journey:'Application journey',feedback:'Feedback & help',operations:'Operations'};
