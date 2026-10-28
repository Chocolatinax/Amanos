"""BUENOS DÍAS reference: three ordered phases (thumb up, crossed forearms, open arms) from the team's human clip.

Uses the same HandLandmarker/PoseLandmarker task files as the browser and the same normalization as
lib/buenos-dias.ts: wrists relative to the shoulder midpoint in shoulder widths, without mirroring.
"""
import cv2,json,math,mediapipe as mp
from pathlib import Path
root=Path(__file__).resolve().parents[1]
SOURCE='buenos-dias.mp4'
# Frame ranges observed in the 60 fps source: raised thumb, forearms crossed in front of the chest, arms open.
PHASES=[('thumb-up',33,66),('cross',87,111),('open',135,180)]
START,END=27,195
def sub(a,b):return [x-y for x,y in zip(a,b)]
def norm(a):return math.sqrt(sum(x*x for x in a))
def unit(a):return [x/max(norm(a),1e-8) for x in a]
def dot(a,b):return sum(x*y for x,y in zip(a,b))
def features(v):
 p=lambda i:v[i*3:i*3+3]
 bend=[dot(unit(sub(p(i),p(i+1))),unit(sub(p(i+3),p(i+1)))) for i in [5,9,13,17]]
 a,b=p(5),p(17);normal=unit([a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]])
 return bend+unit(sub(p(8),p(5)))+normal+[norm(sub(p(8),p(20))),norm(sub(p(4),p(8)))]
def phase(n):return next((name for name,a,b in PHASES if a<=n<=b),'transition')
cap=cv2.VideoCapture(str(root/'references/videos'/SOURCE));fps=cap.get(cv2.CAP_PROP_FPS);step=max(1,round(fps/15));n=0;frames=[];thumbs=[]
hand=mp.tasks.vision.HandLandmarker.create_from_options(mp.tasks.vision.HandLandmarkerOptions(base_options=mp.tasks.BaseOptions(model_asset_path=str(root/'public/models/hand_landmarker.task')),running_mode=mp.tasks.vision.RunningMode.VIDEO,num_hands=2,min_hand_detection_confidence=.6,min_hand_presence_confidence=.6,min_tracking_confidence=.6))
pose=mp.tasks.vision.PoseLandmarker.create_from_options(mp.tasks.vision.PoseLandmarkerOptions(base_options=mp.tasks.BaseOptions(model_asset_path=str(root/'public/models/pose_landmarker_lite.task')),running_mode=mp.tasks.vision.RunningMode.VIDEO,num_poses=1,min_pose_detection_confidence=.6,min_pose_presence_confidence=.6,min_tracking_confidence=.6))
while True:
 ok,img=cap.read()
 if not ok:break
 h,w=img.shape[:2];aspect=w/h;ts=round(n*1000/fps)
 image=mp.Image(image_format=mp.ImageFormat.SRGB,data=cv2.cvtColor(img,cv2.COLOR_BGR2RGB))
 r=hand.detect_for_video(image,ts);pr=pose.detect_for_video(image,ts)
 if START<=n<=END and n%step==0 and pr.pose_landmarks:
  b=pr.pose_landmarks[0];a,d=b[11],b[12];width=math.hypot((a.x-d.x)*aspect,a.y-d.y)
  if min(b[i].visibility for i in [11,12,15,16])>=.6 and width>.03:
   cx,cy=(a.x+d.x)/2,(a.y+d.y)/2
   wrists=[v for i in [15,16] for v in ((b[i].x-cx)*aspect/width,(b[i].y-cy)/width)]
   frames.append({'time':round(n/fps,6),'frame':n,'phase':phase(n),'wrists':[round(x,6) for x in wrists]})
   if phase(n)=='thumb-up':
    # The raised hand is the one whose wrist is highest in the image.
    best=None
    for k,points in enumerate(r.hand_world_landmarks):
     cat=r.handedness[k][0];origin,m=points[0],points[9];scale=norm([m.x-origin.x,m.y-origin.y,m.z-origin.z])
     if cat.score<.65 or scale<.005:continue
     flip=-1 if cat.category_name=='Left' else 1
     v=[x for p in points for x in ((p.x-origin.x)*flip/scale,(p.y-origin.y)/scale,(p.z-origin.z)/scale)]
     y=r.hand_landmarks[k][0].y
     if best is None or y<best[0]:best=(y,{'features':[round(x,6) for x in features(v)],'thumbDirection':[round(x,6) for x in unit(sub(v[12:15],v[6:9]))]})
    if best:thumbs.append(best[1])
 n+=1
cap.release();hand.close();pose.close()
counts={name:sum(f['phase']==name for f in frames) for name,_,_ in PHASES}
if min(counts.values())<4 or len(thumbs)<4:raise RuntimeError(f'insufficient observations {counts} thumbs={len(thumbs)}')
out={'version':'buenos-dias-v1','signId':'buenos-dias','source':SOURCE,'activeFrames':[START,END],'fps':fps,'status':'prototype','coordinateSystem':'shoulder-midpoint/shoulder-width, unmirrored image','frames':frames,'thumbs':thumbs}
(root/'public/evaluation/buenos-dias.json').write_text(json.dumps(out,separators=(',',':')))
print('frames',len(frames),counts,'thumbs',len(thumbs))
for name,_,_ in PHASES:
 ws=[f['wrists'] for f in frames if f['phase']==name]
 print(name,'mean wrists',[round(sum(w[i] for w in ws)/len(ws),2) for i in range(4)])
for t in thumbs[:3]:print('thumb bends',[round(x,2) for x in t['features'][:4]],'dir',[round(x,2) for x in t['thumbDirection']])
