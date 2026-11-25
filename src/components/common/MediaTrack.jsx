import { useEffect, useRef } from "react";

/**
 * Attaches a LiveKit track to a media element. Works for both audio and video tracks.
 */
export default function MediaTrack({ track, muted = false, speaker = true, className, ...rest }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !track) return undefined;
    try {
      track.attach(el);
    } catch (_err) {
      /* noop */
    }
    return () => {
      try {
        track.detach(el);
      } catch (_err) {
        /* noop */
      }
    };
  }, [track]);

  useEffect(() => {
    if (ref.current && track?.kind === "audio") ref.current.volume = speaker ? 1 : 0.35;
  }, [speaker, track]);

  if (track?.kind === "audio") {
    return <audio ref={ref} autoPlay muted={muted} className={className} {...rest} />;
  }
  return <video ref={ref} autoPlay playsInline muted={muted} className={className} {...rest} />;
}
