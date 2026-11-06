(function(root){
'use strict';
const STORES=['Перекрёсток','Лента','Дикси','Пятёрочка'];
const CATEGORIES=['Овощи','Фрукты','Молоко','Йогурты','Молочные продукты','Творог','Сливки','Сыр','Яйца','Сливочное масло','Растительное масло','Курица','Говядина','Индейка','Свинина','Мясные продукты','Колбасы и сосиски','Рыба и морепродукты','Замороженные продукты','Мороженое','Хлеб и выпечка','Крупы и макароны','Напитки','Десерты','Сладости','Бакалея','Для животных','Гигиена','Прочее'];
function compareCategories(a,b){const ai=CATEGORIES.indexOf(a),bi=CATEGORIES.indexOf(b);return (ai<0?CATEGORIES.length:ai)-(bi<0?CATEGORIES.length:bi)||a.localeCompare(b,'ru');}
const norm=s=>String(s||'').toLowerCase().replace(/ё/g,'е').replace(/\s+/g,' ').trim();
const day=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Moscow'}).format(new Date());
function unitPrice(o){return Number(o.price)>0&&Number(o.quantity)>0?Number(o.price)/Number(o.quantity):null;}
function state(o,today=day(),days=14){if(o.deleted)return 'deleted';if(o.validUntil&&o.validUntil<today)return 'expired';if(!o.observedOn)return 'undated';const age=(Date.parse(today)-Date.parse(o.observedOn))/864e5;return age<0?'future':age>days?'stale':'fresh';}
function validate(o){if(!o||typeof o!=='object'||!STORES.includes(o.store))return false;return typeof o.id==='string'&&o.id.length<150&&typeof o.name==='string'&&o.name.length>0&&o.name.length<400&&typeof o.productKey==='string'&&o.productKey.length<400&&['кг','л','шт'].includes(o.unit)&&(o.price===null||Number.isFinite(o.price)&&o.price>0&&o.price<1e7)&&(o.quantity===null||Number.isFinite(o.quantity)&&o.quantity>0&&o.quantity<1e5)&&(!o.observedOn||/^\d{4}-\d{2}-\d{2}$/.test(o.observedOn))&&(!o.validUntil||/^\d{4}-\d{2}-\d{2}$/.test(o.validUntil));}
// Canonical names affect the view only: source names, IDs and price history stay intact.
function confirmedProductTitle(o){
 const n=norm(o.productKey||o.name).replace(/\s*·\s*(кг|л|шт)$/u,'').replace(/\s+\d+(?:[.,]\d+)?\s*(?:кг|г)\s*$/u,'').trim();
 // These aliases were explicitly confirmed as duplicates by the owner.
 if(/^бананы? (?:на )?вес$/.test(n))return 'Бананы';
 if(/^творог село зеленое (?:5%|обезжиренный 0[.,]5%)$/.test(n))return 'Творог Село Зелёное';
 if(/^бедро цб (?:петелинка|петелино охл[.]?)$/.test(n))return 'Бедро цыплёнка Петелинка';
 return '';
}
function productName(o){
 let s=norm(confirmedProductTitle(o)||o.productKey||o.name).replace(/\s*·\s*(кг|л|шт)$/u,'').replace(/(\d),(\d)/g,'$1.$2')
  .replace(/(?<![\p{L}\d])[cс]\s*([012])(?=$|[^\p{L}\d])/gu,'с$1')
  .replace(/с\s+листочк(?:ом|ами)/gu,'с листом').replace(/с\s+листьями/gu,'с листом')
  .replace(/мандарин(?:ы|а|ов)?(?=$|[^\p{L}])/gu,'мандарин')
  .replace(/яйц(?:о|а|ы)(?=$|[^\p{L}])/gu,'яйца')
  .replace(/деревенск(?:ое|ие|ий|ая)(?=$|[^\p{L}])/gu,'деревенское');
 const eggs=/яйц|(?:^|\s)с[012](?:$|\s)/u.test(s);
 if(eggs){s=s.replace(/(?:^|\s)(?:яйца|куриное|куриные|белое|белые)(?=$|\s)/gu,' ');s='яйца '+s;}
 return s.replace(/\d+(?:\.\d+)?\s*(?:кг|мл|литр(?:а|ов)?|л|гр|г|шт)(?![\p{L}])/gu,' ')
  .replace(/[«»"'(),:;–—-]/g,' ').replace(/\.(?!\d)|(?<!\d)\./g,' ').replace(/\s+/g,' ').trim();
}
function productIdentity(o){return productName(o).split(' ').sort().join(' ')+'|'+o.unit;}
function category(o){
 const n=norm((o.productKey||o.title||'')+' '+(o.name||'')),raw=norm(o.shoppingGroup||o.category);
 // Dairy desserts belong with yogurts; fruit names here describe the flavor.
 if(/туалетн.*бумаг|бумаг.*туалетн|бумажн.*полотен|салфетк|зубн.*паст|зубн.*щет|шампун|мыло|гель.*душ|дезодорант|прокладк|тампон|подгуз|бритв|ватн.*(?:диск|палоч)|гигиен/.test(n))return 'Гигиена';
 if(/панн?а[\s–—-]*котт?а|panna[\s-]*cotta/.test(n))return 'Йогурты';
 if(/тирамису|пудинг|десерт|чизкейк|торт|пирожн|эклер/.test(n)&&!/йогурт|actimel|актимель|морожен|пломбир|эскимо/.test(n))return 'Десерты';
 if(o.shoppingGroup&&!/^(овощи и фрукты|молочные продукты|масло|мясо и птица|мясо)$/.test(raw)){const custom=category({productKey:o.shoppingGroup,category:o.shoppingGroup,unit:o.unit});return custom==='Прочее'?o.shoppingGroup.trim():custom;}
 // Recognize products before inconsistent OCR/import categories.
 if(/яйц|(?:^|\s)[сc]\s*[012](?:$|\s|[.,])/u.test(n))return 'Яйца';
 if(/пельмен|наггетс|вареник/.test(n))return 'Замороженные продукты';
 if(/масло/.test(n))return o.unit==='л'||/подсолнеч|оливк|рафинир|олейна|альтеро|златое|золотая семечка/.test(n)?'Растительное масло':'Сливочное масло';
 if(/морожен|пломбир|эскимо/.test(n))return 'Мороженое';
 if(/молоко/.test(n)&&!/коктейль/.test(n))return 'Молоко';
 if(/йогурт|actimel|актимель/.test(n))return 'Йогурты';
 if(/кефир|ряженк|сметан|коктейль|простокваш[аи]\b/.test(n))return 'Молочные продукты';
 if(/творожн.*сыр|сыр.*творожн/.test(n))return 'Сыр';
 if(/творог|творож/.test(n))return 'Творог';
 if(/сливки/.test(n))return 'Сливки';
 if(/сыр/.test(n)&&!/сосиск|колбас|наггетс/.test(n))return 'Сыр';
 if(/пельмен|наггетс|вареник|заморож/.test(n))return 'Замороженные продукты';
 if(/колбас|сосиск|сардельк|молокуш|ветчин/.test(n))return 'Колбасы и сосиски';
 if(/кошка|кошки|корм|паучи|sheba|p[.]?fit/.test(n))return 'Для животных';
 if(/рыба|минтай|тилапи|треск|лосос|форель|семга|краб|кревет|селед|сельд/.test(n))return 'Рыба и морепродукты';
 if(/говяд|говяж/.test(n)&&/свинин|свино|свиная|свиной|курин|индей/.test(n))return 'Мясные продукты';
 if(/говяд|говяж|primebeef|топ[ -]?бл[еэ]йд/.test(n))return 'Говядина';
 if(/индей|индюш/.test(n))return 'Индейка';
 if(/свинин|свино|свиная|свиной/.test(n))return 'Свинина';
 if(/куриц|курин|цыплен|петел|троекур|голень|бедро|грудк|(?:^|\s)цб(?:$|\s)/u.test(n))return 'Курица';
 if(/стейк/.test(n))return 'Говядина';
 if(/фарш|мяс|бургер|чевап/.test(n))return 'Мясные продукты';
 if(/хлеб|батон|булоч|лаваш/.test(n))return 'Хлеб и выпечка';
 if(/сок|нектар|напиток|вода|лимонад/.test(n))return 'Напитки';
 if(/банан|мандарин|апельсин|яблок|груш|виноград|лимон|киви|персик|нектарин|слив[аы]|ягод|клубник|малин|арбуз|дыня|хурма|манго|гранат/.test(n))return 'Фрукты';
 if(/огур|помидор|томат|картоф|морковь|морков|капуст|кабач|баклаж|свекл|редис|лук|чеснок|зелень|салат|перец|броккол|авокадо/.test(n))return 'Овощи';
 if(/макарон|спагетт|греч|рис(?:\s|$)|крупа|овсян|булгур/.test(n))return 'Крупы и макароны';
 const aliases=[[/овощ|зелень/,'Овощи'],[/фрукт|ягод/,'Фрукты'],[/^молоко$/,'Молоко'],[/йогурт|actimel|актимель/,'Йогурты'],[/молоч|кефир|сметан/,'Молочные продукты'],[/яйц/,'Яйца'],[/творог/,'Творог'],[/сливки/,'Сливки'],[/сыр/,'Сыр'],[/растительн|подсолнеч/,'Растительное масло'],[/масло/,'Сливочное масло'],[/морожен/,'Мороженое'],[/замороз|пельмен/,'Замороженные продукты'],[/колбас|сосиск/,'Колбасы и сосиски'],[/говяд|говяж/,'Говядина'],[/куриц|курин/,'Курица'],[/индей|индюш/,'Индейка'],[/свин/,'Свинина'],[/мяс|птиц/,'Мясные продукты'],[/рыб|морепрод/,'Рыба и морепродукты'],[/хлеб|выпеч/,'Хлеб и выпечка'],[/круп|макарон|греч|^рис$/,'Крупы и макароны'],[/напит|сок/,'Напитки'],[/гигиен|туалетн|бумажн|салфет|космет/,'Гигиена'],[/десерт|тирамису|пудинг/,'Десерты'],[/кондитер|сладост/,'Сладости'],[/бакале/,'Бакалея'],[/кошк|животн|корм/,'Для животных']];
 return aliases.find(([re])=>re.test(raw))?.[1]||'Прочее';
}
function cheapest(offers){if(offers.length<2)return [];const min=Math.min(...offers.map(unitPrice));return offers.filter(o=>Math.abs(unitPrice(o)-min)<0.005);}
function groups(rows,opts={}){
 const map=new Map();for(const o of rows){if(o.deleted)continue;const k=productIdentity(o);if(!map.has(k))map.set(k,{key:k,title:confirmedProductTitle(o)||o.productKey.replace(/ · (кг|л|шт)$/,''),category:category(o),unit:o.unit,all:[],byStore:{}});map.get(k).all.push(o);}
 return [...map.values()].map(g=>{for(const store of STORES){const arr=g.all.filter(o=>o.store===store).sort((a,b)=>(b.observedOn||'').localeCompare(a.observedOn||'')||(b.createdAt||'').localeCompare(a.createdAt||''));g.byStore[store]=arr[0]||null;}
 const eligible=Object.values(g.byStore).filter(o=>o&&unitPrice(o)!==null&&state(o,opts.today)==='fresh'&&!o.conditionsUnclear);
 const historical=Object.values(g.byStore).filter(o=>o&&unitPrice(o)!==null&&['fresh','stale'].includes(state(o,opts.today))&&!o.conditionsUnclear);
 g.archiveWinners=cheapest(historical);g.archiveBest=g.archiveWinners[0]||null;
 g.winners=cheapest(eligible);const comparable=eligible.length>=2;g.best=g.winners[0]||null;
 g.delta=comparable?Math.max(...eligible.map(unitPrice))-Math.min(...eligible.map(unitPrice)):null;
 return g;}).sort((a,b)=>a.title.localeCompare(b.title,'ru'));
}
function shoppingPlan(gs,opts={}){
 const stores=Object.fromEntries(STORES.map(s=>[s,{fresh:[],history:[]}])),uncompared=[];
 for(const g of gs){const fresh=g.winners.length>0,winners=fresh?g.winners:opts.archive===false?[]:g.archiveWinners;
  if(!winners.length){uncompared.push(g);continue;}
  const offers=Object.values(g.byStore).filter(o=>o&&unitPrice(o)!==null&&!o.conditionsUnclear&&(fresh?state(o,opts.today)==='fresh':['fresh','stale'].includes(state(o,opts.today))));
  const runnerUp=offers.filter(o=>!winners.includes(o));const difference=runnerUp.length?Math.min(...runnerUp.map(unitPrice))-unitPrice(winners[0]):0;
  for(const offer of winners)stores[offer.store][fresh?'fresh':'history'].push({group:g,offer,tied:winners.length>1,difference,compared:offers});
 }
 return {stores,uncompared};
}
function merge(a,b){return [...new Map([...a,...b].map(o=>[o.id,o])).values()];}
const api={STORES,CATEGORIES,compareCategories,norm,day,unitPrice,state,validate,productName,productIdentity,category,groups,shoppingPlan,merge};if(typeof module==='object'&&module.exports)module.exports=api;else root.GroceryCore=api;
})(typeof window==='undefined'?globalThis:window);
