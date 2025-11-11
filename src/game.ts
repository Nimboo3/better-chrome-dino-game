type GameState = 'ready' | 'playing' | 'gameover';

function rectsCollide(a: {x:number,y:number,w:number,h:number}, b: {x:number,y:number,w:number,h:number}) {
  return !(a.x + a.w < b.x || a.x > b.x + b.w || a.y + a.h < b.y || a.y > b.y + b.h);
}

class PlaneRunner {
  x: number;
  y: number;
  w: number;
  h: number;
  vy = 0;
  gravity = 2000;
  jumpStrength = -700;
  onGround = false;
  legTimer = 0;
  propeller = 0;

  constructor(x: number, y: number, w = 40, h = 44) {
    this.x = x; this.y = y; this.w = w; this.h = h;
  }
  canJump() { return this.onGround; }
  jump() { if (this.canJump()) { this.vy = this.jumpStrength; this.onGround = false; } }
  update(dt: number, groundY: number) {
    this.vy += this.gravity * dt;
    this.y += this.vy * dt;
    if (this.y + this.h >= groundY) { this.y = groundY - this.h; this.vy = 0; this.onGround = true; } else this.onGround = false;
    this.legTimer += dt;
    this.propeller += dt * 20;
  }
  getBounds() { const pad = 4; return { x: this.x + pad, y: this.y + pad, w: this.w - pad * 2, h: this.h - pad * 2 }; }
  draw(ctx: CanvasRenderingContext2D) {
    const x = Math.round(this.x), y = Math.round(this.y); ctx.save();
    ctx.fillStyle = '#141414';
    ctx.fillRect(x + 0, y + 15, this.w, 16);
    ctx.fillRect(x + 10, y + 8, 20, 9);
    ctx.fillRect(x + 30, y + 11, 10, 12);
    ctx.fillRect(x + 2, y + 6, 9, 14);
    ctx.fillRect(x - 2, y + 18, 10, 4);
    ctx.fillRect(x - 2, y + 24, 10, 4);
    ctx.fillRect(x + 8, y + 20, 30, 10);
    ctx.fillRect(x + this.w - 2, y + 14, 4, 18);
    ctx.fillStyle = '#e4edf5';
    ctx.fillRect(x + 1, y + 16, this.w - 2, 14);
    ctx.fillRect(x + 11, y + 9, 18, 7);
    ctx.fillRect(x + 31, y + 12, 8, 10);
    ctx.fillRect(x + 3, y + 7, 7, 12);
    ctx.fillStyle = '#d0dae5';
    ctx.fillRect(x - 1, y + 19, 8, 2);
    ctx.fillRect(x - 1, y + 25, 8, 2);
    ctx.fillRect(x + 9, y + 21, 28, 8);
    ctx.fillStyle = '#c2ccd6';
    ctx.fillRect(x + 1, y + 26, this.w - 2, 4);
    ctx.fillStyle = '#5fa3dc'; ctx.fillRect(x + 19, y + 10, 9, 6);
    ctx.fillStyle = '#a7d6fa'; ctx.fillRect(x + 20, y + 11, 3, 2);
    ctx.fillStyle = '#ffcc33'; ctx.fillRect(x + 7, y + 24, 14, 2);
    const cx = x + this.w + 1, cy = y + 23, frame = Math.floor(this.propeller) % 2;
    ctx.fillStyle = '#888'; if (frame === 0) ctx.fillRect(cx - 1, cy - 9, 2, 18); else ctx.fillRect(cx - 9, cy - 1, 18, 2);
    ctx.globalAlpha = 0.25; ctx.fillStyle = '#bbb';
    ctx.fillRect(cx - 1, cy - 9, 2, 18); ctx.fillRect(cx - 9, cy - 1, 18, 2);
    ctx.globalAlpha = 1; ctx.restore();
  }
}

