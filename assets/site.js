const BACKEND_DEFAULT = 'https://newest-mlb-1.onrender.com';
const state = { backendUrl: localStorage.getItem('allday_backend_url') || BACKEND_DEFAULT };

function byId(id){ return document.getElementById(id); }
function normalizeBackend(url=''){ return String(url||'').trim().replace(/\/$/, ''); }

async function apiFetch(path, options={}){
  const base = normalizeBackend(state.backendUrl);
  if(!base) throw new Error('Backend URL not set.');
  const res = await fetch(base + path, {
    headers: {'Content-Type':'application/json', ...(options.headers||{})}, ...options,
  });
  const data = await res.json().catch(()=>({}));
  if(!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

async function refreshHealth(){
  const el = byId('healthStatus');
  if(!el) return;
  el.textContent='Checking…'; el.className='status';
  try {
    const d = await apiFetch('/health');
    el.textContent = `Backend live · odds ${d.oddsKeyLoaded?'on':'off'} · stripe ${d.stripeEnabled?'on':'off'} · auth ${d.jwtSecretSet?'on':'⚠'}`;
    el.className = 'status success';
  } catch(err){ el.textContent=err.message; el.className='status error'; }
}

function saveBackendUrl(){
  const input = byId('backendUrl');
  if(!input) return;
  state.backendUrl = normalizeBackend(input.value) || BACKEND_DEFAULT;
  localStorage.setItem('allday_backend_url', state.backendUrl);
  refreshHealth();
}

async function checkout(plan){
  const customerEmail = byId('emailCapture')?.value?.trim()||'';
  try {
    const data = await apiFetch('/api/checkout/session', {
      method:'POST',
      body: JSON.stringify({ plan, customerEmail,
        successUrl: window.location.origin+'/app.html?checkout=success',
        cancelUrl: window.location.origin+'/index.html#pricing' })
    });
    if(data.url) window.location.href = data.url;
  } catch(err){ alert(err.message); }
}

async function submitLead(event){
  event.preventDefault();
  const name=byId('leadName')?.value?.trim()||'';
  const email=byId('leadEmail')?.value?.trim()||'';
  const note=byId('leadNote')?.value?.trim()||'';
  const out=byId('leadStatus');
  if(!name||!email){ out.textContent='Name and email required.'; out.className='status error'; return; }
  try {
    const data = await apiFetch('/api/leads', {method:'POST', body:JSON.stringify({name,email,note,source:'homepage'})});
    out.textContent=`Saved lead #${data.lead?.id}`; out.className='status success';
    event.target.reset();
  } catch(err){ out.textContent=err.message; out.className='status error'; }
}

async function claimAccessToken(email){
  const out = byId('claimStatus');
  if(out){ out.textContent='Activating…'; out.className='status'; }
  try {
    const data = await apiFetch('/api/auth/claim', {method:'POST', body:JSON.stringify({email})});
    localStorage.setItem('allday-mlb-edge-token', data.token);
    const existing = JSON.parse(localStorage.getItem('allday-mlb-edge-access')||'{}');
    localStorage.setItem('allday-mlb-edge-access', JSON.stringify({...existing, email:data.email, plan:data.plan}));
    if(out){ out.textContent=`Activated! Plan: ${data.plan}. Redirecting…`; out.className='status success'; }
    setTimeout(()=>{ window.location.href='./app.html'; }, 1400);
  } catch(err){ if(out){ out.textContent=err.message; out.className='status error'; } }
}

function handleClaimSubmit(e){
  e.preventDefault();
  const email = byId('claimEmail')?.value?.trim()||'';
  if(!email) return;
  claimAccessToken(email);
}

window.ALLDAY = { saveBackendUrl, refreshHealth, checkout, submitLead, claimAccessToken, handleClaimSubmit };

window.addEventListener('DOMContentLoaded', ()=>{
  const backendInput = byId('backendUrl');
  if(backendInput) backendInput.value = state.backendUrl;
  refreshHealth();
  const params = new URLSearchParams(window.location.search);
  if(params.get('checkout')==='success'){
    const section = byId('claimSection');
    if(section){ section.style.display='block'; section.scrollIntoView({behavior:'smooth'}); }
    const existing = JSON.parse(localStorage.getItem('allday-mlb-edge-access')||'{}');
    const claimEmailEl = byId('claimEmail');
    if(claimEmailEl && existing.email) claimEmailEl.value = existing.email;
  }
});
