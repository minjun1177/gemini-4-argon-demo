// =========================================================================
// 1. RETRO SYNTH AUDIO ENGINE (Web Audio API)
// =========================================================================
class RetroAudio {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) this.ctx = new AC();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  playTone(f1, f2, dur, type = 'square', vol = 0.1) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f1, now);
    if (f1 !== f2) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, f2), now + dur);
    }
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + dur);
  }

  playCoin() {
    this.playTone(987.77, 987.77, 0.08, 'square', 0.14);
    setTimeout(() => this.playTone(1318.51, 1318.51, 0.32, 'square', 0.14), 80);
  }

  playSelect() {
    this.playTone(520, 780, 0.08, 'square', 0.09);
  }

  playStart() {
    [440, 554, 659, 880].forEach((n, i) =>
      setTimeout(() => this.playTone(n, n, 0.11, 'square', 0.11), i * 70)
    );
  }

  playLaser() {
    this.playTone(880, 170, 0.1, 'sawtooth', 0.08);
  }

  playBomb() {
    this.playTone(220, 35, 0.4, 'sawtooth', 0.18);
  }

  playExplosion() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const dur = 0.2;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * 0.35));
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + dur);
    src.connect(gain);
    gain.connect(this.ctx.destination);
    src.start();
  }

  playBounce() {
    this.playTone(480, 640, 0.06, 'triangle', 0.11);
  }

  playPowerup() {
    [523, 659, 784, 1046].forEach((n, i) =>
      setTimeout(() => this.playTone(n, n * 1.05, 0.08, 'triangle', 0.1), i * 45)
    );
  }

  playGameOver() {
    [392, 349, 329, 261].forEach((n, i) =>
      setTimeout(() => this.playTone(n, n * 0.92, 0.2, 'sawtooth', 0.11), i * 150)
    );
  }
}

window.retroSound = new RetroAudio();

// =========================================================================
// 2. 2D RETRO ARCADE ENGINE (512x640 Offscreen Canvas)
// =========================================================================
class Arcade2DEngine {
  constructor(sound) {
    this.sound = sound;
    this.width = 512;
    this.height = 640;
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.ctx = this.canvas.getContext('2d');

    // States: 'ATTRACT', 'SELECT', 'PLAYING', 'GAMEOVER'
    this.state = 'ATTRACT';
    this.credits = 0;
    this.selectedGameIndex = 0;
    this.games = [
      {
        id: 'GALAXY',
        title: 'GALAXY DEFENDER',
        genre: '2D SPACE SHOOTER',
        color: '#00f7ff',
        hex: 0x00f7ff,
        desc: 'Shoot down alien waves & bosses!'
      },
      {
        id: 'BREAKER',
        title: 'NEON ARKANOID',
        genre: '2D BRICK BREAKER',
        color: '#ff2a85',
        hex: 0xff2a85,
        desc: 'Deflect energy balls & smash neon cores!'
      },
      {
        id: 'SNAKE',
        title: 'CYBER SNAKE DX',
        genre: '2D ARCADE ACTION',
        color: '#a3e635',
        hex: 0xa3e635,
        desc: 'Collect cyber data nodes at high speed!'
      }
    ];

    this.highScores = { GALAXY: 5000, BREAKER: 3500, SNAKE: 2500 };
    this.score = 0;
    this.lives = 3;
    this.wave = 1;
    this.frameCount = 0;
    this.screenShake = 0;
    this.lightHex = 0x00f7ff;

    this.keys = { up: false, down: false, left: false, right: false, btnA: false, btnB: false };

    this.stars = Array.from({ length: 70 }, () => ({
      x: Math.random() * this.width,
      y: Math.random() * this.height,
      speed: 0.6 + Math.random() * 2.4,
      size: Math.random() < 0.3 ? 3 : 2,
      color: ['#ffffff', '#38bdf8', '#f472b6', '#facc15'][Math.floor(Math.random() * 4)]
    }));

    this.particles = [];
    this.floatingTexts = [];
    this.initGalaxyGame();
  }

  insertCoin() {
    this.credits = Math.min(99, this.credits + 1);
    this.sound.playCoin();
    if (this.state === 'ATTRACT') {
      this.state = 'SELECT';
    }
  }

  pressStart() {
    if (this.state === 'ATTRACT') {
      if (this.credits === 0) this.insertCoin();
      else {
        this.state = 'SELECT';
        this.sound.playSelect();
      }
    } else if (this.state === 'SELECT') {
      if (this.credits > 0) this.credits--;
      this.sound.playStart();
      this.startSelectedGame();
    } else if (this.state === 'GAMEOVER') {
      if (this.credits > 0) {
        this.credits--;
        this.sound.playStart();
        this.startSelectedGame();
      } else {
        this.state = 'SELECT';
        this.sound.playSelect();
      }
    }
  }