type ObType = 'building';
class RunnerObstacle {
  x: number; y: number; w: number; h: number; type: ObType; speed: number;
  constructor(type: ObType, x: number, y: number, w: number, h: number, speed: number) {
    this.type = type; this.x = x; this.y = y; this.w = w; this.h = h; this.speed = speed;
  }
  update(dt: number) { this.x -= this.speed * dt; }
  getBounds() { const pad = 1; return { x: Math.round(this.x) + pad, y: Math.round(this.y - this.h) + pad, w: this.w - pad * 2, h: this.h - pad * 2 }; }
  draw(ctx: CanvasRenderingContext2D) {
    const x = Math.round(this.x), top = Math.round(this.y - this.h); ctx.save();
    ctx.fillStyle = '#121922'; ctx.fillRect(x - 1, top - 1, this.w + 2, this.h + 2);
    for (let i = 0; i < this.h; i++) { const yy = top + i; const t = i / this.h; let col: string; if (t < 0.15) col = '#35435d'; else if (t < 0.9) col = '#3e5275'; else col = '#2c3a51'; ctx.fillStyle = col; ctx.fillRect(x, yy, this.w, 1); }
    ctx.fillStyle = '#253246'; ctx.fillRect(x, top, this.w, 3);
    for (let yy = top + 5; yy < top + this.h - 6; yy += 7) {
      for (let xx = x + 3; xx < x + this.w - 3; xx += 7) {
        if ((xx + yy) % 19 === 0) continue;
        const bright = (xx * 31 + yy * 17) % 5 === 0;
        ctx.fillStyle = bright ? '#f4f9ff' : '#c8ddf4';
        ctx.fillRect(xx, yy, 3, 3);
      }
    }
    ctx.restore();
  }
}

