/* Standard 52-card high-hand Hold'em. No suit ordering and no wild cards. */
const PokerHands = (() => {
  const suits={s:'♠',h:'♥',d:'♦',c:'♣'};
  const rankText=n=>({14:'A',13:'K',12:'Q',11:'J',10:'10'}[n]||String(n));
  const rankCode=n=>n===10?'T':rankText(n);
  const label=c=>rankText(c.rank)+suits[c.suit];
  function parse(text,expected){
    if(typeof text!=='string'||text.length>300)throw Error('牌面输入过长。');
    const compact=text.replace(/[\s,，;；|/\uFE0F]/g,'').toUpperCase();
    const token=/(10|[2-9TJQKA])([SHDC♠♥♦♣])|([SHDC♠♥♦♣])(10|[2-9TJQKA])/gy;
    const cards=[];let offset=0;
    while(offset<compact.length){
      token.lastIndex=offset;const m=token.exec(compact);
      if(!m)throw Error('无法识别牌面，请使用 A♠、10♥ 或 As、Th（s黑桃 / h红桃 / d方块 / c梅花）。');
      const rankToken=m[1]||m[4],suitToken=m[2]||m[3];
      const rank=({A:14,K:13,Q:12,J:11,T:10}[rankToken]||Number(rankToken));
      const suit=({'♠':'s','♥':'h','♦':'d','♣':'c'}[suitToken]||suitToken.toLowerCase());
      cards.push({rank,suit,code:rankCode(rank)+suit});offset=token.lastIndex;
    }
    const codes=new Set();for(const c of cards){if(codes.has(c.code))throw Error('重复输入了 '+label(c)+'。');codes.add(c.code);}
    if(expected!==undefined&&cards.length!==expected)throw Error('需要 '+expected+' 张牌，当前输入了 '+cards.length+' 张。');
    return cards;
  }
  function compare(a,b){const x=a.score||a,y=b.score||b;for(let i=0;i<Math.max(x.length,y.length);i++){const d=(x[i]||0)-(y[i]||0);if(d)return Math.sign(d);}return 0;}
  function five(cards){
    const ranks=cards.map(c=>c.rank).sort((a,b)=>b-a),counts=new Map();
    for(const r of ranks)counts.set(r,(counts.get(r)||0)+1);
    const groups=[...counts].sort((a,b)=>b[1]-a[1]||b[0]-a[0]);
    const flush=cards.every(c=>c.suit===cards[0].suit);
    const unique=[...new Set(ranks)];
    const straight=unique.length===5?(unique[0]-unique[4]===4?unique[0]:unique.join(',')==='14,5,4,3,2'?5:0):0;
    let score;
    if(flush&&straight)score=[8,straight];
    else if(groups[0][1]===4)score=[7,groups[0][0],groups[1][0]];
    else if(groups[0][1]===3&&groups[1][1]===2)score=[6,groups[0][0],groups[1][0]];
    else if(flush)score=[5,...ranks];
    else if(straight)score=[4,straight];
    else if(groups[0][1]===3)score=[3,...groups.map(g=>g[0])];
    else if(groups[0][1]===2&&groups[1][1]===2)score=[2,...groups.map(g=>g[0])];
    else if(groups[0][1]===2)score=[1,...groups.map(g=>g[0])];
    else score=[0,...ranks];
    const name=score[0]===8&&score[1]===14?'皇家同花顺':['高牌','一对','两对','三条','顺子','同花','葫芦','四条','同花顺'][score[0]];
    const order=straight&&(score[0]===4||score[0]===8)?(straight===5?[5,4,3,2,14]:ranks):groups.map(g=>g[0]);
    const bestFive=cards.slice().sort((a,b)=>order.indexOf(a.rank)-order.indexOf(b.rank));
    return {score,name,cards:bestFive};
  }
  function best(cards){
    if(!Array.isArray(cards)||cards.length<5||cards.length>7||cards.some(c=>!c||!Number.isInteger(c.rank)||c.rank<2||c.rank>14||!suits[c.suit]||c.code!==rankCode(c.rank)+c.suit)||new Set(cards.map(c=>c.code)).size!==cards.length)throw Error('请提供五至七张不重复的标准扑克牌。');
    let winner=null;
    for(let a=0;a<cards.length-4;a++)for(let b=a+1;b<cards.length-3;b++)for(let c=b+1;c<cards.length-2;c++)for(let d=c+1;d<cards.length-1;d++)for(let e=d+1;e<cards.length;e++){
      const result=five([cards[a],cards[b],cards[c],cards[d],cards[e]]);
      if(!winner||compare(result,winner)>0)winner=result;
    }
    return winner;
  }
  function describe(hand){
    const s=hand.score,v=s.slice(1).map(rankText);
    switch(s[0]){
      case 8:case 4:return v[0]+' 高顺子';
      case 7:return v[0]+' 四条；踢脚 '+v[1];
      case 6:return v[0]+' 三条 + '+v[1]+' 一对';
      case 5:case 0:return '依次比较 '+v.join('、');
      case 3:return v[0]+' 三条；踢脚 '+v.slice(1).join('、');
      case 2:return v[0]+'、'+v[1]+' 两对；踢脚 '+v[2];
      case 1:return v[0]+' 一对；踢脚 '+v.slice(1).join('、');
    }
  }
  function rankPlayers({mode='holdem',board='',players}){
    if(!['holdem','five'].includes(mode)||!Array.isArray(players)||players.length<2||players.length>(mode==='holdem'?23:10)||players.some(p=>!p||typeof p.id!=='string'||typeof p.name!=='string'||!p.name.trim()||typeof p.cards!=='string')||new Set(players.map(p=>p.id)).size!==players.length)throw Error('至少需要两位玩家；德州模式最多23人，五张牌模式最多10人。');
    const deck=new Map();
    function field(text,count,name,id){
      try{
        const cards=parse(text,count);
        for(const c of cards){if(deck.has(c.code))throw Error(label(c)+' 已在'+deck.get(c.code)+'中出现，不能重复使用。');deck.set(c.code,name);}
        return cards;
      }catch(e){e.message=name+'：'+e.message;e.field=id;throw e;}
    }
    const common=mode==='holdem'?field(board,5,'公共牌','board'):[];
    const ranked=players.map(p=>({...p,hand:best([...common,...field(p.cards,mode==='holdem'?2:5,p.name+'的牌',p.id)])})).sort((a,b)=>-compare(a.hand,b.hand));
    let rank=1;ranked.forEach((p,i)=>{if(i&&compare(p.hand,ranked[i-1].hand)!==0)rank=i+1;p.rank=rank;});
    return ranked;
  }
  function winners(ranked,eligible){
    if(!Array.isArray(eligible)||!eligible.length||new Set(eligible).size!==eligible.length)throw Error('底池没有有效的竞争玩家。');
    const pool=ranked.filter(p=>eligible.includes(p.id));
    if(pool.length!==eligible.length)throw Error('有底池玩家尚未输入有效手牌。');
    let strongest=pool[0];for(const p of pool)if(compare(p.hand,strongest.hand)>0)strongest=p;
    return pool.filter(p=>compare(p.hand,strongest.hand)===0).map(p=>p.id);
  }
  return {parse,best,compare,describe,rankPlayers,winners,label,rankText};
})();
if(typeof module!=='undefined')module.exports=PokerHands;
