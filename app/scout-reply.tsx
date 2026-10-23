import {Fragment,type ReactNode} from 'react';

function inline(text:string):ReactNode[]{
 return text.split(/(\*\*[^*\n]+\*\*|`[^`\n]+`)/g).map((part,index)=>
  part.startsWith('**')&&part.endsWith('**')?<strong key={index}>{part.slice(2,-2)}</strong>:
  part.startsWith('`')&&part.endsWith('`')?<code key={index}>{part.slice(1,-1)}</code>:part);
}

/** A small, escaped subset of Markdown. Replies cannot execute HTML or load remote media. */
export default function ScoutReply({text}:{text:string}){
 const blocks:ReactNode[]=[],lines=text.replace(/\r\n?/g,'\n').split('\n');
 for(let i=0;i<lines.length;){
  const line=lines[i];
  if(!line.trim()){i++;continue;}
  if(line.trim().startsWith('```')){
   const code:string[]=[];i++;
   while(i<lines.length&&!lines[i].trim().startsWith('```'))code.push(lines[i++]);
   if(i<lines.length)i++;
   blocks.push(<pre key={blocks.length}><code>{code.join('\n')}</code></pre>);continue;
  }
  const list=line.match(/^\s*(?:([-*•])|(\d+)\.)\s+(.+)$/);
  if(list){
   const ordered=!!list[2],items:ReactNode[]=[];
   while(i<lines.length){
    const item=lines[i].match(/^\s*(?:([-*•])|(\d+)\.)\s+(.+)$/);
    if(!item||!!item[2]!==ordered)break;
    items.push(<li key={items.length}>{inline(item[3])}</li>);i++;
   }
   blocks.push(ordered?<ol key={blocks.length} start={Number(list[2])}>{items}</ol>:<ul key={blocks.length}>{items}</ul>);continue;
  }
  const paragraph:string[]=[];
  while(i<lines.length&&lines[i].trim()&&!lines[i].trim().startsWith('```')&&!/^\s*(?:[-*•]|\d+\.)\s+.+/.test(lines[i]))paragraph.push(lines[i++]);
  blocks.push(<p key={blocks.length}>{paragraph.map((part,index)=><Fragment key={index}>{index>0?<br/>:null}{inline(part)}</Fragment>)}</p>);
 }
 return <div className="scout-reply">{blocks}</div>;
}
