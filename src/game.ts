type GameState = 'ready' | 'playing' | 'gameover';

class Plane {
  x: number;
  y: number;
  w: number;
  h: number;
  vy = 0;
  gravity = 900;
  flapStrength = -340;
  constructor(x: number, y: number, w = 48, h = 30) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
  }

  update(dt: number, canvasHeight: number) {
    this.vy += this.gravity * dt;
    this.y += this.vy * dt;
    if (this.y + this.h > canvasHeight) {
      this.y = canvasHeight - this.h;
      this.vy = 0;
    }
    if (this.y < 0) {
      this.y = 0;
      this.vy = 0;
    }
  }

  flap() {
    this.vy = this.flapStrength;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.x + this.w / 2, this.y + this.h / 2);
    const tilt = Math.max(-0.6, Math.min(0.6, -this.vy / 600));
    ctx.rotate(tilt);
    ctx.fillStyle = '#ffd166';
    ctx.fillRect(-this.w / 2, -this.h / 2, this.w, this.h);
    ctx.fillStyle = '#d49a2a';
    ctx.fillRect(-8, -2, 24, 4);
    ctx.restore();
  }

  getBounds() {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }
}

class Obstacle {
  x: number;
  width: number;
  topHeight: number;
  gap: number;
  passed: boolean = false;
  speed: number;
  color: string;

  constructor(x: number, width: number, topHeight: number, gap: number, speed: number) {
    this.x = x;
    this.width = width;
    this.topHeight = topHeight;
    this.gap = gap;
    this.speed = speed;
    this.color = '#2b2d42';
  }

  update(dt: number) {
    this.x -= this.speed * dt;
  }

  draw(ctx: CanvasRenderingContext2D, canvasHeight: number) {
    // Top skyscraper
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, 0, this.width, this.topHeight);

    // Add simple windows (grid)
    const winW = 6, winH = 6, pad = 6;
    ctx.fillStyle = '#ffd';
    for (let y = pad; y + winH < this.topHeight - pad; y += winH + pad) {
      for (let x = this.x + pad; x + winW < this.x + this.width - pad; x += winW + pad) {
        ctx.fillRect(x, y, winW, winH);
      }
    }

    // Bottom skyscraper
    const bottomY = this.topHeight + this.gap;
    const bH = canvasHeight - bottomY;
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, bottomY, this.width, bH);

    // windows on bottom
    ctx.fillStyle = '#ffd';
    for (let y = bottomY + pad; y + winH < canvasHeight - pad; y += winH + pad) {
      for (let x = this.x + pad; x + winW < this.x + this.width - pad; x += winW + pad) {
        ctx.fillRect(x, y, winW, winH);
      }
    }
  }

  getTopRect() {
    return { x: this.x, y: 0, w: this.width, h: this.topHeight };
  }
  getBottomRect(canvasHeight: number) {
    const y = this.topHeight + this.gap;
    return { x: this.x, y, w: this.width, h: canvasHeight - y };
  }
}

function rectsCollide(a: {x:number,y:number,w:number,h:number}, b: {x:number,y:number,w:number,h:number}) {
  return !(a.x + a.w < b.x || a.x > b.x + b.w || a.y + a.h < b.y || a.y > b.y + b.h);
}

