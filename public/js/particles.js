// Hero background: drifting brand-blue and brand-green particles joined by faint lines,
// the same motif as the Panshaker site. Pauses off-screen and honours reduced motion.

export function startParticles(canvas) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const colors = ["14, 66, 126", "98, 186, 70"];
  let width = 0;
  let height = 0;
  let particles = [];
  let running = false;
  let frame = 0;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = canvas.offsetWidth;
    height = canvas.offsetHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = width < 768 ? 22 : 70;
    const speed = width < 768 ? 0.6 : 0.35;
    particles = Array.from({ length: count }, (_, i) => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * speed,
      vy: (Math.random() - 0.5) * speed,
      r: Math.random() * 2 + 1,
      c: colors[i % 2],
    }));
    if (!running) draw();
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    const reach = width < 768 ? 100 : 150;
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.hypot(dx, dy);
        if (dist < reach) {
          ctx.strokeStyle = `rgba(14, 66, 126, ${0.12 * (1 - dist / reach)})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.stroke();
        }
      }
    }
    for (const p of particles) {
      ctx.fillStyle = `rgba(${p.c}, 0.55)`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function tick() {
    if (!running) return;
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0 || p.x > width) p.vx = -p.vx;
      if (p.y < 0 || p.y > height) p.vy = -p.vy;
    }
    draw();
    frame = requestAnimationFrame(tick);
  }

  resize();
  window.addEventListener("resize", resize);
  if (reduce) return;
  new IntersectionObserver(([entry]) => {
    running = entry.isIntersecting;
    cancelAnimationFrame(frame);
    if (running) tick();
  }).observe(canvas);
}
