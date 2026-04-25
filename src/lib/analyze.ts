import { supabase } from "@/integrations/supabase/client";

export type AnalysisType = "image" | "video" | "fakenews" | "emotion" | "webcam";

export interface AnalyzeArgs {
  type: AnalysisType;
  imageUrl?: string;
  frames?: string[];
  text?: string;
  sourceUrl?: string;
}

export async function runAnalysis(args: AnalyzeArgs) {
  const { data, error } = await supabase.functions.invoke("analyze", { body: args });
  if (error) {
    // surface friendly errors
    const status = (error as any).context?.response?.status;
    if (status === 429) throw new Error("Rate limit exceeded — please try again in a moment.");
    if (status === 402) throw new Error("AI credits exhausted. Add funds in Workspace → Usage.");
    throw new Error(error.message ?? "Analysis failed");
  }
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as { type: AnalysisType; result: any };
}

export async function uploadMedia(userId: string, file: File): Promise<{ path: string; signedUrl: string }> {
  const ext = file.name.split(".").pop() ?? "bin";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("deepguard-media").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;
  const { data } = await supabase.storage.from("deepguard-media").createSignedUrl(path, 60 * 60 * 24 * 7);
  if (!data) throw new Error("Failed to sign URL");
  return { path, signedUrl: data.signedUrl };
}

export async function fileToDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export async function extractVideoFrames(file: File, count = 6): Promise<string[]> {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.src = url;
  video.muted = true;
  video.playsInline = true;
  video.crossOrigin = "anonymous";
  await new Promise<void>((res, rej) => {
    video.onloadedmetadata = () => res();
    video.onerror = () => rej(new Error("Could not load video"));
  });

  const duration = isFinite(video.duration) && video.duration > 0 ? video.duration : 0;
  if (!duration) throw new Error("Video duration unknown");
  const canvas = document.createElement("canvas");
  const W = 384;
  const ratio = video.videoWidth / video.videoHeight || 16 / 9;
  canvas.width = W;
  canvas.height = Math.round(W / ratio);
  const ctx = canvas.getContext("2d")!;
  const frames: string[] = [];

  for (let i = 0; i < count; i++) {
    const t = (duration * (i + 0.5)) / count;
    await new Promise<void>((res, rej) => {
      const handler = () => {
        video.removeEventListener("seeked", handler);
        res();
      };
      video.addEventListener("seeked", handler);
      video.currentTime = Math.min(Math.max(0, t), Math.max(0, duration - 0.05));
      setTimeout(() => rej(new Error("seek timeout")), 5000);
    }).catch(() => {});
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    frames.push(canvas.toDataURL("image/jpeg", 0.7));
  }

  URL.revokeObjectURL(url);
  return frames;
}

export async function captureWebcamFrame(videoEl: HTMLVideoElement): Promise<string> {
  const W = 480;
  const ratio = videoEl.videoWidth / videoEl.videoHeight || 16 / 9;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = Math.round(W / ratio);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.7);
}