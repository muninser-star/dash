(function(root){
'use strict';
const STORES=['Перекрёсток','Лента','Дикси','Пятёрочка'];
const norm=s=>String(s||'').toLowerCase().replace(/ё/g,'е').replace(/\s+/g,' ').trim();
const day=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Moscow'}).format(new Date());
function unitPrice(o){return Number(o.price)>0&&Number(o.quantity)>0?Number(o.price)/Number(o.quantity):null;}
function state(o,today=day(),days=14){if(o.deleted)return 'deleted';if(o.validUntil&&o.validUntil<today)return 'expired';if(!o.observedOn)return 'undated';const age=(Date.parse(today)-Date.parse(o.observedOn))/864e5;return age<0?'future':age>days?'stale':'fresh';}
function validate(o){if(!o||typeof o!=='object'||!STORES.includes(o.store))return false;return typeof o.id==='string'&&o.id.length<150&&typeof o.name==='string'&&o.name.length>0&&o.name.length<400&&typeof o.productKey==='string'&&o.productKey.length<400&&['кг','л','шт'].includes(o.unit)&&(o.price===null||Number.isFinite(o.price)&&o.price>0&&o.price<1e7)&&(o.quantity===null||Number.isFinite(o.quantity)&&o.quantity>0&&o.quantity<1e5)&&(!o.observedOn||/^\d{4}-\d{2}-\d{2}$/.test(o.observedOn))&&(!o.validUntil||/^\d{4}-\d{2}-\d{2}$/.test(o.validUntil));}
function groups(rows,opts={}){
 const map=new Map();for(const o of rows){if(o.deleted)continue;const k=norm(o.productKey)+'|'+o.unit;if(!map.has(k))map.set(k,{key:k,title:o.productKey.replace(/ · (кг|л|шт)$/,''),category:o.category||'Прочее',unit:o.unit,all:[],byStore:{}});map.get(k).all.push(o);}
 return [...map.values()].map(g=>{for(const store of STORES){const arr=g.all.filter(o=>o.store===store).sort((a,b)=>(b.observedOn||'').localeCompare(a.observedOn||'')||(b.createdAt||'').localeCompare(a.createdAt||''));g.byStore[store]=arr[0]||null;}
 const eligible=Object.values(g.byStore).filter(o=>o&&unitPrice(o)!==null&&state(o,opts.today)==='fresh'&&!o.conditionsUnclear);
 const historical=Object.values(g.byStore).filter(o=>o&&unitPrice(o)!==null&&!['expired','future'].includes(state(o,opts.today))&&!o.conditionsUnclear);
 g.archiveBest=historical.length>=2?historical.reduce((a,b)=>unitPrice(a)<=unitPrice(b)?a:b):null;
 const comparable=eligible.length>=2;g.best=comparable?eligible.reduce((a,b)=>unitPrice(a)<=unitPrice(b)?a:b):null;
 g.delta=comparable?Math.max(...eligible.map(unitPrice))-Math.min(...eligible.map(unitPrice)):null;
 return g;}).sort((a,b)=>a.title.localeCompare(b.title,'ru'));
}
function merge(a,b){return [...new Map([...a,...b].map(o=>[o.id,o])).values()];}
const api={STORES,norm,day,unitPrice,state,validate,groups,merge};if(typeof module==='object'&&module.exports)module.exports=api;else root.GroceryCore=api;
})(typeof window==='undefined'?globalThis:window);
