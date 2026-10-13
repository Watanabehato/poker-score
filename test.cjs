const assert=require('node:assert/strict');const {settle}=require('./engine.js');
assert.equal(settle([{name:'A',net:10}]),null);
assert.deepEqual(settle([{name:'A',net:-300},{name:'B',net:100},{name:'C',net:200}]),[{from:'A',to:'B',amount:100},{from:'A',to:'C',amount:200}]);
assert.deepEqual(settle([{name:'A',net:0}]),[]);
for(let k=0;k<1000;k++){const ps=Array.from({length:8},(_,i)=>({name:String(i),net:Math.floor(Math.random()*2001)-1000}));ps.push({name:'8',net:-ps.reduce((s,p)=>s+p.net,0)});const tx=settle(ps),balances=Object.fromEntries(ps.map(p=>[p.name,p.net]));for(const t of tx){assert(t.amount>0);balances[t.from]+=t.amount;balances[t.to]-=t.amount;}assert(Object.values(balances).every(n=>n===0));}
console.log('结算校验通过：标准案例及1000组平衡牌局');
