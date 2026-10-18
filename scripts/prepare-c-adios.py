"""Camera references use the same hand and pose .task files as the web."""
import json,math,cv2,mediapipe as mp
from pathlib import Path
root=Path(__file__).resolve().parents[1]
(root/'public/evaluation').mkdir(exist_ok=True)
for name in ['c','adios']:
 cap=cv2.VideoCapture(str(root/'references/videos'/f'{name}.mp4'));fps=cap.get(cv2.CAP_PROP_FPS);frames=[]
 hand=mp.tasks.vision.HandLandmarker.create_from_options(mp.tasks.vision.HandLandmarkerOptions(base_options=mp.tasks.BaseOptions(model_asset_path=str(root/'public/models/hand_landmarker.task')),running_mode=mp.tasks.vision.RunningMode.VIDEO,num_hands=2,min_hand_detection_confidence=.6,min_hand_presence_confidence=.6,min_tracking_confidence=.6))
 pose=mp.tasks.vision.PoseLandmarker.create_from_options(mp.tasks.vision.PoseLandmarkerOptions(base_options=mp.tasks.BaseOptions(model_asset_path=str(root/'public/models/pose_landmarker_lite.task')),running_mode=mp.tasks.vision.RunningMode.VIDEO,num_poses=1,min_pose_detection_confidence=.6,min_pose_presence_confidence=.6,min_tracking_confidence=.6)) if name=='adios' else None
 i=0
 while True:
  ok,img=cap.read()
  if not ok:break
  image=mp.Image(image_format=mp.ImageFormat.SRGB,data=cv2.cvtColor(img,cv2.COLOR_BGR2RGB));ts=round(i*1000/fps)
  r=hand.detect_for_video(image,ts);pr=pose.detect_for_video(image,ts) if pose else None
  if r.hand_landmarks:
   k=min(range(len(r.hand_landmarks)),key=lambda k:r.hand_landmarks[k][0].y)
   h=r.hand_world_landmarks[k];cat=r.handedness[k][0];w,m=h[0],h[9];scale=math.dist((w.x,w.y,w.z),(m.x,m.y,m.z));flip=-1 if cat.category_name=='Left' else 1
   if cat.score>=.8 and scale>.005:
    vec=[round(v,6) for p in h for v in ((p.x-w.x)*flip/scale,(p.y-w.y)/scale,(p.z-w.z)/scale)]
    anchor=None
    if pr and pr.pose_landmarks:
     a,b=pr.pose_landmarks[0][11],pr.pose_landmarks[0][12];pw=r.hand_landmarks[k][0];width=math.hypot(a.x-b.x,a.y-b.y)
     if min(a.visibility,b.visibility)>.6 and width>.03:anchor=[round((pw.x-(a.x+b.x)/2)*flip/width,6),round((pw.y-(a.y+b.y)/2)/width,6)]
    frames.append({'frame':i,'time':i/fps,'shape':vec,'anchor':anchor})
  i+=1
 cap.release();hand.close()
 if pose:pose.close()
 if name=='c':
  samples=[f['shape'] for f in frames if 65<=f['frame']<=110]
  if len(samples)<20:raise RuntimeError('Not enough C samples')
  data={'version':'hand-world-v2','signId':'c','samples':samples,'meta':[{'senante':'C.mp4 frames 65-110','dispositivo':'HandLandmarker float16/1 VIDEO','fecha':'2026-10-17'}]}
  (root/'public/samples/c.json').write_text(json.dumps(data,separators=(',',':')))
  evaluation={'signId':'c','kind':'static','source':'C.mp4','activeFrames':[65,110],'checks':['curved-fingers','thumb-index-gap','palm-orientation','hold-1000ms'],'status':'prototype'}
 else:
  seq=[f for f in frames if 60<=f['frame']<=113 and f['anchor'] is not None]
  if len(seq)<20:raise RuntimeError('Not enough ADIOS samples')
  evaluation={'version':'hand-body-sequence-v1','signId':'adios','kind':'dynamic','source':'Adios.mp4','fps':fps,'activeFrames':[60,113],'checks':['open-hand','hand-near-head','orientation-change','complete-sequence'],'status':'prototype','frames':seq[::3]}
 (root/'public/evaluation'/f'{name}.json').write_text(json.dumps(evaluation,separators=(',',':')))
 print(name,'detected frames',len(frames),'reference',len(samples) if name=='c' else len(seq[::3]))
