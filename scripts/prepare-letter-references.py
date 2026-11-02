"""Hand samples for the static letters A, I and S, with the exact HandLandmarker task used by the browser camera.

A mixes two takes on purpose: a single clip made the reference too narrow for a real attempt.
Frame ranges keep only the held pose; `skip` drops the moment the hand leaves and returns.
"""
import cv2, mediapipe as mp, json, math
from pathlib import Path
root=Path(__file__).resolve().parents[1]
LETTERS={
 'a':[{'file':'a-corregida.mp4','start':36,'end':74,'step':1},{'file':'a-mejorado.mp4','start':64,'end':352,'step':3}],
 'i':[{'file':'i.mp4','start':33,'end':66,'step':1}],
 's':[{'file':'s.mp4','start':45,'end':190,'step':2,'skip':(104,128)}],
}
def extract(source):
 cap=cv2.VideoCapture(str(root/'references/videos'/source['file']))
 if not cap.isOpened():raise RuntimeError(source['file']+' missing')
 fps=cap.get(cv2.CAP_PROP_FPS) or 30;samples=[];i=0;skip=source.get('skip',(1,0))
 options=mp.tasks.vision.HandLandmarkerOptions(
  base_options=mp.tasks.BaseOptions(model_asset_path=str(root/'public/models/hand_landmarker.task')),
  running_mode=mp.tasks.vision.RunningMode.VIDEO,num_hands=2,
  min_hand_detection_confidence=.6,min_hand_presence_confidence=.6,min_tracking_confidence=.6)
 with mp.tasks.vision.HandLandmarker.create_from_options(options) as model:
  while True:
   ok,image=cap.read()
   if not ok:break
   result=model.detect_for_video(mp.Image(image_format=mp.ImageFormat.SRGB,data=cv2.cvtColor(image,cv2.COLOR_BGR2RGB)),round(i*1000/fps))
   wanted=source['start']<=i<=source['end'] and (i-source['start'])%source['step']==0 and not skip[0]<=i<=skip[1]
   if wanted and result.hand_world_landmarks:
    selected=min(range(len(result.hand_landmarks)),key=lambda k:result.hand_landmarks[k][0].y)
    points=result.hand_world_landmarks[selected];handed=result.handedness[selected][0]
    if handed.score>=.8:
     w,m=points[0],points[9];scale=math.dist((w.x,w.y,w.z),(m.x,m.y,m.z))
     flip=-1 if handed.category_name=='Left' else 1
     samples.append([round(v,6) for p in points for v in ((p.x-w.x)*flip/scale,(p.y-w.y)/scale,(p.z-w.z)/scale)])
   i+=1
 cap.release()
 return samples
for letter,sources in LETTERS.items():
 samples=[];meta=[]
 for source in sources:
  found=extract(source);samples+=found
  meta.append({'senante':f"Referencia del equipo: {source['file']}, cuadros {source['start']}-{source['end']}",'dispositivo':'HandLandmarker float16/1 VIDEO; same task as browser','fecha':'2026-11-01'})
  print(letter,source['file'],len(found))
 if len(samples)<20:raise RuntimeError(letter+': insufficient real reference detections')
 output={'version':'hand-world-v2','signId':letter,'samples':samples,'meta':meta}
 (root/'public/samples'/f'{letter}.json').write_text(json.dumps(output,separators=(',',':')),encoding='utf-8')
