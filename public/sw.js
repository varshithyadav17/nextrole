self.addEventListener('push',event=>{
 let data={title:'NextRole',body:'Your opportunity updates are ready.',url:'/?updates=1'};
 try{data={...data,...event.data.json()};}catch{}
 const target=new URL(data.url||'/?updates=1',self.location.origin);
 const url=target.origin===self.location.origin?target.pathname+target.search:'/?updates=1';
 event.waitUntil(self.registration.showNotification(data.title,{body:data.body,icon:'/favicon.svg',tag:'nextrole-updates',data:{url}}));
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();
 const target=new URL(event.notification.data?.url||'/?updates=1',self.location.origin);
 const href=target.origin===self.location.origin?target.href:self.location.origin+'/?updates=1';
 event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(async windows=>{
  const existing=windows.find(w=>new URL(w.url).origin===self.location.origin);
  if(existing){await existing.focus();existing.postMessage({type:'nextrole-updates'});return;}
  return clients.openWindow(href);
 }));
});
