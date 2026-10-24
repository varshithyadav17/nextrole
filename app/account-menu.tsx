"use client";

import {useRef} from 'react';
import {Pause,Play,Bell,ChevronDown,ExternalLink,LogOut,MessageSquare,Settings2,FileText,ShieldCheck,Sparkles,UserRound,Puzzle} from 'lucide-react';
import {DropdownMenu,DropdownMenuContent,DropdownMenuItem,DropdownMenuLabel,DropdownMenuSeparator,DropdownMenuTrigger} from '../components/ui/dropdown-menu';
import {useScoutMotion} from './scout-motion';
import type {RadarLocation,Tab} from '../lib/navigation';

type Props={
 variant?:'header'|'sidebar';
 onNotifications?:()=>void;
 name:string;
 email:string;
 isHost:boolean;
 unreadReplies:number;
 open:boolean;
 onOpenChange:(open:boolean)=>void;
 onNavigate:(tab:Tab,settingsView?:RadarLocation['settingsView'])=>void;
 onLogout:()=>void;
};

export default function AccountMenu({variant='header',onNotifications,name,email,isHost,unreadReplies,open,onOpenChange,onNavigate,onLogout}:Props){
 const movingFocus=useRef(false);
 const {enabled,reduced,toggle}=useScoutMotion();
 function visit(tab:Tab,settingsView?:RadarLocation['settingsView']){
  movingFocus.current=true;
  onNavigate(tab,settingsView);
 }
 const initial=(name.trim()||email).split(/\s+/).slice(0,2).map(part=>part[0]).join('').toUpperCase();
 return <DropdownMenu open={open} onOpenChange={next=>{if(next)movingFocus.current=false;onOpenChange(next);}} modal={false}>
  <DropdownMenuTrigger className={'account-menu-trigger account-menu-trigger--'+variant} aria-label="Open account menu" title="Account menu">
   <span className="account-menu-avatar" aria-hidden="true">{initial}</span>
   {variant==='sidebar'&&<span className="account-trigger-identity"><strong>{name.trim()||email}</strong><small>{isHost?'Admin':'Student'}</small></span>}
   <ChevronDown size={13} aria-hidden="true"/>
  </DropdownMenuTrigger>
  <DropdownMenuContent className="account-dropdown" align={variant==='sidebar'?'start':'end'} side={variant==='sidebar'?'top':'bottom'} sideOffset={9} collisionPadding={12} aria-label="Your account" onEscapeKeyDown={event=>event.stopPropagation()} onCloseAutoFocus={event=>{if(movingFocus.current){event.preventDefault();movingFocus.current=false;}}}>
   <DropdownMenuLabel className="account-menu-heading"><strong>{name.trim()||email}</strong><span>{email}</span><small>{isHost?'Host & personal workspace':'Personal workspace'}</small></DropdownMenuLabel>
   <DropdownMenuSeparator/>
   {onNotifications&&<DropdownMenuItem className="account-menu-item" onSelect={onNotifications}><Bell size={17}/>Notifications</DropdownMenuItem>}
   <DropdownMenuItem className="account-menu-item" onSelect={()=>visit('settings','profile')}><UserRound size={17}/>Search profile</DropdownMenuItem>
   <DropdownMenuItem className="account-menu-item" onSelect={()=>visit('settings','career')}><FileText size={17}/>Career facts &amp; résumé</DropdownMenuItem>
   <DropdownMenuItem className="account-menu-item" onSelect={()=>visit('settings','ai')}><Sparkles size={17}/>AI connections</DropdownMenuItem>
   <DropdownMenuItem className="account-menu-item" onSelect={()=>visit('settings','alerts')}><Bell size={17}/>Alerts & account</DropdownMenuItem>
   <DropdownMenuItem className="account-menu-item" asChild><a href="/extension" target="_blank" rel="noopener noreferrer"><Puzzle size={17}/>Browser extension &amp; setup<ExternalLink size={13} className="account-menu-external" aria-label="Opens in a new tab"/></a></DropdownMenuItem>
   <DropdownMenuItem className="account-menu-item" onSelect={()=>visit('settings','help')}><MessageSquare size={17}/>Help & feedback{unreadReplies>0&&<span className="account-menu-count" aria-label={`${unreadReplies} unread replies`}>{unreadReplies}</span>}</DropdownMenuItem>
   {isHost&&<DropdownMenuItem className="account-menu-item" onSelect={()=>visit('host')}><Settings2 size={17}/>Host workspace</DropdownMenuItem>}
   <DropdownMenuItem className="account-menu-item" asChild><a href="/privacy" target="_blank" rel="noopener noreferrer"><ShieldCheck size={17}/>Privacy & data<ExternalLink size={13} className="account-menu-external" aria-label="Opens in a new tab"/></a></DropdownMenuItem>
   <DropdownMenuSeparator/>
   <DropdownMenuItem className="account-menu-item" disabled={reduced} onSelect={event=>{event.preventDefault();toggle();}}>{enabled?<Pause size={17}/>:<Play size={17}/>} {reduced?'Reduced motion':enabled?'Pause animations':'Enable animations'}</DropdownMenuItem>
   <DropdownMenuItem className="account-menu-item account-menu-logout" asChild><a href="/signout-with-chatgpt?return_to=%2F" onClick={onLogout} target="_top"><LogOut size={17}/>Log out</a></DropdownMenuItem>
  </DropdownMenuContent>
 </DropdownMenu>;
}
