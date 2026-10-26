/* Daily observations only. No personal data leaves the browser. */
(()=>{
 const shift=(date,n)=>{const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)};
 const mean=a=>a.length?a.reduce((s,v)=>s+v,0)/a.length:null;
 function calculate(days,end,calories,pounds){
  const weight=d=>Number.isFinite(days[d]?.weight)?pounds(days[d].weight):null;
  const kcal=d=>{const c=calories(days[d]);return Number.isFinite(c)?c:null};
  const window=(date,n)=>Array.from({length:n},(_,i)=>shift(date,-i));
  const rows=window(end,28).map(date=>{
   const next=shift(date,1),start=weight(date),after=next<=end?weight(next):null;
   const week=window(date,7),foods=week.filter(d=>days[d]?.foodComplete===true&&kcal(d)!==null).map(kcal),weights=week.map(weight).filter(v=>v!==null);
   return {date,kcal:kcal(date),complete:days[date]?.foodComplete===true,start,after,delta:start!==null&&after!==null?after-start:null,average:foods.length>=4?mean(foods):null,count:foods.length,weightAverage:weights.length>=4?mean(weights):null};
  });
  // Exclude the current day: its next-morning weight is not yet known.
  const dates=window(shift(end,-1),28),full=dates.filter(d=>days[d]?.foodComplete===true&&kcal(d)!==null);
  const recent=window(end,7).map(weight).filter(v=>v!==null),early=window(shift(end,-21),7).map(weight).filter(v=>v!==null);
  const ready=full.length===28&&recent.length>=5&&early.length>=5;
  const average=mean(full.map(kcal)),rate=ready?(mean(recent)-mean(early))/3:null;
  const stable=ready&&Math.abs(rate)<=mean(recent)*.002;
  return {rows,full:full.length,average,ready,rate,stable};
 }
 if(typeof module!=='undefined'&&module.exports){module.exports={calculate,shift};return}
 const words={
  fr:['Calories et poids, jour après jour','Jour','Calories consommées','Poids du matin','Poids du lendemain','Écart','Moyenne calories · 7 j','Poids moyen · 7 j','incomplet','jours complets','Maintien : encore trop peu de données. Renseigne 28 journées alimentaires complètes et au moins 5 pesées dans la première et la dernière semaine.','Repère de maintien observé','À cet apport moyen, ton poids','diminue','augmente','reste à peu près stable','Ce repère décrit les 28 derniers jours, sans garantir un maximum.','Une variation du lendemain inclut l’eau et la digestion : elle ne mesure pas la graisse perdue. Les moyennes sur 7 jours nécessitent au moins 4 jours renseignés ; les calories excluent les journées incomplètes.','Pour fixer un objectif de maintien ou de perte','Aucun seuil de maintien déduit pendant une hausse ou une baisse du poids.','Les jours sans données restent vides.'],
  es:['Calorías y peso, día a día','Día','Calorías consumidas','Peso de la mañana','Peso del día siguiente','Cambio','Media calorías · 7 días','Peso medio · 7 días','incompleto','días completos','Mantenimiento: faltan datos. Registra 28 días de comidas completos y al menos 5 pesajes en la primera y última semana.','Referencia de mantenimiento observada','Con esta ingesta media, tu peso','baja','sube','se mantiene aproximadamente estable','Esta referencia describe los últimos 28 días; no garantiza un máximo.','El cambio del día siguiente incluye agua y digestión: no mide la grasa perdida. Las medias de 7 días necesitan al menos 4 días registrados; las calorías excluyen los días incompletos.','Para establecer un objetivo de mantenimiento o pérdida','No se deduce un umbral de mantenimiento mientras el peso sube o baja.','Los días sin datos quedan vacíos.'],
  en:['Calories and weight, day by day','Day','Calories eaten','Morning weight','Next-morning weight','Change','7-day calorie average','7-day weight average','incomplete','complete days','Maintenance: more data needed. Record 28 complete food days and at least 5 weigh-ins in the first and last week.','Observed maintenance reference','At this average intake, your weight','decreases','increases','stays roughly stable','This reference describes the last 28 days; it does not guarantee a maximum.','Next-day changes include water and digestion, not just fat. Seven-day averages require at least 4 recorded days; calories exclude incomplete days.','To set a maintenance or weight-loss goal','No maintenance threshold is inferred while weight rises or falls.','Missing days stay blank.']
 };
 function render(){
  const anchor=document.getElementById('wcal-card');if(!anchor||typeof weightData==='undefined')return;
  let host=document.getElementById('daily-weight-table');if(!host){host=document.createElement('section');host.id='daily-weight-table';host.className='weight-card';anchor.after(host)}
  const lang=typeof uiLanguage==='string'?uiLanguage:'fr',t=words[lang]||words.fr,end=document.getElementById('weight-date').value;if(!/^\d{4}-\d{2}-\d{2}$/.test(end))return;
  const result=calculate(weightData.days,end,dayCalories,displayPounds),num=(v,d=0)=>v===null?'—':v.toLocaleString(lang,{maximumFractionDigits:d,minimumFractionDigits:d});
  host.replaceChildren();const add=(tag,text,parent=host)=>{const el=document.createElement(tag);el.textContent=text;parent.append(el);return el};
  add('h3',t[0]);
  const summary=add('p','');summary.className='daily-weight-summary';
  if(!result.ready)summary.textContent=t[10]+' ('+result.full+'/28 '+t[9]+')';
  else {summary.textContent=t[12]+' '+num(Math.round(result.average/50)*50)+' kcal/j : '+t[result.stable?15:result.rate<0?13:14]+'. ';if(result.stable)summary.textContent+=t[11]+' ≈ '+num(Math.round(result.average/50)*50)+' kcal/j. '+t[16];else summary.textContent+=t[19]}
  const wrap=add('div','');wrap.className='weight-table';const table=add('table','',wrap);const caption=add('caption',t[20],table);caption.className='weight-muted';const head=add('thead','',table),tr=add('tr','',head);
  [t[1],t[2]+' · kcal',t[3]+' · lb',t[4]+' · lb',t[5]+' · lb',t[6]+' · kcal',t[7]+' · lb'].forEach(text=>{const th=add('th',text,tr);th.scope='col'});
  const body=add('tbody','',table);
  result.rows.forEach(r=>{const tr=add('tr','',body);const date=new Date(r.date+'T12:00:00Z').toLocaleDateString(lang,{day:'2-digit',month:'2-digit'});[date,num(r.kcal)+(r.kcal!==null&&!r.complete?' ('+t[8]+')':''),num(r.start,1),num(r.after,1),r.delta===null?'—':(r.delta>0?'+':'')+num(r.delta,1),num(r.average)+(r.average!==null?' · '+r.count+'/7':''),num(r.weightAverage,1)].forEach(v=>add('td',v,tr))});
  add('p',t[17]).className='weight-muted';const link=add('a',t[18]);link.href='https://www.niddk.nih.gov/bwp';link.target='_blank';link.rel='noopener noreferrer';
 }
 function init(){
  if(typeof renderWeightCharts==='function'){const original=renderWeightCharts;renderWeightCharts=function(...args){const value=original.apply(this,args);render();return value}}
  document.addEventListener('change',()=>setTimeout(render,0));
  const language=document.getElementById('ui-language');if(language)new MutationObserver(render).observe(language,{attributes:true,childList:true,subtree:true});
  render();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
