// Particles and floating combat text: the juice that makes hits, deaths,
// pickups and dashes feel physical. Pure data plus an update/draw pair; the
// game spawns bursts and the system fades them out on its own.

export class Particles {
  constructor() {
    this.sparks = []; // { x, y, vx, vy, life, maxLife, size, color, drag }
    this.texts = []; // { x, y, life, maxLife, text, color, size }
    this.rings = []; // { x, y, radius, maxRadius, life, maxLife, color, width }
  }

  burst(x, y, color, count, speed = 160, size = 3) {
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const velocity = speed * (0.3 + Math.random() * 0.9);
      this.sparks.push({
        x,
        y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        life: 0,
        maxLife: 0.4 + Math.random() * 0.45,
        size: size * (0.6 + Math.random() * 0.8),
        color,
        drag: 0.88,
      });
    }
  }

  trail(x, y, color, size = 5) {
    this.sparks.push({
      x, y, vx: 0, vy: 0,
      life: 0, maxLife: 0.28, size, color, drag: 1,
    });
  }

  ring(x, y, color, maxRadius, width = 3) {
    this.rings.push({ x, y, radius: 4, maxRadius, life: 0, maxLife: 0.45, color, width });
  }

  floatText(x, y, text, color = '#ffffff', size = 15) {
    this.texts.push({ x, y, life: 0, maxLife: 0.9, text, color, size });
  }

  update(dt) {
    for (const spark of this.sparks) {
      spark.life += dt;
      spark.x += spark.vx * dt;
      spark.y += spark.vy * dt;
      spark.vx *= spark.drag;
      spark.vy *= spark.drag;
    }
    this.sparks = this.sparks.filter((s) => s.life < s.maxLife);
    for (const ring of this.rings) {
      ring.life += dt;
      ring.radius = 4 + (ring.maxRadius - 4) * (ring.life / ring.maxLife);
    }
    this.rings = this.rings.filter((r) => r.life < r.maxLife);
    for (const text of this.texts) {
      text.life += dt;
      text.y -= 34 * dt;
    }
    this.texts = this.texts.filter((t) => t.life < t.maxLife);
  }

  draw(ctx, scale = 1) {
    for (const ring of this.rings) {
      const alpha = 1 - ring.life / ring.maxLife;
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = ring.color;
      ctx.lineWidth = ring.width * scale;
      ctx.beginPath();
      ctx.arc(ring.x, ring.y, ring.radius * scale, 0, Math.PI * 2);
      ctx.stroke();
    }
    for (const spark of this.sparks) {
      const alpha = 1 - spark.life / spark.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = spark.color;
      ctx.beginPath();
      ctx.arc(spark.x, spark.y, (spark.size * alpha + 0.5) * scale, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    for (const text of this.texts) {
      const alpha = 1 - text.life / text.maxLife;
      ctx.globalAlpha = alpha;
      ctx.font = `700 ${Math.round(text.size * scale)}px "Segoe UI", system-ui, sans-serif`;
      ctx.fillStyle = text.color;
      ctx.fillText(text.text, text.x, text.y);
    }
    ctx.globalAlpha = 1;
  }

  clear() {
    this.sparks = [];
    this.texts = [];
    this.rings = [];
  }
}
