gsap.registerPlugin(ScrollTrigger);

/* ===================================================================
   1. PRELOAD FRAME SEQUENCE
   =================================================================== */
const TOTAL_FRAMES = 11;
const TOTAL_BEATS   = 7; // 00 assembled ... 06 reassembled
const framePath = (i) => `assets/frames/frame_${String(i).padStart(2,'0')}.jpg`;

let loadedCount = 0;

function preloadFrames(onDone){
  for(let i = 1; i <= TOTAL_FRAMES; i++){
    const img = new Image();
    img.src = framePath(i);
    img.onload = settle;
    img.onerror = settle;
  }
  function settle(){
    loadedCount++;
    if(loadedCount === TOTAL_FRAMES) onDone();
  }
}

/* ===================================================================
   2. WIRE UP ONCE LOADED
   =================================================================== */
preloadFrames(init);

function init(){
  const seqImg    = document.getElementById('seqImg');
  const layerNum  = document.getElementById('layerNum');
  const railFill  = document.getElementById('railFill');
  const railDot   = document.getElementById('railDot');
  const scrubHint = document.getElementById('scrubHint');
  const spacer    = document.getElementById('scrollSpacer');
  const dotsWrap  = document.getElementById('beatDots');
  const beats     = gsap.utils.toArray('.beat');

  /* -------------------------------------------------------------
     Master scroll-driven trigger is created first so dot-nav
     clicks (defined below) can read its start/end pixel bounds.
  --------------------------------------------------------------*/
  let masterST; // assigned below

  function goToProgress(p){
    const y = masterST.start + (masterST.end - masterST.start) * p;
    window.scrollTo({ top: y, behavior: 'smooth' });
  }

  /* -------------------------------------------------------------
     Build dot navigation, one per beat, click jumps to that
     section's scroll position.
  --------------------------------------------------------------*/
  beats.forEach((beat, i) => {
    const dot = document.createElement('button');
    dot.className = 'beat-dot';
    dot.setAttribute('aria-label', 'Jump to section ' + (i + 1));
    dot.addEventListener('click', () => {
      goToProgress(i / (TOTAL_BEATS - 1));
    });
    dotsWrap.appendChild(dot);
  });
  const dotEls = gsap.utils.toArray('.beat-dot');

  // frame -> conceptual layer index (00-05), matches eyebrow labels
  function frameToLayer(fNum){
    if(fNum <= 1) return 0;
    if(fNum <= 3) return 1;
    if(fNum <= 5) return 2;
    if(fNum <= 7) return 3;
    if(fNum <= 9) return 4;
    return 5;
  }

  const frameState = { f: 1 };
  let renderQueued = false;
  let currentBeat = -1;

  function renderFrame(fNum){
    const clamped = Math.min(TOTAL_FRAMES, Math.max(1, Math.round(fNum)));
    seqImg.src = framePath(clamped);
    layerNum.textContent = String(frameToLayer(clamped)).padStart(2, '0');
  }

  function queueRender(){
    if(renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(() => {
      renderFrame(frameState.f);
      renderQueued = false;
    });
  }

  function setActiveBeat(idx){
    if(idx === currentBeat) return;
    const prev = beats[currentBeat];
    const next = beats[idx];
    if(prev){
      prev.classList.remove('is-active');
      gsap.to(prev, { opacity: 0, duration: 0.35, ease: 'power2.out' });
    }
    if(next){
      next.classList.add('is-active');
      gsap.fromTo(next,
        { opacity: 0, y: 14 },
        { opacity: 1, y: 0, duration: 0.55, ease: 'power3.out', delay: 0.08 }
      );
    }
    dotEls.forEach((d, i) => d.classList.toggle('is-active', i === idx));
    currentBeat = idx;
  }

  /* -------------------------------------------------------------
     Master scroll-driven timeline. The visible stage is `position:
     fixed` and never moves — #scrollSpacer below it just supplies
     scrollable distance. Scroll progress (0-1) drives:
       - which of the 11 source frames is shown
       - which text beat is faded in
       - the rainbow rail fill
  --------------------------------------------------------------*/
  masterST = ScrollTrigger.create({
    trigger: spacer,
    start: 'top top',
    end: 'bottom bottom',
    scrub: 0.5,
    onUpdate: (self) => {
      const p = self.progress;

      frameState.f = 1 + p * (TOTAL_FRAMES - 1);
      queueRender();

      const beatIdx = Math.min(TOTAL_BEATS - 1, Math.floor(p * TOTAL_BEATS));
      setActiveBeat(beatIdx);

      railFill.style.height = (p * 100) + '%';
      railDot.style.top = (p * 100) + '%';

      if(p > 0.015){
        scrubHint.style.opacity = '0';
      } else {
        scrubHint.style.opacity = '';
      }
    }
  });

  // show beat 0 immediately on load
  setActiveBeat(0);

  ScrollTrigger.refresh();
}

/* ===================================================================
   3. NAV BRAND SUBTLE HOVER
   =================================================================== */
document.addEventListener('DOMContentLoaded', () => {
  const mark = document.querySelector('.brand-mark');
  if(!mark) return;
  mark.addEventListener('mouseenter', () => {
    gsap.to(mark, { rotate: 180, duration: 0.5, ease: 'power2.out' });
  });
  mark.addEventListener('mouseleave', () => {
    gsap.to(mark, { rotate: 0, duration: 0.5, ease: 'power2.out' });
  });
});
