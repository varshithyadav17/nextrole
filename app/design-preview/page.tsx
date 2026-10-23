import {notFound} from 'next/navigation';
import DesignPreview from './preview';

/** Local design harness only. It cannot expose an account or a production API. */
export default function DesignPreviewPage(){
 if(process.env.NODE_ENV!=='development')notFound();
 return <DesignPreview/>;
}
