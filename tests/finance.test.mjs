import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {test} from 'node:test';
import assert from 'node:assert/strict';
const calls=[];
const context={exports:{},Intl,require:name=> name.includes('supabase')?{supabase:{from:()=>{
 let start=0,end=499;return {select(){return this;},order(){return this;},range(a,b){start=a;end=b;return this;},then(resolve){calls.push(start);return Promise.resolve({data:Array.from({length:Math.max(0,Math.min(end+1,1201)-start)},(_,i)=>({id:start+i})),error:null}).then(resolve);}};
}}}:{withTimeout:async request=>await request}};
vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../src/services/business.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,context);
const {cents,suggestedPrice,balance,realCost,fetchServiceRegistry}=context.exports;
test('importes se convierten a centavos sin perder precisión ni aceptar formatos ambiguos',()=>{
 assert.equal(cents('0.29'),29);assert.equal(cents('125,4'),12540);assert.equal(cents('0'),0);
 for(const input of ['-1','1.234','1.000,00','Infinity','1e3',''])assert.throws(()=>cents(input));
});
test('margen sobre venta no se confunde con recargo y rechaza división imposible',()=>{
 assert.equal(suggestedPrice(70000,30),100000);assert.equal(suggestedPrice(10000,0),10000);
 assert.throws(()=>suggestedPrice(10000,100));assert.throws(()=>suggestedPrice(10000,-1));
});
test('saldo y costos mantienen correcciones sin borrar movimientos',()=>{
 const doc={id:'a',total_cents:10000};
 const payments=[{document_id:'a',cents:2500,voided:false},{document_id:'a',cents:500,voided:true},{document_id:'b',cents:3000,voided:false}];
 assert.equal(balance(doc,payments),7500);assert.equal(balance({...doc,voided:true},payments),0);
 assert.equal(realCost('a',payments.map(p=>({...p,service_id:p.document_id}))),2500);
});
test('la lectura no corta los registros al crecer más allá de la primera página',async()=>{
 assert.equal((await fetchServiceRegistry()).length,1201);assert.deepEqual(calls,[0,500,1000]);
});
