const {test}=require('node:test');
const assert=require('node:assert/strict');
const C=require('../groceries/core.js');
let next=0;
const row=(productKey,extra={})=>({id:'test-'+next++,name:productKey,productKey,category:'Прочее',store:'Лента',price:100,quantity:1,unit:'кг',observedOn:'2026-11-06',createdAt:'2026-11-06T10:00:00Z',...extra});
const today='2026-11-06';
test('mandarin variants share one product with every source observation',()=>{
 const a=row('Мандарин с листом · кг'),b=row('Мандарины с листочком · кг',{store:'Дикси'});
 const gs=C.groups([a,b],{today});
 assert.equal(gs.length,1);assert.deepEqual(gs[0].all,[a,b]);assert.equal(gs[0].category,'Фрукты');
 assert.equal(a.productKey,'Мандарин с листом · кг');
});
test('egg example and imported word order merge, including Latin C1',()=>{
 const gs=C.groups(['Село Зеленое Деревенское белое C1','Село Зелёное Деревенское С1','Яйцо куриное Деревенское С1 . Село Зелёное'].map(k=>row(k,{unit:'шт'})),{today});
 assert.equal(gs.length,1);assert.equal(gs[0].all.length,3);assert.equal(gs[0].category,'Яйца');
});
test('brands, grades, fat content, recipes and measurement units stay distinct',()=>{
 for(const [a,b] of [['Молоко Село Зелёное 3,2%','Молоко Село Зелёное 2,3%'],['Молоко Село Зелёное 3,2%','Молоко Чабан 3,2%'],['Яйца Лента С1','Яйца Лента С0'],['Яйца Лента С1','Яйца Лента Fresh С1 селен/йод'],['Мандарин с листом','Мандарин без листа'],['Пельмени Иркутские','Пельмени Классические']])assert.equal(C.groups([row(a),row(b)],{today}).length,2,a);
 assert.equal(C.groups([row('Молоко'),row('Молоко',{unit:'л'})],{today}).length,2);
});
test('pack sizes and spelling punctuation do not split identical products',()=>{
 const gs=C.groups([row('Молоко «Чабан» 3,2% 1 л',{unit:'л'}),row('Молоко Чабан 3.2% 900 мл',{unit:'л',quantity:.9})],{today});
 assert.equal(gs.length,1);
});
test('category aliases and product names resolve to common categories',()=>{
 assert.equal(C.category(row('Морковь',{category:'овощи'})),'Овощи');
 assert.equal(C.category(row('Морковь',{category:'Овощи и фрукты'})),'Овощи');
 assert.equal(C.category(row('Груши',{category:'Овощи и фрукты'})),'Фрукты');
 assert.equal(C.category(row('Село Зеленое Деревенское белое C1',{category:'Прочее'})),'Яйца');
 assert.equal(C.category(row('Сок яблочный')),'Напитки');
 assert.equal(C.category(row('Масло Слобода рафинированное',{unit:'л'})),'Растительное масло');
 assert.equal(C.category(row('Масло Экомилк 82,5%')),'Сливочное масло');
 assert.equal(C.category(row('Пельмени Сибирская коллекция со сливочным маслом')),'Замороженные продукты');
 assert.equal(C.category(row('Пельмени с сыром')),'Замороженные продукты');
 assert.equal(C.category(row('Творожный сыр')),'Сыр');
 assert.equal(C.category(row('Молоко',{shoppingGroup:'На дачу'})),'На дачу');
});
test('latest observation per store is selected after merging aliases',()=>{
 const a=row('Мандарин с листом',{observedOn:'2026-11-01',price:90}),b=row('Мандарин с листочком',{observedOn:'2026-11-06',price:120});
 const [g]=C.groups([b,a],{today});assert.equal(g.byStore['Лента'],b);assert.equal(g.all.length,2);
});
test('shopping recommendations compare unit price rather than sticker price',()=>{
 const gs=C.groups([row('Молоко Чабан',{unit:'л',quantity:2,price:180}),row('Молоко Чабан',{unit:'л',store:'Дикси',quantity:1,price:100})],{today});
 const plan=C.shoppingPlan(gs,{today});assert.equal(plan.stores['Лента'].fresh.length,1);assert.equal(plan.stores['Дикси'].fresh.length,0);assert.equal(plan.stores['Лента'].fresh[0].difference,10);
});
test('equal minimum prices recommend both stores',()=>{
 const gs=C.groups([row('Бананы'),row('Бананы',{store:'Дикси'}),row('Бананы',{store:'Пятёрочка',price:120})],{today}),plan=C.shoppingPlan(gs,{today});
 for(const s of ['Лента','Дикси']){assert.equal(plan.stores[s].fresh.length,1);assert.equal(plan.stores[s].fresh[0].tied,true);}
 assert.equal(plan.stores['Пятёрочка'].fresh.length,0);
});
test('old prices are history, and can be excluded',()=>{
 const gs=C.groups([row('Бананы',{observedOn:'2026-10-01'}),row('Бананы',{store:'Дикси',observedOn:'2026-10-02',price:120})],{today});
 assert.equal(C.shoppingPlan(gs,{today}).stores['Лента'].history.length,1);assert.equal(C.shoppingPlan(gs,{today}).stores['Лента'].fresh.length,0);
 assert.equal(C.shoppingPlan(gs,{today,archive:false}).stores['Лента'].history.length,0);
});
test('single, unclear, undated, expired, future and missing prices cannot win',()=>{
 for(const extra of [{conditionsUnclear:true},{observedOn:''},{validUntil:'2026-11-01'},{observedOn:'2026-11-07'},{price:null},{quantity:null},{deleted:true}]){
  const gs=C.groups([row('Бананы'),row('Бананы',{store:'Дикси',...extra})],{today}),plan=C.shoppingPlan(gs,{today});
  assert.equal(plan.stores['Лента'].fresh.length+plan.stores['Лента'].history.length,0,JSON.stringify(extra));
 }
});
test('seed data remains valid and no observations are lost during grouping',()=>{
 const data=require('../groceries/seed.json').observations;
 assert.ok(data.every(C.validate));assert.equal(C.groups(data,{today}).reduce((n,g)=>n+g.all.length,0),data.length);
});
