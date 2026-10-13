function tableState(){return game().table??(game().table=PokerTable.config());}
function handRunning(){return !!game().table?.hand;}
function renderTable(){
  const g=game(),t=tableState(),h=t.hand,available=g.players.filter(p=>p.end>0);
  $('smallblind').value=t.small;$('bigblind').value=t.big;
  $('auto-next').checked=t.autoNext!==false;
  $('dealer').innerHTML=available.map(p=>`<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('');
  if(available.some(p=>p.id===t.dealer))$('dealer').value=t.dealer;
  ['smallblind','bigblind','dealer','initialize'].forEach(id=>$(id).disabled=!!h||g.mode!=='chips');
  $('start-hand').disabled=!!h||available.length<2||g.mode!=='chips';
  $('start-hand').textContent=t.number?'开始第 '+(t.number+1)+' 手':'开始第一手';
  $('table-message').textContent=g.mode!=='chips'?'请切换到筹码计分来使用逐手牌桌。':h?'按实际座位顺时针操作；本手进行中可用「撤销」修正。':'按添加顺序顺时针入座。选择首位庄家，开始时自动扣除盲注；零筹码玩家自动跳过。';
  const seats=h?h.seats:g.players,roles=h|| (available.length>=2?PokerTable.positions(available,available.some(p=>p.id===t.dealer)?t.dealer:available[0].id):{});
  $('table-seats').className=seats.length>10?'seat-grid':'seat-ring';
  $('table-seats').innerHTML=seats.map((p,i)=>{
    const badges=[roles.dealer===p.id?'庄家 D':'',roles.sb===p.id?'小盲 SB':'',roles.bb===p.id?'大盲 BB':''].filter(Boolean).join(' · ');
    const angle=2*Math.PI*i/seats.length-Math.PI/2;
    const style=seats.length<=10?`left:${50+38*Math.cos(angle)}%;top:${50+39*Math.sin(angle)}%`:'';
    return `<div class="seat ${h?.turn===p.id?'turn':''} ${p.folded?'folded':''}" style="${style}"><strong>${i+1}. ${esc(p.name)}</strong><span class="seat-role">${badges||'玩家'}</span><span>${fmt(h?p.stack:p.end)} 筹码</span>${h?`<small>${p.folded?'已弃牌':!p.stack?'ALL IN':'本轮 '+fmt(p.round)} · 已投 ${fmt(p.total)}</small>`:''}</div>`;
  }).join('');
  $('hand-number').textContent=h?'第 '+t.number+' 手 · '+PokerTable.streets[h.street]:'顺时针轮庄 ↻';
  $('pot-total').textContent=h?fmt(h.seats.reduce((s,p)=>s+p.total,0)):'0';
  const o=h?PokerTable.options(h):null;
  $('action-panel').hidden=!o;$('payout-panel').hidden=!h||h.street!==4;
  if(o){
    $('current-turn').textContent='轮到 '+o.p.name;
    $('call-action').textContent=o.call?'跟注 '+fmt(Math.min(o.call,o.p.stack))+(o.call>=o.p.stack?'（全下）':''):'过牌';
    $('raise-action').disabled=!o.canRaise;$('allin-action').disabled=!o.canRaise&&o.max>h.bet;
    $('raise-total').min=Math.min(o.min,o.max);$('raise-total').max=o.max;$('raise-total').value=Math.min(o.min,o.max);
    $('bet-hint').textContent='本轮需跟至 '+fmt(h.bet)+' · '+(o.canRaise?'最低加注总额 '+fmt(o.min)+'（含本轮已投）':'当前只能跟注 / 过牌或弃牌');
  }
  if(h?.street===4){
    $('pools').innerHTML=PokerTable.pots(h).map((pool,i)=>`<fieldset data-pool="${i}"><legend>${pool.refund?'未被跟注 · 退回':i===0?'主池':'边池 '+i}：${fmt(pool.amount)}</legend>${pool.eligible.map(id=>{const p=h.seats.find(p=>p.id===id);return `<label><input type="checkbox" value="${esc(id)}" ${pool.eligible.length===1?'checked disabled':''}> ${esc(p.name)}</label>`;}).join('')}</fieldset>`).join('');
  }
  $('hand-records').innerHTML=t.records.length?t.records.map(s=>`<div>${esc(s)}</div>`).join(''):'结束每手后，这里会显示本手输赢。';
  $('diff').previousElementSibling.textContent=h?'本手底池':'筹码差额';$('copy').disabled=!!h;
  if(h){$('diff').textContent=fmt(h.seats.reduce((s,p)=>s+p.total,0));$('diff').className='';$('notice').textContent='本手正在进行，筹码已进入底池。结算本手后再查看整场转分建议。';$('settlement').innerHTML='';}
  $('add').querySelector('button').disabled=!!h;
  $('mode').disabled=!!h;
  $('players').querySelectorAll('input,button').forEach(el=>el.disabled=!!h);
}
function tableChange(message,fn){try{fn();}catch(e){toast(e.message);render();}}
function initTableUI(){
$('auto-next').onchange=()=>mutate('调整自动开下一手',()=>tableState().autoNext=$('auto-next').checked);
['smallblind','bigblind'].forEach(id=>$(id).onchange=()=>{
  if(handRunning())return render();const n=integer($(id).value,1),t=tableState();
  if(n===null||(id==='smallblind'&&n>t.big)||(id==='bigblind'&&n<t.small)){toast('盲注须为正整数，大盲不能小于小盲。');return render();}
  mutate('调整盲注',()=>t[id==='smallblind'?'small':'big']=n);
});
$('dealer').onchange=()=>{if(handRunning())return render();mutate('选择庄家',()=>tableState().dealer=$('dealer').value);};
$('initialize').onclick=()=>{if(handRunning())return;if(confirm('将当前每位玩家的筹码设为其累计买入？这会覆盖已记的最终筹码，可以撤销。'))mutate('按累计买入初始化筹码',()=>game().players.forEach(p=>p.end=p.buy));};
$('start-hand').onclick=()=>tableChange('start',()=>{
  if(handRunning())return;const g=game(),draft=structuredClone(tableState()),players=structuredClone(g.players);
  PokerTable.start(players,draft);mutate('开始第 '+draft.number+' 手，自动扣除大小盲',()=>{g.table=draft;g.players=players;});
});
function takeAction(type,total){tableChange('act',()=>{
  const g=game(),draft=structuredClone(tableState()),players=structuredClone(g.players),o=PokerTable.options(draft.hand);
  const text=o.p.name+' '+(type==='fold'?'弃牌':type==='call'?(o.call?'跟注 '+Math.min(o.call,o.p.stack):'过牌'):'下注 / 加注至 '+total);
  PokerTable.act(draft.hand,type,total);PokerTable.sync(players,draft.hand);
  mutate(text,()=>{g.table=draft;g.players=players;});
});}
$('fold-action').onclick=()=>takeAction('fold');$('call-action').onclick=()=>takeAction('call');
$('raise-action').onclick=()=>takeAction('raise',integer($('raise-total').value,1));
$('allin-action').onclick=()=>{const o=PokerTable.options(tableState().hand);takeAction(o.max>tableState().hand.bet?'raise':'call',o.max);};
$('finish-hand').onclick=()=>tableChange('finish',()=>{
  const g=game(),draft=structuredClone(tableState()),players=structuredClone(g.players);
  const choices=Array.from($('pools').querySelectorAll('fieldset')).map(f=>Array.from(f.querySelectorAll('input:checked')).map(x=>x.value));
  let result=PokerTable.finish(players,draft,choices);
  if(draft.autoNext!==false&&players.filter(p=>p.end>0).length>=2){PokerTable.start(players,draft);result+='；自动开始第 '+draft.number+' 手';}
  mutate(result,()=>{g.table=draft;g.players=players;});
});
const examples=[
  ['皇家同花顺','A♠ K♠ Q♠ J♠ 10♠','同花色的 A、K、Q、J、10；最高的同花顺。'],
  ['同花顺','9♥ 8♥ 7♥ 6♥ 5♥','同花且连续；比较最大牌。'],
  ['四条','Q♠ Q♥ Q♦ Q♣ 7♠','先比四条点数，再比剩余一张。'],
  ['葫芦','J♠ J♥ J♦ 4♣ 4♥','三条加一对；先比三条，再比对子。'],
  ['同花','A♦ J♦ 8♦ 6♦ 2♦','同花色但不连续；从最大牌逐张比较。'],
  ['顺子','8♠ 7♥ 6♦ 5♣ 4♠','连续五张；比较最大牌，花色不影响。'],
  ['三条','9♠ 9♥ 9♦ A♣ 6♠','先比三条，再依次比两张踢脚。'],
  ['两对','K♠ K♥ 5♦ 5♣ J♠','先比大对，再比小对，最后比踢脚。'],
  ['一对','10♠ 10♥ A♦ 8♣ 3♠','先比对子，再依次比三张踢脚。'],
  ['高牌','A♠ J♥ 9♦ 6♣ 2♠','没有以上牌型；从最大牌逐张比较。']
];
$('rankings').innerHTML=examples.map(([name,cards,rule],i)=>`<article class="rank"><div class="rank-title"><b>${i+1}</b><h3>${name}</h3></div><div class="cards">${cards.split(' ').map(c=>`<span class="card ${/[♥♦]/.test(c)?'red':''}">${c}</span>`).join('')}</div><p>${rule}</p></article>`).join('');
}
