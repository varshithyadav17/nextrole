import {redirect} from 'next/navigation';
export const metadata={title:'NextRole / Admin',robots:{index:false,follow:false}};
export default function AdminRedirect(){redirect('/admin');}
