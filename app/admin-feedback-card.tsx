import type {ReactNode} from 'react';
import {Star,UserRound} from 'lucide-react';
import './admin-feedback-card.css';

export function FeedbackStars({rating}:{rating:number|null|undefined}){
 if(rating==null||!Number.isFinite(rating)||rating<1||rating>5)return null;
 return <div className="admin-review-rating" role="img" aria-label={`${rating} out of 5 stars`}>
  <span className="admin-review-stars" aria-hidden="true">{[1,2,3,4,5].map(star=><Star key={star} size={17} strokeWidth={1.7} className={star<=rating?'filled':''}/>)}</span>
  <span className="admin-review-score" aria-hidden="true"><strong>{rating}</strong><span>/ 5</span></span>
 </div>;
}

type Props={name?:string;rating:number|null;category?:string;subject?:string;message?:string;difficulty?:string;needs?:string;date?:string;tags?:ReactNode;children?:ReactNode};
export default function AdminFeedbackCard({name,rating,category,subject,message,difficulty,needs,date,tags,children}:Props){
 const author=name?.trim()||'NextRole member',initials=name?.trim().split(/\s+/u).slice(0,2).map(part=>Array.from(part)[0]).join('').toLocaleUpperCase();
 const tone=Array.from(author).reduce((sum,letter)=>sum+(letter.codePointAt(0)||0),0)%4;
 return <article className="admin-review-card">
  <header className="admin-review-header">
   <div className="admin-review-author"><span className={`admin-review-avatar tone-${tone}`} aria-hidden="true">{initials||<UserRound size={21}/>}</span><div><h3 className="admin-review-name">{author}</h3>{date&&<span className="admin-review-date">{date}</span>}</div></div>
   <FeedbackStars rating={rating}/>
  </header>
  {(category||tags)&&<div className="admin-review-tags">{category&&<span className="admin-review-category">{category}</span>}{tags}</div>}
  {subject&&<h4 className="admin-review-subject">{subject}</h4>}
  {message?.trim()&&<p className="admin-review-message">{message}</p>}
  {(difficulty||needs)&&<div className="admin-review-insights">{difficulty&&<div><span>Pain point</span><p>{difficulty}</p></div>}{needs&&<div><span>Opportunity</span><p>{needs}</p></div>}</div>}
  {children}
 </article>;
}
