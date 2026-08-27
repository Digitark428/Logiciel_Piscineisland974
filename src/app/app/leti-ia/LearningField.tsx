"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { LearningCategory } from "./learningPhrases";
import styles from "./LetiAiExperience.module.css";

type Rgb = readonly [number, number, number];

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  age: number;
  lifespan: number;
  driftSeed: number;
  direction: number;
  color: Rgb;
  networkAffinity: number;
  depth: number;
}

const BLUE_COLORS: readonly Rgb[] = [
  [95, 198, 227],
  [120, 216, 236],
  [77, 177, 220],
  [150, 226, 241],
];

const CORAL_COLORS: readonly Rgb[] = [
  [244, 139, 130],
  [247, 183, 174],
  [238, 118, 109],
];

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function coralWeight(category: LearningCategory) {
  if (category === "organization" || category === "clients" || category === "humor") return 0.34;
  if (category === "water" || category === "filtration" || category === "basins") return 0.13;
  return 0.22;
}

function createParticle(
  width: number,
  height: number,
  category: LearningCategory,
  populateImmediately: boolean,
): Particle {
  const centerX = width / 2;
  const centerY = height / 2;
  const angle = Math.random() * Math.PI * 2;
  const horizontalRadius = randomBetween(width * 0.2, width * 0.49);
  const verticalRadius = randomBetween(height * 0.22, height * 0.5);
  const depth = randomBetween(0.42, 1);
  const lifespan = randomBetween(11, 19);
  const useCoral = Math.random() < coralWeight(category);
  const colors = useCoral ? CORAL_COLORS : BLUE_COLORS;

  return {
    x: centerX + Math.cos(angle) * horizontalRadius,
    y: centerY + Math.sin(angle) * verticalRadius,
    vx: Math.cos(angle + Math.PI / 2) * randomBetween(1.5, 6),
    vy: Math.sin(angle + Math.PI / 2) * randomBetween(1.5, 6),
    size: randomBetween(1.05, 3.15) * depth,
    alpha: randomBetween(0.38, 0.86),
    age: populateImmediately ? randomBetween(0, lifespan * 0.76) : 0,
    lifespan,
    driftSeed: Math.random() * Math.PI * 2,
    direction: Math.random() > 0.5 ? 1 : -1,
    color: colors[Math.floor(Math.random() * colors.length)],
    networkAffinity: Math.random(),
    depth,
  };
}

function particleCount(width: number, reducedMotion: boolean) {
  if (reducedMotion) return width < 640 ? 10 : 14;
  if (width < 480) return 28;
  if (width < 768) return 38;
  if (width < 1180) return 54;
  return 68;
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return reduced;
}

