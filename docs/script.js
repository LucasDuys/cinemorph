// Cinemorph site — minimal interactive bits.
// (1) Live morph demo: toggles the canvas between the two stages so visitors
//     can see how shared layout (FLIP-style) drives the entire transition.
// (2) Auto-loop the demo on a timer so the page is alive even if the visitor
//     never clicks. Pauses while the tab is hidden to be considerate.

(() => {
  const canvas = document.getElementById('demoCanvas');
  const button = document.getElementById('demoToggle');
  if (!canvas || !button) return;

  const STAGES = ['hook', 'reveal'];
  let idx = 0;
  let timer = null;

  const setStage = (i) => {
    idx = (i + STAGES.length) % STAGES.length;
    canvas.dataset.stage = STAGES[idx];
    button.textContent = idx === 0 ? 'Toggle stage →' : '← Back to hook';
  };

  const tick = () => setStage(idx + 1);

  const start = () => { stop(); timer = setInterval(tick, 2400); };
  const stop  = () => { if (timer) clearInterval(timer); timer = null; };

  button.addEventListener('click', () => { stop(); tick(); start(); });

  // Pause loop when the user can't see the page.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else start();
  });

  // Pause when the demo scrolls out of view to save cycles on slow devices.
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) start();
        else stop();
      }
    }, { threshold: 0.3 });
    io.observe(canvas);
  } else {
    start();
  }
})();
