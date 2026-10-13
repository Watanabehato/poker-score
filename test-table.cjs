const assert=require('node:assert/strict');
const T=require('./table-engine.js');
const players=stacks=>stacks.map((end,i)=>({id:String(i),name:'玩家'+i,end}));
function action(ps,t,type,n){T.act(t.hand,type,n);T.sync(ps,t.hand);assert(T.valid(t,ps));}
// Three seats: dealer, SB and BB rotate after settlement; zero stacks are skipped.
{
 const ps=players([100,100,100,0]),t=T.config();T.start(ps,t);
 assert.deepEqual([t.hand.dealer,t.hand.sb,t.hand.bb,t.hand.turn],['0','1','2','0']);
 assert.deepEqual(ps.map(p=>p.end),[100,95,90,0]);
 action(ps,t,'fold');action(ps,t,'fold');
 T.finish(ps,t,[]);assert.deepEqual(ps.map(p=>p.end),[100,95,105,0]);assert.equal(t.dealer,'1');
 T.start(ps,t);assert.deepEqual([t.hand.dealer,t.hand.sb,t.hand.bb,t.hand.turn],['1','2','0','1']);
 assert(T.valid(JSON.parse(JSON.stringify(t)),ps));
}
// Heads up: button is SB and acts first preflop, BB acts first after the flop.
{
 const ps=players([100,100]),t=T.config();T.start(ps,t);
 assert.deepEqual([t.hand.dealer,t.hand.sb,t.hand.bb,t.hand.turn],['0','0','1','0']);
 action(ps,t,'call');action(ps,t,'call');assert.equal(t.hand.street,1);assert.equal(t.hand.turn,'1');
 for(let i=0;i<6;i++)action(ps,t,'call');assert.equal(t.hand.street,4);
 T.finish(ps,t,[['0','1']]);assert.deepEqual(ps.map(p=>p.end),[100,100]);assert.equal(t.dealer,'1');
}
// Multiple all-ins: separate main/side pots and refund the unmatched highest bet.
{
 const ps=players([100,60,30]),t=T.config();T.start(ps,t);
 action(ps,t,'raise',100);action(ps,t,'call');action(ps,t,'call');
 assert.equal(t.hand.street,4);
 assert.deepEqual(T.pots(t.hand),[{amount:90,eligible:['0','1','2'],refund:false},{amount:60,eligible:['0','1'],refund:false},{amount:40,eligible:['0'],refund:true}]);
 assert.throws(()=>T.finish(ps,t,[['2'],['2']]));
 T.finish(ps,t,[['2'],['1']]);assert.deepEqual(ps.map(p=>p.end),[40,60,90]);
}
// A short all-in does not reopen raising for a player who already acted.
{
 const ps=players([100,15,100]),t=T.config();T.start(ps,t);
 action(ps,t,'call');action(ps,t,'raise',15);action(ps,t,'call');
 assert.equal(t.hand.turn,'0');assert.equal(T.options(t.hand).canRaise,false);
 assert.throws(()=>T.act(t.hand,'raise',30));action(ps,t,'call');assert.equal(t.hand.street,1);
}
// Full raises reopen action; too-small raises are rejected without changing chips.
{
 const ps=players([100,100,100]),t=T.config();T.start(ps,t);
 const before=JSON.stringify(t.hand);assert.throws(()=>T.act(t.hand,'raise',15));assert.equal(JSON.stringify(t.hand),before);
 action(ps,t,'call');action(ps,t,'raise',20);action(ps,t,'call');assert(T.options(t.hand).canRaise);
}
// A short big blind heads-up needs no extra unmatched call.
{
 const ps=players([100,3]),t=T.config();T.start(ps,t);assert.equal(t.hand.street,4);
 T.finish(ps,t,[['1']]);assert.deepEqual(ps.map(p=>p.end),[97,6]);
}
// Odd chips in a tied pool go to winners clockwise from the dealer.
{
 const ps=players([100,100,100]),t=T.config();t.small=1;t.big=1;T.start(ps,t);
 action(ps,t,'call');action(ps,t,'call');action(ps,t,'call');
 while(t.hand.street<4)action(ps,t,'call');T.finish(ps,t,[['0','1']]);
 assert.deepEqual(ps.map(p=>p.end),[100,101,99]);
}
// Random legal hands exercise folds, calls, raises, all-ins, persistence and conservation.
let seed=7391;const rand=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
for(let k=0;k<500;k++){
 const ps=players(Array.from({length:2+Math.floor(rand()*7)},()=>1+Math.floor(rand()*200))),t=T.config();
 const total=ps.reduce((s,p)=>s+p.end,0);T.start(ps,t);assert(T.valid(t,ps));let count=0;
 while(t.hand.street<4){assert(count++<300);const o=T.options(t.hand),r=rand();if(r<.12)action(ps,t,'fold');else if(r>.78&&o.canRaise)action(ps,t,'raise',o.max);else action(ps,t,'call');assert.equal(ps.reduce((s,p)=>s+p.end,0)+t.hand.seats.reduce((s,p)=>s+p.total,0),total);}
 const choices=T.pots(t.hand).map(p=>[p.eligible[Math.floor(rand()*p.eligible.length)]]);
 T.finish(ps,t,choices);assert.equal(ps.reduce((s,p)=>s+p.end,0),total);assert(T.valid(t,ps));
}
console.log('逐手牌桌测试通过：轮庄、两人盲注、四轮行动、加注、边池、平分、恢复及500手筹码守恒');