export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private dpr = Math.max(1, window.devicePixelRatio || 1);
  private lastTime = 0; private raf = 0;
  private state: GameState = 'ready'; private score = 0; private hiScore = 0;
  private dino!: PlaneRunner; private groundHeight = 28; private groundY = 0;
  private speed = 240; private maxSpeed = 680; private accel = 18;
  private obstacles: RunnerObstacle[] = []; private spawnTimer = 0;
  private cycleTime = 0; private dayLength = 18; private nightLength = 24; private transitionDur = 4;
  private isDay = true; private transitioning = false; private transitionT = 0; private nextIsDay = true;
  private sunPos = { x: 0, y: 0, alpha: 1 }; private moonPos = { x: 0, y: 0, alpha: 0 };
  private clouds: {x:number,y:number,w:number}[] = []; private stars: {x:number,y:number,alpha:number}[] = [];
  private gameOverMsg = ''; private gameOverMessages = [
    'Mission report: The skyline won this round.',
    'Close call! The pigeons are still gossiping.',
    'Paperwork filed: “unexpected landing”.',
    'Pilot tip: altitude is a lifestyle.',
    'You flew boldly. The towers stood bolder.',
    'New objective: fewer building hugs.',
  ];
  private difficulty: 'easy' | 'normal' | 'hard' = 'normal';

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas; const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('2D context not available'); this.ctx = ctx;
    this.handleResize = this.handleResize.bind(this);
    this.handleKey = this.handleKey.bind(this);
    this.handlePointer = this.handlePointer.bind(this);
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('keydown', this.handleKey);
    window.addEventListener('pointerdown', this.handlePointer);
    this.handleResize(); this.initEntities();
  }

  private initEntities() {
    const w = this.canvas.width / this.dpr; const h = this.canvas.height / this.dpr;
    this.groundY = h - this.groundHeight; this.dino = new PlaneRunner(80, this.groundY - 44);
    this.obstacles = []; this.spawnTimer = 0.8; this.score = 0; this.speed = 240; this.ctx.imageSmoothingEnabled = false;
    this.cycleTime = 0; this.isDay = true; this.transitioning = false; this.transitionT = 0; this.nextIsDay = true;
    this.sunPos = { x: 0, y: 0, alpha: 1 }; this.moonPos = { x: 0, y: 0, alpha: 0 };
    this.clouds = []; for (let i = 0; i < 5; i++) this.clouds.push({ x: Math.random() * (w + 200), y: 40 + Math.random() * 120, w: 50 + Math.random() * 40 });
    this.stars = []; for (let i = 0; i < 60; i++) this.stars.push({ x: Math.random() * w, y: Math.random() * (h - 120), alpha: Math.random() * 0.7 + 0.3 });
  }
  private handleKey(e: KeyboardEvent) { if (e.code === 'Space') { e.preventDefault(); if (this.state === 'ready') this.setPlaying(); else if (this.state === 'playing') this.dino.jump(); else if (this.state === 'gameover') this.restart(); } }
  private handlePointer(e: PointerEvent) { e.preventDefault(); if (this.state === 'ready') this.setPlaying(); else if (this.state === 'playing') this.dino.jump(); else if (this.state === 'gameover') this.restart(); }
  private handleResize() { const rect = this.canvas.getBoundingClientRect(); this.canvas.width = Math.round(rect.width * this.dpr); this.canvas.height = Math.round(rect.height * this.dpr); this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0); }
  private clear() { this.ctx.clearRect(0, 0, this.canvas.width / this.dpr, this.canvas.height / this.dpr); }
  start() { this.stop(); this.lastTime = performance.now(); this.raf = requestAnimationFrame(this.loop.bind(this)); }
  stop() { if (this.raf) cancelAnimationFrame(this.raf); }
  private loop(now: number) { const dtMs = Math.min(32, now - this.lastTime); const dt = dtMs / 1000; this.lastTime = now; this.update(dt); this.render(); this.raf = requestAnimationFrame(this.loop.bind(this)); }
  private spawnObstacle() {
    const canvasW = this.canvas.width / this.dpr; const sizes = [ { w: 18, h: 46 }, { w: 22, h: 58 }, { w: 26, h: 72 } ];
    const pair = Math.random() < 0.6;
    if (pair) { const s1 = sizes[Math.floor(Math.random() * sizes.length)]; const s2 = sizes[Math.floor(Math.random() * sizes.length)]; const gap = 10 + Math.floor(Math.random() * 8); const x0 = canvasW + 40; this.obstacles.push(new RunnerObstacle('building', x0, this.groundY, s1.w, s1.h, this.speed)); this.obstacles.push(new RunnerObstacle('building', x0 + s1.w + gap, this.groundY, s2.w, s2.h, this.speed)); }
    else { const s = sizes[Math.floor(Math.random() * sizes.length)]; this.obstacles.push(new RunnerObstacle('building', canvasW + 40, this.groundY, s.w, s.h, this.speed)); }
    const diffFactor = this.difficulty === 'easy' ? 1.2 : this.difficulty === 'hard' ? 0.75 : 1; const speedAdj = 1.0 - Math.min(0.5, (this.speed - 320) / 640); const base = speedAdj * diffFactor; this.spawnTimer = base + Math.random() * (0.6 * diffFactor);
  }
  private update(dt: number) {
    if (this.state === 'playing') {
      const ease = 1 - (this.speed - 240) / (this.maxSpeed - 240); const accelScale = this.difficulty === 'easy' ? 0.65 : this.difficulty === 'hard' ? 1.25 : 1; this.speed = Math.min(this.maxSpeed, this.speed + this.accel * accelScale * ease * dt);
      this.dino.update(dt, this.groundY);
      this.spawnTimer -= dt; if (this.spawnTimer <= 0) this.spawnObstacle();
      this.score += (this.speed / 32) * dt;
      const cycleAccel = 1 + (this.speed - 240) / (this.maxSpeed - 240) * 0.5; this.cycleTime += dt * cycleAccel;
      if (!this.transitioning) {
        if (this.isDay && this.cycleTime >= this.dayLength) { this.transitioning = true; this.transitionT = 0; this.cycleTime = 0; this.nextIsDay = false; }
        else if (!this.isDay && this.cycleTime >= this.nightLength) { this.transitioning = true; this.transitionT = 0; this.cycleTime = 0; this.nextIsDay = true; }
      } else { this.transitionT += dt / this.transitionDur; if (this.transitionT >= 1) { this.transitionT = 0; this.transitioning = false; this.isDay = this.nextIsDay; this.cycleTime = 0; } }
      const w = this.canvas.width / this.dpr; const sunX = w - 40; const moonX = w - 40; const ground = this.groundY; this.sunPos.x = sunX; this.moonPos.x = moonX;
      if (!this.transitioning) {
        if (this.isDay) { this.sunPos.y = 60; this.sunPos.alpha = 1; this.moonPos.y = ground + 16; this.moonPos.alpha = 0; }
        else { this.sunPos.y = -20; this.sunPos.alpha = 0; this.moonPos.y = 80; this.moonPos.alpha = 1; }
      } else {
        const t = this.transitionT;
        if (!this.nextIsDay) { this.sunPos.y = Math.round(60 + (-80) * t); this.sunPos.alpha = 1 - t; this.moonPos.y = Math.round(ground + 16 + (80 - (ground + 16)) * t); this.moonPos.alpha = t; }
        else { this.moonPos.y = Math.round(80 + (ground + 16 - 80) * t); this.moonPos.alpha = 1 - t; this.sunPos.y = Math.round(-20 + (60 - (-20)) * t); this.sunPos.alpha = t; }
      }
      for (const c of this.clouds) { c.x -= this.speed * 0.15 * dt; if (c.x + c.w < -50) c.x = w + Math.random() * 200; }
      for (const o of this.obstacles) o.update(dt); this.obstacles = this.obstacles.filter(o => o.x + o.w > -40);
      const d = this.dino.getBounds(); for (const o of this.obstacles) { if (rectsCollide(d, o.getBounds())) { this.setGameOver(); break; } }
    }
  }
  private render() {
    this.clear(); const w = this.canvas.width / this.dpr; const h = this.canvas.height / this.dpr;
    const tBlend = this.transitioning ? this.transitionT : 0; const dayTop = '#8cc6f4', dayBottom = '#b5e2ff', nightTop = '#0d1524', nightBottom = '#142033';
    const lerpColor = (c1:string,c2:string,t:number) => { const p = (c:string)=>[parseInt(c.slice(1,3),16),parseInt(c.slice(3,5),16),parseInt(c.slice(5,7),16)]; const a=p(c1),b=p(c2); return '#'+a.map((v,i)=>{const vv=Math.round(v+(b[i]-v)*t);return vv.toString(16).padStart(2,'0')}).join(''); };
    const mix = this.isDay ? tBlend : (1 - tBlend); const top = lerpColor(dayTop, nightTop, mix); const bottom = lerpColor(dayBottom, nightBottom, mix);
    const g = this.ctx.createLinearGradient(0,0,0,h); g.addColorStop(0, top); g.addColorStop(1, bottom); this.ctx.fillStyle = g; this.ctx.fillRect(0,0,w,h);
    const starAlphaBase = this.isDay ? (this.transitioning? tBlend*0.8 : 0) : (this.transitioning? (1 - tBlend)*0.8 : 0.8);
    if (starAlphaBase>0.01){ this.ctx.save(); for (const s of this.stars){ this.ctx.globalAlpha = starAlphaBase * s.alpha; this.ctx.fillStyle = '#ffffff'; this.ctx.fillRect(Math.round(s.x), Math.round(s.y),1,1);} this.ctx.restore(); }
    this.ctx.save(); if (this.sunPos.alpha>0.05){ this.ctx.globalAlpha = this.sunPos.alpha; this.ctx.fillStyle = '#ffe08a'; this.ctx.beginPath(); this.ctx.arc(this.sunPos.x, this.sunPos.y, 14, 0, Math.PI*2); this.ctx.fill(); }
    if (this.moonPos.alpha>0.05){ this.ctx.globalAlpha = this.moonPos.alpha; this.ctx.fillStyle = '#e1ecff'; this.ctx.beginPath(); this.ctx.arc(this.moonPos.x, this.moonPos.y, 12, 0, Math.PI*2); this.ctx.fill(); this.ctx.globalCompositeOperation = 'destination-out'; this.ctx.beginPath(); this.ctx.arc(this.moonPos.x+4, this.moonPos.y-2, 10, 0, Math.PI*2); this.ctx.fill(); this.ctx.globalCompositeOperation = 'source-over'; } this.ctx.restore();
    const cloudAlpha = this.isDay ? 1 - 0.6*tBlend : (this.transitioning? (1 - tBlend)*0.4 : 0); if (cloudAlpha>0.02){ this.ctx.save(); this.ctx.globalAlpha = cloudAlpha; for (const c of this.clouds){ const cx = Math.round(c.x), cy = Math.round(c.y); this.ctx.fillStyle = '#ffffff'; this.ctx.fillRect(cx, cy, c.w, 10); this.ctx.fillRect(cx+8, cy-6, c.w*0.4, 8); this.ctx.fillRect(cx+Math.floor(c.w*0.5), cy-4, c.w*0.35, 6);} this.ctx.restore(); }
    const groundDay = '#3a3a3a', groundNight = '#20262e', ground = lerpColor(groundDay, groundNight, mix); this.ctx.fillStyle = ground; this.ctx.fillRect(0, this.groundY, w, this.groundHeight);
    this.ctx.fillStyle = lerpColor('#2d2d2d', '#1a1f24', mix); for (let x = (-(this.lastTime * (this.speed * 0.2) / 1000) % 40); x < w; x += 40) this.ctx.fillRect(Math.floor(x), this.groundY + 6, 24, 4);
    for (const o of this.obstacles) o.draw(this.ctx); this.dino.draw(this.ctx);
    this.ctx.fillStyle = lerpColor('#ffffff', '#d0e4ff', mix); this.ctx.font = '20px Arial'; this.ctx.fillText(`Score: ${Math.floor(this.score)}  HI: ${Math.floor(this.hiScore)}`, 14, 28);
    if (this.state === 'ready') { this.ctx.fillStyle = 'rgba(0,0,0,0.4)'; this.ctx.fillRect(w/2 - 140, h/2 - 40, 280, 80); this.ctx.fillStyle = '#fff'; this.ctx.textAlign = 'center'; this.ctx.fillText('Press Space or Tap to Start', w/2, h/2); this.ctx.textAlign = 'left'; }
    else if (this.state === 'gameover') { const panelW = 420, panelH = 140, px = (w - panelW)/2, py = h/2 - panelH/2; this.ctx.fillStyle = 'rgba(0,0,0,0.55)'; this.ctx.fillRect(px, py, panelW, panelH); this.ctx.strokeStyle = 'rgba(255,255,255,0.25)'; this.ctx.strokeRect(px+0.5, py+0.5, panelW-1, panelH-1); this.ctx.textAlign = 'center'; this.ctx.fillStyle = '#ffd966'; this.ctx.font = '26px Arial'; this.ctx.fillText('MISSION ABORTED', w/2, py + 42); this.ctx.font = '16px Arial'; this.ctx.fillStyle = '#ffffff'; this.ctx.fillText(`Score ${Math.floor(this.score)}  |  High ${Math.floor(this.hiScore)}`, w/2, py + 70); this.ctx.fillStyle = '#a7d6fa'; this.ctx.fillText(this.gameOverMsg || 'Tip: Perfect your timing & watch the skyline!', w/2, py + 96); this.ctx.fillStyle = '#ffffff'; this.ctx.fillText('Press Space to Retry', w/2, py + 118); this.ctx.textAlign = 'left'; }
  }
  public setPlaying() { this.state = 'playing'; this.score = 0; this.spawnTimer = 0.8; this.obstacles = []; this.speed = this.difficulty === 'easy' ? 260 : this.difficulty === 'hard' ? 340 : 300; this.dino.vy = 0; }
  public setGameOver() { this.state = 'gameover'; this.hiScore = Math.max(this.hiScore, this.score); if (this.gameOverMessages.length) { const idx = Math.floor(Math.random() * this.gameOverMessages.length); this.gameOverMsg = this.gameOverMessages[idx]; } }
  public restart() { this.initEntities(); this.setPlaying(); }
  public setDifficulty(d: 'easy' | 'normal' | 'hard') { this.difficulty = d; }
}
