/* Authored corrections for these four reference clips, not a sign recognizer. */
(function (root) {
  const profiles = {
    A: { range: [33, 42, 68, 80], pose: 'fist', side: 'Left' },
    Tu: { range: [15, 24, 60, 72], pose: 'point', side: 'Left' },
    Gracias: { range: [8, 15, 68, 77], pose: 'flat', side: 'Both' },
    'Mucho gusto': { range: [10, 23, 88, 100], pose: 'grip', side: 'Both' },
  };
  const smooth = x => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
  function weight(name, frame) {
    const p = profiles[name];
    if (!p || !Number.isFinite(frame)) return 0;
    const [a, b, c, d] = p.range;
    return smooth((frame - a) / (b - a)) * (1 - smooth((frame - c) / (d - c)));
  }
  function angles(pose, finger) {
    if (pose === 'flat' || (pose === 'point' && finger === 'Index')) return [0.04, 0.04, 0.04];
    if (pose === 'grip') return [0.85, 1.15, 0.65];
    return [1.35, 1.65, 0.95];
  }
  function apply({ THREE, node, rest, name, frame, mirrored, strength = 1, contact = true }) {
    const profile = profiles[name];
    const w = weight(name, frame) * Math.max(0, Math.min(1, strength));
    if (!profile || w <= 0) return;
    let sides = profile.side === 'Both' ? ['Left', 'Right'] : [profile.side];
    if (mirrored) sides = sides.map(s => s === 'Left' ? 'Right' : 'Left');
    for (const side of sides) {
      const prefix = side.toLowerCase();
      const sign = side === 'Left' ? 1 : -1;
      for (const finger of ['Index', 'Middle', 'Ring', 'Little']) {
        const values = profile.pose === 'grip'
          ? (side === (mirrored ? 'Right' : 'Left') ? [0.55, 1.45, 0.8] : [1.3, 1.55, 0.85])
          : angles(profile.pose, finger);
        ['Proximal', 'Intermediate', 'Distal'].forEach((joint, i) => {
          const bone = node(prefix + finger + joint);
          if (!bone || !rest[bone.name]) return;
          const q = rest[bone.name].clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), sign * values[i]));
          bone.quaternion.slerp(q, w);
        });
      }
      if (profile.pose === 'grip') {
        const hand = node(prefix + 'Hand'), middle = node(prefix + 'MiddleProximal');
        const index = node(prefix + 'IndexProximal'), little = node(prefix + 'LittleProximal');
        if (hand && middle && index && little) {
          const wrapping = side === (mirrored ? 'Right' : 'Left');
          const basis = (forward, lateral) => {
            const x = forward.clone().normalize();
            const z = new THREE.Vector3().crossVectors(x, lateral).normalize();
            const y = new THREE.Vector3().crossVectors(z, x);
            return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
          };
          const reflect = mirrored ? -1 : 1;
          const forward = wrapping ? new THREE.Vector3(-0.9 * reflect, 0.35, 0.05) : new THREE.Vector3(0.18 * reflect, 0.97, 0.05);
          const lateral = wrapping ? new THREE.Vector3(0.35 * reflect, 0.9, 0) : new THREE.Vector3(0, 0, -1);
          const local = basis(middle.position, index.position.clone().sub(little.position));
          const parent = hand.parent.getWorldQuaternion(new THREE.Quaternion());
          hand.quaternion.slerp(parent.invert().multiply(basis(forward, lateral)).multiply(local.invert()), w);
          hand.updateMatrixWorld(true);
          ['Proximal', 'Intermediate', 'Distal'].forEach((joint, i) => {
            const thumb = node(prefix + 'Thumb' + joint);
            if (!thumb || !rest[thumb.name]) return;
            const q = rest[thumb.name].clone();
            // The supporting thumb closes over its fingers; using the wrapping
            // thumb pose on both hands leaves it sticking out of the clasp.
            if (i === 0) q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), sign * (wrapping ? 0.65 : 1.05)));
            const thumbCurl = wrapping ? [0.25, 0.45, 0.25] : [0.65, 0.85, 0.55];
            q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), sign * thumbCurl[i]));
            thumb.quaternion.slerp(q, w);
          });
        }
      }
      if (profile.pose === 'flat') {
        // Occluded thumbs can twist even when the other four fingers are stable.
        for (const joint of ['Proximal', 'Intermediate', 'Distal']) {
          const thumb = node(prefix + 'Thumb' + joint);
          if (thumb && rest[thumb.name]) thumb.quaternion.slerp(rest[thumb.name], w);
        }
        const hand = node(prefix + 'Hand'), middle = node(prefix + 'MiddleProximal');
        const index = node(prefix + 'IndexProximal'), little = node(prefix + 'LittleProximal');
        if (hand && middle && index && little) {
          const basis = (forward, lateral) => {
            const x = forward.clone().normalize();
            const z = new THREE.Vector3().crossVectors(x, lateral).normalize();
            const y = new THREE.Vector3().crossVectors(z, x);
            return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
          };
          const local = basis(middle.position, index.position.clone().sub(little.position));
          const desired = basis(new THREE.Vector3(0, -0.08, 1), new THREE.Vector3(side === 'Left' ? -1 : 1, 0, 0));
          const parent = hand.parent.getWorldQuaternion(new THREE.Quaternion());
          hand.quaternion.slerp(parent.invert().multiply(desired).multiply(local.invert()), w);
          hand.updateMatrixWorld(true);
        }
      }
      if (profile.pose === 'point') {
        const hand = node(prefix + 'Hand');
        const base = node(prefix + 'IndexProximal');
        const tip = node(prefix + 'IndexDistal');
        if (hand && base && tip) {
          const direction = tip.getWorldPosition(new THREE.Vector3()).sub(base.getWorldPosition(new THREE.Vector3())).normalize();
          // This reference points at the viewer, rather than raising an index vertically.
          const delta = new THREE.Quaternion().setFromUnitVectors(direction, new THREE.Vector3(0, -0.03, 1).normalize());
          const world = hand.getWorldQuaternion(new THREE.Quaternion());
          const parent = hand.parent.getWorldQuaternion(new THREE.Quaternion());
          const target = parent.invert().multiply(delta.multiply(world));
          hand.quaternion.slerp(target, w);
          hand.updateMatrixWorld(true);
        }
      }
    }
    if (profile.pose === 'grip' && contact) joinHands({ THREE, node, weight: w, mirrored });
  }
  function joinHands({ THREE, node, weight, mirrored }) {
    const hands = ['left', 'right'].map(side => ({ side, hand: node(side + 'Hand'), anchor: node(side + 'MiddleProximal') }));
    if (hands.some(h => !h.hand || !h.anchor)) return;
    const positions = hands.map(h => h.hand.getWorldPosition(new THREE.Vector3()).lerp(h.anchor.getWorldPosition(new THREE.Vector3()), 0.5));
    const center = positions[0].clone().add(positions[1]).multiplyScalar(0.5);
    hands.forEach((h, i) => {
      const handQ = h.hand.getWorldQuaternion(new THREE.Quaternion());
      // Small opposing offsets retain palm volume instead of merging both wrists.
      const wrapping = h.side === (mirrored ? 'right' : 'left');
      const palmTarget = center.clone().add(new THREE.Vector3((wrapping ? 0.008 : -0.008) * (mirrored ? -1 : 1), wrapping ? 0.005 : -0.005, wrapping ? 0.022 : -0.022));
      palmTarget.lerp(positions[i], 1 - weight);
      // Solve wrist position, accounting for the preserved hand orientation. Solving
      // a knuckle and restoring hand rotation afterwards moves it away from its target.
      // Contact is at the palm center, not at the knuckle line.
      const anchorOffset = h.anchor.position.clone().multiplyScalar(0.5).applyQuaternion(handQ);
      const target = palmTarget.sub(anchorOffset);
      const joints = [node(h.side + 'LowerArm'), node(h.side + 'UpperArm')];
      for (let pass = 0; pass < 12; pass++) {
        for (const joint of joints) {
          if (!joint) continue;
          const pivot = joint.getWorldPosition(new THREE.Vector3());
          const from = h.hand.getWorldPosition(new THREE.Vector3()).sub(pivot);
          const to = target.clone().sub(pivot);
          if (from.lengthSq() < 1e-10 || to.lengthSq() < 1e-10) continue;
          const delta = new THREE.Quaternion().setFromUnitVectors(from.normalize(), to.normalize());
          const parent = joint.parent.getWorldQuaternion(new THREE.Quaternion());
          joint.quaternion.premultiply(parent.clone().invert().multiply(delta).multiply(parent));
          joint.updateMatrixWorld(true);
        }
      }
      const parent = h.hand.parent.getWorldQuaternion(new THREE.Quaternion());
      h.hand.quaternion.copy(parent.invert().multiply(handQ));
      h.hand.updateMatrixWorld(true);
    });
  }
  const api = { profiles, weight, angles, apply };
  if (typeof module !== 'undefined') module.exports = api;
  else root.DemoCorrections = api;
})(typeof window === 'undefined' ? {} : window);
