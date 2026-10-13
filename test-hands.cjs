const assert=require('node:assert/strict'),H=require('./hand-engine.js'),T=require('./table-engine.js');
const best=text=>H.best(H.parse(text));
const fixture=[
 ['As Kh 9d 6c 2s',[0,14,13,9,6,2]],
 ['As Ah Kd Qc 9s',[1,14,13,12,9]],
 ['Ks Kh 5d 5c Js',[2,13,5,11]],
 ['9s 9h 9d Ac 6s',[3,9,14,6]],
 ['8s 7h 6d 5c 4s',[4,8]],
 ['Ad Jd 8d 6d 2d',[5,14,11,8,6,2]],
 ['Js Jh Jd 4c 4h',[6,11,4]],
 ['Qs Qh Qd Qc 7s',[7,12,7]],
 ['9h 8h 7h 6h 5h',[8,9]],
 ['As Ks Qs Js Ts',[8,14]]
];
for(let i=0;i<fixture.length;i++){assert.deepEqual(best(fixture[i][0]).score,fixture[i][1]);if(i)assert(H.compare(best(fixture[i][0]),best(fixture[i-1][0]))>0);}
assert.equal(best(fixture[9][0]).name,'皇家同花顺');
assert.deepEqual(H.parse('♠A，10♥ / qD; Jc').map(c=>c.code),['As','Th','Qd','Jc']);
assert.deepEqual(H.parse('A♠️K♥️').map(c=>c.code),['As','Kh']);
for(const bad of ['1s 2h','Ax','As blah','11h','黑桃王','As A♠'])assert.throws(()=>H.parse(bad));
assert.throws(()=>H.parse('As Kh',5));assert.throws(()=>best('As Kh'));
assert.deepEqual(best('As 2h 3d 4c 5s').score,[4,5]);
assert(H.compare(best('2s 3h 4d 5c 6s'),best('As 2h 3d 4c 5s'))>0);
assert.deepEqual(best('Qs Kh Ad 2c 3s').score,[0,14,13,12,3,2]);
assert.deepEqual(best('As Ah Ad Ks Kh Kd 2c').score,[6,14,13]);
assert.deepEqual(best('As 9s 7s 5s 3s Ks 2d').score,[5,14,13,9,7,5]);
assert.deepEqual(best('As Ah 5c 4s 3d 2c Kh').score,[4,5]);
assert(H.compare(best('As Ah Kd Qc 9s'),best('Ad Ac Ks Qh 8d'))>0);
assert(H.compare(best('Ks Kh 8d 8c 2s'),best('Kd Kc 7s 7h As'))>0);
assert(H.compare(best('As Js 9s 5s 3s'),best('Ah Jh 8h 7h 6h'))>0);
assert.equal(H.compare(best('7s 7h 7d 7c As'),best('7s 7h 7d 7c Ah')),0);
const rank=(board,a,b)=>H.rankPlayers({board,players:[{id:'a',name:'甲',cards:a},{id:'b',name:'乙',cards:b}]});
assert.deepEqual(rank('As Kh Qd Jc Ts','2d 3d','4h 5h').map(p=>p.rank),[1,1]);
assert.equal(rank('As Ac 7d 4c 2s','Kh Qh','Kd Jh')[0].id,'a');
assert.equal(rank('As Ac Ks Kc 7h','Qd Jh','9c Td')[0].id,'a');
assert.deepEqual(rank('7s 7h 7d 7c 2h','As Kd','Ah Qc').map(p=>p.rank),[1,1]);
assert.throws(()=>rank('As Kh Qd Jc Ts','As 2d','4h 5h'),/重复/);
assert.throws(()=>rank('As Kh Qd Jc Ts','2d 3d','2d 5h'),/重复/);
assert.throws(()=>rank('As Kh Qd','2d 3d','4h 5h'),/需要 5/);
assert.equal(H.rankPlayers({mode:'five',players:[{id:'a',name:'甲',cards:'As Ah Kd Qc 9s'},{id:'b',name:'乙',cards:'Ad Ac Ks Qh 8d'}]})[0].id,'a');
// Each side pot compares only players entitled to win it, not the overall winner.
{
 const ps=[100,60,30].map((end,i)=>({id:String(i),name:'玩家'+i,end})),t=T.config();T.start(ps,t);T.act(t.hand,'raise',100);T.act(t.hand,'call');T.act(t.hand,'call');T.sync(ps,t.hand);
 const ranked=H.rankPlayers({board:'2s 3h 4d 8c 9s',players:[{id:'0',name:'玩家0',cards:'Kh Kd'},{id:'1',name:'玩家1',cards:'Ah Ad'},{id:'2',name:'玩家2',cards:'5h 6d'}]});
 const choices=T.pots(t.hand).map(p=>p.eligible.length===1?p.eligible:H.winners(ranked,p.eligible));
 assert.deepEqual(choices,[['2'],['1'],['0']]);T.finish(ps,t,choices);assert.deepEqual(ps.map(p=>p.end),[40,60,90]);
 assert.throws(()=>H.winners(ranked,['absent']));
}
// Invariance under input order and suit permutation; extra cards cannot weaken a hand.
const deck=[];for(const suit of ['s','h','d','c'])for(let rank=2;rank<=14;rank++)deck.push(H.parse((rank===10?'T':H.rankText(rank))+suit,1)[0]);
let seed=1027;const random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
for(let n=0;n<1000;n++){
 const shuffled=deck.slice();for(let i=shuffled.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]];}
 const cards=shuffled.slice(0,7),hand=H.best(cards);assert.deepEqual(H.best(cards.slice().reverse()).score,hand.score);assert(H.compare(hand,H.best(cards.slice(0,5)))>=0);
 const suitMap={s:'h',h:'d',d:'c',c:'s'},permuted=cards.map(c=>H.parse((c.rank===10?'T':H.rankText(c.rank))+suitMap[c.suit],1)[0]);assert.deepEqual(H.best(permuted).score,hand.score);
}
console.log('自动比牌测试通过：十种牌型、踢脚、A2345、七选五、共享公共牌平局、重复牌校验、边池及1000组不变性检验');
if(process.argv.includes('--exhaustive')){
 console.log('开始枚举52张牌的全部五张组合…');const counts=Array(9).fill(0);
 for(let a=0;a<48;a++)for(let b=a+1;b<49;b++)for(let c=b+1;c<50;c++)for(let d=c+1;d<51;d++)for(let e=d+1;e<52;e++)counts[H.best([deck[a],deck[b],deck[c],deck[d],deck[e]]).score[0]]++;
 // Independent combinatorial totals: high card, pair, two pair, trips, straight, flush, full house, quads, straight flush.
 assert.deepEqual(counts,[1302540,1098240,123552,54912,10200,5108,3744,624,40]);console.log('全部2,598,960种五张组合分类正确');
}
