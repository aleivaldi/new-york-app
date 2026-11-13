(function(){
'use strict';
var D = window.DATA, P = D.P, PBY = {}, HOTEL = D.HOTEL;
P.forEach(function(p){ PBY[p.id] = p; });
var MBY = {}, HBY = {};
D.MISS.forEach(function(m){ MBY[m[0]] = m; });
D.HUNT.forEach(function(h){ HBY[h[0]] = h; });
var DCOL = ['#8b8578','#a33a24','#16694a','#1d5fa8','#6d4a8f'];
var DAYNAME = ['Venerd\u00ec','Sabato','Domenica','Luned\u00ec','Marted\u00ec'];

/* ---------- stato ---------- */
var S = { claims:{}, removed:{}, choices:{}, order:{}, me:null, editDay:-1 };
try{
  S.claims  = JSON.parse(localStorage.getItem('ny2_claims')  || '{}');
  S.removed = JSON.parse(localStorage.getItem('ny2_removed') || '{}');
  S.choices = JSON.parse(localStorage.getItem('ny2_choices') || '{}');
  S.order   = JSON.parse(localStorage.getItem('ny2_order')   || '{}');
}catch(e){}
function save(){ try{
  localStorage.setItem('ny2_claims', JSON.stringify(S.claims));
  localStorage.setItem('ny2_removed', JSON.stringify(S.removed));
  localStorage.setItem('ny2_choices', JSON.stringify(S.choices));
  localStorage.setItem('ny2_order', JSON.stringify(S.order));
}catch(e){} }

/* ---------- utility ---------- */
function h(tag, cls, txt){ var e=document.createElement(tag); if(cls) e.className=cls; if(txt!=null) e.textContent=txt; return e; }
function raw(tag, cls, html){ var e=document.createElement(tag); if(cls) e.className=cls; if(html!=null) e.innerHTML=html; return e; }
function esc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function dist(a,b){ var R=6371000,r=Math.PI/180,dLa=(b[0]-a[0])*r,dLo=(b[1]-a[1])*r;
  var x=Math.sin(dLa/2)*Math.sin(dLa/2)+Math.cos(a[0]*r)*Math.cos(b[0]*r)*Math.sin(dLo/2)*Math.sin(dLo/2);
  return 2*R*Math.asin(Math.sqrt(x)); }
function fmtD(m){ var min=Math.max(1,Math.round(m/80));
  return m<950 ? Math.round(m)+' m, '+min+' min a piedi' : (m/1000).toFixed(1).replace('.',',')+' km, '+min+' min a piedi'; }
function gmaps(p){ return 'https://www.google.com/maps/dir/?api=1&destination='+p.ll[0]+','+p.ll[1]+'&travelmode=transit'; }
function gwalk(p){ return 'https://www.google.com/maps/dir/?api=1&destination='+p.ll[0]+','+p.ll[1]+'&travelmode=walking'; }
function amaps(p){ return 'https://maps.apple.com/?daddr='+p.ll[0]+','+p.ll[1]+'&dirflg=r'; }
function gsearch(q){ return 'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(q+', New York'); }

/* ---------- foto (Wikipedia, con ripiego disegnato) ---------- */
var IMGC = {};
try{ IMGC = JSON.parse(localStorage.getItem('ny2_img3') || '{}'); }catch(e){}
function placeholder(seed, label){
  var cols=[['#2f4f4f','#16694a'],['#4a3b5c','#6d4a8f'],['#5c3a2e','#a33a24'],['#2c3e50','#1d5fa8'],['#4a4032','#9a6b1f']];
  var c=cols[Math.abs(hashCode(seed))%cols.length];
  var svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">'
    +'<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="'+c[0]+'"/><stop offset="1" stop-color="'+c[1]+'"/></linearGradient></defs>'
    +'<rect width="400" height="300" fill="url(#g)"/>'
    +'<g fill="none" stroke="rgba(255,255,255,.15)" stroke-width="2">'
    +'<path d="M40 300V160h40v140M100 300V120h46v180M166 300V196h38v104M224 300V96h52v204M296 300V168h44v132"/></g>'
    +'<g fill="rgba(255,255,255,.1)"><circle cx="330" cy="54" r="16"/></g></svg>';
  return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
}
function shortTitle(t){
  var x=String(t||'');
  var cut=x.indexOf(':');
  if(cut>=16 && cut<64) return x.slice(0,cut);
  var dot=x.indexOf('.');
  if(dot>12 && dot<70) return x.slice(0,dot);
  return x.length>64 ? x.slice(0,62).replace(/[ ,;]+\S*$/,'')+'\u2026' : x;
}
function hashCode(s){ var x=0,i; s=String(s); for(i=0;i<s.length;i++){ x=((x<<5)-x)+s.charCodeAt(i); x|=0; } return x; }
// WHY: Wikipedia answers 429 when a page asks for dozens of photos at once, so requests go two at a time,
// and only a definite "no photo" is remembered: a failed request is tried again next time.
var IMGQ = [], IMGBUSY = 0, IMGWAIT = {};
function setImg(el, wikiTitle, label){
  el.src = placeholder(wikiTitle||label, label);
  if(!wikiTitle) return;
  if(IMGC[wikiTitle]){ if(IMGC[wikiTitle]!=='-') el.src=IMGC[wikiTitle]; return; }
  if(IMGWAIT[wikiTitle]){ IMGWAIT[wikiTitle].push(el); return; }
  IMGWAIT[wikiTitle]=[el];
  IMGQ.push(wikiTitle);
  pumpImg();
}
function pumpImg(){
  while(IMGBUSY<2 && IMGQ.length){ IMGBUSY++; fetchImg(IMGQ.shift()); }
}
function fetchImg(title){
  var url='https://en.wikipedia.org/api/rest_v1/page/summary/'+encodeURIComponent(title.replace(/ /g,'_'));
  var done=function(src, final){
    if(final){ IMGC[title]=src||'-'; try{ localStorage.setItem('ny2_img3', JSON.stringify(IMGC)); }catch(e){} }
    if(src) (IMGWAIT[title]||[]).forEach(function(el){ el.src=src; });
    delete IMGWAIT[title];
    IMGBUSY--; pumpImg();
  };
  fetch(url,{headers:{'Accept':'application/json'}}).then(function(r){
    if(r.status===404) return {none:true};
    return r.ok ? r.json() : null;
  }).then(function(j){
    if(!j) return done(null,false);
    var src = j.none ? null : ((j.originalimage&&j.originalimage.source) || (j.thumbnail&&j.thumbnail.source));
    if(src && /\.(jpe?g|png)$/i.test(src.split('?')[0])){
      if(j.originalimage && j.originalimage.width>1600 && j.thumbnail) src=j.thumbnail.source.replace(/\/\d+px-/, '/960px-');
      done(src,true);
    } else done(null,true);
  }).catch(function(){ done(null,false); });
}

/* ---------- piano ---------- */
/* Every stop of a day in the order chosen on the phone (S.order), removed ones included. */
function allStops(di){
  var seen={}, out=[];
  D.DAYS[di].slots.forEach(function(s){ var id=s[5]; if(id && !seen[id]){ seen[id]=1; out.push({id:id, t:s[0]}); } });
  var ord=S.order[di];
  if(ord){
    var pos=function(x){ var i=ord.indexOf(x.id); return i<0 ? 999 : i; };
    out.sort(function(a,b){ return pos(a)-pos(b); });
  }
  return out;
}
function dayStops(di){ return allStops(di).filter(function(x){ return !S.removed[x.id]; }); }
function dayEdited(di){ return !!S.order[di] || allStops(di).some(function(x){ return S.removed[x.id]; }); }
function moveStop(di, id, d){
  var ids=dayStops(di).map(function(x){return x.id;}), i=ids.indexOf(id), j=i+d;
  if(i<0 || j<0 || j>=ids.length) return;
  ids[i]=ids[j]; ids[j]=id;
  S.order[di]=ids.concat(allStops(di).filter(function(x){return S.removed[x.id];}).map(function(x){return x.id;}));
  save(); render();
}
function toggleStop(id){ if(S.removed[id]) delete S.removed[id]; else S.removed[id]=1; save(); render(); }
function resetDay(di){
  delete S.order[di];
  allStops(di).forEach(function(x){ delete S.removed[x.id]; });
  save(); render();
}
function dayHome(id){ for(var i=0;i<D.DAYS.length;i++){ if(allStops(i).some(function(x){return x.id===id;})) return i; } return -1; }
function dayOf(id){ for(var i=0;i<D.DAYS.length;i++){ if(dayStops(i).some(function(x){return x.id===id;})) return i; } return -1; }
function neighbour(id, d){
  var di=dayOf(id); if(di<0) return null;
  var a=dayStops(di).map(function(x){return x.id;}), i=a.indexOf(id), j=i+d;
  return (j>=0 && j<a.length) ? a[j] : null;
}
function legSteps(from,to){
  if(from && D.LEGS[from+'>'+to]) return D.LEGS[from+'>'+to];
  return D.TUBE[to] || [];
}
function branch(id){ var p=PBY[id]; if(!p||!p.choice) return ''; return S.choices[id]||p.choice.opts[0].k; }
function steps(p){ var b=branch(p.id); return (p.fare||[]).filter(function(f){ return !f.br || f.br===b; }); }
function todayIdx(){
  var n=new Date(new Date().toLocaleString('en-US',{timeZone:'America/New_York'}));
  if(n.getFullYear()===2026 && n.getMonth()===10){ var k=n.getDate()-20; if(k>=0&&k<=4) return k; }
  return -1;
}
function nearest(){
  if(!S.me) return null;
  var best=null,bd=1e9;
  P.forEach(function(p){ if(S.removed[p.id]) return; var d=dist(S.me,p.ll); if(d<bd){bd=d;best=p;} });
  return best ? {p:best,d:bd} : null;
}

/* ---------- pezzi riusabili ---------- */
function hero(opts){
  var w=h('div','hero');
  var img=document.createElement('img'); img.alt=opts.title||''; img.loading='eager';
  setImg(img, opts.wiki, opts.title);
  w.appendChild(img);
  w.appendChild(h('div','shade'));
  var t=h('div','htxt');
  if(opts.kick) t.appendChild(h('div','kick',opts.kick));
  t.appendChild(h('h1',null,opts.title));
  if(opts.chips && opts.chips.length){
    var c=h('div','chips');
    opts.chips.forEach(function(x){ if(x) c.appendChild(h('span','chip',x)); });
    t.appendChild(c);
  }
  w.appendChild(t);
  return w;
}
function btn(label, href, cls, icon){
  var a = href ? document.createElement('a') : document.createElement('button');
  a.className='btn'+(cls?' '+cls:'');
  if(href){ a.href=href; if(/^https?:/.test(href)){ a.target='_blank'; a.rel='noopener noreferrer'; } }
  else a.type='button';
  if(icon) a.appendChild(raw('span',null,icon));
  a.appendChild(h('span',null,label));
  return a;
}
var IC = {
  dir:'<svg viewBox="0 0 24 24" width="18" height="18"><path d="M12 21s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11z" fill="none" stroke="currentColor" stroke-width="1.9"/><circle cx="12" cy="10" r="2.6" fill="none" stroke="currentColor" stroke-width="1.9"/></svg>',
  play:'<svg viewBox="0 0 24 24" width="18" height="18"><path d="M8 5l11 7-11 7z" fill="currentColor"/></svg>',
  chat:'<svg viewBox="0 0 24 24" width="18" height="18"><path d="M21 12a8 8 0 11-3.2-6.4L21 4l-1 4.2" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>'
};
function noteBox(cls, title, text){
  var n=h('div','note '+cls);
  if(title) n.appendChild(h('b',null,title));
  n.appendChild(h('p',null,text));
  return n;
}
function huntRow(row){
  var id=row[0], txt=row[1], pts=row[2], where=row[3];
  var d=h('div','hunt'+(S.claims[id]?' done':''));
  d.appendChild(h('div','badge',String(pts)));
  var t=h('div','t',txt);
  if(where) t.appendChild(h('span','w',where));
  d.appendChild(t);
  var pk=h('div','pick');
  ['m','g'].forEach(function(w){
    var b=h('button',w+(S.claims[id]===w?' on':''), w==='m'?'M':'G');
    b.type='button';
    b.addEventListener('click',function(ev){
      ev.stopPropagation();
      if(S.claims[id]===w) delete S.claims[id]; else S.claims[id]=w;
      save(); render();
    });
    pk.appendChild(b);
  });
  d.appendChild(pk);
  return d;
}
window.__app = { S:S, PBY:PBY, dayStops:dayStops, steps:steps };

/* ===================== VISTE ===================== */
var view = document.getElementById('view');

function vOggi(){
  var di = todayIdx(); if(di<0) di = 1;
  var near = nearest();
  var frag = document.createDocumentFragment();
  var d = D.DAYS[di];
  frag.appendChild(hero({
    kick:'New York, '+DAYNAME[di],
    title:d.t,
    wiki: (dayStops(di)[0] && PBY[dayStops(di)[0].id].wiki) || 'Times Square',
    chips:[ di===0?'Arrivo e riposo':'Tramonto alle 16:33', dayStops(di).length+' tappe' ]
  }));
  var w=h('div','wrap');
  if(near && near.d<900){
    var p=near.p;
    var c=h('div','card'); var pd=h('div','pad');
    pd.appendChild(h('div','tm','SIETE QUI VICINO'));
    pd.appendChild(h('h3',null,p.n));
    pd.appendChild(h('p',null,fmtD(near.d)));
    var b=btn('Apri la pagina',null,'');
    b.addEventListener('click',function(){ location.hash='#/posto/'+p.id; });
    var br=h('div','btnrow'); br.appendChild(b); pd.appendChild(br);
    c.appendChild(pd); w.appendChild(c);
  }
  w.appendChild(h('p','lead', d.sub));
  var sec=h('section');
  sec.appendChild(h('h2','sec','Il programma di oggi'));
  if(S.order[di]){
    sec.appendChild(noteBox('info','Ordine cambiato','Avete riordinato le tappe: orari e spostamenti del programma originale qui non valgono più. Per tornare al programma: Giorni, Modifica, Ripristina.'));
    dayStops(di).forEach(function(s){ sec.appendChild(stopCard(s.id, '')); });
  } else d.slots.forEach(function(s){
    var id=s[5];
    if(id && !S.removed[id]) sec.appendChild(stopCard(id, s[0]));
    else if(!id && s[1]) sec.appendChild(raw('div','move','<b>'+esc(s[0])+'</b> '+esc(s[1])));
  });
  w.appendChild(sec);
  frag.appendChild(w);
  return frag;
}
function stopCard(id, time){
  var p=PBY[id];
  var a=document.createElement('a'); a.className='stop'; a.href='#/posto/'+id;
  var ph=h('div','ph skel');
  var img=document.createElement('img'); img.alt=''; img.loading='lazy';
  setImg(img, p.wiki, p.n); ph.appendChild(img);
  a.appendChild(ph);
  var bd=h('div','bd');
  if(time) bd.appendChild(h('div','tm',time));
  bd.appendChild(h('h3',null,p.n));
  bd.appendChild(h('div','sub',p.meta));
  a.appendChild(bd);
  return a;
}

function vGiorni(){
  var frag=document.createDocumentFragment();
  frag.appendChild(hero({kick:'Il viaggio', title:'Quattro giorni a New York', wiki:'Manhattan',
    chips:['Cinque giornate, dall\u0027arrivo al volo di ritorno']}));
  var w=h('div','wrap');
  w.appendChild(searchBox());
  D.DAYS.forEach(function(d,i){
    var sec=h('section');
    var hd=h('div','dayhd');
    hd.appendChild(h('h2','sec', DAYNAME[i]+' · '+d.t));
    var editing = S.editDay===i;
    if(allStops(i).length){
      var eb=h('button','edbtn', editing ? 'Fatto' : 'Modifica'); eb.type='button';
      eb.addEventListener('click',function(){ S.editDay = editing ? -1 : i; render(); });
      hd.appendChild(eb);
    }
    sec.appendChild(hd);
    if(editing) sec.appendChild(editList(i));
    else dayStops(i).forEach(function(s){ sec.appendChild(stopCard(s.id, S.order[i] ? '' : s.t)); });
    if(!allStops(i).length) sec.appendChild(h('p','empty','Nessuna visita: giornata di arrivo.'));
    else if(!editing && !dayStops(i).length) sec.appendChild(h('p','empty','Avete tolto tutte le tappe di questo giorno.'));
    w.appendChild(sec);
  });
  frag.appendChild(w);
  return frag;
}

function editList(di){
  var box=h('div','edlist');
  var on=dayStops(di);
  on.forEach(function(s,k){
    var r=h('div','edrow');
    r.appendChild(h('span','n',PBY[s.id].n));
    [['\u2191',-1,'Sposta prima'],['\u2193',1,'Sposta dopo']].forEach(function(x){
      var b=h('button',null,x[0]); b.type='button'; b.setAttribute('aria-label',x[2]+': '+PBY[s.id].n);
      b.disabled = (x[1]<0 && k===0) || (x[1]>0 && k===on.length-1);
      b.addEventListener('click',function(){ moveStop(di, s.id, x[1]); });
      r.appendChild(b);
    });
    var del=h('button','del','\u2715'); del.type='button'; del.setAttribute('aria-label','Togli: '+PBY[s.id].n);
    del.addEventListener('click',function(){ toggleStop(s.id); });
    r.appendChild(del);
    box.appendChild(r);
  });
  allStops(di).filter(function(s){ return S.removed[s.id]; }).forEach(function(s){
    var r=h('div','edrow off');
    r.appendChild(h('span','n',PBY[s.id].n));
    var b=h('button','back','Rimetti'); b.type='button';
    b.addEventListener('click',function(){ toggleStop(s.id); });
    r.appendChild(b);
    box.appendChild(r);
  });
  if(dayEdited(di)){
    var rb=btn('Ripristina il programma di '+DAYNAME[di], null, 'ghost');
    rb.addEventListener('click',function(){ resetDay(di); });
    var row=h('div','btnrow'); row.appendChild(rb); box.appendChild(row);
  }
  return box;
}
function norm(s){ return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,''); }
function searchBox(){
  var box=h('div','search');
  var inp=document.createElement('input');
  inp.type='search'; inp.placeholder='Cerca una tappa'; inp.setAttribute('aria-label','Cerca una tappa per nome');
  inp.autocomplete='off';
  var res=h('div','sres');
  inp.addEventListener('input',function(){
    var q=norm(inp.value.trim()); res.innerHTML='';
    if(q.length<2) return;
    var hits=P.filter(function(p){ return norm(p.n).indexOf(q)>=0 || norm(p.addr).indexOf(q)>=0 || norm(p.meta).indexOf(q)>=0; });
    if(!hits.length){ res.appendChild(h('p','empty','Nessuna tappa con questo nome.')); return; }
    hits.forEach(function(p){
      var di=dayOf(p.id);
      res.appendChild(stopCard(p.id, di>=0 ? DAYNAME[di].toUpperCase() : 'FUORI PROGRAMMA'));
    });
  });
  box.appendChild(inp); box.appendChild(res);
  return box;
}

function vPosto(id){
  var p=PBY[id]; if(!p) return h('p','empty','Tappa non trovata.');
  var di=dayOf(id);
  var frag=document.createDocumentFragment();
  frag.appendChild(hero({ kick: di>=0 ? DAYNAME[di] : 'Fuori programma', title:p.n, wiki:p.wiki,
    chips:[p.when, p.meta] }));
  var w=h('div','wrap');
  if(p.intro) w.appendChild(h('p','lead',p.intro));

  var br=h('div','btnrow two');
  br.appendChild(btn('Indicazioni', gmaps(p), '', IC.dir));
  if(p.big) { var g=btn('Percorso guidato', null, 'ghost', IC.play);
    g.addEventListener('click',function(){ location.hash='#/posto/'+id+'/passo/0'; }); br.appendChild(g); }
  else br.appendChild(btn('Apple Maps', amaps(p), 'ghost'));
  w.appendChild(br);
  if(S.me) w.appendChild(h('p','credit','A '+fmtD(dist(S.me,p.ll))+' da dove siete'));

  var st=steps(p);
  var sec=h('section');
  sec.appendChild(h('h2','sec', p.big ? 'Le cose più belle, a grandi linee' : 'Cosa vedere qui'));
  var box=h('div','card'); var pad=h('div','pad');
  st.forEach(function(f,i){
    var row=h('div','hl');
    var ph=h('div','ph'); var im=document.createElement('img'); im.alt=''; im.loading='lazy';
    setImg(im, f.wiki||p.wiki, p.n); ph.appendChild(im); row.appendChild(ph);
    var bd=h('div');
    bd.appendChild(h('div','num', (i+1)+' di '+st.length));
    bd.appendChild(h('h3',null, shortTitle(f.t)));
    bd.appendChild(h('p',null, f.t));
    row.appendChild(bd);
    box.appendChild(row.parentNode?row:row);
    pad.appendChild(row);
  });
  box.appendChild(pad); sec.appendChild(box);
  if(p.big){
    var gg=btn('Vedile una per una, con i consigli', null, 'green', IC.play);
    gg.addEventListener('click',function(){ location.hash='#/posto/'+id+'/passo/0'; });
    var r2=h('div','btnrow'); r2.appendChild(gg); sec.appendChild(r2);
  }
  w.appendChild(sec);

  if(p.choice){
    var cs=h('section'); cs.appendChild(h('h2','sec','Una scelta da fare'));
    cs.appendChild(h('p','lead',p.choice.q));
    p.choice.opts.forEach(function(o){
      var b=h('button','opt'+(branch(id)===o.k?' on':'')); b.type='button';
      b.appendChild(h('h3',null,o.t));
      b.appendChild(h('p',null,o.s));
      b.addEventListener('click',function(){ S.choices[id]=o.k; save(); render(); });
      cs.appendChild(b);
    });
    w.appendChild(cs);
  }

  var ks=h('section'); ks.appendChild(h('h2','sec','Con i bambini'));
  var kid = st.filter(function(f){return f.kid;}).slice(0,2);
  kid.forEach(function(f){ ks.appendChild(noteBox('kid','Da fare qui', f.kid)); });
  (p.miss||[]).forEach(function(mid){ if(MBY[mid]) ks.appendChild(huntRow(MBY[mid])); });
  w.appendChild(ks);

  if(p.tips && p.tips.length){
    var ts=h('section'); ts.appendChild(h('h2','sec','Consigli per la visita'));
    p.tips.forEach(function(t,i){ ts.appendChild(noteBox('tip','Consiglio '+(i+1), t)); });
    w.appendChild(ts);
  }

  if(p.eat && p.eat.length){
    var es=h('section'); es.appendChild(h('h2','sec','Dove mangiare qui'));
    p.eat.forEach(function(e){ es.appendChild(eatCard(e)); });
    w.appendChild(es);
  }
  if(p.snack && p.snack.length){
    var ss=h('section'); ss.appendChild(h('h2','sec','Da assaggiare'));
    p.snack.forEach(function(x){ ss.appendChild(noteBox('info', x[0], x[1]+(x[2]?' ('+x[2]+')':''))); });
    w.appendChild(ss);
  }
  if(p.also && p.also.length){
    var as=h('section'); as.appendChild(h('h2','sec','Qui intorno'));
    p.also.forEach(function(x){ var c=h('div','card'); var pd=h('div','pad');
      pd.appendChild(h('h3',null,x[0])); pd.appendChild(h('p',null,x[1])); c.appendChild(pd); as.appendChild(c); });
    w.appendChild(as);
  }
  if(p.did) w.appendChild(noteBox('did','Lo sapevi', p.did));
  var home=dayHome(id);
  if(home>=0){
    var tb=btn(S.removed[id] ? 'Rimetti nel programma di '+DAYNAME[home] : 'Togli dal programma', null, 'ghost');
    tb.addEventListener('click',function(){ toggleStop(id); });
    var tr=h('div','btnrow'); tr.appendChild(tb); w.appendChild(tr);
  }

  var nid=neighbour(id,1);
  if(nid){
    var ns=h('section'); ns.appendChild(h('h2','sec','La tappa dopo'));
    ns.appendChild(stopCard(nid,''));
    var lg=legSteps(id,nid);
    if(lg.length){
      var c2=h('div','card'); var pd2=h('div','pad');
      var ol=document.createElement('ol'); ol.style.margin='0'; ol.style.paddingLeft='1.1em';
      lg.forEach(function(t){ var li=h('li',null,t); li.style.marginBottom='7px'; li.style.fontSize='.9rem'; li.style.color='var(--ink2)'; ol.appendChild(li); });
      pd2.appendChild(ol); c2.appendChild(pd2); ns.appendChild(c2);
    }
    var r3=h('div','btnrow'); r3.appendChild(btn('Portami alla tappa dopo', gmaps(PBY[nid]), '', IC.dir)); ns.appendChild(r3);
    w.appendChild(ns);
  }
  frag.appendChild(w);
  return frag;
}
function eatCard(e){
  var b=h('button','eat'); b.type='button';
  b.appendChild(h('h3',null,e[0]));
  var m=h('div','m');
  if(e[1]) m.appendChild(h('span','chip d',e[1]));
  m.appendChild(h('span','chip o',e[2]));
  b.appendChild(m);
  var why=e[4] ? e[4].replace(/^Perch[eé]:\s*/i,'') : e[3];
  if(why) b.appendChild(h('p',null,why));
  b.addEventListener('click',function(){ openSheet(e); });
  return b;
}
function openSheet(e){
  var b=document.getElementById('sheetbody'); b.innerHTML='';
  b.appendChild(h('h1',null,e[0]));
  var m=h('div','chips'); m.style.marginTop='10px';
  if(e[1]) m.appendChild(h('span','chip d',e[1]));
  m.appendChild(h('span','chip o',e[2]));
  b.appendChild(m);
  if(e[4]) b.appendChild(noteBox('info','Perché andarci', e[4].replace(/^Perch[eé]:\s*/i,'')));
  if(e[5]) b.appendChild(noteBox('did','Cosa ordinare', e[5].replace(/^Da prendere:\s*/i,'')));
  b.appendChild(h('p','lead', e[3]));
  if(e[6]) b.appendChild(noteBox('tip','Cosa ne dicono', e[6]));
  if(e[7]) b.appendChild(h('p','credit', e[7]));
  var q=e[7] ? e[0]+', '+e[7] : e[0];
  var r=h('div','btnrow two');
  r.appendChild(btn('Recensioni', gsearch(q), 'ghost'));
  r.appendChild(btn('Portami lì', gsearch(q), '', IC.dir));
  b.appendChild(r);
  document.getElementById('sheet').hidden=false;
}

function vPasso(id, idx){
  var p=PBY[id]; if(!p) return h('p','empty','Tappa non trovata.');
  var st=steps(p); idx=Math.max(0,Math.min(idx, st.length-1));
  var f=st[idx];
  var frag=document.createDocumentFragment();
  var bar=h('div','stepbar');
  st.forEach(function(_,i){ bar.appendChild(h('i', i<=idx?'on':'')); });
  frag.appendChild(bar);
  frag.appendChild(hero({ kick:p.n+' · passo '+(idx+1)+' di '+st.length,
    title: shortTitle(f.t), wiki: f.wiki||p.wiki, chips:[] }));
  var w=h('div','wrap step');
  w.appendChild(h('p','lead', f.t));
  if(f.hint) w.appendChild(noteBox('tip','Consiglio', f.hint));
  if(f.kid)  w.appendChild(noteBox('kid','Per Maya e Gabriele', f.kid));
  if(idx===st.length-1){
    (p.miss||[]).forEach(function(mid){ if(MBY[mid]) w.appendChild(huntRow(MBY[mid])); });
    var r=h('div','btnrow'); 
    var b=btn('Torna alla pagina di '+p.n, null, 'ghost');
    b.addEventListener('click',function(){ location.hash='#/posto/'+id; });
    r.appendChild(b); w.appendChild(r);
  }
  frag.appendChild(w);
  var nav=h('div','stepnav');
  var prev=raw('button',null,'<svg viewBox="0 0 24 24" width="20" height="20"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>');
  prev.type='button'; prev.disabled = idx===0;
  prev.addEventListener('click',function(){ location.hash='#/posto/'+id+'/passo/'+(idx-1); });
  var mid=h('button','mid', idx<st.length-1 ? 'Avanti' : 'Fine, torna alla pagina');
  mid.type='button';
  mid.addEventListener('click',function(){
    if(idx<st.length-1) location.hash='#/posto/'+id+'/passo/'+(idx+1);
    else location.hash='#/posto/'+id;
  });
  var next=raw('button',null,'<svg viewBox="0 0 24 24" width="20" height="20"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>');
  next.type='button'; next.disabled = idx>=st.length-1;
  next.addEventListener('click',function(){ location.hash='#/posto/'+id+'/passo/'+(idx+1); });
  nav.appendChild(prev); nav.appendChild(mid); nav.appendChild(next);
  frag.appendChild(nav);
  return frag;
}

var map=null, markers=[], meMarker=null;
function vMappa(){
  var frag=document.createDocumentFragment();
  var box=h('div'); box.style.position='relative';
  var m=h('div'); m.id='map'; box.appendChild(m);
  var bts=h('div','mapbtns');
  var loc=raw('button',null,'<svg viewBox="0 0 24 24" width="20" height="20"><circle cx="12" cy="12" r="3.2" fill="currentColor"/><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 1v3M12 20v3M1 12h3M20 12h3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>');
  loc.type='button'; loc.addEventListener('click',function(){ locate(true); });
  bts.appendChild(loc);
  box.appendChild(bts);
  frag.appendChild(box);
  setTimeout(initMap, 30);
  return frag;
}
function initMap(){
  var el=document.getElementById('map'); if(!el) return;
  if(typeof L==='undefined'){ el.innerHTML='<p class="empty">La mappa non si è caricata. Le tessere arrivano da OpenStreetMap: serve la rete la prima volta.</p>'; return; }
  map = L.map(el,{zoomControl:false}).setView([40.745,-73.99],12.4);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
    maxZoom:19, attribution:'&copy; OpenStreetMap'}).addTo(map);
  L.control.zoom({position:'bottomright'}).addTo(map);
  markers=[];
  P.forEach(function(p){
    if(S.removed[p.id]) return;
    var di=dayOf(p.id); var col=DCOL[di>=0?di:0];
    var ic=L.divIcon({className:'', iconSize:[26,26], iconAnchor:[13,13],
      html:'<div style="width:26px;height:26px;border-radius:50%;background:'+col+';border:2.5px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35)"></div>'});
    var mk=L.marker(p.ll,{icon:ic}).addTo(map);
    mk.bindPopup('<div class="mpop"><b>'+esc(p.n)+'</b><span>'+esc(p.when)+' &middot; '+esc(p.meta)+'</span>'
      +'<div class="mb"><a class="g" href="#/posto/'+p.id+'">Scheda</a>'
      +'<a href="'+gmaps(p)+'" target="_blank" rel="noopener">Portami</a></div></div>');
    markers.push(mk);
  });
  var hi=L.divIcon({className:'',iconSize:[18,18],iconAnchor:[9,9],
    html:'<div style="width:18px;height:18px;background:#14171c;border:2.5px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.4)"></div>'});
  L.marker(HOTEL.ll,{icon:hi}).addTo(map).bindPopup('<div class="mpop"><b>'+esc(HOTEL.n)+'</b><span>'+esc(HOTEL.addr)+'</span></div>');
  var g=L.featureGroup(markers.concat([L.marker(HOTEL.ll)]));
  map.fitBounds(g.getBounds().pad(0.12));
  if(S.me) drawMe();
}
function drawMe(){
  if(!map||!S.me) return;
  if(meMarker) map.removeLayer(meMarker);
  var ic=L.divIcon({className:'',iconSize:[20,20],iconAnchor:[10,10],
    html:'<div style="width:20px;height:20px;border-radius:50%;background:#1d5fa8;border:3px solid #fff;box-shadow:0 0 0 7px rgba(29,95,168,.22)"></div>'});
  meMarker=L.marker(S.me,{icon:ic,zIndexOffset:900}).addTo(map);
}