  returnToMenu() {
    this.sound.playSelect();
    this.state = 'SELECT';
  }

  onKeyTrigger(code) {
    if (this.state === 'ATTRACT') {
      if (code === 'Space' || code === 'KeyZ' || code === 'Enter') this.insertCoin();
      return;
    }
    if (this.state === 'SELECT') {
      if (code === 'ArrowLeft' || code === 'KeyA' || code === 'ArrowUp' || code === 'KeyW') {
        this.selectedGameIndex = (this.selectedGameIndex + this.games.length - 1) % this.games.length;
        this.sound.playSelect();
      } else if (code === 'ArrowRight' || code === 'KeyD' || code === 'ArrowDown' || code === 'KeyS') {
        this.selectedGameIndex = (this.selectedGameIndex + 1) % this.games.length;
        this.sound.playSelect();
      } else if (code === 'Space' || code === 'KeyZ' || code === 'Enter') {
        this.pressStart();
      }
      return;
    }
    if (this.state === 'GAMEOVER') {
      if (code === 'Space' || code === 'KeyZ' || code === 'Enter') {
        this.pressStart();
      } else if (code === 'KeyX' || code === 'ShiftLeft' || code === 'ShiftRight') {
        this.state = 'SELECT';
        this.sound.playSelect();
      }
      return;
    }
    if (this.state === 'PLAYING') {
      const gId = this.games[this.selectedGameIndex].id;
      if (gId === 'GALAXY' && (code === 'KeyX' || code === 'ShiftLeft' || code === 'ShiftRight')) {
        this.triggerGalaxyBomb();
      } else if (gId === 'BREAKER' && (code === 'Space' || code === 'KeyZ')) {
        this.launchBreakerBall();
      } else if (gId === 'SNAKE') {
        this.handleSnakeDirKey(code);
      }
    }
  }

  startSelectedGame() {
    this.state = 'PLAYING';
    this.score = 0;
    this.lives = 3;
    this.wave = 1;
    this.particles = [];
    this.floatingTexts = [];
    const gId = this.games[this.selectedGameIndex].id;
    this.lightHex = this.games[this.selectedGameIndex].hex;
    if (gId === 'GALAXY') this.initGalaxyGame();
    else if (gId === 'BREAKER') this.initBreakerGame();
    else if (gId === 'SNAKE') this.initSnakeGame();
  }

  addScore(pts, x, y, color = '#facc15') {
    this.score += pts;
    const gId = this.games[this.selectedGameIndex].id;
    if (this.score > this.highScores[gId]) {
      this.highScores[gId] = this.score;
    }
    if (x !== undefined && y !== undefined) {
      this.floatingTexts.push({ x, y, text: '+' + pts, color, life: 32 });
    }
  }

