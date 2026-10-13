window.PokerCompareUI=(()=>{
  const STORAGE='poker-card-comparison-v1';
  const row=(name,id=crypto.randomUUID())=>({id,name,cards:''});
  let draft={mode:'holdem',board:'',players:[row('玩家1'),row('玩家2')],binding:null};
  try{const d=JSON.parse(localStorage.getItem(STORAGE));if(d&&['holdem','five'].includes(d.mode)&&typeof d.board==='string'&&d.board.length<=300&&Array.isArray(d.players)&&d.players.length>=2&&d.players.length<=23&&new Set(d.players.map(p=>p.id)).size===d.players.length&&d.players.every(p=>p&&typeof p.id==='string'&&typeof p.name==='string'&&p.name.length<=30&&typeof p.cards==='string'&&p.cards.length<=300)&&(d.binding===null||(d.binding&&typeof d.binding.session==='string'&&Number.isSafeInteger(d.binding.number))))draft=d;}catch{}
  let ranked=null,resultSignature=null,applied=null,picker=null;
  const signature=()=>JSON.stringify({mode:draft.mode,board:draft.board,players:draft.players});
  const contextKey=b=>b?b.session+':'+b.number:null;
  const cardHTML=cards=>cards.map(c=>`<span class="card ${['h','d'].includes(c.suit)?'red':''}">${PokerHands.label(c)}</span>`).join('');
  const save=()=>{try{localStorage.setItem(STORAGE,JSON.stringify(draft));}catch{}};
  function boundHand(){const h=game().table?.hand;return draft.mode==='holdem'&&draft.binding?.session===game().id&&draft.binding.number===game().table?.number&&h?.street===4&&h.seats.filter(p=>!p.folded).length===draft.players.length&&h.seats.filter(p=>!p.folded).every(p=>draft.players.some(x=>x.id===p.id))?h:null;}
  function choices(h){return PokerTable.pots(h).map(p=>p.eligible.length===1?p.eligible:PokerHands.winners(ranked,p.eligible));}
  function fillWinners(winners){Array.from($('pools').querySelectorAll('fieldset')).forEach((field,i)=>field.querySelectorAll('input').forEach(input=>input.checked=winners[i]?.includes(input.value)||false));}
  function invalidate(){
    if(applied&&contextKey(applied.binding)===contextKey(draft.binding)&&boundHand())$('pools').querySelectorAll('input:not(:disabled)').forEach(input=>input.checked=false);
    ranked=null;resultSignature=null;applied=null;$('comparison-results').hidden=true;$('compare-error').textContent='';
    $('compare-inputs').querySelectorAll('[aria-invalid]').forEach(e=>e.removeAttribute('aria-invalid'));$('compare-board').removeAttribute('aria-invalid');
    save();syncContext();
  }
  function renderRows(){
    $('compare-mode').value=draft.mode;$('compare-board').value=draft.board;$('board-field').hidden=draft.mode==='five';
    $('compare-inputs').innerHTML=draft.players.map((p,i)=>`<div class="compare-input-row" data-player="${esc(p.id)}"><span class="compare-seat">${i+1}</span><input data-field="name" value="${esc(p.name)}" maxlength="30" aria-label="第${i+1}位玩家姓名"><input data-field="cards" value="${esc(p.cards)}" maxlength="300" placeholder="${draft.mode==='holdem'?'A♠ K♥':'A♠ K♥ Q♦ J♣ 10♠'}" aria-label="${esc(p.name)}的牌"><button type="button" data-pick="${esc(p.id)}">选牌</button><button type="button" class="ghost" data-remove="${esc(p.id)}" ${draft.players.length<=2?'disabled':''} aria-label="移除比牌玩家${esc(p.name)}">移除</button></div>`).join('');
    $('compare-card-count').textContent=draft.mode==='holdem'?'每人两张手牌，公共牌五张':'每人直接输入五张牌，不需要公共牌';
    $('compare-add').disabled=draft.players.length>=(draft.mode==='holdem'?23:10);
    syncContext();
  }
  function syncContext(){
    const h=game().table?.hand,live=h?.seats.filter(p=>!p.folded);
    $('compare-showdown').hidden=!h||h.street!==4||live.length<2;
    $('compare-load').disabled=(live||game().players).length<2;
    const current=boundHand();
    $('compare-context').textContent=draft.binding?(current?'已关联当前第 '+draft.binding.number+' 手，结果可填入各底池赢家。':'已关联的牌局或本手状态发生变化，请重新导入当前牌桌。'):'独立比牌，不会修改牌桌筹码。';
    $('compare-apply').disabled=!current||!ranked||resultSignature!==signature();
    if(applied){
      if(current&&contextKey(applied.binding)===contextKey(draft.binding)&&applied.signature===signature())fillWinners(applied.winners);
      else applied=null;
    }
  }
  function loadTable(){
    const t=game().table,h=t?.hand,players=h?h.seats.filter(p=>!p.folded):game().players;
    if(players.length<2||players.length>23){toast('请选择两至23位玩家进行比牌。');return;}
    const binding=h?.street===4?{session:game().id,number:t.number}:null;
    const same=binding&&contextKey(binding)===contextKey(draft.binding);
    const previous=draft.players;
    invalidate();draft={mode:'holdem',board:same?draft.board:'',players:players.map(p=>({...row(p.name,p.id),cards:same?(previous.find(x=>x.id===p.id)?.cards||''):''})),binding};
    save();renderRows();$('compare-cards').scrollIntoView({block:'start'});$('compare-board').focus({preventScroll:true});
  }
  $('compare-load').onclick=loadTable;$('compare-showdown').onclick=loadTable;
  $('compare-mode').onchange=()=>{invalidate();draft.mode=$('compare-mode').value;draft.binding=null;save();renderRows();};
  $('compare-board').oninput=()=>{draft.board=$('compare-board').value;invalidate();};
  $('compare-inputs').oninput=e=>{const p=draft.players.find(p=>p.id===e.target.closest('[data-player]')?.dataset.player);if(!p||!e.target.dataset.field)return;p[e.target.dataset.field]=e.target.value;const input=e.target.closest('[data-player]').querySelector('[data-field=cards]');input.setAttribute('aria-label',p.name+'的牌');invalidate();};
  $('compare-inputs').onclick=e=>{const pick=e.target.closest('[data-pick]'),remove=e.target.closest('[data-remove]');if(pick)return openPicker(pick.dataset.pick);if(remove&&draft.players.length>2){invalidate();draft.players=draft.players.filter(p=>p.id!==remove.dataset.remove);save();renderRows();}};
  $('compare-add').onclick=()=>{if(draft.players.length>=(draft.mode==='holdem'?23:10))return;invalidate();draft.players.push(row('玩家'+(draft.players.length+1)));draft.binding=null;save();renderRows();};
  $('compare-form').onsubmit=e=>{
    e.preventDefault();invalidate();
    try{
      ranked=PokerHands.rankPlayers(draft);resultSignature=signature();
      const winners=ranked.filter(p=>p.rank===1);$('compare-summary').textContent=winners.map(p=>p.name).join('、')+(winners.length>1?' 平局':' 胜出');
      $('compare-ranking').innerHTML=ranked.map(p=>`<li class="compare-result"><span class="result-rank">${p.rank}</span><div><strong>${esc(p.name)}</strong><span class="result-hand">${p.hand.name}</span><p>${PokerHands.describe(p.hand)}</p></div><div class="cards" aria-label="${esc(p.name)}的最佳五张">${cardHTML(p.hand.cards)}</div></li>`).join('');
      const h=boundHand();$('compare-pots').textContent=h?PokerTable.pots(h).map((p,i)=>(p.refund?'未跟注退回':i===0?'主池':'边池 '+i)+'：'+(p.eligible.length===1?p.eligible:PokerHands.winners(ranked,p.eligible)).map(id=>h.seats.find(s=>s.id===id).name).join('、')).join('；'):'';
      $('comparison-results').hidden=false;syncContext();
    }catch(error){ranked=null;resultSignature=null;$('compare-error').textContent=error.message;const field=error.field==='board'?$('compare-board'):Array.from($('compare-inputs').querySelectorAll('[data-player]')).find(el=>el.dataset.player===error.field)?.querySelector('[data-field=cards]');if(field){field.setAttribute('aria-invalid','true');field.focus();}syncContext();}
  };
  $('compare-apply').onclick=()=>{
    const h=boundHand();if(!h||!ranked||resultSignature!==signature()){toast('请重新导入本手并比牌。');return;}
    const winners=choices(h);fillWinners(winners);applied={binding:{...draft.binding},signature:resultSignature,winners};
    $('payout-panel').scrollIntoView({block:'start'});toast('已填入各底池赢家，请核对后确认本手结算。');
  };
  $('pools').addEventListener('change',()=>{applied=null;});
  function openPicker(id){
    const p=id==='board'?null:draft.players.find(p=>p.id===id);if(id!=='board'&&!p)return;
    let selected=[];try{selected=PokerHands.parse(p?p.cards:draft.board);}catch{}
    const limit=id==='board'||draft.mode==='five'?5:2;
    picker={id,suit:'s',selected,limit};$('picker-title').textContent=id==='board'?'选择公共牌':'选择'+p.name+'的牌';renderPicker();$('card-picker').showModal();
  }
  function usedCards(){
    const used=new Set();const texts=draft.players.filter(p=>p.id!==picker.id).map(p=>p.cards);
    if(draft.mode==='holdem'&&picker.id!=='board')texts.push(draft.board);
    for(const text of texts)try{PokerHands.parse(text).forEach(c=>used.add(c.code));}catch{}
    return used;
  }
  function renderPicker(){
    $('picker-count').textContent='已选 '+picker.selected.length+' / '+picker.limit+' 张；再次点击可取消。';
    $('picker-suits').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.suit===picker.suit)));
    const used=usedCards();$('picker-deck').innerHTML=Array.from({length:13},(_,i)=>14-i).map(rank=>{
      const code=(rank===10?'T':PokerHands.rankText(rank))+picker.suit,c={rank,suit:picker.suit,code},selected=picker.selected.some(x=>x.code===code),unavailable=used.has(code)||(!selected&&picker.selected.length>=picker.limit);
      return `<button type="button" data-card="${code}" class="card-choice ${['h','d'].includes(picker.suit)?'red':''}" aria-pressed="${selected}" ${unavailable?'disabled':''}>${PokerHands.label(c)}</button>`;
    }).join('');
    $('picker-selected').innerHTML=picker.selected.length?picker.selected.map(c=>`<button type="button" data-card="${c.code}" aria-label="取消${PokerHands.label(c)}" class="selected-card ${['h','d'].includes(c.suit)?'red':''}">${PokerHands.label(c)} ×</button>`).join(''):'尚未选牌';
  }
  function setPicker(){const text=picker.selected.map(PokerHands.label).join(' ');if(picker.id==='board')draft.board=text;else draft.players.find(p=>p.id===picker.id).cards=text;invalidate();renderRows();renderPicker();}
  $('pick-board').onclick=()=>openPicker('board');
  $('picker-suits').onclick=e=>{const b=e.target.closest('[data-suit]');if(b){picker.suit=b.dataset.suit;renderPicker();}};
  function togglePicked(e){
    const b=e.target.closest('[data-card]');if(!b||b.disabled)return;const code=b.dataset.card,index=picker.selected.findIndex(c=>c.code===code);
    if(index>=0)picker.selected.splice(index,1);else if(picker.selected.length<picker.limit)picker.selected.push(PokerHands.parse(code,1)[0]);
    setPicker();const focus=Array.from($('picker-deck').querySelectorAll('button')).find(button=>button.dataset.card===code&&!button.disabled);(focus||$('picker-done')).focus();
  }
  $('picker-deck').onclick=togglePicked;$('picker-selected').onclick=togglePicked;
  $('picker-clear').onclick=()=>{picker.selected=[];setPicker();};$('picker-done').onclick=()=>$('card-picker').close();
  renderRows();
  return {syncContext};
})();
