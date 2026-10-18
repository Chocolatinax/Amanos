"""Extract B with the exact HandLandmarker task used by the browser camera."""
import cv2, mediapipe as mp, json, math
from pathlib import Path
root=Path(__file__).resolve().parents[1]
cap=cv2.VideoCapture(str(root/'references/videos/b.mp4'))
if not cap.isOpened(): raise RuntimeError('A source video missing')
fps=cap.get(cv2.CAP_PROP_FPS) or 30
samples=[]
options=mp.tasks.vision.HandLandmarkerOptions(
 base_options=mp.tasks.BaseOptions(model_asset_path=str(root/'public/models/hand_landmarker.task')),
 running_mode=mp.tasks.vision.RunningMode.VIDEO,num_hands=2,
 min_hand_detection_confidence=.6,min_hand_presence_confidence=.6,min_tracking_confidence=.6)
with mp.tasks.vision.HandLandmarker.create_from_options(options) as model:
 i=0
 while True:
  ok,image=cap.read()
  if not ok: break
  result=model.detect_for_video(mp.Image(image_format=mp.ImageFormat.SRGB,data=cv2.cvtColor(image,cv2.COLOR_BGR2RGB)),round(i*1000/fps))
  if 45<=i<=110 and result.hand_world_landmarks:
   selected=min(range(len(result.hand_landmarks)),key=lambda k:result.hand_landmarks[k][0].y)
   points=result.hand_world_landmarks[selected];handed=result.handedness[selected][0]
   if handed.score>=.8:
    w,m=points[0],points[9];scale=math.dist((w.x,w.y,w.z),(m.x,m.y,m.z))
    flip=-1 if handed.category_name=='Left' else 1
    samples.append([round(v,6) for p in points for v in ((p.x-w.x)*flip/scale,(p.y-w.y)/scale,(p.z-w.z)/scale)])
  i+=1
cap.release()
if len(samples)<20: raise RuntimeError('Insufficient real reference detections')
output={'version':'hand-world-v2','signId':'b','samples':samples,'meta':[{'senante':'Referencia del equipo: b.mp4, cuadros 45-110','dispositivo':'HandLandmarker float16/1 VIDEO; same task as browser','fecha':'2026-10-17'}]}
(root/'public/samples/b.json').write_text(json.dumps(output,separators=(',',':')),encoding='utf-8')
print(f'Saved {len(samples)} B reference frames with camera-compatible task')
