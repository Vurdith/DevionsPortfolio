"use client";

import * as React from "react";
import { useMotionValueEvent, useReducedMotion, useScroll } from "framer-motion";

const VIDEO_SRC = "/cathedral-scroll-smooth.mp4";

export function ScrollCathedralVideo() {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const durationRef = React.useRef(0);
  const frameRef = React.useRef<number | null>(null);
  const targetTimeRef = React.useRef(0);
  const activeRef = React.useRef(false);
  const prefersReducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll();

  const stopScrubLoop = React.useCallback(() => {
    activeRef.current = false;
    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
  }, []);

  const startScrubLoop = React.useCallback(() => {
    if (activeRef.current) return;
    activeRef.current = true;

    const tickFrame = () => {
      const video = videoRef.current;
      const duration = durationRef.current;

      if (!video || !duration || Number.isNaN(duration)) {
        stopScrubLoop();
        return;
      }

      const target = targetTimeRef.current;
      const current = video.currentTime;
      const delta = target - current;

      if (Math.abs(delta) <= 0.018) {
        video.currentTime = target;
        stopScrubLoop();
        return;
      }

      const catchup = Math.abs(delta) > 0.35 ? 0.34 : 0.2;
      const eased = current + delta * catchup;
      video.currentTime = Math.min(Math.max(eased, 0), Math.max(duration - 0.08, 0));
      frameRef.current = window.requestAnimationFrame(tickFrame);
    };

    frameRef.current = window.requestAnimationFrame(tickFrame);
  }, [stopScrubLoop]);

  const scrubTo = React.useCallback((progress: number) => {
    if (prefersReducedMotion) return;

    const video = videoRef.current;
    const duration = durationRef.current;
    if (!video || !duration || Number.isNaN(duration)) return;

    targetTimeRef.current = Math.min(Math.max(progress, 0), 1) * Math.max(duration - 0.08, 0);

    if (Math.abs(video.currentTime - targetTimeRef.current) > 0.018) {
      startScrubLoop();
    }
  }, [prefersReducedMotion, startScrubLoop]);

  useMotionValueEvent(scrollYProgress, "change", scrubTo);

  React.useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleMetadata = () => {
      durationRef.current = video.duration || 0;
      scrubTo(scrollYProgress.get());
    };

    video.pause();
    video.currentTime = 0;
    video.addEventListener("loadedmetadata", handleMetadata);

    if (video.readyState >= 1) {
      handleMetadata();
    }

    return () => {
      video.removeEventListener("loadedmetadata", handleMetadata);
      stopScrubLoop();
    };
  }, [scrubTo, scrollYProgress, stopScrubLoop]);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-void"
      data-scroll-cathedral-video
    >
      <video
        ref={videoRef}
        className="h-full w-full object-cover opacity-[0.28] mix-blend-screen"
        src={VIDEO_SRC}
        muted
        playsInline
        preload="auto"
        disablePictureInPicture
      />
      <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_42%,transparent_22%,rgba(0,0,0,0.72)_100%)]" />
      <div className="absolute inset-0 bg-gradient-to-b from-void/25 via-transparent to-void/55" />
    </div>
  );
}