export function LearningField({ category }: { category: LearningCategory }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const categoryRef = useRef(category);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    categoryRef.current = category;
  }, [category]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = canvas?.parentElement;
    if (!canvas || !container) return;

    const context = canvas.getContext("2d", { alpha: true });
    if (!context) return;

    let width = 0;
    let height = 0;
    let particles: Particle[] = [];
    let animationFrame = 0;
    let lastPaint = performance.now();
    let centralPulse = 0;
    let hidden = document.hidden;

    const resize = () => {
      const bounds = container.getBoundingClientRect();
      width = Math.max(1, bounds.width);
      height = Math.max(1, bounds.height);
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);

      const targetCount = particleCount(width, reducedMotion);
      particles = Array.from({ length: targetCount }, () => (
        createParticle(width, height, categoryRef.current, true)
      ));
    };

    const drawParticle = (particle: Particle, phase: number) => {
      const [red, green, blue] = particle.color;
      const fadeIn = Math.min(1, phase / 0.12);
      const fadeOut = Math.min(1, (1 - phase) / 0.14);
      const opacity = particle.alpha * fadeIn * fadeOut;
      const absorptionScale = phase > 0.76 ? 1 - ((phase - 0.76) / 0.24) * 0.68 : 1;
      const radius = Math.max(0.45, particle.size * absorptionScale);

      if (particle.depth > 0.72 && opacity > 0.18) {
        context.beginPath();
        context.arc(particle.x, particle.y, radius * 3.4, 0, Math.PI * 2);
        context.fillStyle = `rgba(${red}, ${green}, ${blue}, ${opacity * 0.095})`;
        context.fill();
      }

      context.beginPath();
      context.arc(particle.x, particle.y, radius, 0, Math.PI * 2);
      context.fillStyle = `rgba(${red}, ${green}, ${blue}, ${opacity})`;
      context.fill();

      if (radius > 1.9) {
        context.beginPath();
        context.arc(particle.x - radius * 0.28, particle.y - radius * 0.3, radius * 0.28, 0, Math.PI * 2);
        context.fillStyle = `rgba(255, 255, 255, ${opacity * 0.68})`;
        context.fill();
      }
    };

    const draw = (delta: number, staticOnly = false) => {
      context.clearRect(0, 0, width, height);
      const centerX = width / 2;
      const centerY = height / 2;
      const logoRadius = Math.min(width, height) * (width < 640 ? 0.115 : 0.105);
      const currentCategory = categoryRef.current;

      if (!staticOnly) {
        centralPulse = Math.max(0, centralPulse - delta * 1.35);
        if (centralPulse > 0) {
          const pulseRadius = logoRadius * (1.16 + (1 - centralPulse) * 0.42);
          const glow = context.createRadialGradient(centerX, centerY, logoRadius * 0.3, centerX, centerY, pulseRadius);
          glow.addColorStop(0, `rgba(120, 216, 236, ${centralPulse * 0.075})`);
          glow.addColorStop(1, "rgba(120, 216, 236, 0)");
          context.beginPath();
          context.arc(centerX, centerY, pulseRadius, 0, Math.PI * 2);
          context.fillStyle = glow;
          context.fill();
        }
      }

      let connections = 0;
      const connectionLimit = currentCategory === "diagnostic" ? 14 : 8;
      if (!staticOnly) {
        for (let index = 0; index < particles.length && connections < connectionLimit; index += 1) {
          const first = particles[index];
          if (first.networkAffinity < (currentCategory === "diagnostic" ? 0.58 : 0.7)) continue;

          for (let otherIndex = index + 1; otherIndex < particles.length; otherIndex += 1) {
            const second = particles[otherIndex];
            if (second.networkAffinity < 0.68) continue;
            const distance = Math.hypot(first.x - second.x, first.y - second.y);
            if (distance > Math.min(145, width * 0.15)) continue;

            const firstPhase = first.age / first.lifespan;
            const secondPhase = second.age / second.lifespan;
            const visibility = Math.min(1, firstPhase / 0.2, secondPhase / 0.2)
              * Math.min(1, (1 - firstPhase) / 0.26, (1 - secondPhase) / 0.26);
            context.beginPath();
            context.moveTo(first.x, first.y);
            context.lineTo(second.x, second.y);
            context.strokeStyle = `rgba(95, 198, 227, ${0.13 * visibility})`;
            context.lineWidth = 0.7;
            context.stroke();
            connections += 1;
            break;
          }
        }
      }

      particles.forEach((particle, index) => {
        const phase = particle.age / particle.lifespan;
        const dx = centerX - particle.x;
        const dy = centerY - particle.y;
        const distance = Math.max(1, Math.hypot(dx, dy));

        if (!staticOnly) {
          particle.age += delta;
          const attractionPhase = Math.max(0, (phase - 0.48) / 0.52);
          const pull = attractionPhase * attractionPhase * 0.95;
          const tangentX = -dy / distance;
          const tangentY = dx / distance;
          const drift = Math.sin(particle.age * 0.72 + particle.driftSeed) * 3.6;

          particle.vx += (tangentX * particle.direction * (1 - attractionPhase) * 4 + drift) * delta;
          particle.vy += (tangentY * particle.direction * (1 - attractionPhase) * 4 - drift * 0.55) * delta;
          particle.vx *= Math.pow(0.94, delta);
          particle.vy *= Math.pow(0.94, delta);
          particle.x += particle.vx * delta + dx * pull * delta;
          particle.y += particle.vy * delta + dy * pull * delta;

          if (phase > 0.63) {
            const [red, green, blue] = particle.color;
            context.beginPath();
            context.moveTo(particle.x, particle.y);
            context.lineTo(
              particle.x + dx * Math.min(0.34, attractionPhase * 0.31),
              particle.y + dy * Math.min(0.34, attractionPhase * 0.31),
            );
            context.strokeStyle = `rgba(${red}, ${green}, ${blue}, ${0.075 * attractionPhase})`;
            context.lineWidth = Math.max(0.45, particle.size * 0.3);
            context.stroke();
          }

          if ((phase > 0.7 && distance < logoRadius) || particle.age >= particle.lifespan) {
            particles[index] = createParticle(width, height, currentCategory, false);
            centralPulse = Math.max(centralPulse, 0.72);
            return;
          }
        }

        drawParticle(particle, Math.min(0.96, phase));
      });
    };

    const animate = (now: number) => {
      animationFrame = requestAnimationFrame(animate);
      if (hidden || now - lastPaint < 1000 / 30) return;
      const delta = Math.min((now - lastPaint) / 1000, 0.06);
      lastPaint = now;
      draw(delta);
    };

    const handleVisibility = () => {
      hidden = document.hidden;
      lastPaint = performance.now();
    };

    const resizeObserver = new ResizeObserver(() => {
      resize();
      draw(0, reducedMotion);
    });
    resizeObserver.observe(container);
    document.addEventListener("visibilitychange", handleVisibility);
    resize();
    draw(0, reducedMotion);

    if (!reducedMotion) animationFrame = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      document.removeEventListener("visibilitychange", handleVisibility);
      context.clearRect(0, 0, width, height);
    };
  }, [reducedMotion]);

  return (
    <div className={styles.field} aria-hidden="true">
      <canvas ref={canvasRef} className={styles.canvas} />
      <div className={styles.core}>
        <div className={styles.corePulse}>
        <div className={styles.symbol}>
          <Image
            src="/leti/leti-symbol-transparent.png"
            alt=""
            width={314}
            height={360}
            priority
            sizes="(max-width: 767px) 116px, (max-width: 1279px) 150px, 175px"
            className={styles.symbolImage}
          />
          <span className={styles.symbolSheen} />
        </div>
        </div>
      </div>
    </div>
  );
}
