gsap.registerPlugin(ScrollTrigger);

/* ===================================================================
   1. PRELOAD FRAME SEQUENCE
   =================================================================== */
const TOTAL_FRAMES = 11;
const TOTAL_BEATS   = 7; 
const framePath = (i) => `assets/frames/frame_${String(i).padStart(2,'0')}.jpg`;

const frames = [];

function preloadFrames(onDone){
  let loadedCount = 0;
  
  for(let i = 1; i <= TOTAL_FRAMES; i++){
    const img = new Image();
    img.src = framePath(i);
    frames.push(img);
    
    const settle = () => {
      loadedCount++;
      if(loadedCount === TOTAL_FRAMES){
        // Decode all images in parallel to prevent micro-stutters on first draw
        Promise.all(frames.map(f => f.decode().catch(() => {})))
          .then(onDone);
      }
    };
    img.onload = settle;
    img.onerror = settle;
  }
}

/* ===================================================================
   2. WIRE UP ONCE LOADED
   =================================================================== */
preloadFrames(init);

function init(){
  const canvas    = document.getElementById('seqCanvas');
  const ctx       = canvas.getContext('2d');
  const layerNum  = document.getElementById('layerNum');
  const railFill  = document.getElementById('railFill');
  const railDot   = document.getElementById('railDot');
  const scrubHint = document.getElementById('scrubHint');
  const spacer    = document.getElementById('scrollSpacer');
  const dotsWrap  = document.getElementById('beatDots');
  const beats     = gsap.utils.toArray('.beat');

  let masterST; 

  /* -------------------------------------------------------------
     Handle Canvas Resizing for High-DPI (Retina) displays
  --------------------------------------------------------------*/
  function resizeCanvas() {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      
      // Set actual size in memory (scaled to account for extra pixel density)
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      
      // Reset transform and scale context to match DPR
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      
      // Redraw current frame immediately so it doesn't flash blank on resize
      renderFrame(frameState.f);
  }

  function goToProgress(p){
    const y = masterST.start + (masterST.end - masterST.start) * p;
    window.scrollTo({ top: y, behavior: 'smooth' });
  }

  /* -------------------------------------------------------------
     Build dot navigation
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

  function frameToLayer(fNum){
    if(fNum <= 1) return 0;
    if(fNum <= 3) return 1;
    if(fNum <= 5) return 2;
    if(fNum <= 7) return 3;
    if(fNum <= 9) return 4;
    return 5;
  }

  const frameState = { f: 1 };
  let currentBeat = -1;

  /* -------------------------------------------------------------
     Render frame to Canvas with "Object-Fit: Cover" logic
  --------------------------------------------------------------*/
  function renderFrame(fNum){
    const clamped = Math.min(TOTAL_FRAMES, Math.max(1, Math.round(fNum)));
    const idx = clamped - 1;
    const img = frames[idx];
    
    if (img && img.complete && img.naturalWidth !== 0) {
        const rect = canvas.getBoundingClientRect();
        const cw = rect.width;
        const ch = rect.height;
        
        ctx.clearRect(0, 0, cw, ch);
        
        // Calculate aspect ratios for cover logic
        const ir = img.naturalWidth / img.naturalHeight;
        const cr = cw / ch;
        let sw, sh, sx, sy;
        
        if (ir > cr) {
            sh = img.naturalHeight;
            sw = sh * cr;
            sx = (img.naturalWidth - sw) / 2;
            sy = 0;
        } else {
            sw = img.naturalWidth;
            sh = sw / cr;
            sx = 0;
            sy = (img.naturalHeight - sh) / 2;
        }
        
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, cw, ch);
    }
    
    layerNum.textContent = String(frameToLayer(clamped)).padStart(2, '0');
  }

  /* -------------------------------------------------------------
     Text Beat Cross-fades (Pure opacity to avoid transform conflicts)
  --------------------------------------------------------------*/
  function setActiveBeat(idx){
    if(idx === currentBeat) return;
    
    const prev = beats[currentBeat];
    const next = beats[idx];
    
    if(prev){
      prev.classList.remove('is-active');
      gsap.to(prev, { opacity: 0, duration: 0.3, ease: 'power2.out' });
    }
    
    if(next){
      next.classList.add('is-active');
      // Pure opacity fade. No 'y' animation to prevent overriding CSS translateY(-50%)
      gsap.fromTo(next,
        { opacity: 0 },
        { opacity: 1, duration: 0.4, ease: 'power2.out' }
      );
    }
    
    dotEls.forEach((d, i) => d.classList.toggle('is-active', i === idx));
    currentBeat = idx;
  }

  /* -------------------------------------------------------------
     Master ScrollTrigger
  --------------------------------------------------------------*/
  masterST = ScrollTrigger.create({
    trigger: spacer,
    start: 'top top',
    end: 'bottom bottom',
    scrub: 0.6, // Slightly heavier scrub for a smoother, weighted feel
    onUpdate: (self) => {
      const p = self.progress;

      frameState.f = 1 + p * (TOTAL_FRAMES - 1);
      
      // Direct render call. No requestAnimationFrame throttling needed 
      // because ScrollTrigger's onUpdate is already synced to the render loop.
      renderFrame(frameState.f);

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

  // Handle window resizing
  window.addEventListener('resize', () => {
      resizeCanvas();
      ScrollTrigger.refresh();
  });

  // Initial setup
  resizeCanvas();
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
