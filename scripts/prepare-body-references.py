"""Body-aware references from human clips, using the web camera's exact task models."""
import cv2,json,math,sys,mediapipe as mp
from pathlib import Path
root=Path(__file__).resolve().parents[1]
def sub(a,b):return [x-y for x,y in zip(a,b)]
def norm(a):return math.sqrt(sum(x*x for x in a))
def unit(a):return [x/max(norm(a),1e-8) for x in a]
def dot(a,b):return sum(x*y for x,y in zip(a,b))
def features(v):
 p=lambda i:v[i*3:i*3+3]
 bend=[dot(unit(sub(p(i),p(i+1))),unit(sub(p(i+3),p(i+1)))) for i in [5,9,13,17]]
 a,b=p(5),p(17);normal=unit([a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]])
 return bend+unit(sub(p(8),p(5)))+normal+[norm(sub(p(8),p(20))),norm(sub(p(4),p(8)))]
configs=[('tu','tu',24,60,1,'hold'),('gracias','gracias',12,67,2,'sequence'),('hola','hola-human',30,56,1,'sequence'),('buenas-tardes','buenas-tardes',40,156,1,'sequence')]
for name,file,start,end,count,mode in configs:
 if len(sys.argv)>1 and name not in sys.argv[1:]:continue
 cap=cv2.VideoCapture(str(root/'references/videos'/f'{file}.mp4'));fps=cap.get(cv2.CAP_PROP_FPS);frames=[];step=max(1,round(fps/15));n=0
 hand=mp.tasks.vision.HandLandmarker.create_from_options(mp.tasks.vision.HandLandmarkerOptions(base_options=mp.tasks.BaseOptions(model_asset_path=str(root/'public/models/hand_landmarker.task')),running_mode=mp.tasks.vision.RunningMode.VIDEO,num_hands=2,min_hand_detection_confidence=.6,min_hand_presence_confidence=.6,min_tracking_confidence=.6))
 pose=mp.tasks.vision.PoseLandmarker.create_from_options(mp.tasks.vision.PoseLandmarkerOptions(base_options=mp.tasks.BaseOptions(model_asset_path=str(root/'public/models/pose_landmarker_lite.task')),running_mode=mp.tasks.vision.RunningMode.VIDEO,num_poses=1,min_pose_detection_confidence=.6,min_pose_presence_confidence=.6,min_tracking_confidence=.6))
 while True:
  ok,img=cap.read()
  if not ok:break
  if n%step:n+=1;continue
  h,w=img.shape[:2];aspect=w/h;image=mp.Image(image_format=mp.ImageFormat.SRGB,data=cv2.cvtColor(img,cv2.COLOR_BGR2RGB));ts=round(n*1000/fps)
  r=hand.detect_for_video(image,ts);pr=pose.detect_for_video(image,ts)
  if start<=n<=end and pr.pose_landmarks:
   body=pr.pose_landmarks[0];a,b,nose=body[11],body[12],body[0];width=math.hypot((a.x-b.x)*aspect,a.y-b.y)
   if min(a.visibility,b.visibility,nose.visibility)>.6 and width>.03:
    hands=[]
    for k,points in enumerate(r.hand_world_landmarks):
     cat=r.handedness[k][0];pw=r.hand_landmarks[k][0];tip=r.hand_landmarks[k][8];origin,m=points[0],points[9];scale=norm([m.x-origin.x,m.y-origin.y,m.z-origin.z]);flip=-1 if cat.category_name=='Left' else 1
     if cat.score<.65 or scale<.005:continue
     v=[x for p in points for x in ((p.x-origin.x)*flip/scale,(p.y-origin.y)/scale,(p.z-origin.z)/scale)]
     anchor=[(pw.x-(a.x+b.x)/2)*aspect*flip/width,(pw.y-(a.y+b.y)/2)/width,(tip.x-nose.x)*aspect*flip/width,(tip.y-nose.y)/width]
     hands.append({'features':features(v),'thumb':[norm(sub(v[12:15],v[i*3:i*3+3])) for i in [5,9,17]],'thumbDirection':unit(sub(v[12:15],v[6:9])),'anchor':anchor,'screen':[pw.x*aspect,pw.y],'score':cat.score})
    if len(hands)>=count:
     hands=sorted(hands,key=lambda x:x['screen'][1])[:count]
     gap=norm(sub(hands[0]['screen'],hands[1]['screen']))/width if count==2 else 0
     frames.append({'time':n/fps,'frame':n,'hands':[{'features':[round(x,6) for x in hand['features']],'anchor':[round(x,6) for x in hand['anchor']],**({'thumb':[round(x,6) for x in hand['thumb']]} if name in ['hola','buenas-tardes'] else {}),**({'thumbDirection':[round(x,6) for x in hand['thumbDirection']]} if name=='buenas-tardes' else {})} for hand in hands],'gap':round(gap,6),**({'phase':'thumb-up' if n<=80 else 'flat' if n>=104 else 'transition'} if name=='buenas-tardes' else {})})
  n+=1
 cap.release();hand.close();pose.close()
 if len(frames)<6:raise RuntimeError(f'{name}: insufficient observations ({len(frames)})')
 output={'version':'human-body-v1','signId':name,'mode':mode,'requiredHands':count,'source':f'{file}.mp4','activeFrames':[start,end],'fps':fps,'status':'partial-no-grade' if name=='gracias' else 'prototype','coordinateSystem':'image-height-units/shoulder-width','frames':frames}
 (root/'public/evaluation'/f'{name}.json').write_text(json.dumps(output,separators=(',',':')))
 print(name,'frames',len(frames),'gaps',round(min(x['gap'] for x in frames),3),round(max(x['gap'] for x in frames),3),flush=True)
