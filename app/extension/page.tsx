import type {Metadata} from 'next';
import ExtensionGuide from './setup-guide';
import './store.css';

export const metadata:Metadata={title:'Scout Companion · Your job inbox in Chrome | NextRole',description:'Meet Scout Companion: recent job matches, optional desktop alerts and application preparation beside your browser. Check Chrome Web Store availability.'};
export default function ExtensionPage(){return <ExtensionGuide/>;}
