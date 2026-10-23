"use client";
import {FileText,X} from 'lucide-react';
export default function ScoutFile({name,bytes,url,onRemove}:{name:string;bytes:number;url:string;onRemove?:()=>void}){
 return <div className="scout-file-card"><span className="scout-file-icon"><FileText size={23}/><small>PDF</small></span><div><strong title={name}>{name}</strong><small>{Math.ceil(bytes/1024)} KB · <a href={url} target="_blank" rel="noopener noreferrer">Preview</a></small></div>{onRemove&&<button type="button" className="scout-icon-button" onClick={onRemove} aria-label="Remove PDF attachment"><X size={16}/></button>}</div>;
}
