gsap.registerPlugin(ScrollTrigger);

/* ===================================================================
   1. PRELOAD FRAME SEQUENCE
   =================================================================== */
const TOTAL_FRAMES = 11;
const framePath = (i) => `assets/frames/frame_${String(i).padStart(2,'0')}.jpg`;

const images = [];
let loadedCount = 0;

function preloadFrames(onDone){
  for(let i = 1; i <= TOTAL_FRAMES; i++){
    const img = new Image();
    img.src = framePath(i);
    img.onload = () => {
      loadedCount++;
      if(loadedCount === TOTAL_FRAMES) onDone();
    };
    img.onerror = () => {
      loadedCount++;
      if(loadedCount === TOTAL_FRAMES) onDone();
    };
    images[i] = img;
  }
}

/* ===================================================================
   2. WIRE UP ONCE LOADED
   =================================================================== */
preloadFrames(init);

function init(){
  const seqImg   = document.getElementById('seqImg');
  const layerNum = document.getElementById('layerNum');
  const railFill = document.getElementById('railFill');
  const railDot  = document.getElementById('railDot');
  const scrubHint= document.getElementById('scrubHint');
  const stage    = document.getElementById('stage');

  // frame -> conceptual layer index, matches the eyebrow labels in the panels
  // frame 1: assembled (00) · 2-3: keycaps (01) · 4-5: switches (02)
  // 6-7: plate (03) · 8-9: pcb/foam (04) · 10-11: chassis (05)
  function frameToLayer(fNum){
    if(fNum <= 1) return 0;
    if(fNum <= 3) return 1;
    if(fNum <= 5) return 2;
    if(fNum <= 7) return 3;
    if(fNum <= 9) return 4;
    return 5;
  }

  // current frame state, eased via a proxy object so GSAP can tween it smoothly
  const frameState = { f: 1 };
  let renderQueued = false;

  function renderFrame(fNum){
    const clamped = Math.min(TOTAL_FRAMES, Math.max(1, Math.round(fNum)));
    seqImg.src = framePath(clamped);
    layerNum.textContent = String(frameToLayer(clamped)).padStart(2,'0');
  }

  function queueRender(){
    if(renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(() => {
      renderFrame(frameState.f);
      renderQueued = false;
    });
  }

  /* -------------------------------------------------------------
     Master scroll-driven timeline: scrub through frames 1 -> 11
     across the full height of #stage. ScrollTrigger's own `scrub`
     value already smooths the incoming progress, so we map it
     straight to a frame index — no secondary tween needed.
  --------------------------------------------------------------*/
  const masterST = ScrollTrigger.create({
    trigger: stage,
    start: 'top top',
    end: 'bottom bottom',
    scrub: 0.5,
    onUpdate: (self) => {
      frameState.f = 1 + self.progress * (TOTAL_FRAMES - 1);
      queueRender();

      // drive the rainbow rail with the same progress value
      railFill.style.height = (self.progress * 100) + '%';
      railDot.style.top = (self.progress * 100) + '%';

      // fade the scroll hint out fast
      if(self.progress > 0.02){
        scrubHint.style.opacity = '0';
      } else {
        scrubHint.style.opacity = '';
      }
    }
  });

  /* -------------------------------------------------------------
     Per-panel text reveals — fade/slide in on enter, settle.
  --------------------------------------------------------------*/
  const panels = gsap.utils.toArray('.panel');

  panels.forEach((panel) => {
    const eyebrow = panel.querySelector('.eyebrow');
    const title   = panel.querySelector('.panel-title');
    const body    = panel.querySelector('.panel-body');
    const extra   = panel.querySelectorAll('.spec-grid, .cta');

    const tl = gsap.timeline({
      paused:true,
      defaults:{ ease:'power3.out' }
    });

    if(eyebrow) tl.from(eyebrow, { y:16, opacity:0, duration:0.5 });
    if(title)   tl.from(title,   { y:28, opacity:0, duration:0.65 }, '-=0.32');
    if(body)    tl.from(body,    { y:20, opacity:0, duration:0.6 }, '-=0.4');
    if(extra.length) tl.from(extra, { y:18, opacity:0, duration:0.55, stagger:0.08 }, '-=0.3');

    ScrollTrigger.create({
      trigger: panel,
      start: 'top 72%',
      end: 'bottom 20%',
      onEnter: () => tl.play(),
      onEnterBack: () => tl.play(),
      onLeaveBack: () => tl.progress(0).pause(),
    });
  });

  /* -------------------------------------------------------------
     Subtle parallax: visual frame breathes slightly with scroll
  --------------------------------------------------------------*/
  gsap.to('.visual-frame', {
    scale: 1.015,
    ease:'none',
    scrollTrigger:{
      trigger: stage,
      start:'top top',
      end:'bottom bottom',
      scrub:true
    }
  });

  ScrollTrigger.refresh();
}

/* ===================================================================
   3. NAV BRAND SUBTLE HOVER
   =================================================================== */
document.addEventListener('DOMContentLoaded', () => {
  const mark = document.querySelector('.brand-mark');
  if(!mark) return;
  mark.addEventListener('mouseenter', () => {
    gsap.to(mark, { rotate: 180, duration:0.5, ease:'power2.out' });
  });
  mark.addEventListener('mouseleave', () => {
    gsap.to(mark, { rotate: 0, duration:0.5, ease:'power2.out' });
  });
});
