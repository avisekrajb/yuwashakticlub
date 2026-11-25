import { API_BASE, getToken } from "./api";

export function uploadFile(file, kind = "post", onProgress) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error("Choose a file first"));
    const form = new FormData();
    form.append("file", file);
    form.append("kind", kind);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE}/uploads/media`);
    const token = getToken();
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);

    if (xhr.upload && typeof onProgress === "function") {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      };
    }

    xhr.onload = () => {
      let payload = null;
      try {
        payload = JSON.parse(xhr.responseText || "{}");
      } catch (_e) {
        payload = {};
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(payload.data || payload);
      } else {
        reject(new Error(payload.message || `Upload failed (${xhr.status})`));
      }
    };
    xhr.onerror = () => reject(new Error("Upload failed. Check your connection."));
    xhr.onabort = () => reject(new Error("Upload cancelled"));
    xhr.send(form);
  });
}

export function uploadAvatar(file, onProgress) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error("Choose an image first"));
    const form = new FormData();
    form.append("file", file);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE}/uploads/avatar`);
    const token = getToken();
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    if (xhr.upload && typeof onProgress === "function") {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      };
    }
    xhr.onload = () => {
      let payload = null;
      try {
        payload = JSON.parse(xhr.responseText || "{}");
      } catch (_e) {
        payload = {};
      }
      if (xhr.status >= 200 && xhr.status < 300) resolve(payload.data || payload);
      else reject(new Error(payload.message || `Upload failed (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error("Upload failed. Check your connection."));
    xhr.send(form);
  });
}

export const uploadImage = (file, onProgress) => uploadFile(file, "image", onProgress);
export const uploadVideo = (file, onProgress) => uploadFile(file, "video", onProgress);
export const uploadAudio = (file, onProgress) => uploadFile(file, "audio", onProgress);

export function checkFileSize(file, kind = "video", limits = {}) {
  const maxMb =
    kind === "video"
      ? limits.maxVideoMb || 200
      : kind === "audio"
      ? limits.maxAudioMb || 20
      : limits.maxImageMb || 25;
  if (file.size > maxMb * 1024 * 1024) {
    throw new Error(`${kind === "video" ? "Video" : kind === "audio" ? "Audio" : "Image"} is too large (max ${maxMb} MB).`);
  }
  return true;
}

export function getMediaDuration(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const media = document.createElement(/^video\//.test(file.type) ? "video" : "audio");
    media.preload = "metadata";
    media.onloadedmetadata = () => {
      const duration = Number.isFinite(media.duration) ? media.duration : 0;
      URL.revokeObjectURL(url);
      resolve(duration);
    };
    media.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read this media file. Try another file."));
    };
    media.src = url;
  });
}

export async function recordAudio({ maxSeconds = 15, onTick } = {}) {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error("Microphone is not available in this browser");
  }
  if (typeof MediaRecorder === "undefined") {
    throw new Error("Voice recording is not supported in this browser");
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
  });

  const mime = MediaRecorder.isTypeSupported("audio/webm")
    ? "audio/webm"
    : MediaRecorder.isTypeSupported("audio/mp4")
    ? "audio/mp4"
    : "";
  const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
  const chunks = [];
  const started = Date.now();
  let ticker = null;
  let settled = false;
  let cancelled = false;
  let resolveDone;
  const done = new Promise((resolve) => {
    resolveDone = resolve;
  });

  const release = () => {
    if (ticker) clearInterval(ticker);
    ticker = null;
    stream.getTracks().forEach((t) => t.stop());
  };

  const finish = () => {
    if (settled) return done;
    settled = true;
    try {
      if (recorder.state !== "inactive") recorder.stop();
      else release();
    } catch (_err) {
      release();
    }
    return done;
  };

  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size) chunks.push(e.data);
  };

  recorder.onstop = () => {
    release();
    if (cancelled) {
      resolveDone({ file: null, blob: null, duration: 0, cancelled: true });
      return;
    }
    const duration = Math.min(maxSeconds, (Date.now() - started) / 1000);
    const blob = new Blob(chunks, { type: recorder.mimeType || mime || "audio/webm" });
    const ext = /mp4/.test(blob.type) ? "mp4" : "webm";
    const file = new File([blob], `voice-${Date.now()}.${ext}`, { type: blob.type });
    resolveDone({ file, blob, duration, cancelled: false });
  };

  recorder.onerror = (e) => {
    release();
    settled = true;
    resolveDone({ file: null, blob: null, duration: 0, error: e.error || new Error("Recording failed") });
  };

  ticker = setInterval(() => {
    const elapsed = (Date.now() - started) / 1000;
    if (onTick) onTick(Math.min(elapsed, maxSeconds));
    if (elapsed >= maxSeconds) finish();
  }, 100);

  recorder.start(250);

  return {
    stop: finish,
    done,
    cancel: () => {
      cancelled = true;
      finish();
    },
    seconds: () => Math.min(maxSeconds, (Date.now() - started) / 1000),
    recording: true,
  };
}