export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private dpr = Math.max(1, window.devicePixelRatio || 1);

  // loop
  private lastTime = 0;
  private raf = 0;

  // game
  private state: GameState = 'ready';
  private score = 0;

  // entities
  private plane!: Plane;
  private obstacles: Obstacle[] = [];
  private spawnTimer = 0;
  private spawnInterval = 1.8; // seconds initial
  private obstacleSpeed = 220; // px/s
  private obstacleWidth = 64;
  private obstacleGap = 150;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D context not available');
    this.ctx = ctx;

    this.handleResize = this.handleResize.bind(this);
    this.handleKey = this.handleKey.bind(this);
    this.handlePointer = this.handlePointer.bind(this);

    window.addEventListener('resize', this.handleResize);
    window.addEventListener('keydown', this.handleKey);
    window.addEventListener('pointerdown', this.handlePointer);

    this.handleResize();
    this.initEntities();
  }

  private initEntities() {
    const w = this.canvas.width / this.dpr;
    const h = this.canvas.height / this.dpr;
    this.plane = new Plane(80, h / 2 - 15);
    this.obstacles = [];
    this.spawnTimer = 0;
    this.score = 0;
    this.spawnInterval = 1.8;
    this.obstacleSpeed = 220;
  }

  private handleKey(e: KeyboardEvent) {
    if (e.code === 'Space') {
      e.preventDefault();
      if (this.state === 'ready') {
        this.setPlaying();
      } else if (this.state === 'playing') {
        this.plane.flap();
      } else if (this.state === 'gameover') {
        this.initEntities();
        this.setPlaying();
      }
    }
  }

  private handlePointer(e: PointerEvent) {
    e.preventDefault();
    if (this.state === 'ready') {
      this.setPlaying();
    } else if (this.state === 'playing') {
      this.plane.flap();
    } else if (this.state === 'gameover') {
      this.initEntities();
      this.setPlaying();
    }
  }

  private handleResize() {
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = Math.round(rect.width * this.dpr);
    this.canvas.height = Math.round(rect.height * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  private clear() {
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width / this.dpr, canvas.height / this.dpr);
  }

  start() {
    this.stop();
    this.lastTime = performance.now();
    this.raf = requestAnimationFrame(this.loop.bind(this));
  }

  stop() {
    if (this.raf) cancelAnimationFrame(this.raf);
  }

  private loop(now: number) {
    const dtMs = Math.min(32, now - this.lastTime);
    const dt = dtMs / 1000;
    this.lastTime = now;

    this.update(dt);
    this.render();

    this.raf = requestAnimationFrame(this.loop.bind(this));
  }

  private spawnObstacle() {
    const canvasW = this.canvas.width / this.dpr;
    const canvasH = this.canvas.height / this.dpr;
    const minTop = 40;
    const maxTop = canvasH - this.obstacleGap - 80;
    const topHeight = Math.floor(minTop + Math.random() * (Math.max(0, maxTop - minTop)));
    const o = new Obstacle(canvasW + 40, this.obstacleWidth, topHeight, this.obstacleGap, this.obstacleSpeed);
    this.obstacles.push(o);
  }

  private update(dt: number) {
    const canvasH = this.canvas.height / this.dpr;
    if (this.state === 'playing') {
      // plane
      this.plane.update(dt, canvasH);

      // If the plane touches the ground (bottom of canvas), the game is over.
      // Plane.update already clamps the plane inside the canvas, so test the
      // clamped position here. Use a tiny epsilon to avoid floating precision
      // issues.
      const epsilon = 0.5;
      if (this.plane.y + this.plane.h >= canvasH - epsilon) {
        this.setGameOver();
      }

      // obstacles
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.spawnObstacle();
        this.spawnTimer = this.spawnInterval;
        // slightly speed up and shorten gap as score grows
        if (this.spawnInterval > 1.0) this.spawnInterval -= 0.02;
        this.obstacleSpeed += 0.8;
      }

      // time-based score so the top-left counter steadily increases while playing
      this.score += dt * 10; // 10 points per second

      for (const o of this.obstacles) {
        o.update(dt);
      }

      // remove offscreen obstacles
      this.obstacles = this.obstacles.filter(o => o.x + o.width > -50);

      // collision detection
      const planeBounds = this.plane.getBounds();
      for (const o of this.obstacles) {
        // collision with top or bottom
        const topRect = o.getTopRect();
        const bottomRect = o.getBottomRect(canvasH);
        if (rectsCollide(planeBounds, topRect) || rectsCollide(planeBounds, bottomRect)) {
          this.setGameOver();
        }
      }
    }
  }

  private render() {
    this.clear();
    const w = this.canvas.width / this.dpr;
    const h = this.canvas.height / this.dpr;

    // background
    const g = this.ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#7ec0ee');
    g.addColorStop(1, '#4b82d6');
    this.ctx.fillStyle = g;
    this.ctx.fillRect(0, 0, w, h);

    // obstacles
    for (const o of this.obstacles) {
      o.draw(this.ctx, h);
    }

    // draw plane
    this.plane.draw(this.ctx);

    // HUD
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '20px Arial';
    this.ctx.fillText(`Score: ${Math.floor(this.score)}`, 14, 28);

    if (this.state === 'ready') {
      this.ctx.fillStyle = 'rgba(0,0,0,0.4)';
      this.ctx.fillRect(w / 2 - 140, h / 2 - 40, 280, 80);
      this.ctx.fillStyle = '#fff';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('Press Space or Tap to Start', w / 2, h / 2);
      this.ctx.textAlign = 'left';
    } else if (this.state === 'gameover') {
      this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
      this.ctx.fillRect(0, h / 2 - 50, w, 100);
      this.ctx.fillStyle = '#fff';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(`Game Over — Score ${Math.floor(this.score)} — Press Space to Restart`, w / 2, h / 2 + 6);
      this.ctx.textAlign = 'left';
    }
  }

  public setPlaying() {
    this.state = 'playing';
    this.score = 0;
    this.spawnTimer = 0.6; // give a small buffer before first obstacle
    this.obstacles = [];
    this.obstacleSpeed = 220;
    this.spawnInterval = 1.8;
    this.plane.vy = 0;
  }
  public setGameOver() {
    this.state = 'gameover';
  }

  /**
   * Restart the game: reinitialize entities and switch to playing state.
   * Public API intended for external UI controls (buttons, etc.).
   */
  public restart() {
    this.initEntities();
    this.setPlaying();
  }
}
