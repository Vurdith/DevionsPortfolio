"use client";

import * as React from "react";
import { motion } from "framer-motion";

const PARTICLE_COUNT = 15;

type FairyConfig = {
  id: number;
  initial: { x: string; y: string };
  target: { x: string; y: string };
  duration: { left: number; top: number; glow: number };
};

export function ParticleField() {
  const [particles, setParticles] = React.useState<FairyConfig[]>([]);

  React.useEffect(() => {
    setParticles(
      Array.from({ length: PARTICLE_COUNT }).map((_, i) => ({
        id: i,
        initial: {
          x: `${Math.random() * 100}%`,
          y: `${Math.random() * 100}%`,
        },
        target: {
          x: `${Math.random() * 100}%`,
          y: `${Math.random() * 100}%`,
        },
        duration: {
          left: 15 + Math.random() * 15,
          top: 15 + Math.random() * 15,
          glow: 4 + Math.random() * 4,
        },
      }))
    );
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden">
      {particles.map((particle) => (
        <Fairy config={particle} key={particle.id} />
      ))}
    </div>
  );
}

function Fairy({ config }: { config: FairyConfig }) {
  const [target, setTarget] = React.useState(config.target);

  React.useEffect(() => {
    const wander = () => {
      setTarget({
        x: `${Math.random() * 120 - 10}%`,
        y: `${Math.random() * 120 - 10}%`,
      });
    };

    wander();
    const interval = setInterval(wander, 10000 + Math.random() * 10000); 
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ left: config.initial.x, top: config.initial.y }}
      animate={{ 
        left: target.x, 
        top: target.y,
      }}
      transition={{ 
        left: { duration: config.duration.left, ease: "linear" },
        top: { duration: config.duration.top, ease: "linear" },
      }}
      className="absolute h-[3px] w-[3px]"
    >
      <motion.div
        animate={{ 
          opacity: [0.2, 0.7, 0.2],
          scale: [0.8, 1.3, 0.8]
        }}
        transition={{ 
          duration: config.duration.glow,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="h-full w-full rounded-full bg-white blur-[0.5px]"
        style={{
          boxShadow: "0 0 12px 3px rgba(255, 255, 255, 0.3)",
        }}
      />
    </motion.div>
  );
}

