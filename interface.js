// Navigation and disclosure are presentation only; poker accounting lives in table-engine.js.
function updateNavigation(){
  const section=location.hash||'#play-table';
  const navigationSection=section==='#table-setup'?'#play-table':section;
  document.querySelectorAll('nav a').forEach(link=>{
    if(link.getAttribute('href')===navigationSection)link.setAttribute('aria-current','location');
    else link.removeAttribute('aria-current');
  });
  if(section==='#table-setup')document.getElementById('table-setup').open=true;
}
window.addEventListener('hashchange',updateNavigation);
document.querySelectorAll('a[href="#table-setup"]').forEach(link=>link.addEventListener('click',()=>document.getElementById('table-setup').open=true));
updateNavigation();
