import cv2,json,math,mediapipe as mp
from pathlib import Path
c=cv2.VideoCapture('references/videos/mucho-gusto.mp4');fps=c.get(cv2.CAP_PROP_FPS);frames=[];i=0
p=mp.tasks.vision.PoseLandmarker.create_from_options(mp.tasks.vision.PoseLandmarkerOptions(base_options=mp.tasks.BaseOptions(model_asset_path='public/models/pose_landmarker_lite.task'),running_mode=mp.tasks.vision.RunningMode.VIDEO,num_poses=1,min_pose_detection_confidence=.6,min_pose_presence_confidence=.6,min_tracking_confidence=.6))
while True:
 ok,im=c.read()
 if not ok:break
 if i%2:i+=1;continue
 h,w=im.shape[:2];aspect=w/h
 r=p.detect_for_video(mp.Image(image_format=mp.ImageFormat.SRGB,data=cv2.cvtColor(im,cv2.COLOR_BGR2RGB)),round(i*1000/fps))
 if 23<=i<=87 and r.pose_landmarks:
  b=r.pose_landmarks[0];a,d,l,r=b[11],b[12],b[15],b[16];width=math.hypot((a.x-d.x)*aspect,a.y-d.y)
  if min(a.visibility,d.visibility,l.visibility,r.visibility)>.55 and width>.03:
   frames.append({'frame':i,'time':i/fps,'gap':math.hypot((l.x-r.x)*aspect,l.y-r.y)/width,'height':((l.y+r.y)-(a.y+d.y))/2/width})
 i+=1
c.release();p.close()
if len(frames)<6:raise RuntimeError('Contact pose not clear enough')
Path('public/evaluation/mucho-gusto.json').write_text(json.dumps({'version':'contact-guidance-v1','signId':'mucho-gusto','status':'partial-no-grade','reason':'Two hands not independently tracked during clasp in source task model','frames':frames},separators=(',',':')))
print('contact references',len(frames),'gap',min(f['gap'] for f in frames),max(f['gap'] for f in frames))
