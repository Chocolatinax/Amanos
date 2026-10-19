// Publish the reviewed player and preserve original landmark sequences.
const fs = require('node:fs');
const path = require('node:path');
const source = path.resolve(__dirname, '../../avatar-senas');
const target = path.resolve(__dirname, '../public/avatar');
const clips = { a: 'A arreglado', b: 'b', c: 'C', adios: 'Adios', tu: 'Tu', gracias: 'Gracias', hola: 'Hola', 'buenos-dias': 'Buenos dias', 'buenas-tardes': 'Buenas Tardes' };
fs.mkdirSync(path.join(target, 'landmarks'), { recursive: true });
fs.mkdirSync(path.join(target, 'avatares'), { recursive: true });
fs.mkdirSync(path.resolve(__dirname, '../public/movements'), { recursive: true });
for (const file of ['viewer.html', 'demo-corrections.js', 'avatares/Amanos.vrm']) {
  fs.copyFileSync(path.join(source, file), path.join(target, file));
}
let html = fs.readFileSync(path.join(target, 'viewer.html'), 'utf8');
html = html.replace("$('referenceVideo').src = 'videos/' + encodeURIComponent(name) + '.mp4';", "if (!document.body.classList.contains('embedded')) $('referenceVideo').src = 'videos/' + encodeURIComponent(name) + '.mp4';");
html = html.replace('</style>', `
body.embedded #panel,body.embedded #reference{display:none}
body.embedded{background:#e6eeeb}
body.compact #demoControls{display:none}
#demoControls{position:absolute;bottom:12px;left:12px;right:12px;display:flex;gap:8px;align-items:center;z-index:2}
#demoControls button{background:#244c45;border-radius:24px;padding:10px 16px}
#demoMessage{position:absolute;top:12px;left:12px;right:12px;color:#244c45;text-align:center}
</style>`);
html = html.replace(/<\/script>\r?\n<\/body>/, `
// Embedded lesson mode uses the same rig and authored corrections as the review player.
const demoSign = new URLSearchParams(location.search).get('sign');
const demoClips = ${JSON.stringify(clips)};
if (demoClips[demoSign]) {
  document.body.classList.add('embedded');
  if (new URLSearchParams(location.search).get('compact') === '1') document.body.classList.add('compact');
  scene.background = new THREE.Color('#e6eeeb');
  controls.enableZoom = false; controls.enablePan = false;
  const bar = document.createElement('div'); bar.id = 'demoControls';
  const play = document.createElement('button'); play.textContent = 'Pausar';
  play.onclick = () => { $('play').click(); play.textContent = playing ? 'Pausar' : 'Reproducir'; };
  const replay = document.createElement('button'); replay.textContent = 'Repetir';
  replay.onclick = () => { if (!data) return; showFrame(0); playing = true; play.textContent = 'Pausar'; };
  const speedButton = document.createElement('button'); speedButton.textContent = '1x';
  speedButton.onclick = () => { $('speed').value = +$('speed').value === 1 ? .5 : 1; speedButton.textContent = $('speed').value + 'x'; };
  bar.append(play,replay,speedButton); stage.append(bar);
  const message = document.createElement('div'); message.id = 'demoMessage'; message.setAttribute('role','status');
  message.textContent = 'Cargando avatar…'; stage.append(message);
  const observer = new MutationObserver(() => { if ($('status').textContent.startsWith('Error:')) message.textContent = 'No se pudo cargar el avatar. Volvé a intentar recargando la página.'; });
  observer.observe($('status'),{childList:true});
  $('preset').value = demoClips[demoSign];
  $('loadPreset').onclick().then(() => { if (!data || !vrm) return; $('referenceVideo').removeAttribute('src'); $('referenceVideo').load(); message.textContent = ''; playing = true; resize(); });
}
</script>\n</body>`);
fs.writeFileSync(path.join(target, 'viewer.html'), html);
const manifest = { schemaVersion: 1, purpose: 'camera-recognition-reference', status: 'reference-only', coordinateSystem: 'mediapipe-holistic-normalized-image', notes: 'Original detections, including pose and interpolation flags. Not hand-world-v2 classifier samples. Dynamic/location signs require temporal/body validation.', signs: [] };
for (const [id, name] of Object.entries(clips)) {
  const raw = fs.readFileSync(path.join(source, 'landmarks', name + '.json'));
  for (const destination of [path.join(target, 'landmarks', name + '.json'), path.resolve(__dirname, '../public/movements', id + '.json')]) {
    if (!fs.existsSync(destination) || !fs.readFileSync(destination).equals(raw)) fs.writeFileSync(destination, raw);
  }
  const data = JSON.parse(raw);
  manifest.signs.push({ id, name, url: '/movements/' + id + '.json', frames: data.frames.length, fps: data.fps, width: data.width, height: data.height });
}
fs.writeFileSync(path.resolve(__dirname, '../public/movements/manifest.json'), JSON.stringify(manifest, null, 2));
console.log('Published avatar player and original movement JSON for: ' + Object.keys(clips).join(', ') + '');
