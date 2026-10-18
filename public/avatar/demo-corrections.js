/* Authored corrections for the reference clips, not a sign recognizer. */
(function (root) {
  const profiles = {
    A: { range: [33, 42, 68, 80], pose: 'fist', side: 'Left' },
    b: { range: [25, 35, 115, 130], pose: 'tucked', side: 'Right' },
    Hola: { range: [18, 26, 66, 76], pose: 'tucked', side: 'Left' },
    Tu: { range: [15, 24, 60, 72], pose: 'point', side: 'Left' },
    Gracias: { range: [-2, 0, 81, 83], pose: 'flat', side: 'Both' },
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
    if (pose === 'flat' || pose === 'tucked' || (pose === 'point' && finger === 'Index')) return [0.04, 0.04, 0.04];
    if (pose === 'grip') return [0.85, 1.15, 0.65];
    return [1.35, 1.65, 0.95];
  }
  function apply({ THREE, node, rest, name, frame, mirrored, strength = 1, contact = true, pose, imageAspect = 1 }) {
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
      if (profile.pose === 'tucked') {
        foldThumb({ THREE, node, rest, prefix, weight: w });
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
    if (name === 'Gracias') lowerThanks({ THREE, node, pose, imageAspect, mirrored, weight: w });
    if (profile.pose === 'grip' && contact) joinHands({ THREE, node, weight: w, mirrored });
  }
  function thanksLocations(pose, imageAspect, mirrored = false) {
    if (!pose || [11, 12, 13, 14, 15, 16].some(i => !pose[i] || (pose[i].visibility ?? 1) < .5 || !Number.isFinite(pose[i].x) || !Number.isFinite(pose[i].y)) || !Number.isFinite(imageAspect) || imageAspect <= 0) return null;
    const width = Math.hypot((pose[11].x - pose[12].x) * imageAspect, pose[11].y - pose[12].y);
    if (width < .03) return null;
    const centerX = (pose[11].x + pose[12].x) / 2, centerY = (pose[11].y + pose[12].y) / 2;
    const location = i => ({ x: (pose[i].x - centerX) * imageAspect / width * (mirrored ? -1 : 1), y: (centerY - pose[i].y) / width });
    return { left: { ...location(mirrored ? 16 : 15), elbow: location(mirrored ? 14 : 13) }, right: { ...location(mirrored ? 15 : 16), elbow: location(mirrored ? 13 : 14) } };
  }
  function lowerThanks({ THREE, node, pose, imageAspect, mirrored = false, weight }) {
    const locations = thanksLocations(pose, imageAspect, mirrored);
    if (!locations) return;
    const left = node('leftUpperArm'), right = node('rightUpperArm');
    if (!left || !right) return;
    const leftPosition = left.getWorldPosition(new THREE.Vector3()), rightPosition = right.getWorldPosition(new THREE.Vector3());
    const width = leftPosition.distanceTo(rightPosition);
    const center = leftPosition.clone().add(rightPosition).multiplyScalar(.5);
    for (const side of ['left', 'right']) {
      const hand = node(side + 'Hand'), shoulder = node(side + 'UpperArm');
      if (!hand || !shoulder) continue;
      const current = hand.getWorldPosition(new THREE.Vector3()), location = locations[side];
      // Use each source wrist relative to the shoulders. Never feed the previous
      // solved wrist back into the target: that drifts both hands inward.
      const target = new THREE.Vector3(center.x + width * location.x, center.y + width * location.y, center.z + width * .65).lerp(current, 1 - weight);
      const orientation = hand.getWorldQuaternion(new THREE.Quaternion());
      const upper = node(side + 'UpperArm'), lower = node(side + 'LowerArm');
      if (!upper || !lower) continue;
      const origin = upper.getWorldPosition(new THREE.Vector3());
      const direction = target.clone().sub(origin), distance = direction.length();
      if (distance < 1e-6) continue;
      direction.normalize();
      const lengthA = lower.position.length() * upper.getWorldScale(new THREE.Vector3()).x;
      const lengthB = hand.position.length() * lower.getWorldScale(new THREE.Vector3()).x;
      const reach = Math.max(Math.abs(lengthA - lengthB) + 1e-5, Math.min(lengthA + lengthB - 1e-5, distance));
      const along = (lengthA * lengthA + reach * reach - lengthB * lengthB) / (2 * reach);
      const height = Math.sqrt(Math.max(0, lengthA * lengthA - along * along));
      // A wrist target alone leaves infinitely many elbow positions. Use the
      // source elbow as the bend guide instead of accumulating CCD rotations.
      const bend = new THREE.Vector3(center.x + width * location.elbow.x, center.y + width * location.elbow.y, center.z + width * .15).sub(origin);
      bend.addScaledVector(direction, -bend.dot(direction));
      if (bend.lengthSq() < 1e-10) { bend.set(0, -1, 0); bend.addScaledVector(direction, -bend.dot(direction)); }
      bend.normalize();
      const elbow = origin.clone().addScaledVector(direction, along).addScaledVector(bend, height);
      const wrist = origin.clone().addScaledVector(direction, reach);
      const aim = (joint, axis, destination) => {
        const local = destination.clone().sub(joint.getWorldPosition(new THREE.Vector3())).normalize().applyQuaternion(joint.parent.getWorldQuaternion(new THREE.Quaternion()).invert());
        joint.quaternion.setFromUnitVectors(axis.clone().normalize(), local);
        joint.updateMatrixWorld(true);
      };
      aim(upper, lower.position, elbow);
      aim(lower, hand.position, wrist);
      hand.quaternion.copy(hand.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(orientation));
      hand.updateMatrixWorld(true);
    }
  }
  function foldThumb({ THREE, node, rest, prefix, weight }) {
    const hand = node(prefix + 'Hand'), middle = node(prefix + 'MiddleProximal');
    const index = node(prefix + 'IndexProximal'), little = node(prefix + 'LittleProximal');
    const chain = ['Proximal', 'Intermediate', 'Distal'].map(j => node(prefix + 'Thumb' + j));
    if (!hand || !middle || !index || !little || chain.some(b => !b || !rest[b.name])) return;
    const original = chain.map(b => b.quaternion.clone());
    chain.forEach(b => b.quaternion.copy(rest[b.name]));
    hand.updateMatrixWorld(true);
    // The thumb lies on the palm surface, aimed across the palm, independently
    // of the hand's orientation and of the model's bone rotation axes.
    const width = index.position.distanceTo(little.position);
    const normal = new THREE.Vector3().crossVectors(middle.position, index.position.clone().sub(little.position)).normalize();
    if (normal.dot(chain[0].position) < 0) normal.negate();
    const lateral = little.position.clone().sub(index.position).normalize();
    const target = middle.position.clone().multiplyScalar(.7).addScaledVector(normal, width * .35).addScaledVector(lateral, width * .15);
    hand.localToWorld(target);
    const tipOffset = chain[2].position.clone().multiplyScalar(.65);
    const tipDirection = lateral.clone().transformDirection(hand.matrixWorld);
    const distalTarget = target.clone().addScaledVector(tipDirection, -tipOffset.length());
    const base = chain[0].getWorldPosition(new THREE.Vector3());
    const along = distalTarget.clone().sub(base), distance = along.length();
    const firstLength = chain[1].position.length(), secondLength = chain[2].position.length();
    along.normalize();
    const reach = Math.max(Math.abs(firstLength - secondLength) + 1e-5, Math.min(firstLength + secondLength - 1e-5, distance));
    const projected = (firstLength * firstLength + reach * reach - secondLength * secondLength) / (2 * reach);
    const height = Math.sqrt(Math.max(0, firstLength * firstLength - projected * projected));
    const bend = new THREE.Vector3().crossVectors(normal.clone().transformDirection(hand.matrixWorld), along).normalize();
    if (bend.dot(tipDirection) > 0) bend.negate();
    const elbow = base.clone().addScaledVector(along, projected).addScaledVector(bend, height);
    const aim = (joint, localAxis, direction) => {
      const parent = joint.parent.getWorldQuaternion(new THREE.Quaternion()).invert();
      const localDirection = direction.clone().normalize().applyQuaternion(parent);
      joint.quaternion.setFromUnitVectors(localAxis.clone().normalize(), localDirection);
      joint.updateMatrixWorld(true);
    };
    aim(chain[0], chain[1].position, elbow.clone().sub(base));
    aim(chain[1], chain[2].position, distalTarget.clone().sub(elbow));
    aim(chain[2], tipOffset, tipDirection);
    chain.forEach((b, i) => b.quaternion.copy(original[i].slerp(b.quaternion.clone(), weight)));
    hand.updateMatrixWorld(true);
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
  const api = { profiles, weight, angles, apply, foldThumb, lowerThanks, thanksLocations };
  if (typeof module !== 'undefined') module.exports = api;
  else root.DemoCorrections = api;
})(typeof window === 'undefined' ? {} : window);
