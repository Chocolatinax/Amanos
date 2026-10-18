"use client";
import { FaceLandmarker, FilesetResolver, PoseLandmarker, type NormalizedLandmark, type PoseLandmarkerResult, type FaceLandmarkerResult } from "@mediapipe/tasks-vision";

export type BodyFrame = { pose: PoseLandmarkerResult; face: FaceLandmarkerResult; timestamp: number; faceTimestamp?: number; imageSize?: { width: number; height: number } };
const base = "https://storage.googleapis.com/mediapipe-models";
async function modelPath(name: string, remote: string) {
  try {
    const response = await fetch(`/models/${name}.task`, { method: "HEAD" });
    if (response.ok && Number(response.headers.get("content-length")) > 1000) return `/models/${name}.task`;
  } catch {}
  return remote;
}
export async function createBodyTracker() {
  const vision = await FilesetResolver.forVisionTasks("/mediapipe/wasm");
  const posePath = await modelPath("pose_landmarker_lite", `${base}/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task`);
  const facePath = await modelPath("face_landmarker", `${base}/face_landmarker/face_landmarker/float16/1/face_landmarker.task`);
  const pose = await PoseLandmarker.createFromOptions(vision, {
    baseOptions: { modelAssetPath: posePath, delegate: "CPU" }, runningMode: "VIDEO", numPoses: 1,
    minPoseDetectionConfidence: .6, minPosePresenceConfidence: .6, minTrackingConfidence: .6,
    outputSegmentationMasks: false,
  });
  try {
    const face = await FaceLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: facePath, delegate: "CPU" }, runningMode: "VIDEO", numFaces: 1,
      minFaceDetectionConfidence: .6, minFacePresenceConfidence: .6, minTrackingConfidence: .6,
      outputFaceBlendshapes: false, outputFacialTransformationMatrixes: false,
    });
    let lastFace: FaceLandmarkerResult = { faceLandmarks: [], faceBlendshapes: [], facialTransformationMatrixes: [] };
    let faceTimestamp = -Infinity;
    return { detect: (video: HTMLVideoElement, timestamp: number): BodyFrame => {
      // The expression overlay can run slower than the hand/arm tracker during a wave.
      const detectedPose = pose.detectForVideo(video, timestamp);
      if (timestamp - faceTimestamp >= 300) { lastFace = face.detectForVideo(video, timestamp); faceTimestamp = timestamp; }
      return { pose: detectedPose, face: lastFace, timestamp, faceTimestamp, imageSize: { width: video.videoWidth, height: video.videoHeight } };
    }, close: () => { pose.close(); face.close(); } };
  } catch (error) { pose.close(); throw error; }
}

export function drawBody(ctx: CanvasRenderingContext2D, frame: BodyFrame, width: number, height: number) {
  const draw = (points: NormalizedLandmark[] | undefined, connections: { start: number; end: number }[], color: string, radius: number, visibility: boolean) => {
    if (!points) return;
    const visible = (p: NormalizedLandmark | undefined) => p && Number.isFinite(p.x) && Number.isFinite(p.y) && p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1 && (!visibility || (p.visibility ?? 0) >= .6);
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = radius === 2 ? 1 : 3;
    const indices = new Set<number>();
    for (const { start, end } of connections) {
      const a = points[start], b = points[end];
      if (!visible(a) || !visible(b)) continue;
      ctx.beginPath(); ctx.moveTo(a.x * width, a.y * height); ctx.lineTo(b.x * width, b.y * height); ctx.stroke();
      indices.add(start); indices.add(end);
    }
    for (const i of indices) { const p = points[i]; ctx.beginPath(); ctx.arc(p.x * width, p.y * height, radius, 0, Math.PI * 2); ctx.fill(); }
  };
  // Only upper-body connections: legs outside the camera must not form ghost lines.
  draw(frame.pose.landmarks[0], PoseLandmarker.POSE_CONNECTIONS.filter(c => c.start >= 11 && c.start <= 24 && c.end >= 11 && c.end <= 24), "#62dfb5", 4, true);
  if (frame.timestamp - (frame.faceTimestamp ?? frame.timestamp) <= 350) draw(frame.face.faceLandmarks[0], FaceLandmarker.FACE_LANDMARKS_CONTOURS, "#8fd7ff", 2, false);
}
