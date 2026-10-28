"""Observable body checks only; these references do not certify finger configuration."""
import cv2,json,math,mediapipe as mp
from pathlib import Path
root=Path(__file__).resolve().parents[1]
for name,start,end,mode in [('gracias',12,67,'sequence')]:
 cap=cv2.VideoCapture(str(root/'references/videos'/f'{name}.mp4'));fps=cap.get(cv2.CAP_PROP_FPS);frames=[];i=0;step=max(1,round(fps/15))
 opts=mp.tasks.vision.PoseLandmarkerOptions(base_options=mp.tasks.BaseOptions(model_asset_path=str(root/'public/models/pose_landmarker_lite.task')),running_mode=mp.tasks.vision.RunningMode.VIDEO,num_poses=1,min_pose_detection_confidence=.6,min_pose_presence_confidence=.6,min_tracking_confidence=.6)
 with mp.tasks.vision.PoseLandmarker.create_from_options(opts) as model:
  while True:
   ok,img=cap.read()
   if not ok:break
   if i%step:i+=1;continue
   h,w=img.shape[:2];aspect=w/h
   r=model.detect_for_video(mp.Image(image_format=mp.ImageFormat.SRGB,data=cv2.cvtColor(img,cv2.COLOR_BGR2RGB)),round(i*1000/fps))
   if start<=i<=end and r.pose_landmarks:
    b=r.pose_landmarks[0]
    if min(b[j].visibility for j in [11,12,13,14,15,16])>=.6:
     a,d=b[11],b[12];width=math.hypot((a.x-d.x)*aspect,a.y-d.y)
     if width>.03:
      pairs=sorted([[(b[j].x-(a.x+d.x)/2)*aspect/width,(b[j].y-(a.y+d.y)/2)/width] for j in [15,16]])
      frames.append({'time':round(i/fps,6),'wrists':[round(x,6) for pair in pairs for x in pair]})
   i+=1
 cap.release()
 if len(frames)<8:raise RuntimeError(f'{name}: too few visible frames')
 out={'version':'movement-check-v1','signId':name,'scope':'body-motion-only','mode':mode,'source':name+'.mp4','activeFrames':[start,end],'frames':frames}
 (root/'public/evaluation'/f'{name}-movement.json').write_text(json.dumps(out,separators=(',',':')))
 print(name,len(frames),flush=True)
