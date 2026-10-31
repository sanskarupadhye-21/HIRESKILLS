/**
 * HireSkill AI — 3D Spatial & iOS Experience Engine
 * Implements real-time 3D neural core, VisionOS-style spatial card tilt,
 * dynamic specular reflections, live biometric audio waveforms, and Dynamic Island.
 */

(function () {
  'use strict';

  // ==========================================
  // 1. 3D NEURAL SPATIAL ORB ENGINE (WebGL / Canvas 3D)
  // ==========================================
  class Spatial3DNeuralOrb {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.width = canvas.clientWidth || 460;
      this.height = canvas.clientHeight || 460;
      this.pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

      this.rotX = 0.2;
      this.rotY = 0.4;
      this.targetRotX = 0.2;
      this.targetRotY = 0.4;
      this.mouseX = 0;
      this.mouseY = 0;
      this.isHovered = false;

      this.nodes = [];
      this.ringNodes1 = [];
      this.ringNodes2 = [];
      this.stardust = [];

      this.initScene();
      this.bindEvents();
      this.resize();
      this.loop = this.loop.bind(this);
      requestAnimationFrame(this.loop);
    }

    initScene() {
      const nodeCount = 54;
      const radius = 135;

      // Golden spiral sphere distribution (Fibonacci Sphere)
      for (let i = 0; i < nodeCount; i++) {
        const phi = Math.acos(1 - (2 * (i + 0.5)) / nodeCount);
        const theta = Math.PI * (1 + Math.sqrt(5)) * i;
        this.nodes.push({
          x: radius * Math.sin(phi) * Math.cos(theta),
          y: radius * Math.sin(phi) * Math.sin(theta),
          z: radius * Math.cos(phi),
          baseRadius: radius,
          phi,
          theta,
          pulse: Math.random() * Math.PI * 2,
          pulseSpeed: 0.02 + Math.random() * 0.03,
          color: i % 3 === 0 ? '#0A84FF' : i % 3 === 1 ? '#30D158' : '#5E5CE6',
          size: 2.5 + Math.random() * 2
        });
      }

      // 3D Orbital Ring 1: Speech Wave Signal Ring
      const ring1Count = 36;
      for (let i = 0; i < ring1Count; i++) {
        const angle = (i / ring1Count) * Math.PI * 2;
        this.ringNodes1.push({
          angle,
          radius: 175,
          color: '#0A84FF',
          speed: 0.012
        });
      }

      // 3D Orbital Ring 2: Facial Biometric Ring (tilted 60 deg)
      const ring2Count = 36;
      for (let i = 0; i < ring2Count; i++) {
        const angle = (i / ring2Count) * Math.PI * 2;
        this.ringNodes2.push({
          angle,
          radius: 195,
          color: '#30D158',
          speed: -0.009
        });
      }

      // Ambient 3D floating stardust particles
      for (let i = 0; i < 40; i++) {
        this.stardust.push({
          x: (Math.random() - 0.5) * 500,
          y: (Math.random() - 0.5) * 500,
          z: (Math.random() - 0.5) * 500,
          size: 1 + Math.random() * 1.5,
          alpha: 0.2 + Math.random() * 0.5,
          speed: 0.2 + Math.random() * 0.5
        });
      }
    }

    bindEvents() {
      window.addEventListener('resize', () => this.resize());

      const targetEl = this.canvas.parentElement || this.canvas;
      targetEl.addEventListener('mousemove', (e) => {
        const rect = this.canvas.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const nx = (e.clientX - cx) / (rect.width / 2);
        const ny = (e.clientY - cy) / (rect.height / 2);

        this.targetRotY = nx * 1.2;
        this.targetRotX = -ny * 0.9;
        this.isHovered = true;
      });

      targetEl.addEventListener('mouseleave', () => {
        this.isHovered = false;
      });

      // Touch events for mobile
      targetEl.addEventListener('touchmove', (e) => {
        if (!e.touches[0]) return;
        const rect = this.canvas.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        this.targetRotY = ((e.touches[0].clientX - cx) / (rect.width / 2)) * 1.2;
        this.targetRotX = -((e.touches[0].clientY - cy) / (rect.height / 2)) * 0.9;
      }, { passive: true });
    }

    resize() {
      const rect = this.canvas.getBoundingClientRect();
      this.width = rect.width || 460;
      this.height = rect.height || 460;
      this.canvas.width = this.width * this.pixelRatio;
      this.canvas.height = this.height * this.pixelRatio;
      this.ctx.scale(this.pixelRatio, this.pixelRatio);
    }

    rotateX(x, y, z, angle) {
      const rad = angle;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      return {
        x: x,
        y: y * cos - z * sin,
        z: y * sin + z * cos
      };
    }

    rotateY(x, y, z, angle) {
      const rad = angle;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      return {
        x: x * cos + z * sin,
        y: y,
        z: -x * sin + z * cos
      };
    }

    project(p, fov = 420) {
      const factor = fov / (fov + p.z);
      return {
        x: p.x * factor + this.width / 2,
        y: p.y * factor + this.height / 2,
        scale: factor,
        z: p.z
      };
    }

    loop() {
      // Smooth inertia rotation
      if (!this.isHovered) {
        this.targetRotY += 0.004;
        this.targetRotX = Math.sin(Date.now() * 0.001) * 0.15;
      }

      this.rotX += (this.targetRotX - this.rotX) * 0.06;
      this.rotY += (this.targetRotY - this.rotY) * 0.06;

      const ctx = this.ctx;
      ctx.clearRect(0, 0, this.width, this.height);

      const fov = 440;
      const projectedNodes = [];

      // 1. Draw central glowing ambient core
      const coreGrad = ctx.createRadialGradient(
        this.width / 2, this.height / 2, 5,
        this.width / 2, this.height / 2, 160
      );
      coreGrad.addColorStop(0, 'rgba(10, 132, 255, 0.28)');
      coreGrad.addColorStop(0.4, 'rgba(94, 92, 230, 0.16)');
      coreGrad.addColorStop(0.8, 'rgba(48, 209, 88, 0.06)');
      coreGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(this.width / 2, this.height / 2, 160, 0, Math.PI * 2);
      ctx.fill();

      // 2. Render Stardust
      this.stardust.forEach((s) => {
        s.y -= s.speed;
        if (s.y < -250) s.y = 250;
        let r = this.rotateX(s.x, s.y, s.z, this.rotX * 0.5);
        r = this.rotateY(r.x, r.y, r.z, this.rotY * 0.5);
        const proj = this.project(r, fov);
        if (proj.scale > 0) {
          ctx.beginPath();
          ctx.arc(proj.x, proj.y, s.size * proj.scale, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${s.alpha * proj.scale * 0.5})`;
          ctx.fill();
        }
      });

      // 3. Transform sphere nodes
      this.nodes.forEach((node) => {
        node.pulse += node.pulseSpeed;
        const currentR = node.baseRadius + Math.sin(node.pulse) * 4;
        const x0 = currentR * Math.sin(node.phi) * Math.cos(node.theta);
        const y0 = currentR * Math.sin(node.phi) * Math.sin(node.theta);
        const z0 = currentR * Math.cos(node.phi);

        let r = this.rotateX(x0, y0, z0, this.rotX);
        r = this.rotateY(r.x, r.y, r.z, this.rotY);
        const proj = this.project(r, fov);
        proj.color = node.color;
        proj.size = node.size;
        projectedNodes.push(proj);
      });

      // 4. Draw connecting synaptic lines between nearest nodes
      ctx.lineWidth = 1;
      for (let i = 0; i < projectedNodes.length; i++) {
        const p1 = projectedNodes[i];
        for (let j = i + 1; j < projectedNodes.length; j++) {
          const p2 = projectedNodes[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 64) {
            const alpha = (1 - dist / 64) * 0.28 * Math.min(p1.scale, p2.scale);
            ctx.beginPath();
            ctx.strokeStyle = `rgba(142, 142, 147, ${alpha})`;
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      }

      // 5. Draw 3D Orbital Ring 1 (Speech Signal Ring)
      ctx.beginPath();
      const ring1Points = [];
      const time = Date.now() * 0.0015;
      this.ringNodes1.forEach((rn, idx) => {
        rn.angle += rn.speed;
        // Dynamic sine wave undulating on the ring (speech waveform simulation)
        const wave = Math.sin(rn.angle * 6 + time * 3) * 8;
        const rx = (rn.radius + wave) * Math.cos(rn.angle);
        const rz = (rn.radius + wave) * Math.sin(rn.angle);
        const ry = Math.sin(rn.angle * 2) * 15;

        let r = this.rotateX(rx, ry, rz, this.rotX + 0.35);
        r = this.rotateY(r.x, r.y, r.z, this.rotY);
        const proj = this.project(r, fov);
        ring1Points.push(proj);

        if (idx === 0) ctx.moveTo(proj.x, proj.y);
        else ctx.lineTo(proj.x, proj.y);
      });
      ctx.closePath();
      ctx.strokeStyle = 'rgba(10, 132, 255, 0.35)';
      ctx.lineWidth = 1.6;
      ctx.stroke();

      // Draw active pulses on Ring 1
      ring1Points.forEach((p, idx) => {
        if (idx % 4 === 0) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 2.8 * p.scale, 0, Math.PI * 2);
          ctx.fillStyle = '#0A84FF';
          ctx.shadowColor = '#0A84FF';
          ctx.shadowBlur = 8;
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      });

      // 6. Draw 3D Orbital Ring 2 (Facial Signal Ring)
      ctx.beginPath();
      const ring2Points = [];
      this.ringNodes2.forEach((rn, idx) => {
        rn.angle += rn.speed;
        const rx = rn.radius * Math.cos(rn.angle);
        const ry = rn.radius * Math.sin(rn.angle);
        const rz = 0;

        // Tilt Ring 2 diagonally
        let r = this.rotateX(rx, ry, rz, this.rotX - 0.7);
        r = this.rotateY(r.x, r.y, r.z, this.rotY + 0.4);
        const proj = this.project(r, fov);
        ring2Points.push(proj);

        if (idx === 0) ctx.moveTo(proj.x, proj.y);
        else ctx.lineTo(proj.x, proj.y);
      });
      ctx.closePath();
      ctx.strokeStyle = 'rgba(48, 209, 88, 0.3)';
      ctx.lineWidth = 1.4;
      ctx.stroke();

      ring2Points.forEach((p, idx) => {
        if (idx % 6 === 0) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 3 * p.scale, 0, Math.PI * 2);
          ctx.fillStyle = '#30D158';
          ctx.shadowColor = '#30D158';
          ctx.shadowBlur = 10;
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      });

      // 7. Sort nodes by Z-depth for correct occlusion rendering
      projectedNodes.sort((a, b) => a.z - b.z);

      // 8. Render nodes with 3D glow & depth
      projectedNodes.forEach((p) => {
        const radius = Math.max(1, p.size * p.scale);
        const alpha = Math.min(1, Math.max(0.2, (p.z + 180) / 360));

        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 10 * p.scale;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;

        // Specular node core
        if (p.scale > 1.05) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, radius * 0.4, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();
        }
      });

      requestAnimationFrame(this.loop);
    }
  }

  // ==========================================
  // 2. VISIONOS / APPLE 3D SPATIAL TILT & SPECULAR SHINE
  // ==========================================
  function initSpatialCardTilt() {
    const tiltElements = document.querySelectorAll(
      '.card, .dashboard-hero, .profile-hero, .report-hero, .metric-pill, .sidebar-card'
    );

    tiltElements.forEach((el) => {
      // Avoid double initialization
      if (el.dataset.spatialTiltReady) return;
      el.dataset.spatialTiltReady = 'true';

      // Inject specular shine sheen layer
      const shine = document.createElement('div');
      shine.className = 'ios-specular-shine';
      el.appendChild(shine);

      el.addEventListener('mousemove', (e) => {
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const deltaX = (x - centerX) / centerX;
        const deltaY = (y - centerY) / centerY;

        // Max tilt degree (gentle, Apple Vision Pro subtle 3D depth)
        const maxTilt = 7;
        const rotateY = deltaX * maxTilt;
        const rotateX = -deltaY * maxTilt;

        el.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateZ(6px)`;
        el.style.transition = 'transform 0.08s ease-out';

        // Move specular highlight over the card
        shine.style.opacity = '1';
        shine.style.background = `radial-gradient(circle 240px at ${x}px ${y}px, rgba(255, 255, 255, 0.16), transparent 80%)`;
      });

      el.addEventListener('mouseleave', () => {
        el.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0px)';
        el.style.transition = 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)';
        shine.style.opacity = '0';
        shine.style.transition = 'opacity 0.4s ease';
      });
    });
  }

  // ==========================================
  // 3. APPLE SIRI / VOICE MEMOS 3D AUDIO WAVEFORM
  // ==========================================
  function initVoiceWaveform(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;

    const ctx = canvas.getContext('2d');
    let animationId = null;
    let isActive = false;
    let step = 0;

    function resize() {
      const rect = canvas.getBoundingClientRect();
      canvas.width = (rect.width || 300) * (window.devicePixelRatio || 1);
      canvas.height = (rect.height || 60) * (window.devicePixelRatio || 1);
      ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
    }
    resize();
    window.addEventListener('resize', resize);

    const waves = [
      { color: 'rgba(10, 132, 255, 0.85)', speed: 0.08, amplitude: 14, wavelength: 0.02 },
      { color: 'rgba(48, 209, 88, 0.75)', speed: -0.06, amplitude: 18, wavelength: 0.025 },
      { color: 'rgba(94, 92, 230, 0.75)', speed: 0.1, amplitude: 12, wavelength: 0.018 },
      { color: 'rgba(255, 55, 95, 0.65)', speed: -0.07, amplitude: 10, wavelength: 0.03 }
    ];

    function draw() {
      const w = canvas.clientWidth || 300;
      const h = canvas.clientHeight || 60;
      const centerY = h / 2;

      ctx.clearRect(0, 0, w, h);

      waves.forEach((wave) => {
        ctx.beginPath();
        ctx.lineWidth = 2.4;
        ctx.strokeStyle = wave.color;

        const currentAmp = isActive ? wave.amplitude : 2;

        for (let x = 0; x < w; x++) {
          // Attenuate wave at edges (Apple Siri window function)
          const envelope = Math.sin((x / w) * Math.PI);
          const y = centerY + Math.sin(x * wave.wavelength + step * wave.speed) * currentAmp * envelope;

          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }

        ctx.shadowColor = wave.color;
        ctx.shadowBlur = isActive ? 12 : 2;
        ctx.stroke();
        ctx.shadowBlur = 0;
      });

      step += 1;
      animationId = requestAnimationFrame(draw);
    }

    draw();

    return {
      setActive(active) {
        isActive = active;
      },
      destroy() {
        if (animationId) cancelAnimationFrame(animationId);
      }
    };
  }

  // ==========================================
  // 4. APPLE DYNAMIC ISLAND COMPONENT
  // ==========================================
  function renderDynamicIsland() {
    let di = document.getElementById('apple-dynamic-island');
    if (di) return di;

    di = document.createElement('div');
    di.id = 'apple-dynamic-island';
    di.className = 'dynamic-island';
    di.innerHTML = `
      <div class="dynamic-island-pill" id="di-pill">
        <div class="di-left">
          <span class="di-dot" id="di-dot"></span>
          <span class="di-title" id="di-title">HireSkill AI</span>
        </div>
        <div class="di-center" id="di-wave-box">
          <span class="di-bar di-bar-1"></span>
          <span class="di-bar di-bar-2"></span>
          <span class="di-bar di-bar-3"></span>
          <span class="di-bar di-bar-4"></span>
        </div>
        <div class="di-right">
          <span class="di-status" id="di-status">Ready</span>
        </div>
      </div>
      <div class="di-expanded-sheet" id="di-expanded">
        <div class="di-exp-header">
          <div class="di-exp-brand">
            <span class="apple-logo"></span>
            <strong>HireSkill Intelligence</strong>
          </div>
          <span class="di-exp-badge">Active Track</span>
        </div>
        <div class="di-exp-metrics">
          <div class="di-exp-metric">
            <span class="di-lbl">Mode</span>
            <strong id="di-exp-mode">Full-Stack Rehearsal</strong>
          </div>
          <div class="di-exp-metric">
            <span class="di-lbl">Engine</span>
            <strong>Speech + Facial AI</strong>
          </div>
          <div class="di-exp-metric">
            <span class="di-lbl">System</span>
            <strong>Zero-Lag Client</strong>
          </div>
        </div>
      </div>
    `;

    document.body.prepend(di);

    // Expand on hover or tap
    const pill = di.querySelector('#di-pill');
    pill.addEventListener('click', () => {
      di.classList.toggle('expanded');
    });

    document.addEventListener('click', (e) => {
      if (!di.contains(e.target)) {
        di.classList.remove('expanded');
      }
    });

    return di;
  }

  // ==========================================
  // 5. EXPOSE TO GLOBAL WINDOW
  // ==========================================
  window.Spatial3D = {
    initHeroScene(canvasId) {
      const canvas = document.getElementById(canvasId);
      if (canvas) return new Spatial3DNeuralOrb(canvas);
      return null;
    },
    initCardTilt: initSpatialCardTilt,
    initVoiceWaveform,
    renderDynamicIsland,
    updateDynamicIsland(title, status, active = false) {
      const dot = document.getElementById('di-dot');
      const titleEl = document.getElementById('di-title');
      const statusEl = document.getElementById('di-status');
      const waveBox = document.getElementById('di-wave-box');
      if (dot) dot.classList.toggle('active', active);
      if (titleEl && title) titleEl.textContent = title;
      if (statusEl && status) statusEl.textContent = status;
      if (waveBox) waveBox.classList.toggle('animating', active);
    }
  };

  // Run automatically when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initSpatialCardTilt();
      renderDynamicIsland();
    });
  } else {
    initSpatialCardTilt();
    renderDynamicIsland();
  }
})();
