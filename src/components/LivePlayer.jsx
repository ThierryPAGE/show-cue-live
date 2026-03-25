import React, { useRef, useEffect, useImperativeHandle, forwardRef, useState, useCallback } from "react";
import { resolveMediaUrl } from "../lib/mediaStore";

const LOADING_TIMEOUT = 20000;

const LivePlayer = forwardRef(function LivePlayer({ onStatusChange, onLog, onVideoEnded }, ref) {
  const video1Ref = useRef(null);
  const video2Ref = useRef(null);
  const [activeVideo, setActiveVideo] = useState(null); // 1 or 2, null = none playing yet
  const [video1Opacity, setVideo1Opacity] = useState(0);
  const [video2Opacity, setVideo2Opacity] = useState(0);
  const [imageOpacity, setImageOpacity] = useState(1);
  const [imageSrc, setImageSrc] = useState("");
  const [video1TransitionMs, setVideo1TransitionMs] = useState(0);
  const [video2TransitionMs, setVideo2TransitionMs] = useState(0);
  const [imageTransitionMs, setImageTransitionMs] = useState(0);
  const [video1ZIndex, setVideo1ZIndex] = useState(1);
  const [video2ZIndex, setVideo2ZIndex] = useState(1);
  const [imageZIndex, setImageZIndex] = useState(2);
  const loadingTimerRef = useRef(null);
  const currentCueRef = useRef(null);

  const log = useCallback((msg, level = "info") => {
    onLog?.({ message: msg, level, time: new Date().toLocaleTimeString() });
  }, [onLog]);

  const clearLoadingTimer = useCallback(() => {
    if (loadingTimerRef.current) {
      clearTimeout(loadingTimerRef.current);
      loadingTimerRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => clearLoadingTimer();
  }, [clearLoadingTimer]);

  useImperativeHandle(ref, () => ({
    async showImage(rawUrl, fadeMs = 800) {
      const url = await resolveMediaUrl(rawUrl);
      clearLoadingTimer();

      // Hide videos smoothly first
      const v1 = video1Ref.current;
      const v2 = video2Ref.current;
      if (activeVideo === 1) {
        setVideo1TransitionMs(fadeMs);
        setVideo1Opacity(0);
        setVideo1ZIndex(1);
      } else if (activeVideo === 2) {
        setVideo2TransitionMs(fadeMs);
        setVideo2Opacity(0);
        setVideo2ZIndex(1);
      }
      
      // Show image
      setImageSrc(url);
      setImageTransitionMs(fadeMs);
      setImageOpacity(0);
      setImageZIndex(10);
      
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setImageOpacity(1);
        });
      });
      
      log(`Show image (fade ${fadeMs}ms)`);
      
      // Clean up video after fade completes
      setTimeout(() => {
        if (v1) {
          v1.pause();
          v1.removeAttribute("src");
          v1.load();
          v1.currentTime = 0;
        }
        if (v2) {
          v2.pause();
          v2.removeAttribute("src");
          v2.load();
          v2.currentTime = 0;
        }
        setActiveVideo(null);
      }, fadeMs + 50);
      
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve();
        }, fadeMs + 50);
      });
    },
    
    hideVideo() {
      this.releaseVideo();
    },
    
    hideImage() {
      setImageOpacity(0);
      setImageZIndex(2);
      log("Image hidden");
    },

    async showSafetyImage(rawUrl) {
      const url = await resolveMediaUrl(rawUrl).catch(() => rawUrl);
      clearLoadingTimer();
      setImageSrc(url);
      setImageTransitionMs(0);
      setImageOpacity(1);
      setImageZIndex(10);
      const v1 = video1Ref.current;
      const v2 = video2Ref.current;
      if (v1) {
        v1.pause();
        v1.currentTime = 0;
      }
      if (v2) {
        v2.pause();
        v2.currentTime = 0;
      }
      onStatusChange?.("INTERLUDE");
      log("⚠ Safety image displayed", "warn");
    },

    async playVideo(rawUrl, fadeMs = 1200, loop = false) {
      const url = await resolveMediaUrl(rawUrl);
      clearLoadingTimer();
      onStatusChange?.("LOADING");
      log(`Loading video...`);

      // Hide image immediately
      setImageTransitionMs(fadeMs);
      setImageOpacity(0);
      setImageZIndex(2);

      const prevActiveVideoNum = activeVideo;
      const newVideoNum = prevActiveVideoNum === 1 ? 2 : 1;
      
      const newV = newVideoNum === 1 ? video1Ref.current : video2Ref.current;
      const oldV = prevActiveVideoNum === 1 ? video1Ref.current : (prevActiveVideoNum === 2 ? video2Ref.current : null);
      
      if (!newV) return false;
      
      newV.src = url;
      newV.loop = loop;
      newV.load();

      currentCueRef.current = url;

      // Prepare new video above and ready to appear
      if (newVideoNum === 1) {
        setVideo1ZIndex(10);
        setVideo1Opacity(0);
        setVideo1TransitionMs(fadeMs);
      } else {
        setVideo2ZIndex(10);
        setVideo2Opacity(0);
        setVideo2TransitionMs(fadeMs);
      }

      return new Promise((resolve) => {
        loadingTimerRef.current = setTimeout(() => {
          if (currentCueRef.current === url) {
            log("Video load timeout", "error");
            onStatusChange?.("ERROR");
            newV.removeEventListener("canplay", onCanPlay);
            newV.removeEventListener("error", onError);
            resolve(false);
          }
        }, LOADING_TIMEOUT);

        const onCanPlay = async () => {
          newV.removeEventListener("canplay", onCanPlay);
          newV.removeEventListener("error", onError);
          if (currentCueRef.current !== url) return;
          clearLoadingTimer();

          onStatusChange?.("LOADED");
          log("Video loaded, starting playback");

          await newV.play();
          onStatusChange?.("PLAYING");
          log("▶ Playing");
          
          const onEnded = () => {
            log("Video ended");
            if (!loop) {
              setActiveVideo(null);
              onVideoEnded?.();
            }
          };
          newV.addEventListener("ended", onEnded, { once: true });

          setActiveVideo(newVideoNum);

          // Fade in new video
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              if (newVideoNum === 1) {
                setVideo1Opacity(1);
              } else {
                setVideo2Opacity(1);
              }
            });
          });

          // Fade out old video if exists
          if (oldV && prevActiveVideoNum !== null) {
            if (prevActiveVideoNum === 1) {
              setVideo1TransitionMs(fadeMs);
              setVideo1Opacity(0);
              setVideo1ZIndex(1);
            } else {
              setVideo2TransitionMs(fadeMs);
              setVideo2Opacity(0);
              setVideo2ZIndex(1);
            }
          }

          // Clean up old video after crossfade
          setTimeout(() => {
            if (oldV && prevActiveVideoNum !== null) {
              oldV.pause();
              oldV.removeAttribute("src");
              oldV.load();
              oldV.currentTime = 0;
              log(`Video ${prevActiveVideoNum} released after crossfade`);
            }
            resolve(true);
          }, fadeMs + 50);
        };

        const onError = () => {
          newV.removeEventListener("canplay", onCanPlay);
          newV.removeEventListener("error", onError);
          if (currentCueRef.current !== url) return;
          clearLoadingTimer();
          log("Video load error", "error");
          onStatusChange?.("ERROR");
          resolve(false);
        };

        newV.addEventListener("canplay", onCanPlay, { once: true });
        newV.addEventListener("error", onError, { once: true });
      });
    },

    retryPlay() {
      const v = activeVideo === 1 ? video1Ref.current : video2Ref.current;
      if (!v || !v.src) return;
      log("Retrying playback...");
      onStatusChange?.("LOADING");
      v.load();
    },

    fadeOutVideo(fadeMs = 1200) {
      clearLoadingTimer();
      const v = activeVideo === 1 ? video1Ref.current : video2Ref.current;
      
      if (activeVideo === 1) {
        setVideo1TransitionMs(fadeMs);
        setVideo1Opacity(0);
      } else {
        setVideo2TransitionMs(fadeMs);
        setVideo2Opacity(0);
      }
      
      setTimeout(() => {
        if (v) {
          v.pause();
          v.currentTime = 0;
        }
      }, fadeMs + 50);
      log(`Fade out video (${fadeMs}ms)`);
    },

    releaseVideo() {
      clearLoadingTimer();
      const v1 = video1Ref.current;
      const v2 = video2Ref.current;
      
      if (v1) {
        v1.pause();
        v1.removeAttribute("src");
        v1.load();
        v1.currentTime = 0;
      }
      if (v2) {
        v2.pause();
        v2.removeAttribute("src");
        v2.load();
        v2.currentTime = 0;
      }
      
      setVideo1Opacity(0);
      setVideo2Opacity(0);
      setVideo1ZIndex(1);
      setVideo2ZIndex(1);
      currentCueRef.current = null;
      log("Videos released");
    },

    isVideoPlaying() {
      const v = activeVideo === 1 ? video1Ref.current : video2Ref.current;
      return v && !v.paused && !v.ended;
    }
  }));

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      {/* Video layer 1 */}
      <video
        ref={video1Ref}
        className="absolute inset-0 w-full h-full object-contain"
        style={{
          opacity: video1Opacity,
          transition: video1TransitionMs > 0 ? `opacity ${video1TransitionMs}ms ease-in-out` : "none",
          zIndex: video1ZIndex
        }}
        playsInline
        preload="auto"
      />

      {/* Video layer 2 */}
      <video
        ref={video2Ref}
        className="absolute inset-0 w-full h-full object-contain"
        style={{
          opacity: video2Opacity,
          transition: video2TransitionMs > 0 ? `opacity ${video2TransitionMs}ms ease-in-out` : "none",
          zIndex: video2ZIndex
        }}
        playsInline
        preload="auto"
      />

      {/* Image layer */}
      {imageSrc && (
        <img
          src={imageSrc}
          alt=""
          className="absolute inset-0 w-full h-full object-contain"
          style={{
            opacity: imageOpacity,
            transition: imageTransitionMs > 0 ? `opacity ${imageTransitionMs}ms ease-in-out` : "none",
            zIndex: imageZIndex
          }}
        />
      )}
    </div>
  );
});

export default LivePlayer;