  spawnParticles(x, y, color, count = 14) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 1 + Math.random() * 4.8;
      this.particles.push({
        x, y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: 18 + Math.floor(Math.random() * 18),
        maxLife: 36,
        color,
        size: 3 + Math.floor(Math.random() * 3)
      });
    }
  }

  // -----------------------------------------------------------------------
  // GAME 1: GALAXY DEFENDER (2D Space Shooter)
  // -----------------------------------------------------------------------
  initGalaxyGame() {
    this.player = {
      x: this.width / 2,
      y: this.height - 90,
      w: 32,
      h: 28,
      speed: 4.6,
      cooldown: 0,
      weaponLevel: 1,
      bombs: 3,
      invincible: 60
    };
    this.bullets = [];
    this.enemyBullets = [];
    this.powerups = [];
    this.spawnGalaxyWave();
  }

  spawnGalaxyWave() {
    this.enemies = [];
    const rows = Math.min(5, 3 + Math.floor(this.wave / 2));
    const cols = 7;
    const colors = ['#ff2a85', '#a855f7', '#00f7ff', '#22c55e', '#facc15'];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const isBoss = r === 0 && (c === 2 || c === 4);
        this.enemies.push({
          homeX: 76 + c * 60,
          homeY: 115 + r * 44,
          x: 76 + c * 60,
          y: -40 - r * 35,
          w: isBoss ? 34 : 26,
          h: isBoss ? 28 : 22,
          hp: isBoss ? 3 + Math.floor(this.wave / 2) : 1 + Math.floor(this.wave / 3),
          maxHp: isBoss ? 3 + Math.floor(this.wave / 2) : 1 + Math.floor(this.wave / 3),
          type: isBoss ? 'ELITE' : 'GRUNT',
          color: colors[r % colors.length],
          state: 'ENTER',
          diveVx: 0,
          diveVy: 0,
          phase: Math.random() * Math.PI * 2
        });
      }
    }
  }

  triggerGalaxyBomb() {
    if (!this.player || this.player.bombs <= 0) return;
    this.player.bombs--;
    this.sound.playBomb();
    this.screenShake = 16;
    this.enemyBullets = [];
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      e.hp -= 3;
      this.spawnParticles(e.x, e.y, '#00f7ff', 8);
      if (e.hp <= 0) {
        this.spawnParticles(e.x, e.y, e.color, 18);
        this.addScore(e.type === 'ELITE' ? 300 : 120, e.x, e.y, e.color);
        this.enemies.splice(i, 1);
      }
    }
  }

  updateGalaxyGame() {
    const p = this.player;
    if (this.keys.left) p.x -= p.speed;
    if (this.keys.right) p.x += p.speed;
    if (this.keys.up) p.y -= p.speed;
    if (this.keys.down) p.y += p.speed;
    p.x = Math.max(30, Math.min(this.width - 30, p.x));
    p.y = Math.max(260, Math.min(this.height - 65, p.y));

    if (p.invincible > 0) p.invincible--;
    if (p.cooldown > 0) p.cooldown--;

    if (this.keys.btnA && p.cooldown <= 0) {
      p.cooldown = 8;
      this.sound.playLaser();
      if (p.weaponLevel === 1) {
        this.bullets.push({ x: p.x, y: p.y - 16, vx: 0, vy: -10, color: '#00f7ff' });
      } else if (p.weaponLevel === 2) {
        this.bullets.push({ x: p.x - 10, y: p.y - 12, vx: 0, vy: -10, color: '#00f7ff' });
        this.bullets.push({ x: p.x + 10, y: p.y - 12, vx: 0, vy: -10, color: '#00f7ff' });
      } else {
        this.bullets.push({ x: p.x, y: p.y - 16, vx: 0, vy: -11, color: '#facc15' });
        this.bullets.push({ x: p.x - 12, y: p.y - 10, vx: -1.6, vy: -10, color: '#00f7ff' });
        this.bullets.push({ x: p.x + 12, y: p.y - 10, vx: 1.6, vy: -10, color: '#00f7ff' });
      }
    }

    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.x += b.vx;
      b.y += b.vy;
      if (b.y < 50) this.bullets.splice(i, 1);
    }

    const sway = Math.sin(this.frameCount * 0.04) * 32;
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (e.state === 'ENTER') {
        e.y += (e.homeY - e.y) * 0.08;
        e.x = e.homeX + sway;
        if (Math.abs(e.y - e.homeY) < 2) e.state = 'FORMATION';
      } else if (e.state === 'FORMATION') {
        e.x = e.homeX + sway;
        e.y = e.homeY + Math.sin(this.frameCount * 0.07 + e.phase) * 5;
        if (Math.random() < 0.0018 * (1 + this.wave * 0.25)) {
          e.state = 'DIVE';
          const angle = Math.atan2(p.y - e.y, p.x - e.x);
          const spd = 3.2 + Math.min(2.5, this.wave * 0.35);
          e.diveVx = Math.cos(angle) * spd;
          e.diveVy = Math.sin(angle) * spd;
        }
        if (Math.random() < 0.003 * (1 + this.wave * 0.2)) {
          this.enemyBullets.push({ x: e.x, y: e.y + 12, vx: 0, vy: 4.2 + this.wave * 0.3 });
        }
      } else if (e.state === 'DIVE') {
        e.x += e.diveVx;
        e.y += e.diveVy;
        if (e.y > this.height + 20) {
          e.y = -20;
          e.state = 'ENTER';
        }
      }

      for (let j = this.bullets.length - 1; j >= 0; j--) {
        const b = this.bullets[j];
        if (Math.abs(b.x - e.x) < e.w / 2 + 4 && Math.abs(b.y - e.y) < e.h / 2 + 6) {
          this.bullets.splice(j, 1);
          e.hp--;
          this.spawnParticles(b.x, b.y, '#ffffff', 4);
          if (e.hp <= 0) {
            this.sound.playExplosion();
            this.spawnParticles(e.x, e.y, e.color, 18);
            const pts = e.type === 'ELITE' ? 300 : 100;
            this.addScore(pts, e.x, e.y, e.color);
            if (Math.random() < 0.14) {
              this.powerups.push({
                x: e.x,
                y: e.y,
                kind: Math.random() < 0.7 ? 'WEAPON' : 'BOMB'
              });
            }
            this.enemies.splice(i, 1);
          }
          break;
        }
      }

      if (p.invincible <= 0 && Math.abs(p.x - e.x) < (p.w + e.w) * 0.4 && Math.abs(p.y - e.y) < (p.h + e.h) * 0.4) {
        this.damagePlayer();
      }
    }

    for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
      const eb = this.enemyBullets[i];
      eb.x += eb.vx;
      eb.y += eb.vy;
      if (p.invincible <= 0 && Math.abs(eb.x - p.x) < p.w * 0.4 && Math.abs(eb.y - p.y) < p.h * 0.4) {
        this.enemyBullets.splice(i, 1);
        this.damagePlayer();
        continue;
      }
      if (eb.y > this.height) this.enemyBullets.splice(i, 1);
    }

    for (let i = this.powerups.length - 1; i >= 0; i--) {
      const pw = this.powerups[i];
      pw.y += 2.2;
      if (Math.abs(pw.x - p.x) < 24 && Math.abs(pw.y - p.y) < 24) {
        this.sound.playPowerup();
        if (pw.kind === 'WEAPON') {
          p.weaponLevel = Math.min(3, p.weaponLevel + 1);
          this.addScore(250, pw.x, pw.y, '#00f7ff');
        } else {
          p.bombs = Math.min(5, p.bombs + 1);
          this.addScore(250, pw.x, pw.y, '#facc15');
        }
        this.powerups.splice(i, 1);
        continue;
      }
      if (pw.y > this.height) this.powerups.splice(i, 1);
    }

    if (this.enemies.length === 0) {
      this.wave++;
      this.sound.playPowerup();
      this.spawnGalaxyWave();
    }
  }

  damagePlayer() {
    this.sound.playExplosion();
    this.screenShake = 14;
    this.spawnParticles(this.player.x, this.player.y, '#ff2a85', 24);
    this.lives--;
    this.player.weaponLevel = Math.max(1, this.player.weaponLevel - 1);
    this.player.invincible = 90;
    if (this.lives <= 0) {
      this.sound.playGameOver();
      this.state = 'GAMEOVER';
    }
  }

  // -----------------------------------------------------------------------
  // GAME 2: NEON ARKANOID (2D Brick Breaker)
  // -----------------------------------------------------------------------
  initBreakerGame() {
    this.paddle = { x: this.width / 2, y: this.height - 78, w: 88, h: 14, speed: 6.5 };
    this.ball = { x: this.width / 2, y: this.height - 94, vx: 4.2, vy: -5.2, r: 7, stuck: true };
    this.spawnBreakerBricks();
  }

  spawnBreakerBricks() {
    this.bricks = [];
    const rows = Math.min(7, 4 + this.wave);
    const cols = 8;
    const colors = ['#ff2a85', '#f97316', '#facc15', '#22c55e', '#00f7ff', '#a855f7'];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        this.bricks.push({
          x: 42 + c * 56,
          y: 110 + r * 26,
          w: 50,
          h: 18,
          hp: r < 2 ? 2 : 1,
          color: colors[r % colors.length]
        });
      }
    }
  }

  launchBreakerBall() {
    if (this.ball && this.ball.stuck) {
      this.ball.stuck = false;
      this.ball.vx = (Math.random() > 0.5 ? 1 : -1) * (4 + this.wave * 0.3);
      this.ball.vy = -(5.4 + this.wave * 0.3);
      this.sound.playBounce();
    }
  }

  updateBreakerGame() {
    const pd = this.paddle;
    const spd = this.keys.btnB ? pd.speed * 1.45 : pd.speed;
    if (this.keys.left) pd.x -= spd;
    if (this.keys.right) pd.x += spd;
    pd.x = Math.max(pd.w / 2 + 16, Math.min(this.width - pd.w / 2 - 16, pd.x));

    const b = this.ball;
    if (b.stuck) {
      b.x = pd.x;
      b.y = pd.y - 16;
      if (this.keys.btnA) this.launchBreakerBall();
      return;
    }

    b.x += b.vx;
    b.y += b.vy;

    if (b.x < 20 + b.r) { b.x = 20 + b.r; b.vx *= -1; this.sound.playBounce(); }
    if (b.x > this.width - 20 - b.r) { b.x = this.width - 20 - b.r; b.vx *= -1; this.sound.playBounce(); }
    if (b.y < 65 + b.r) { b.y = 65 + b.r; b.vy *= -1; this.sound.playBounce(); }

    // Paddle bounce
    if (b.vy > 0 && Math.abs(b.x - pd.x) < pd.w / 2 + b.r && Math.abs(b.y - pd.y) < pd.h / 2 + b.r) {
      const hitOffset = (b.x - pd.x) / (pd.w / 2);
      const speed = Math.min(9.5, Math.hypot(b.vx, b.vy) * 1.02);
      const angle = hitOffset * (Math.PI / 3);
      b.vx = Math.sin(angle) * speed;
      b.vy = -Math.cos(angle) * speed;
      b.y = pd.y - pd.h / 2 - b.r;
      this.sound.playBounce();
      this.spawnParticles(b.x, b.y, '#00f7ff', 6);
    }

    // Bricks collision
    for (let i = this.bricks.length - 1; i >= 0; i--) {
      const br = this.bricks[i];
      if (
        b.x + b.r > br.x &&
        b.x - b.r < br.x + br.w &&
        b.y + b.r > br.y &&
        b.y - b.r < br.y + br.h
      ) {
        b.vy *= -1;
        br.hp--;
        if (br.hp <= 0) {
          this.sound.playExplosion();
          this.spawnParticles(br.x + br.w / 2, br.y + br.h / 2, br.color, 14);
          this.addScore(150, br.x + br.w / 2, br.y, br.color);
          this.bricks.splice(i, 1);
        } else {
          this.sound.playBounce();
          this.addScore(50, br.x + br.w / 2, br.y, '#ffffff');
        }
        break;
      }
    }

    if (b.y > this.height - 20) {
      this.lives--;
      this.sound.playExplosion();
      this.screenShake = 12;
      if (this.lives <= 0) {
        this.sound.playGameOver();
        this.state = 'GAMEOVER';
      } else {
        b.stuck = true;
      }
    }

    if (this.bricks.length === 0) {
      this.wave++;
      this.sound.playPowerup();
      b.stuck = true;
      this.spawnBreakerBricks();
    }
  }

  // -----------------------------------------------------------------------
  // GAME 3: CYBER SNAKE DX (2D Grid Snake)
  // -----------------------------------------------------------------------
  initSnakeGame() {
    this.gridCols = 22;
    this.gridRows = 24;
    this.cellSize = 20;
    this.gridOffsetX = 36;
    this.gridOffsetY = 92;
    this.snake = [
      { x: 10, y: 12 },
      { x: 9, y: 12 },
      { x: 8, y: 12 },
      { x: 7, y: 12 }
    ];
    this.snakeDir = { x: 1, y: 0 };
    this.nextSnakeDir = { x: 1, y: 0 };
    this.snakeTimer = 0;
    this.spawnSnakeFood();
  }

  spawnSnakeFood() {
    while (true) {
      const fx = Math.floor(Math.random() * this.gridCols);
      const fy = Math.floor(Math.random() * this.gridRows);
      if (!this.snake.some(s => s.x === fx && s.y === fy)) {
        this.snakeFood = {
          x: fx,
          y: fy,
          bonus: Math.random() < 0.25
        };
        break;
      }
    }
  }

  handleSnakeDirKey(code) {
    if ((code === 'ArrowUp' || code === 'KeyW') && this.snakeDir.y === 0) {
      this.nextSnakeDir = { x: 0, y: -1 };
    } else if ((code === 'ArrowDown' || code === 'KeyS') && this.snakeDir.y === 0) {
      this.nextSnakeDir = { x: 0, y: 1 };
    } else if ((code === 'ArrowLeft' || code === 'KeyA') && this.snakeDir.x === 0) {
      this.nextSnakeDir = { x: -1, y: 0 };
    } else if ((code === 'ArrowRight' || code === 'KeyD') && this.snakeDir.x === 0) {
      this.nextSnakeDir = { x: 1, y: 0 };
    }
  }

  updateSnakeGame() {
    if (this.keys.up && this.snakeDir.y === 0) this.nextSnakeDir = { x: 0, y: -1 };
    else if (this.keys.down && this.snakeDir.y === 0) this.nextSnakeDir = { x: 0, y: 1 };
    else if (this.keys.left && this.snakeDir.x === 0) this.nextSnakeDir = { x: -1, y: 0 };
    else if (this.keys.right && this.snakeDir.x === 0) this.nextSnakeDir = { x: 1, y: 0 };

    const interval = (this.keys.btnA || this.keys.btnB) ? 3 : Math.max(4, 7 - Math.floor(this.wave / 2));
    this.snakeTimer++;
    if (this.snakeTimer < interval) return;
    this.snakeTimer = 0;

    this.snakeDir = { ...this.nextSnakeDir };
    const head = {
      x: this.snake[0].x + this.snakeDir.x,
      y: this.snake[0].y + this.snakeDir.y
    };

    // Wall or self collision
    if (
      head.x < 0 ||
      head.x >= this.gridCols ||
      head.y < 0 ||
      head.y >= this.gridRows ||
      this.snake.some(s => s.x === head.x && s.y === head.y)
    ) {
      this.lives--;
      this.sound.playExplosion();
      this.screenShake = 14;
      const px = this.gridOffsetX + this.snake[0].x * this.cellSize;
      const py = this.gridOffsetY + this.snake[0].y * this.cellSize;
      this.spawnParticles(px, py, '#ff2a85', 22);
      if (this.lives <= 0) {
        this.sound.playGameOver();
        this.state = 'GAMEOVER';
      } else {
        this.snake = [
          { x: 10, y: 12 },
          { x: 9, y: 12 },
          { x: 8, y: 12 },
          { x: 7, y: 12 }
        ];
        this.snakeDir = { x: 1, y: 0 };
        this.nextSnakeDir = { x: 1, y: 0 };
      }
      return;
    }

    this.snake.unshift(head);
    if (head.x === this.snakeFood.x && head.y === this.snakeFood.y) {
      this.sound.playPowerup();
      const fx = this.gridOffsetX + head.x * this.cellSize + 10;
      const fy = this.gridOffsetY + head.y * this.cellSize + 10;
      const pts = this.snakeFood.bonus ? 400 : 150;
      this.addScore(pts, fx, fy, this.snakeFood.bonus ? '#facc15' : '#a3e635');
      this.spawnParticles(fx, fy, '#a3e635', 14);
      if (this.snake.length % 6 === 0) this.wave++;
      this.spawnSnakeFood();
    } else {
      this.snake.pop();
    }
  }

  // -----------------------------------------------------------------------
  // MAIN UPDATE & 2D CRT RENDER
  // -----------------------------------------------------------------------
  update() {
    this.frameCount++;
    if (this.screenShake > 0) this.screenShake *= 0.85;
    if (this.screenShake < 0.4) this.screenShake = 0;

    for (const st of this.stars) {
      st.y += st.speed * (this.state === 'PLAYING' ? 1.5 : 0.8);
      if (st.y > this.height) {
        st.y = 0;
        st.x = Math.random() * this.width;
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.x += pt.vx;
      pt.y += pt.vy;
      pt.life--;
      if (pt.life <= 0) this.particles.splice(i, 1);
    }

    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y -= 1.1;
      ft.life--;
      if (ft.life <= 0) this.floatingTexts.splice(i, 1);
    }

    if (this.state === 'PLAYING') {
      const gId = this.games[this.selectedGameIndex].id;
      if (gId === 'GALAXY') this.updateGalaxyGame();
      else if (gId === 'BREAKER') this.updateBreakerGame();
      else if (gId === 'SNAKE') this.updateSnakeGame();
    }

    this.render();
  }

  render() {
    const ctx = this.ctx;
    ctx.save();

    if (this.screenShake > 0) {
      ctx.translate(
        (Math.random() - 0.5) * this.screenShake,
        (Math.random() - 0.5) * this.screenShake
      );
    }

    // CRT Dark Background
    ctx.fillStyle = '#060714';
    ctx.fillRect(0, 0, this.width, this.height);

    // Starfield
    for (const st of this.stars) {
      ctx.fillStyle = st.color;
      ctx.fillRect(st.x, st.y, st.size, st.size);
    }

    // Top Arcade Header Bar
    const curGame = this.games[this.selectedGameIndex];
    ctx.fillStyle = '#0d1026';
    ctx.fillRect(0, 0, this.width, 54);
    ctx.strokeStyle = curGame.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 54);
    ctx.lineTo(this.width, 54);
    ctx.stroke();

    ctx.font = 'bold 16px Courier New';
    ctx.fillStyle = '#ff2a85';
    ctx.textAlign = 'left';
    ctx.fillText('1UP SCORE', 20, 22);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(String(this.score).padStart(6, '0'), 20, 43);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#facc15';
    ctx.fillText('HIGH SCORE', this.width / 2, 22);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(String(this.highScores[curGame.id]).padStart(6, '0'), this.width / 2, 43);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#00f7ff';
    ctx.fillText('WAVE ' + this.wave, this.width - 20, 22);
    ctx.fillStyle = '#a3e635';
    ctx.fillText('LIVES:' + '♥'.repeat(Math.max(0, this.lives)), this.width - 20, 43);

    // State Specific Rendering
    if (this.state === 'ATTRACT') {
      this.renderAttract(ctx);
    } else if (this.state === 'SELECT') {
      this.renderSelect(ctx);
    } else if (this.state === 'PLAYING') {
      if (curGame.id === 'GALAXY') this.renderGalaxy(ctx);
      else if (curGame.id === 'BREAKER') this.renderBreaker(ctx);
      else if (curGame.id === 'SNAKE') this.renderSnake(ctx);
    } else if (this.state === 'GAMEOVER') {
      this.renderGameOver(ctx);
    }

    // Particles & Floating Score Popups
    for (const pt of this.particles) {
      ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
      ctx.fillStyle = pt.color;
      ctx.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size);
    }
    ctx.globalAlpha = 1;

    ctx.font = 'bold 15px Courier New';
    ctx.textAlign = 'center';
    for (const ft of this.floatingTexts) {
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, ft.x, ft.y);
    }

    // Bottom Credit Bar
    ctx.fillStyle = '#0b0d20';
    ctx.fillRect(0, this.height - 36, this.width, 36);
    ctx.font = 'bold 15px Courier New';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#facc15';
    ctx.fillText('CREDIT ' + String(this.credits).padStart(2, '0'), 20, this.height - 13);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('[M] GAME MENU   [C] INSERT COIN', this.width - 20, this.height - 13);

    // CRT Scanline & Vignette Effect
    ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
    for (let y = 0; y < this.height; y += 4) {
      ctx.fillRect(0, y, this.width, 2);
    }

    ctx.strokeStyle = 'rgba(0, 247, 255, 0.22)';
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, this.width - 6, this.height - 6);

    ctx.restore();
  }

  renderAttract(ctx) {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#00f7ff';
    ctx.font = 'bold 38px Courier New';
    ctx.fillText('NEON ARCADE', this.width / 2, 150);
    ctx.fillStyle = '#ff2a85';
    ctx.font = 'bold 28px Courier New';
    ctx.fillText('3-IN-1 SYSTEM (1984)', this.width / 2, 190);

    // Demo preview box
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.strokeRect(56, 225, this.width - 112, 220);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.fillRect(56, 225, this.width - 112, 220);

    ctx.font = 'bold 18px Courier New';
    this.games.forEach((g, idx) => {
      const y = 272 + idx * 54;
      ctx.fillStyle = g.color;
      ctx.fillText((idx + 1) + '. ' + g.title + ' [' + g.genre + ']', this.width / 2, y);
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '14px Courier New';
      ctx.fillText(g.desc, this.width / 2, y + 20);
      ctx.font = 'bold 18px Courier New';
    });

    if (Math.floor(this.frameCount / 25) % 2 === 0) {
      ctx.fillStyle = '#facc15';
      ctx.font = 'bold 24px Courier New';
      ctx.fillText('INSERT COIN [PRESS C OR ENTER]', this.width / 2, 510);
    }
    ctx.fillStyle = '#94a3b8';
    ctx.font = '15px Courier New';
    ctx.fillText('OR CLICK THE 3D COIN SLOT / START BUTTON', this.width / 2, 548);
  }

  renderSelect(ctx) {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#facc15';
    ctx.font = 'bold 28px Courier New';
    ctx.fillText('SELECT YOUR 2D GAME', this.width / 2, 115);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '15px Courier New';
    ctx.fillText('USE JOYSTICK [W/S OR UP/DOWN] & PRESS [SPACE/START]', this.width / 2, 145);

    this.games.forEach((g, idx) => {
      const y = 178 + idx * 118;
      const selected = idx === this.selectedGameIndex;
      ctx.fillStyle = selected ? 'rgba(30, 41, 59, 0.95)' : 'rgba(15, 23, 42, 0.65)';
      ctx.fillRect(48, y, this.width - 96, 98);
      ctx.lineWidth = selected ? 4 : 1.5;
      ctx.strokeStyle = selected ? g.color : '#334155';
      ctx.strokeRect(48, y, this.width - 96, 98);

      ctx.textAlign = 'left';
      ctx.fillStyle = g.color;
      ctx.font = 'bold 22px Courier New';
      ctx.fillText((selected ? '> ' : '  ') + g.title, 68, y + 36);

      ctx.fillStyle = '#e2e8f0';
      ctx.font = '14px Courier New';
      ctx.fillText(g.genre + '  |  HI: ' + this.highScores[g.id], 88, y + 60);
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(g.desc, 88, y + 82);
    });

    ctx.textAlign = 'center';
    if (Math.floor(this.frameCount / 20) % 2 === 0) {
      ctx.fillStyle = '#00f7ff';
      ctx.font = 'bold 22px Courier New';
      ctx.fillText('PRESS [SPACE] OR [ENTER] TO START!', this.width / 2, 565);
    }
  }

  renderGalaxy(ctx) {
    const p = this.player;
    // Draw Player Ship (Pixel-style Fighter)
    if (p.invincible % 4 < 2) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.fillStyle = '#00f7ff';
      ctx.fillRect(-4, -15, 8, 30);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(-14, -2, 28, 12);
      ctx.fillStyle = '#ff2a85';
      ctx.fillRect(-18, 4, 6, 12);
      ctx.fillRect(12, 4, 6, 12);
      ctx.fillStyle = '#facc15';
      ctx.fillRect(-3, 14, 6, 5 + (this.frameCount % 5));
      ctx.restore();
    }

    // Draw Bullets
    for (const b of this.bullets) {
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x - 2, b.y - 8, 4, 14);
    }

    // Draw Enemy Bullets
    ctx.fillStyle = '#ff2a85';
    for (const eb of this.enemyBullets) {
      ctx.fillRect(eb.x - 3, eb.y - 5, 6, 10);
    }

    // Draw Enemies
    for (const e of this.enemies) {
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.fillStyle = e.color;
      const w = e.w;
      const h = e.h;
      ctx.fillRect(-w / 2, -h / 2, w, h * 0.65);
      const flap = Math.sin(this.frameCount * 0.25 + e.phase) > 0 ? 4 : -2;
      ctx.fillRect(-w / 2 - 4, -2 + flap, 6, 10);
      ctx.fillRect(w / 2 - 2, -2 + flap, 6, 10);
      ctx.fillStyle = '#060714';
      ctx.fillRect(-w * 0.25, -4, 4, 4);
      ctx.fillRect(w * 0.25 - 4, -4, 4, 4);
      ctx.restore();
    }

    // Draw Powerups
    for (const pw of this.powerups) {
      ctx.fillStyle = pw.kind === 'WEAPON' ? '#00f7ff' : '#facc15';
      ctx.fillRect(pw.x - 10, pw.y - 10, 20, 20);
      ctx.fillStyle = '#000';
      ctx.font = 'bold 14px Courier New';
      ctx.textAlign = 'center';
      ctx.fillText(pw.kind === 'WEAPON' ? 'W' : 'B', pw.x, pw.y + 5);
    }

    // Bombs indicator
    ctx.textAlign = 'left';
    ctx.fillStyle = '#facc15';
    ctx.font = 'bold 15px Courier New';
    ctx.fillText('BOMBS [X]: ' + '★'.repeat(p.bombs), 20, this.height - 46);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#00f7ff';
    ctx.fillText('WEAPON LV.' + p.weaponLevel, this.width - 20, this.height - 46);
  }

  renderBreaker(ctx) {
    // Arena Border
    ctx.strokeStyle = '#ff2a85';
    ctx.lineWidth = 3;
    ctx.strokeRect(18, 64, this.width - 36, this.height - 110);

    // Paddle
    const pd = this.paddle;
    ctx.fillStyle = '#00f7ff';
    ctx.fillRect(pd.x - pd.w / 2, pd.y - pd.h / 2, pd.w, pd.h);
    ctx.fillStyle = '#ff2a85';
    ctx.fillRect(pd.x - pd.w / 2, pd.y - pd.h / 2, 10, pd.h);
    ctx.fillRect(pd.x + pd.w / 2 - 10, pd.y - pd.h / 2, 10, pd.h);

    // Ball
    const b = this.ball;
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();

    // Bricks
    for (const br of this.bricks) {
      ctx.fillStyle = br.color;
      ctx.fillRect(br.x, br.y, br.w, br.h);
      if (br.hp > 1) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(br.x + 2, br.y + 2, br.w - 4, br.h - 4);
      }
    }

    if (b.stuck) {
      ctx.textAlign = 'center';
      ctx.fillStyle = '#facc15';
      ctx.font = 'bold 18px Courier New';
      ctx.fillText('PRESS [SPACE / A-BTN] TO LAUNCH BALL', this.width / 2, this.height - 125);
    }
  }

  renderSnake(ctx) {
    const ox = this.gridOffsetX;
    const oy = this.gridOffsetY;
    const cs = this.cellSize;
    const gw = this.gridCols * cs;
    const gh = this.gridRows * cs;

    // Grid background
    ctx.fillStyle = 'rgba(10, 18, 32, 0.85)';
    ctx.fillRect(ox, oy, gw, gh);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let c = 0; c <= this.gridCols; c++) {
      ctx.beginPath();
      ctx.moveTo(ox + c * cs, oy);
      ctx.lineTo(ox + c * cs, oy + gh);
      ctx.stroke();
    }
    for (let r = 0; r <= this.gridRows; r++) {
      ctx.beginPath();
      ctx.moveTo(ox, oy + r * cs);
      ctx.lineTo(ox + gw, oy + r * cs);
      ctx.stroke();
    }
    ctx.strokeStyle = '#a3e635';
    ctx.lineWidth = 3;
    ctx.strokeRect(ox, oy, gw, gh);

    // Food
    if (this.snakeFood) {
      ctx.fillStyle = this.snakeFood.bonus ? '#facc15' : '#ff2a85';
      ctx.fillRect(
        ox + this.snakeFood.x * cs + 2,
        oy + this.snakeFood.y * cs + 2,
        cs - 4,
        cs - 4
      );
    }

    // Snake segments
    this.snake.forEach((seg, idx) => {
      ctx.fillStyle = idx === 0 ? '#00f7ff' : '#a3e635';
      ctx.fillRect(ox + seg.x * cs + 1, oy + seg.y * cs + 1, cs - 2, cs - 2);
    });
  }

  renderGameOver(ctx) {
    ctx.fillStyle = 'rgba(6, 7, 20, 0.82)';
    ctx.fillRect(44, 180, this.width - 88, 270);
    ctx.strokeStyle = '#ff2a85';
    ctx.lineWidth = 3;
    ctx.strokeRect(44, 180, this.width - 88, 270);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff2a85';
    ctx.font = 'bold 42px Courier New';
    ctx.fillText('GAME OVER', this.width / 2, 248);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px Courier New';
    ctx.fillText('FINAL SCORE: ' + this.score, this.width / 2, 305);

    ctx.fillStyle = '#facc15';
    ctx.font = 'bold 18px Courier New';
    ctx.fillText('PRESS [SPACE / ENTER] TO RETRY', this.width / 2, 365);
    ctx.fillStyle = '#00f7ff';
    ctx.fillText('PRESS [X / M] FOR GAME SELECT', this.width / 2, 405);
  }
}

window.Arcade2DEngine = Arcade2DEngine;
