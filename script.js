(() => {
  const cv = document.getElementById('fire'), ctx = cv.getContext('2d');
  const furnace = document.getElementById('furnace');
  const countEl = document.getElementById('count'), bless = document.getElementById('blessing');
  let W, H, parts = [], burning = [], count = +(localStorage.getItem('cjp-count') || 0), heat = 0;
  countEl.textContent = count;
  const BLESS = ['招財進寶','萬事如意','平安喜樂','財源廣進','心想事成','步步高升','闔家安康','好運連連','升級不當機','Bug 全消','年年有餘','貴人相助','程式一次就過','福氣滿滿','歐氣爆棚'];
  const COLORS = {金紙:['#ffd84a','#7a5200'],銀紙:['#e0f0ff','#556'],往生錢:['#ff8acb','#5a0030'],自訂:['#9ff','#004a55']};
  function resize(){const r=cv.getBoundingClientRect(),d=devicePixelRatio||1;W=r.width;H=r.height;cv.width=W*d;cv.height=H*d;ctx.setTransform(d,0,0,d,0,0)}
  addEventListener('resize',resize);resize();
  function spawn(type,x,y,n){for(let i=0;i<n;i++){
    if(type==='fire')parts.push({t:'f',x:x+(Math.random()-.5)*W*.5,y,vx:(Math.random()-.5)*.6,vy:-1-Math.random()*2.2,l:1,s:12+Math.random()*20});
    else if(type==='ember')parts.push({t:'e',x,y,vx:(Math.random()-.5)*5,vy:-2-Math.random()*5,l:1,s:1+Math.random()*2.5});
    else parts.push({t:'a',x,y,vx:(Math.random()-.5)*1.5,vy:-.5-Math.random(),l:1,s:2+Math.random()*3});}}
  function drawPaper(b){const p=b.p,[c1,c2]=COLORS[b.type]||COLORS['自訂'];ctx.save();ctx.translate(b.x,b.y);ctx.rotate(b.r);
    const w=70,h=50,curl=p*0.9;ctx.globalAlpha=1-p*.9;
    ctx.beginPath();ctx.moveTo(-w/2,-h/2+curl*20);ctx.quadraticCurveTo(0,-h/2-curl*30,w/2,-h/2+curl*25);ctx.lineTo(w/2*(1-curl*.5),h/2*(1-curl*.6));ctx.quadraticCurveTo(0,h/2+curl*10,-w/2*(1-curl*.4),h/2*(1-curl*.5));ctx.closePath();
    const g=ctx.createLinearGradient(-w/2,-h/2,w/2,h/2);g.addColorStop(0,p>.5?'#222':c1);g.addColorStop(Math.min(1,p*1.4),'#1a0a00');g.addColorStop(1,c2);ctx.fillStyle=g;ctx.fill();
    ctx.strokeStyle=`rgba(255,${120+100*(1-p)|0},0,${.9-p*.5})`;ctx.lineWidth=2;ctx.shadowColor='#ff8800';ctx.shadowBlur=15;ctx.stroke();
    ctx.shadowBlur=0;ctx.fillStyle='rgba(60,20,0,.8)';ctx.font='bold 14px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(b.label,0,0);ctx.restore()}
  function loop(){ctx.globalCompositeOperation='source-over';ctx.fillStyle='rgba(13,4,24,.35)';ctx.fillRect(0,0,W,H);
    heat*=.985;spawn('fire',W/2,H-30,4+Math.round(heat*8));
    for(const b of burning){b.p+=.008;b.y+=.15;b.r+=.004;spawn('ember',b.x+(Math.random()-.5)*60,b.y,1);if(Math.random()<.3)spawn('ash',b.x,b.y,1);drawPaper(b)}
    burning=burning.filter(b=>b.p<1);
    ctx.globalCompositeOperation='lighter';
    for(const q of parts){q.x+=q.vx;q.y+=q.vy;
      if(q.t==='f'){q.l-=.012;q.s*=.985;const g=ctx.createRadialGradient(q.x,q.y,0,q.x,q.y,q.s);const hue=q.l>.6?50:q.l>.3?25:320;g.addColorStop(0,`hsla(${hue},100%,65%,${q.l*.8})`);g.addColorStop(1,'hsla(300,100%,50%,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(q.x,q.y,q.s,0,7);ctx.fill()}
      else if(q.t==='e'){q.vy+=.04;q.l-=.012;ctx.fillStyle=`rgba(255,${180*q.l|0},40,${q.l})`;ctx.fillRect(q.x,q.y,q.s,q.s)}
      else{q.l-=.006;q.vx+=(Math.random()-.5)*.1;ctx.globalCompositeOperation='source-over';ctx.fillStyle=`rgba(140,140,150,${q.l*.6})`;ctx.fillRect(q.x,q.y,q.s,q.s);ctx.globalCompositeOperation='lighter'}}
    parts=parts.filter(q=>q.l>0&&q.y>-20);if(parts.length>900)parts.splice(0,parts.length-900);
    requestAnimationFrame(loop)}
  loop();
  // audio
  let actx=null,soundOn=false;const sb=document.getElementById('sound');
  sb.onclick=()=>{soundOn=!soundOn;sb.textContent=soundOn?'🔊 音效：開':'🔇 音效：關';if(soundOn&&!actx){actx=new (window.AudioContext||window.webkitAudioContext)()}if(actx&&actx.state==='suspended')actx.resume()};
  function crackle(){if(!soundOn||!actx)return;const dur=2.5,buf=actx.createBuffer(1,actx.sampleRate*dur,actx.sampleRate),d=buf.getChannelData(0);
    for(let i=0;i<d.length;i++){const env=1-i/d.length;d[i]=(Math.random()<.002?(Math.random()*2-1):(Math.random()*2-1)*.04)*env}
    const s=actx.createBufferSource();s.buffer=buf;const f=actx.createBiquadFilter();f.type='highpass';f.frequency.value=800;const g=actx.createGain();g.gain.value=.8;s.connect(f).connect(g).connect(actx.destination);s.start()}
  function burn(type,label){const x=W/2+(Math.random()-.5)*W*.3;burning.push({type,label,x,y:H*.55,p:0,r:(Math.random()-.5)*.6});heat=Math.min(1.5,heat+.6);
    spawn('ember',x,H*.55,40);furnace.classList.add('hot');setTimeout(()=>furnace.classList.remove('hot'),900);crackle();
    count++;countEl.textContent=count;localStorage.setItem('cjp-count',count);
    bless.textContent='✨ '+BLESS[Math.random()*BLESS.length|0]+' ✨';bless.classList.remove('pop');void bless.offsetWidth;bless.classList.add('pop');
    if(navigator.vibrate)navigator.vibrate(30)}
  // custom
  const cp=document.getElementById('customPaper'),ct=document.getElementById('customText');
  document.getElementById('setCustom').onclick=()=>{const v=ct.value.trim()||'願望';cp.textContent=v;cp.dataset.label=v};
  // drag / click
  let selected=null;
  function inFurnace(x,y){const r=furnace.getBoundingClientRect();return x>r.left&&x<r.right&&y>r.top&&y<r.bottom}
  function fly(el){const a=el.getBoundingClientRect(),b=furnace.getBoundingClientRect();const f=el.cloneNode(true);f.className=el.className.replace('selected','')+' flying';
    Object.assign(f.style,{left:a.left+'px',top:a.top+'px'});document.body.appendChild(f);requestAnimationFrame(()=>{Object.assign(f.style,{left:(b.left+b.width/2-45)+'px',top:(b.top+b.height*.5)+'px',transform:'rotate(25deg) scale(.6)',opacity:'.3'})});
    setTimeout(()=>{f.remove();burn(el.dataset.type,el.dataset.label)},600)}
  document.querySelectorAll('.paper').forEach(el=>{let ghost=null,sx,sy,moved=false;
    el.addEventListener('pointerdown',e=>{e.preventDefault();el.setPointerCapture(e.pointerId);sx=e.clientX;sy=e.clientY;moved=false});
    el.addEventListener('pointermove',e=>{if(!el.hasPointerCapture(e.pointerId))return;if(!moved&&Math.hypot(e.clientX-sx,e.clientY-sy)>8){moved=true;ghost=el.cloneNode(true);ghost.className=el.className.replace('selected','')+' ghost';document.body.appendChild(ghost)}
      if(ghost){ghost.style.left=e.clientX+'px';ghost.style.top=e.clientY+'px';furnace.classList.toggle('hot',inFurnace(e.clientX,e.clientY))}});
    el.addEventListener('pointerup',e=>{if(ghost){ghost.remove();ghost=null;furnace.classList.remove('hot');if(inFurnace(e.clientX,e.clientY))burn(el.dataset.type,el.dataset.label)}
      else if(!moved){document.querySelectorAll('.paper').forEach(p=>p.classList.remove('selected'));el.classList.add('selected');selected=el;fly(el)}});
    el.addEventListener('pointercancel',()=>{if(ghost){ghost.remove();ghost=null}})});
  furnace.addEventListener('click',()=>{if(selected)fly(selected)});
})();
