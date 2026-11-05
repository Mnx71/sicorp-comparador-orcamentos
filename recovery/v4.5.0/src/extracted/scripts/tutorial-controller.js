(() => {
  'use strict';
  const get = id => document.getElementById(id);
  const card = get('tutorialCard'), resume = get('tutorialResumeBtn');
  const flow = globalThis.SicorpTutorialFlow;
  const spotlight = document.createElementNS('http://www.w3.org/2000/svg','svg');
  spotlight.classList.add('tutorial-spotlight'); spotlight.setAttribute('aria-hidden','true'); spotlight.setAttribute('hidden','');
  const shade = document.createElementNS(spotlight.namespaceURI,'path');
  shade.setAttribute('fill','rgba(15,23,42,.48)'); shade.setAttribute('fill-rule','evenodd');
  spotlight.append(shade); document.body.append(spotlight);
  let manualPosition=null, drag=null;
  function releaseLayout() { spotlight.setAttribute('hidden',''); manualPosition=null; drag=null; delete card.dataset.dragging; }
  const navigation=globalThis.SicorpTutorialNavigation.create();
  let active = false, paused = false, previous = null, step = null, sequence = [];
  let target = null, returnFocus = null, frame = 0, renderKey = '';
  let configuringBase = false;
  const visible = node => Boolean(node?.isConnected && node.getClientRects().length && getComputedStyle(node).visibility !== 'hidden');
  const focusedControl = node => node?.matches('button,input,select,a,[tabindex]') ? node : node?.querySelector('button,input,select,a,[tabindex]');
  function snapshot() {
    const s = globalThis.SicorpTutorialContext.read();
    s.dialog = [...document.querySelectorAll('dialog[open]')].at(-1)?.id || '';
    s.error = visible(get('errorBox')) && Boolean(get('errorBox').textContent);
    s.configuringBase = configuringBase;
    return s;
  }
  function reconcile(s) {
    if(!previous||s.busy)return;
    const changed=keys=>keys.some(k=>s[k]!==previous[k]);
    if(changed(['projectId','projectSheet'])){
      if(changed(['projectId'])&&navigation.current('page:1')?.id!=='project:upload')navigation.reset('page:1');
      navigation.reset('dialog:budgetAuditDialog');navigation.reset('page:2');navigation.reset('page:3');
      configuringBase=false;
    }
    if(changed(['auditId']))navigation.reset('dialog:budgetAuditDialog');
    if(changed(['reviewId','baseId','baseSheet']))navigation.reset('dialog:reviewDialog');
    if(changed(['bases'])){
      if(s.baseCount>previous.baseCount){configuringBase=false;navigation.goTo('page:2','base:list');}
      if(!s.baseCount)configuringBase=Boolean(s.baseId);
    }
  }
  function clearTarget() {
    if (target) target.classList.remove('tutorial-target');
    target = null;
  }
  function hostFor(s) { return s.dialog ? get(s.dialog) : document.body; }
  function restoreFocus() {
    const dialog = [...document.querySelectorAll('dialog[open]')].at(-1);
    const allowed = node => visible(node) && (!dialog || dialog.contains(node)) && !node.disabled;
    const candidates = [returnFocus, focusedControl(target), dialog?.querySelector('button:not([disabled])'), get('tutorialOpenBtn')];
    const candidate = candidates.find(allowed);
    candidate?.focus({preventScroll:true});
  }
  function revealTarget() {
    if(!target)return;
    const r=target.getBoundingClientRect(),vh=window.visualViewport?.height||innerHeight;
    const header=document.querySelector('body > header')?.getBoundingClientRect();
    const top=target.closest('dialog')?16:(header?.bottom||0)+16;
    // Keep an already usable view. Otherwise issue just one native smooth
    // scroll; successive frames keep the spotlight attached to its target.
    if(r.top>=top&&r.bottom<=vh-12&&Math.max(r.top-28,vh-r.bottom-28)>=Math.min(240,vh*.35))return;
    target.scrollIntoView({block:'start',inline:'nearest',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
  }
  function targetRect() {
    if (!target) return null;
    const r=target.getBoundingClientRect(),v=window.visualViewport;
    const clip={left:v?.offsetLeft||0,top:v?.offsetTop||0,right:(v?.offsetLeft||0)+(v?.width||document.documentElement.clientWidth),bottom:(v?.offsetTop||0)+(v?.height||innerHeight)};
    for(let parent=target.parentElement;parent&&parent!==document.body;parent=parent.parentElement){
      const style=getComputedStyle(parent),b=parent.getBoundingClientRect();
      if(/auto|scroll|hidden|clip/.test(style.overflowX)){clip.left=Math.max(clip.left,b.left);clip.right=Math.min(clip.right,b.right);}
      if(/auto|scroll|hidden|clip/.test(style.overflowY)){clip.top=Math.max(clip.top,b.top);clip.bottom=Math.min(clip.bottom,b.bottom);}
    }
    const left=Math.max(r.left,clip.left),right=Math.min(r.right,clip.right),top=Math.max(r.top,clip.top),bottom=Math.min(r.bottom,clip.bottom);
    return right>left&&bottom>top?{left,right,top,bottom}:null;
  }
  function resolveTarget(candidate) {
    if(!candidate)return null;
    if(step?.group)return candidate;
    // Large containers can fill a short screen. Guide the first meaningful
    // control instead, leaving room for the explanation without hiding it.
    if(candidate.matches('dialog') || candidate.getBoundingClientRect().height>innerHeight*.55){
      const children=candidate.querySelectorAll('h2,h3,button,label,input,select,[data-summary-status]');
      return [...children].find(node=>visible(node)&&node.getBoundingClientRect().height<=innerHeight*.5)||candidate;
    }
    return candidate;
  }
  function place() {
    if (!active || card.hidden) return;
    const viewport=window.visualViewport,ox=viewport?.offsetLeft||0,oy=viewport?.offsetTop||0;
    const vw=viewport?.width||document.documentElement.clientWidth, vh=viewport?.height||innerHeight;
    const scale=card.getBoundingClientRect().width/card.offsetWidth || 1;
    card.style.width=`${Math.min(300,(vw-24)/scale)}px`;
    const limit=manualPosition?Math.min(parseFloat(card.style.maxHeight)||420/scale,(vh-24)/scale):Math.min(420,vh-24)/scale;
    const rect=targetRect(),relative=r=>({left:r.left-ox,right:r.right-ox,top:r.top-oy,bottom:r.bottom-oy});
    const r=rect?relative(rect):null;
    const surface=relative((target?.closest('dialog')||document.querySelector('main')).getBoundingClientRect());
    const size=card.getBoundingClientRect(),scroll=get('tutorialScroll'),style=getComputedStyle(card);
    const chrome=card.querySelector('.tutorial-toolbar').offsetHeight+card.querySelector('.tutorial-actions').offsetHeight+parseFloat(style.borderTopWidth)+parseFloat(style.borderBottomWidth);
    const naturalHeight=(chrome+scroll.scrollHeight)*scale;
    const position=globalThis.SicorpTutorialPlacement.place({width:vw,height:vh,cardWidth:size.width,cardHeight:Math.min(naturalHeight,limit*scale),target:r,surface});
    // Measure the inner content instead of expanding the live card: temporary
    // expansion clamps scrollTop to zero when the text momentarily fits.
    const maxHeight=manualPosition?limit:Math.max(1,Math.min(420/scale,(vh-24)/scale,position.maxHeight/scale));
    if(card.style.maxHeight!==`${maxHeight}px`)card.style.maxHeight=`${maxHeight}px`;
    const measured=card.getBoundingClientRect();
    const chosen=manualPosition?globalThis.SicorpTutorialPlacement.manual({...manualPosition,width:vw,height:vh,cardWidth:measured.width,cardHeight:measured.height}):position;
    card.style.left=`${(chosen.x+ox)/scale}px`;card.style.top=`${(chosen.y+oy)/scale}px`;
    target?.classList.toggle('tutorial-target',Boolean(r));
    spotlight.toggleAttribute('hidden',!r);
    if(!r)return;
    spotlight.setAttribute('viewBox',`0 0 ${vw} ${vh}`);
    spotlight.style.left=`${ox/scale}px`;spotlight.style.top=`${oy/scale}px`;
    spotlight.style.width=`${vw/scale}px`;spotlight.style.height=`${vh/scale}px`;
    const x=Math.max(0,r.left-6),y=Math.max(0,r.top-6),right=Math.min(vw,r.right+6),bottom=Math.min(vh,r.bottom+6),k=Math.min(8,(right-x)/2,(bottom-y)/2);
    shade.setAttribute('d',`M0 0H${vw}V${vh}H0Z M${x+k} ${y}H${right-k}Q${right} ${y} ${right} ${y+k}V${bottom-k}Q${right} ${bottom} ${right-k} ${bottom}H${x+k}Q${x} ${bottom} ${x} ${bottom-k}V${y+k}Q${x} ${y} ${x+k} ${y}Z`);
  }
  function update({reveal=false, focus=false} = {}) {
    frame = 0;
    const s = snapshot();
    reconcile(s);
    if (!s.busy) previous = s;
    if (!active) {
      if (paused) { const host=hostFor(s); if (resume.parentElement!==host) host.append(resume); }
      return;
    }
    sequence = flow.steps({...s,configuringBase});
    const route=s.busy?'wait':s.dialog?'dialog:'+s.dialog:s.error?'error':'page:'+s.page;
    step=navigation.sync(sequence,route);
    const host = hostFor(s);
    if (card.parentElement !== host) host.append(card);
    if (spotlight.parentElement !== host) host.append(spotlight);
    const candidate = document.querySelector(step.target);
    const nextTarget = visible(candidate) && (!s.dialog || host.contains(candidate)) ? resolveTarget(candidate) : null;
    const targetChanged = nextTarget !== target;
    if (targetChanged) {
      manualPosition=null; drag=null; delete card.dataset.dragging;
      clearTarget(); target = nextTarget;
      target?.classList.add('tutorial-target');
    }
    const key = JSON.stringify([step,Boolean(target)]);
    if (key !== renderKey) {
      if(card.dataset.step!==step.id) manualPosition=null;
      renderKey = key;
      const stepChanged=card.dataset.step!==step.id;
      if(stepChanged)get('tutorialScroll').scrollTop=0;
      card.dataset.step = step.id;
      get('tutorialHeading').textContent = step.title;
      get('tutorialText').textContent = step.text;
      get('tutorialCondition').textContent = !target ? 'O alvo não está visível. Role a tela ou pause o tutorial para continuar; seu trabalho permanece na sessão.' : step.mode==='finish' ? 'A exportação depende da sua escolha.' : step.ready ? 'Confira e avance quando estiver pronto.' : 'Aguardando a ação no programa. Você pode pausar a qualquer momento.';
      get('tutorialNextBtn').disabled = !step.ready;
      get('tutorialNextBtn').textContent = step.mode==='finish' ? 'Concluir tutorial' : step.mode==='optional' ? 'Pular orientação' : 'Próximo';
      get('tutorialPreviousBtn').disabled = sequence.indexOf(step) <= 0;
      if(stepChanged&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
        const copy=card.querySelector('[aria-live]');
        for(const animation of copy.getAnimations())animation.cancel();
        copy.animate([{opacity:.3},{opacity:1}],{duration:220,easing:'ease-out'});
      }
    }
    card.hidden = false; resume.hidden = true;
    if (reveal || (targetChanged && !s.busy)) revealTarget();
    place();
    if (focus) get('tutorialHeading').focus({preventScroll:true});
    get('tutorialOpenBtn').textContent = 'Tutorial em andamento';
  }
  function schedule() { if (!frame) frame=requestAnimationFrame(()=>update()); }
  function start({restart=true}={}) {
    returnFocus=document.activeElement;
    const s=snapshot();
    configuringBase=configuringBase||(s.page===2&&!s.baseCount&&Boolean(s.baseId));
    if(restart)navigation.clear();
    active=true;paused=false;update({reveal:true,focus:true});
  }
  function stop(pause=false) {
    restoreFocus(); clearTarget();
    active=false; paused=pause; card.hidden=true; releaseLayout();
    resume.hidden=!pause;
    get('tutorialOpenBtn').textContent='Tutorial';
    if (pause) { const host=hostFor(snapshot()); host.append(resume); }
  }
  const handle=get('tutorialDragHandle');
  handle.addEventListener('pointerdown',e=>{
    if(!active||!e.isPrimary||e.button!==0)return;
    const r=card.getBoundingClientRect(),v=window.visualViewport;
    drag={id:e.pointerId,x:e.clientX,y:e.clientY,left:r.left-(v?.offsetLeft||0),top:r.top-(v?.offsetTop||0)};
    manualPosition={x:drag.left,y:drag.top};card.dataset.dragging='';
    handle.setPointerCapture(e.pointerId);handle.focus({preventScroll:true});e.preventDefault();
  });
  handle.addEventListener('pointermove',e=>{
    if(!drag||drag.id!==e.pointerId)return;
    manualPosition={x:drag.left+e.clientX-drag.x,y:drag.top+e.clientY-drag.y};place();
  });
  const endDrag=()=>{drag=null;delete card.dataset.dragging;};
  for(const name of ['pointerup','pointercancel','lostpointercapture'])handle.addEventListener(name,endDrag);
  handle.addEventListener('keydown',e=>{
    const direction={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];
    if(!direction)return;
    const r=card.getBoundingClientRect(),v=window.visualViewport,n=e.shiftKey?40:16;
    manualPosition={x:r.left-(v?.offsetLeft||0)+direction[0]*n,y:r.top-(v?.offsetTop||0)+direction[1]*n};place();e.preventDefault();
  });
  get('tutorialOpenBtn').addEventListener('click',()=>start());
  resume.addEventListener('click',()=>start({restart:false}));
  get('tutorialPauseBtn').addEventListener('click',()=>stop(true));
  get('tutorialCloseBtn').addEventListener('click',()=>stop());
  get('tutorialNextBtn').addEventListener('click',()=>{
    // Re-read the state even if an input event and click share the same frame.
    update();
    if (!step.ready) return;
    if (step.mode==='finish') { stop(); return; }
    navigation.next();update({reveal:true,focus:true});
  });
  get('tutorialPreviousBtn').addEventListener('click',()=>{
    update();
    if(navigation.previous())update({reveal:true,focus:true});
  });
  document.addEventListener('keydown',e=>{
    if (active && e.key==='Escape') {e.preventDefault();e.stopImmediatePropagation();stop();}
  },true);
  document.addEventListener('focusin',e=>{
    if (!card.contains(e.target) && e.target!==resume) returnFocus=e.target;
  });
  function onApplicationEvent(e) {
    if (card.contains(e.target) || e.target===resume) return;
    if (e.type==='change' || e.type==='drop' || e.type==='click') {
      if (e.target.closest('#baseFile,#baseDropzone,#baseSheet,#baseHeaderRow,#baseSourceIdentifier,#baseMappingFieldPool,#basePreviewTable,#baseClearMappingBtn,#baseAutoMapBtn')) configuringBase=true;
    }
    schedule();
  }
  for (const name of ['input','change','click','drop','keyup','close']) document.addEventListener(name,onApplicationEvent,true);
  const observer=new MutationObserver(records=>{
    if (records.some(r=>!card.contains(r.target) && !spotlight.contains(r.target) && r.target!==resume &&
      !(r.type==='attributes' && r.attributeName==='class' && (r.oldValue||'').replace(/\s*tutorial-target/g,'')===String(r.target.getAttribute('class')||'').replace(/\s*tutorial-target/g,'')))) schedule();
  });
  observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeOldValue:true,attributeFilter:['class','style','open','disabled','aria-busy']});
  window.addEventListener('resize',()=>update({reveal:true}));
  window.visualViewport?.addEventListener('resize',place);
  window.visualViewport?.addEventListener('scroll',place);
  document.addEventListener('scroll',e=>{if(!card.contains(e.target))place();},true);
  previous=snapshot();
  globalThis.SicorpTutorialWelcome.install({dialog:get('welcomeDialog'),startButton:get('welcomeStartBtn'),skipButton:get('welcomeSkipBtn'),hideButton:get('welcomeHideBtn'),onStart:()=>start()});
})();