/* FOOD rows are [nome, indirizzo, prezzo, descrizione, recensioni]; the stop pages hold the same places with perché and cosa ordinare. */
var EATBY = {};
P.forEach(function(p){ (p.eat||[]).forEach(function(e){ if(!EATBY[e[0]]) EATBY[e[0]]=e; }); });
function foodEntry(r){
  var e=EATBY[r[0]];
  return [r[0], e?e[1]:'', r[2], r[3], e?e[4]:null, e?e[5]:null, r[4], r[1]];
}
function vCibo(){
  var frag=document.createDocumentFragment();
  frag.appendChild(hero({kick:'Dove mangiare', title:'Trentasei posti, divisi per occasione', wiki:'Pizza', chips:['Per occasione']}));
  var w=h('div','wrap');
  D.FOOD.forEach(function(sec){
    var s=h('section');
    s.appendChild(h('h2','sec',sec.t));
    s.appendChild(h('p','lead',sec.s));
    sec.it.forEach(function(r){ s.appendChild(eatCard(foodEntry(r))); });
    w.appendChild(s);
  });
  frag.appendChild(w);
  return frag;
}

function vGioco(){
  var sm=0,sg=0;
  D.HUNT.concat(D.MISS).forEach(function(r){ var c=S.claims[r[0]]; if(c==='m') sm+=r[2]; else if(c==='g') sg+=r[2]; });
  var frag=document.createDocumentFragment();
  frag.appendChild(hero({kick:'La sfida', title:'Maya contro Gabriele', wiki:'Yellow cab', chips:['Per tutta la vacanza']}));
  var w=h('div','wrap');
  var sc=h('div','score');
  var a=h('div','pl m'); a.appendChild(h('div','n','Maya')); a.appendChild(h('div','v',String(sm))); sc.appendChild(a);
  var b=h('div','pl g'); b.appendChild(h('div','n','Gabriele')); b.appendChild(h('div','v',String(sg))); sc.appendChild(b);
  w.appendChild(sc);
  w.appendChild(noteBox('info','Come funziona',"Chi vede per primo dice il nome e prende i punti. Un genitore conferma toccando M o G. Ogni cosa vale una volta sola per tutta la vacanza. Chi vince sceglie la cena dell'ultima sera e un ricordo da portare a casa."));
  var s1=h('section'); s1.appendChild(h('h2','sec','Missioni, una per tappa'));
  D.MISS.forEach(function(m){ s1.appendChild(huntRow(m)); });
  w.appendChild(s1);
  var s2=h('section'); s2.appendChild(h('h2','sec','Caccia al tesoro'));
  D.HUNT.forEach(function(x){ s2.appendChild(huntRow(x)); });
  w.appendChild(s2);
  frag.appendChild(w);
  return frag;
}

