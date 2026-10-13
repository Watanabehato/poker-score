/* No-limit Hold'em bookkeeping. Cards are dealt and compared at the physical table. */
const PokerTable = (() => {
  const streets = ['翻牌前', '翻牌', '转牌', '河牌', '摊牌'];
  const config = () => ({dealer: null, small: 5, big: 10, autoNext: true, number: 0, hand: null, records: []});
  const money = n => Number.isSafeInteger(n) && n >= 0 && n <= 1000000000;
  function valid(t, players) {
    if (t === undefined) return true;
    if (!t || !(t.autoNext===undefined||typeof t.autoNext==='boolean') || !money(t.small) || !money(t.big) || !t.small || t.big < t.small || !money(t.number) || !(t.dealer === null || players.some(p => p.id === t.dealer)) || !Array.isArray(t.records) || t.records.length > 100 || !t.records.every(r => typeof r === 'string')) return false;
    const h = t.hand;
    if (h === null) return true;
    if (!h || !Number.isInteger(h.street) || h.street < 0 || h.street > 4 || !money(h.bet) || !money(h.big) || !h.big || !money(h.minRaise) || !h.minRaise || !Array.isArray(h.seats) || h.seats.length < 2 || new Set(h.seats.map(p => p.id)).size !== h.seats.length || !h.seats.every(p => players.some(x => x.id === p.id && x.end === p.stack) && typeof p.name === 'string' && money(p.stack) && money(p.start) && money(p.total) && money(p.round) && p.round <= p.total && p.stack + p.total === p.start && typeof p.folded === 'boolean') || !Array.isArray(h.acted) || !h.acted.every(id => h.seats.some(p => p.id === id)) || !h.lastBet || !Object.entries(h.lastBet).every(([id,n]) => h.seats.some(p => p.id === id) && money(n))) return false;
    return ['dealer','sb','bb'].every(k => h.seats.some(p => p.id === h[k])) && (h.turn === null || h.seats.some(p => p.id === h.turn && !p.folded && p.stack > 0)) && (h.street === 4 ? h.turn === null : h.turn !== null);
  }
  function next(seats, id, predicate = () => true) {
    const at = seats.findIndex(p => p.id === id);
    for (let n=1; n<=seats.length; n++) { const p=seats[(at+n+seats.length)%seats.length]; if (predicate(p)) return p.id; }
    return null;
  }
  function positions(seats, dealer) {
    const sb = seats.length === 2 ? dealer : next(seats,dealer);
    return {dealer,sb,bb:next(seats,sb)};
  }
  function pay(h, id, amount) {
    const p=h.seats.find(p=>p.id===id); const paid=Math.min(amount,p.stack);
    p.stack-=paid; p.round+=paid; p.total+=paid;
  }
  const live = h => h.seats.filter(p=>!p.folded);
  const pending = (h,p) => !p.folded && p.stack>0 && (!h.acted.includes(p.id) || p.round<h.bet);
  function advance(h, after) {
    if (live(h).length===1) { h.street=4; h.turn=null; return; }
    const able=live(h).filter(p=>p.stack>0);
    const opposingBet=able.length===1?Math.max(0,...live(h).filter(p=>p.id!==able[0].id).map(p=>p.round)):h.bet;
    if (able.length<=1 && (!able.length || able[0].round>=opposingBet)) { h.street=4; h.turn=null; return; }
    if (able.length===1) h.bet=opposingBet;
    const waiting=next(h.seats,after,p=>pending(h,p));
    if (waiting) { h.turn=waiting; return; }
    h.street++;
    if (h.street===4) { h.turn=null; return; }
    h.seats.forEach(p=>p.round=0); h.bet=0; h.minRaise=h.big; h.acted=[]; h.lastBet={};
    h.turn=next(h.seats,h.dealer,p=>!p.folded&&p.stack>0);
  }
  function start(players,t) {
    const seats=players.filter(p=>p.end>0).map(p=>({id:p.id,name:p.name,start:p.end,stack:p.end,total:0,round:0,folded:false}));
    if (seats.length<2) throw Error('至少需要两位有筹码的玩家；可增购或初始化筹码。');
    const dealer=seats.some(p=>p.id===t.dealer)?t.dealer:seats[0].id;
    const h={...positions(seats,dealer),seats,street:0,bet:t.big,minRaise:t.big,big:t.big,acted:[],lastBet:{},turn:null};
    pay(h,h.sb,t.small); pay(h,h.bb,t.big);
    // The full big blind remains the preflop call amount even if the blind is short.
    advance(h,h.bb);
    t.dealer=dealer; t.number++; t.hand=h; sync(players,h);
    return h;
  }
  function options(h) {
    const p=h.seats.find(p=>p.id===h.turn); if (!p) return null;
    const call=Math.max(0,h.bet-p.round), max=p.round+p.stack;
    const reopened=!h.acted.includes(p.id) || h.bet-(h.lastBet[p.id]??0)>=h.minRaise;
    const opponents=live(h).some(x=>x.id!==p.id&&x.stack>0);
    return {p,call,canRaise:reopened&&opponents&&max>h.bet,min:h.bet+h.minRaise,max};
  }
  function act(h,type,total) {
    const o=options(h); if (!o) throw Error('本手已结束，请分配底池。');
    const p=o.p;
    if (type==='fold') p.folded=true;
    else if (type==='call') pay(h,p.id,o.call);
    else if (type==='raise') {
      if (!o.canRaise) throw Error('当前不能加注，可跟注或弃牌。');
      if (!money(total)||total<=h.bet||total>o.max||(total<o.min&&total!==o.max)) throw Error('加注总额至少为 '+o.min+'，筹码不足时可全下至 '+o.max+'。');
      const increase=total-h.bet;
      pay(h,p.id,total-p.round);
      if(increase>=h.minRaise){h.minRaise=increase;h.acted=[];h.lastBet={};}
      h.bet=total;
    } else throw Error('未知操作');
    if (!h.acted.includes(p.id)) h.acted.push(p.id); h.lastBet[p.id]=h.bet;
    advance(h,p.id);
  }
  function sync(players,h) { h.seats.forEach(p=>{players.find(x=>x.id===p.id).end=p.stack;}); }
  function pots(h) {
    const levels=[...new Set(h.seats.map(p=>p.total).filter(n=>n>0))].sort((a,b)=>a-b);
    let prev=0;
    return levels.map(level=>{
      const payers=h.seats.filter(p=>p.total>=level),amount=(level-prev)*payers.length; prev=level;
      const eligible=live(h).length===1?live(h).map(p=>p.id):payers.filter(p=>!p.folded).map(p=>p.id);
      // A unique highest contribution is an uncalled bet and always returns to its contributor.
      return {amount,eligible:payers.length===1?[payers[0].id]:eligible,refund:payers.length===1};
    });
  }
  function finish(players,t,choices) {
    const h=t.hand; if (!h||h.street!==4) throw Error('请先完成本手的行动。');
    const pools=pots(h);
    const awards=new Map(h.seats.map(p=>[p.id,0]));
    pools.forEach((pool,i)=>{
      const winners=pool.eligible.length===1?pool.eligible:choices[i];
      if (!Array.isArray(winners)||!winners.length||new Set(winners).size!==winners.length||!winners.every(id=>pool.eligible.includes(id))) throw Error('请为每个底池选择获胜玩家；平局可多选。');
      // Odd chips go clockwise from the seat left of the button.
      const order=[]; let id=h.dealer;
      for(let n=0;n<h.seats.length;n++){id=next(h.seats,id);if(winners.includes(id))order.push(id);}
      const share=Math.floor(pool.amount/order.length),extra=pool.amount%order.length;
      order.forEach((id,j)=>awards.set(id,awards.get(id)+share+(j<extra?1:0)));
    });
    if (h.seats.some(p=>!money(p.stack+awards.get(p.id)))) throw Error('结算后筹码不能超过10亿。');
    h.seats.forEach(p=>p.stack+=awards.get(p.id)); sync(players,h);
    const result='第 '+t.number+' 手：'+h.seats.map(p=>p.name+' '+(p.stack-p.start>=0?'+':'')+(p.stack-p.start)).join('，');
    t.records.unshift(result);t.records=t.records.slice(0,100);
    t.dealer=next(players,h.dealer,p=>p.end>0); t.hand=null;
    return result;
  }
  return {config,valid,next,positions,start,options,act,sync,pots,finish,streets};
})();
if(typeof module!=='undefined')module.exports=PokerTable;
