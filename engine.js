/* Integer-only chip accounting avoids floating-point settlement errors. */
function settle(players) {
  if (players.reduce((sum,p)=>sum+p.net,0)!==0) return null;
  const owed=players.filter(p=>p.net<0).map(p=>({...p,left:-p.net}));
  const due=players.filter(p=>p.net>0).map(p=>({...p,left:p.net}));
  const result=[];let i=0,j=0;
  while(i<owed.length&&j<due.length){const amount=Math.min(owed[i].left,due[j].left);result.push({from:owed[i].name,to:due[j].name,amount});owed[i].left-=amount;due[j].left-=amount;if(!owed[i].left)i++;if(!due[j].left)j++;}
  return result;
}
if(typeof module!=='undefined')module.exports={settle};