/* ===================== ROUTER ===================== */
function parse(){
  var x=(location.hash||'#/oggi').replace(/^#\/?/,'').split('/').filter(Boolean);
  return x.length?x:['oggi'];
}
function render(){
  var r=parse(), f, tab=r[0], title='';
  if(r[0]==='posto' && r[2]==='passo'){ f=vPasso(r[1], parseInt(r[3]||'0',10)); title=PBY[r[1]]?PBY[r[1]].n:''; tab=''; }
  else if(r[0]==='posto'){ f=vPosto(r[1]); title=PBY[r[1]]?PBY[r[1]].n:''; tab=''; }
  else if(r[0]==='giorni'){ f=vGiorni(); title='I quattro giorni'; }
  else if(r[0]==='mappa'){ f=vMappa(); title='Mappa'; }
  else if(r[0]==='cibo'){ f=vCibo(); title='Dove mangiare'; }
  else if(r[0]==='gioco'){ f=vGioco(); title='Il gioco'; }
  else { f=vOggi(); title='Oggi'; }
  view.innerHTML=''; view.appendChild(f);
  document.getElementById('topttl').textContent=title;
  document.getElementById('back').hidden = (r[0]!=='posto');
  var tabs=document.querySelectorAll('#tabs a');
  for(var i=0;i<tabs.length;i++) tabs[i].classList.toggle('on', tabs[i].dataset.t===tab);
  window.scrollTo(0,0);
}
window.addEventListener('hashchange', render);
document.getElementById('back').addEventListener('click',function(){
  var r=parse();
  if(r[0]==='posto' && r[2]==='passo') location.hash='#/posto/'+r[1];
  else if(history.length>1) history.back();
  else location.hash='#/oggi';
});
document.getElementById('sheetclose').addEventListener('click',function(){ document.getElementById('sheet').hidden=true; });
document.getElementById('sheet').addEventListener('click',function(e){ if(e.target.id==='sheet') e.currentTarget.hidden=true; });
document.getElementById('askbtn').addEventListener('click',function(){
  var b=document.getElementById('sheetbody'); b.innerHTML='';
  b.appendChild(h('h1',null,'Chiedere un consiglio'));
  b.appendChild(h('p','lead','Le domande le fate a Claude nella conversazione del viaggio: ha in testa tutto il programma e vi risponde su meteo, tagli, orari e alternative.'));
  var r=h('div','btnrow');
  r.appendChild(btn('Apri la chat del viaggio','https://claude.ai/artifact/X3HH2HWE2yLtsesXn4Fd5e','',IC.chat));
  b.appendChild(r);
  b.appendChild(noteBox('info','Senza rete','Le schede, la metro, i consigli e il gioco funzionano anche offline. La mappa ha bisogno della rete la prima volta che aprite una zona nuova.'));
  document.getElementById('sheet').hidden=false;
});
window.addEventListener('scroll',function(){
  var t=document.getElementById('topbar'), s=window.scrollY>40;
  t.classList.toggle('solid',s);
  document.getElementById('topttl').classList.toggle('show',s);
});

/* ---------- posizione ---------- */
function locate(center){
  if(!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(function(pos){
    S.me=[pos.coords.latitude,pos.coords.longitude];
    try{ localStorage.setItem('ny2_geo','1'); }catch(e){}
    drawMe();
    if(center && map) map.setView(S.me,15);
    if(!center){
      var n=nearest();
      if(n && n.d<700 && location.hash.indexOf('/posto/')<0) location.hash='#/posto/'+n.p.id;
      else render();
    }
  },function(){},{enableHighAccuracy:true,timeout:12000,maximumAge:60000});
}
navigator.geolocation && navigator.permissions && navigator.permissions.query ?
  navigator.permissions.query({name:'geolocation'}).then(function(st){
    if(st.state==='granted') locate(false);
  }).catch(function(){}) : null;

if('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(function(){});
render();
})();
