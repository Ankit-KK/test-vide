gsap.registerPlugin(ScrollTrigger);

/* ===================================================================
   1. BUILD + PRELOAD STACKED FRAME LAYERS
   One <img> per source frame, all absolutely stacked on top of each
   other. Scrubbing crossfades opacity between the two layers that
   straddle the current scroll position — this is what makes the
   motion feel continuous instead of a hard jump-cut every frame.
   =================================================================== */
const TOTAL_FRAMES = 11;
const TOTAL_BEATS   = 7; // 00 assembled ... 06 reassembled
const framePath = (i) => `assets/frames/frame_${String(i).padStart(2,'0')}.jpg`;

const frameLayers = []; // 1-indexed, frameLayers[1..11]
let loadedCount = 0;

function buildFrameLayers(container, onDone){
  const vignette = container.querySelector('.vignette');
  for(let i = 1; i <= TOTAL_FRAMES; i++){
    const img = document.createElement('img');
    img.className = 'frame-layer' + (i === 1 ? ' is-base' : '');
    img.alt = i === 1 ? 'Exploded view of mechanical keyboard' : '';
    img.decoding = 'async';
    img.loading = 'eager';
    container.insertBefore(img, vignette);
    frameLayers[i] = img;

    img.onload = settle;
    img.onerror = settle;
    img.src = framePath(i);
  }
  function settle(){
    loadedCount++;
    if(loadedCount === TOTAL_FRAMES) onDone();
  }
}

/* ===================================================================
   2. WIRE UP ONCE LOADED
   =================================================================== */
document.addEventListener('DOMContentLoaded', () => {
  const visualFrame = document.getElementById('visualFrame');
  buildFrameLayers(visualFrame, init);
});

function init(){
  const layerNum  = document.getElementById('layerNum');
  const railFill  = document.getElementById('railFill');
  const railDot   = document.getElementById('railDot');
  const scrubHint = document.getElementById('scrubHint');
  const spacer    = document.getElementById('scrollSpacer');
  const dotsWrap  = document.getElementById('beatDots');
  const beats     = gsap.utils.toArray('.beat');

  let masterST;

  function goToProgress(p){
    const y = masterST.start + (masterST.end - masterST.start) * p;
    window.scrollTo({ top: y, behavior: 'smooth' });
  }

  /* -------------------------------------------------------------
     Dot navigation — one per beat, click jumps to that section.
  --------------------------------------------------------------*/
  beats.forEach((beat, i) => {
    const dot = document.createElement('button');
    dot.className = 'beat-dot';
    dot.setAttribute('aria-label', 'Jump to section ' + (i + 1));
    dot.addEventListener('click', () => goToProgress(i / (TOTAL_BEATS - 1)));
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

  let renderQueued = false;
  let pendingPos = 1;
  let lastLowFrame = 1;
  let currentBeat = -1;

  /* -------------------------------------------------------------
     Crossfade core: `pos` is a fractional frame position, e.g.
     4.35 means 35% of the way between frame 4 and frame 5.
     We fade frame 4 out and frame 5 in by that exact amount, and
     hard-hide every other layer so only two are ever visible.
  --------------------------------------------------------------*/
  function renderPosition(pos){
    const clampedPos = Math.min(TOTAL_FRAMES, Math.max(1, pos));
    const low  = Math.min(TOTAL_FRAMES - 1, Math.floor(clampedPos));
    const high = Math.min(TOTAL_FRAMES, low + 1);
    const t    = clampedPos - low; // 0..1 blend between low and high

    for(let i = 1; i <= TOTAL_FRAMES; i++){
      const layer = frameLayers[i];
      if(i === low)       layer.style.opacity = String(1 - t);
      else if(i === high) layer.style.opacity = String(t);
      else                 layer.style.opacity = '0';
    }

    const roundedFrame = t < 0.5 ? low : high;
    if(roundedFrame !== lastLowFrame){
      lastLowFrame = roundedFrame;
      layerNum.textContent = String(frameToLayer(roundedFrame)).padStart(2, '0');
    }
  }

  function queueRender(pos){
    pendingPos = pos;
    if(renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(() => {
      renderPosition(pendingPos);
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
     Master scroll-driven trigger. `scrub` is a smoothing time in
     seconds — ScrollTrigger interpolates progress itself, so by
     the time onUpdate fires, p is already eased
