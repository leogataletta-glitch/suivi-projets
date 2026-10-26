/* Local multilingual search and parsing. No food descriptions are sent online. */
(()=>{
 const normalize=s=>s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/œ/g,'oe').replace(/[’']/g,' ').replace(/[^a-z0-9.,;\n+ /%-]/g,' ').replace(/[ \t]+/g,' ').trim();
 const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 const boundary=(text,word)=>new RegExp('(^|[^a-z])'+escape(word)+'([^a-z]|$)').test(text);
 const split=/\s*(?:[,;\n+]|\by\b|\bet\b|\band\b|\bcon\b|\bavec\b|\bwith\b)\s*/;
 function ranked(catalog,query,lang){
  const q=normalize(query),idx={fr:0,en:1,es:2}[lang]||0;if(q.length<2)return [];
  return catalog.map(food=>{const local=normalize(food.label[idx]),aliases=food.aliases.map(normalize);let score=local.startsWith(q)?0:local.split(' ').some(w=>w.startsWith(q))?1:aliases.some(a=>a.startsWith(q))?2:aliases.some(a=>a.split(' ').some(w=>w.startsWith(q)))?3:99;return {food,score}}).filter(m=>m.score<99).sort((a,b)=>a.score-b.score||a.food.label[idx].localeCompare(b.food.label[idx],lang)).slice(0,10).map(m=>m.food);
 }
 function parse(text,catalog){
  const numbers={un:1,une:1,uno:1,una:1,one:1,deux:2,dos:2,two:2,trois:3,tres:3,three:3,quatre:4,cuatro:4,four:4,cinq:5,cinco:5,five:5,demi:.5,medio:.5,media:.5,half:.5};
  let normalized=normalize(text.replace(/(\d),(\d)/g,'$1.$2')).replace(/\b(un|une|uno|una|one|deux|dos|two|trois|tres|three|quatre|cuatro|four|cinq|cinco|five|demi|medio|media|half)\b/g,w=>numbers[w]).replace(/(\d+)\s*\/\s*(\d+)/g,(_,a,b)=>+b?+a/+b:'invalid');
  const protectedAliases=[];
  for(const alias of catalog.flatMap(f=>f.aliases.map(normalize)).filter(a=>a.split(split).length>1).sort((a,b)=>b.length-a.length)){const token='suivialias'+protectedAliases.length+'token';if(boundary(normalized,alias)){normalized=normalized.replace(new RegExp('(^|[^a-z])'+escape(alias)+'(?=[^a-z]|$)','g'),(_,prefix)=>prefix+token);protectedAliases.push([token,alias])}}
  const items=[],unknown=[];
  for(let chunk of normalized.split(split).filter(Boolean)){
   for(const [token,alias] of protectedAliases)chunk=chunk.replaceAll(token,alias);
   const matches=catalog.map(food=>({food,alias:food.aliases.map(normalize).filter(a=>boundary(chunk,a)).sort((a,b)=>b.length-a.length)[0]})).filter(m=>m.alias).sort((a,b)=>b.alias.length-a.alias.length);
   if(!matches.length){unknown.push(chunk);continue}
   const {food,alias}=matches[0],rest=chunk.replace(alias,'');
   if(matches.some(m=>m.food.id!==food.id&&boundary(rest,m.alias))){unknown.push(chunk);continue}
   const source=normalize(food.source?.description||food.label[1]);
   if(/\b(cru|crue|crus|crues|crudo|cruda|crudos|crudas|raw|uncooked|seco|seca|secos|secas|dry)\b/.test(chunk)&&!/\b(raw|uncooked|dry|dried)\b/.test(source)){unknown.push(chunk);continue}
   if(/\b(frito|frita|fritos|fritas|fried|frit|frite|frites)\b/.test(chunk)&&!/fried/.test(source)){unknown.push(chunk);continue}
   if(/\b(cuit|cuite|cuits|cuites|cocido|cocida|cocidos|cocidas|cooked|hervido|hervida)\b/.test(chunk)&&!/\b(cooked|roasted|fried|baked)\b/.test(source)&&/\b(raw|uncooked|dry)\b/.test(source)){unknown.push(chunk);continue}
   const amount=chunk.match(/(\d+(?:\.\d+)?)\s*(kilogramos?|kilograms?|kg|gramos?|grammes?|grams?|grs?|g|mililitros?|millilitres?|milliliters?|ml|litros?|litres?|liters?|l|onzas?|oz|libras?|lbs?|tazas?|cups?|tasses?|cucharadas?|tablespoons?|cucharaditas?|teaspoons?|rebanadas?|slices?|tranches?|porciones?|portions?|raciones?|vasos?|verres?|glasses?)\b/),number=chunk.match(/^\s*(\d+(?:\.\d+)?)/);let grams,assumed=false;
   if(amount){const n=+amount[1],u=amount[2];if(/^(kg|kilo)/.test(u))grams=n*1000;else if(/^(g|gr)/.test(u))grams=n;else if(/^(lb|libra)/.test(u))grams=n*453.59237;else if(/^(oz|onza)/.test(u))grams=n*28.349523125;else if(/^(ml|milli|milili)/.test(u))grams=n*(food.ml||1);else if(/^(l|litro|litre|liter)$/.test(u))grams=n*1000*(food.ml||1);else if(/^(taza|cup|tasse|vaso|verre|glass)/.test(u)){grams=n*(food.cup||food.portion);assumed=!food.cup}else if(/^(cucharadita|teaspoon)/.test(u)){grams=n*(food.spoon||15)/3;assumed=!food.spoon}else if(/^(cucharada|tablespoon)/.test(u)){grams=n*(food.spoon||15);assumed=!food.spoon}else grams=n*food.portion}
   else {grams=(number?+number[1]:1)*food.portion;assumed=!number}
   if(!Number.isFinite(grams)||grams<=0||grams>10000){unknown.push(chunk);continue}
   items.push({food,grams,assumed,text:chunk});
  }
  return {items,unknown};
 }
 if(typeof module!=='undefined'&&module.exports){module.exports={normalize,ranked,parse};return}
 const dictionary=typeof SuiviFoodCatalog==='undefined'?[]:SuiviFoodCatalog;
 const key='suivi-custom-foods-v1';let custom=[];try{const saved=JSON.parse(localStorage.getItem(key)||'[]');if(Array.isArray(saved))custom=saved.filter(f=>f&&typeof f.id==='string'&&Array.isArray(f.label)&&f.label.length===3&&f.label.every(l=>typeof l==='string')&&Array.isArray(f.aliases)&&f.aliases.every(a=>typeof a==='string')&&Number.isFinite(f.kcal)&&f.kcal>=0&&f.kcal<=1000&&Number.isFinite(f.portion)&&f.portion>0)}catch{}
 const T={fr:['Suggestions d’aliments','Aliment absent ? Ajouter depuis une étiquette','Nom de l’aliment','kcal pour 100 g','Portion habituelle (g)','Mémoriser cet aliment','Aliment mémorisé.','Impossible de mémoriser : vérifie les valeurs ou le stockage du navigateur.','Bibliothèque locale : références USDA et aliments personnels. Choisis la préparation (cru/cuit). Les recettes et marques peuvent varier.','Aucun résultat. Ajoute cet aliment depuis son étiquette.','Tape au moins deux lettres pour voir les suggestions.','Référence pour 100 g','Source USDA'],es:['Sugerencias de alimentos','¿Falta un alimento? Añadir desde una etiqueta','Nombre del alimento','kcal por 100 g','Porción habitual (g)','Guardar este alimento','Alimento guardado.','No se pudo guardar: revisa los valores o el almacenamiento del navegador.','Biblioteca local: referencias USDA y alimentos personales. Elige la preparación (crudo/cocido). Las recetas y marcas pueden variar.','Sin resultados. Añade el alimento desde su etiqueta.','Escribe al menos dos letras para ver sugerencias.','Referencia por 100 g','Fuente USDA'],en:['Food suggestions','Missing a food? Add it from a label','Food name','kcal per 100 g','Usual portion (g)','Remember this food','Food saved.','Could not save: check values or browser storage.','Local library: USDA references and your own foods. Choose raw/cooked preparation. Recipes and brands may vary.','No results. Add this food from its label.','Type at least two letters for suggestions.','Reference per 100 g','USDA source']};
 const language=()=>typeof uiLanguage==='string'?uiLanguage:'fr',words=()=>T[language()]||T.fr,idx=()=>({fr:0,en:1,es:2}[language()]||0);
 let catalog=[],registered=new Set();
 function rebuild(){catalog=[...custom,...dictionary];if(typeof QUICK_FOODS!=='undefined'){
  // Feed references through the existing estimator to preserve its nutrient format.
  for(const food of catalog){if(registered.has(food.id))continue;QUICK_FOODS.push({...food,aliases:['suivifoodref'+food.id.replace(/[^a-z0-9]/gi,'').toLowerCase()]});registered.add(food.id)}
 }}
 function install(){
  const input=document.getElementById('quick-description');if(!input)return;rebuild();
  if(typeof estimateMeal==='function'){
   const original=estimateMeal;
   estimateMeal=function(text){const result=parse(text,catalog),items=[];for(const item of result.items){const token='suivifoodref'+item.food.id.replace(/[^a-z0-9]/gi,'').toLowerCase(),answer=original(item.grams+' g '+token);if(answer.items.length){for(const old of answer.items)items.push({...old,text:item.text,assumed:item.assumed})}else result.unknown.push(item.text)}
    // Retain foods already supported by the original application.
    const unresolved=[];for(const chunk of result.unknown){if(catalog.some(f=>f.aliases.some(a=>boundary(chunk,normalize(a))))){unresolved.push(chunk);continue}const answer=original(chunk);if(answer.items.length&&!answer.unknown.length)items.push(...answer.items);else unresolved.push(chunk)}
    return {items,unknown:unresolved,total:items.reduce((s,f)=>s+f.calories,0)};
   };
  }
  const wrap=document.createElement('div');wrap.className='food-suggest-wrap';input.after(wrap);const menu=document.createElement('div');menu.id='food-suggestions';menu.className='food-suggestions';menu.setAttribute('role','listbox');menu.hidden=true;wrap.append(menu);
  input.setAttribute('role','combobox');input.setAttribute('aria-autocomplete','list');input.setAttribute('aria-controls',menu.id);input.setAttribute('aria-expanded','false');input.setAttribute('autocomplete','off');
  const status=document.createElement('p');status.className='weight-muted';status.setAttribute('aria-live','polite');wrap.append(status);
  let active=-1,options=[];
  function close(){menu.hidden=true;input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant');active=-1}
  function fragment(){const caret=input.selectionStart??input.value.length,part=input.value.slice(0,caret);const separators=[...part.matchAll(/[,;\n+]|\b(?:y|et|and|con|avec|with)\b/gi)];const last=separators.at(-1),start=last?last.index+last[0].length:0;const segment=part.slice(start),prefix=segment.match(/^\s*(?:(?:\d+(?:[.,]\d+)?(?:\s*\/\s*\d+)?)\s*(?:(?:kg|grs?|gramos?|grams?|grammes?|g|ml|litros?|litres?|l|oz|lbs?|tazas?|cups?|tasses?|rebanadas?|slices?|tranches?)\b)?\s*(?:de\s+|d[’']\s*)?)?/i)?.[0]||'';return {start,caret,prefix,query:segment.slice(prefix.length).trim()}}
  function choose(food){const part=fragment(),name=food.label[idx()];input.setRangeText(part.prefix+name,part.start,part.caret,'end');input.dispatchEvent(new Event('input',{bubbles:true}));close();input.focus()}
  function refresh(){const part=fragment();options=ranked(catalog,part.query,language());menu.replaceChildren();active=-1;input.removeAttribute('aria-activedescendant');status.textContent=part.query.length>=2&&!options.length?words()[9]:'';if(!options.length){close();return}options.forEach((food,i)=>{const row=document.createElement('button');row.type='button';row.id='food-option-'+i;row.setAttribute('role','option');row.setAttribute('aria-selected','false');const name=document.createElement('span');name.textContent=food.label[idx()];const cal=document.createElement('small');cal.textContent=Math.round(food.kcal)+' kcal / 100 g';row.append(name,cal);row.addEventListener('mousedown',e=>e.preventDefault());row.onclick=()=>choose(food);menu.append(row)});menu.hidden=false;input.setAttribute('aria-expanded','true');menu.setAttribute('aria-label',words()[0])}
  input.addEventListener('input',refresh);input.addEventListener('keydown',e=>{if(e.key==='Escape'){close();return}if(menu.hidden)return;if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();active=(active+(e.key==='ArrowDown'?1:-1)+options.length)%options.length;Array.from(menu.children).forEach((el,i)=>el.setAttribute('aria-selected',String(i===active)));input.setAttribute('aria-activedescendant','food-option-'+active);menu.children[active].scrollIntoView({block:'nearest'})}if(e.key==='Enter'&&active>=0){e.preventDefault();choose(options[active])}});input.addEventListener('blur',()=>setTimeout(close,150));
  const details=document.createElement('details');details.className='food-custom';const summary=document.createElement('summary');details.append(summary);const fields=document.createElement('div');fields.className='food-custom-fields';details.append(fields);const inputs=[];[2,3,4].forEach((n,i)=>{const label=document.createElement('label'),text=document.createElement('span'),control=document.createElement('input');control.type=i?'number':'text';control.id='custom-food-'+i;control.maxLength=120;if(i){control.min=i===1?'0':'1';control.max=i===1?'1000':'10000';control.step='0.1'}if(i===2)control.value='100';label.append(text,control);fields.append(label);inputs.push({label:text,control,index:n})});const save=document.createElement('button');save.type='button';fields.append(save);const feedback=document.createElement('p');feedback.setAttribute('role','status');details.append(feedback);
  save.onclick=()=>{const name=inputs[0].control.value.trim(),cal=inputs[1].control.value,portion=inputs[2].control.value;if(!name||!cal||!portion||inputs.some(f=>!f.control.checkValidity())){feedback.textContent=words()[7];return}const f={id:'custom'+crypto.randomUUID().replace(/-/g,''),label:[name,name,name],aliases:[normalize(name)],kcal:+cal,portion:+portion};try{localStorage.setItem(key,JSON.stringify([...custom,f]));custom.push(f);rebuild();feedback.textContent=words()[6];choose(f)}catch{feedback.textContent=words()[7]}};
  document.getElementById('quick-food-form').after(details);
  const source=document.createElement('p');source.className='weight-muted food-library-source';details.after(source);
  function translate(){const t=words();summary.textContent=t[1];inputs.forEach(f=>f.label.textContent=t[f.index]);save.textContent=t[5];input.setAttribute('aria-description',t[10]);source.replaceChildren(document.createTextNode(t[8]+' '));const a=document.createElement('a');a.textContent=t[12];a.href='https://fdc.nal.usda.gov/download-datasets/';a.target='_blank';a.rel='noopener noreferrer';source.append(a);close()}
  document.getElementById('ui-language')?.addEventListener('change',translate);if(typeof renderQuickLanguage==='function'){const original=renderQuickLanguage;renderQuickLanguage=function(...args){const result=original.apply(this,args);translate();return result}}
  translate();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
