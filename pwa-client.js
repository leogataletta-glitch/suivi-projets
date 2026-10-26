(()=>{
 if(window.__leoPwaReady){window.dispatchEvent(new Event('leo-document-ready'));return}
 window.__leoPwaReady=true;
 if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js',{scope:'./',updateViaCache:'none'}).catch(()=>{});
 let invitation=null,button=null;
 const installed=()=>matchMedia('(display-mode: standalone)').matches||matchMedia('(display-mode: fullscreen)').matches;
 function show(){
  if(!invitation||installed())return;
  if(!document.body){document.addEventListener('DOMContentLoaded',show,{once:true});return}
  if(button&&!button.isConnected)button=null;
  if(button)return;
  button=document.createElement('button');button.type='button';button.id='install-leo-app';
  const lang=typeof uiLanguage==='string'?uiLanguage:document.documentElement.lang;
  button.textContent=lang==='es'?'Instalar aplicación':lang==='en'?'Install app':'Installer l’application';
  button.style.cssText='position:fixed;right:16px;bottom:max(16px,env(safe-area-inset-bottom));z-index:1000;width:auto;padding:10px 16px;border:1px solid #a0b9dd;border-radius:12px;background:#2b4e7b;color:#fff;font:600 14px Segoe UI,Arial,sans-serif;box-shadow:0 4px 18px #0003;cursor:pointer';
  button.onclick=async()=>{if(!invitation)return;const current=invitation;invitation=null;button.remove();button=null;await current.prompt();await current.userChoice};
  document.body.append(button);
 }
 window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();invitation=event;show()});
 window.addEventListener('leo-document-ready',show);
 window.addEventListener('appinstalled',()=>{invitation=null;if(button)button.remove();button=null});
})();
