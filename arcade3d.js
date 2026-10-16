// =========================================================================
// 3. THREE.JS 3D ARCADE CABINET & ROOM SCENE
// =========================================================================
window.startArcade3D = function (THREE, OrbitControls) {
  const container = document.getElementById('webgl-container');
  const sound = window.retroSound;
  const game2d = new window.Arcade2DEngine(sound);

  // --- Scene, Camera, Renderer ---
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05050b);
  scene.fog = new THREE.FogExp2(0x05050b, 0.042);

  const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;
  controls.maxPolarAngle = Math.PI / 2 - 0.02;
  controls.minDistance = 1.4;
  controls.maxDistance = 12;
  controls.enabled = false;

  // --- Camera Presets ---
  const camPresets = {
    arcade: { pos: new THREE.Vector3(0, 3.15, 2.75), target: new THREE.Vector3(0, 2.72, 0.1) },
    screen: { pos: new THREE.Vector3(0, 3.16, 1.58), target: new THREE.Vector3(0, 3.05, 0.05) },
    full:   { pos: new THREE.Vector3(2.35, 3.1, 4.55), target: new THREE.Vector3(0, 2.25, 0) },
    orbit:  { pos: new THREE.Vector3(2.8, 3.4, 4.2), target: new THREE.Vector3(0, 2.35, 0) }
  };
  let activeCamMode = 'arcade';
  camera.position.copy(camPresets.arcade.pos);
  controls.target.copy(camPresets.arcade.target);
  camera.lookAt(camPresets.arcade.target);

  // --- Lights ---
  const ambientLight = new THREE.AmbientLight(0x283055, 1.3);
  scene.add(ambientLight);

  const mainSpot = new THREE.SpotLight(0x93c5fd, 35, 20, Math.PI / 4, 0.5, 1.2);
  mainSpot.position.set(3.5, 7.5, 5.0);
  mainSpot.castShadow = true;
  mainSpot.shadow.mapSize.set(1024, 1024);
  scene.add(mainSpot);

  const neonPinkLight = new THREE.PointLight(0xff007f, 12, 9);
  neonPinkLight.position.set(-2.8, 3.8, 1.5);
  scene.add(neonPinkLight);

  const neonCyanLight = new THREE.PointLight(0x00f7ff, 12, 9);
  neonCyanLight.position.set(2.8, 3.8, 1.5);
  scene.add(neonCyanLight);

  // Dynamic CRT Screen Glow Light illuminating the joystick deck
  const crtGlowLight = new THREE.PointLight(0x00f7ff, 4.5, 3.2);
  crtGlowLight.position.set(0, 2.85, 0.72);
  scene.add(crtGlowLight);

  // --- Retro Arcade Room Environment (Floor & Neon Grid) ---
  const floorGeo = new THREE.PlaneGeometry(40, 40);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x070913,
    roughness: 0.25,
    metalness: 0.6
  });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const gridHelper = new THREE.GridHelper(36, 36, 0xff007f, 0x00f7ff);
  gridHelper.position.y = 0.01;
  gridHelper.material.opacity = 0.28;
  gridHelper.material.transparent = true;
  scene.add(gridHelper);

  // --- Helper: Procedural Side Decal & Marquee Textures ---
  function createMarqueeTexture() {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 128;
    const cx = c.getContext('2d');
    const grad = cx.createLinearGradient(0, 0, 512, 128);
    grad.addColorStop(0, '#ff007f');
    grad.addColorStop(0.5, '#3b0764');
    grad.addColorStop(1, '#00f7ff');
    cx.fillStyle = grad;
    cx.fillRect(0, 0, 512, 128);

    cx.strokeStyle = '#facc15';
    cx.lineWidth = 6;
    cx.strokeRect(8, 8, 496, 112);

    cx.font = '900 44px Courier New';
    cx.textAlign = 'center';
    cx.fillStyle = '#00f7ff';
    cx.fillText('NEON ARCADE', 256, 62);
    cx.font = 'bold 26px Courier New';
    cx.fillStyle = '#facc15';
    cx.fillText('1984 3-IN-1 EDITION', 256, 102);

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  function createCoinSlotTexture() {
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 128;
    const cx = c.getContext('2d');
    cx.fillStyle = '#ea580c';
    cx.fillRect(0, 0, 128, 128);
    cx.strokeStyle = '#fde047';
    cx.lineWidth = 6;
    cx.strokeRect(6, 6, 116, 116);
    cx.fillStyle = '#111';
    cx.fillRect(58, 18, 12, 42);
    cx.fillStyle = '#fff';
    cx.font = 'bold 24px Courier New';
    cx.textAlign = 'center';
    cx.fillText('25c', 64, 86);
    cx.font = 'bold 16px Courier New';
    cx.fillText('INSERT', 64, 110);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  // =========================================================================
  // BUILD THE 3D ARCADE CABINET
  // =========================================================================
  const cabinetGroup = new THREE.Group();
  scene.add(cabinetGroup);

  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x111528, roughness: 0.45, metalness: 0.25 });
  const sidePanelMat = new THREE.MeshStandardMaterial({ color: 0x1a103c, roughness: 0.35, metalness: 0.3 });
  const trimMat = new THREE.MeshStandardMaterial({
    color: 0x00f7ff,
    emissive: 0x00f7ff,
    emissiveIntensity: 0.65,
    roughness: 0.2
  });
  const darkMetalMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.35, metalness: 0.8 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.12, metalness: 0.95 });

  // 1. Side Panels (Classic Arcade Profile using ExtrudeGeometry)
  const sideShape = new THREE.Shape();
  sideShape.moveTo(-0.85, 0.0);
  sideShape.lineTo(0.75, 0.0);
  sideShape.lineTo(0.75, 2.05);
  sideShape.lineTo(0.95, 2.28);
  sideShape.lineTo(0.50, 2.52);
  sideShape.lineTo(0.32, 3.65);
  sideShape.lineTo(0.72, 3.92);
  sideShape.lineTo(0.56, 4.45);
  sideShape.lineTo(-0.85, 4.45);
  sideShape.closePath();

  const sideExtrude = new THREE.ExtrudeGeometry(sideShape, {
    depth: 0.1,
    bevelEnabled: true,
    bevelThickness: 0.015,
    bevelSize: 0.015,
    bevelSegments: 2
  });

  const leftSide = new THREE.Mesh(sideExtrude, sidePanelMat);
  leftSide.rotation.y = Math.PI / 2;
  leftSide.position.x = -0.95;
  leftSide.castShadow = true;
  leftSide.receiveShadow = true;
  cabinetGroup.add(leftSide);

  const rightSide = new THREE.Mesh(sideExtrude, sidePanelMat);
  rightSide.rotation.y = Math.PI / 2;
  rightSide.position.x = 0.85;
  rightSide.castShadow = true;
  rightSide.receiveShadow = true;
  cabinetGroup.add(rightSide);

  // Neon T-Molding Strips along front edges
  const leftTrim = new THREE.Mesh(sideExtrude, trimMat);
  leftTrim.rotation.y = Math.PI / 2;
  leftTrim.scale.set(1.005, 1.005, 0.22);
  leftTrim.position.set(-0.96, 0, 0);
  cabinetGroup.add(leftTrim);

  const rightTrim = new THREE.Mesh(sideExtrude, trimMat);
  rightTrim.rotation.y = Math.PI / 2;
  rightTrim.scale.set(1.005, 1.005, 0.22);
  rightTrim.position.set(0.94, 0, 0);
  cabinetGroup.add(rightTrim);

  // 2. Lower Base Box & Back Spine
  const baseBox = new THREE.Mesh(new THREE.BoxGeometry(1.7, 2.1, 1.5), bodyMat);
  baseBox.position.set(0, 1.05, -0.05);
  baseBox.castShadow = true;
  baseBox.receiveShadow = true;
  cabinetGroup.add(baseBox);

  const upperBackBox = new THREE.Mesh(new THREE.BoxGeometry(1.7, 2.35, 1.05), bodyMat);
  upperBackBox.position.set(0, 3.25, -0.32);
  upperBackBox.castShadow = true;
  cabinetGroup.add(upperBackBox);

  // 3. Illuminated Top Marquee Sign
  const marqueeTex = createMarqueeTexture();
  const marqueeMat = new THREE.MeshStandardMaterial({
    map: marqueeTex,
    emissive: 0xffffff,
    emissiveMap: marqueeTex,
    emissiveIntensity: 0.95,
    roughness: 0.2
  });
  const marqueeMesh = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.46, 0.12), marqueeMat);
  marqueeMesh.position.set(0, 4.16, 0.56);
  marqueeMesh.rotation.x = 0.24;
  cabinetGroup.add(marqueeMesh);

  // 4. Recessed CRT Monitor Bezel & 2D Live Canvas Screen
  const bezelMat = new THREE.MeshStandardMaterial({ color: 0x090b14, roughness: 0.6, metalness: 0.2 });
  const bezelMesh = new THREE.Mesh(new THREE.BoxGeometry(1.68, 1.32, 0.18), bezelMat);
  bezelMesh.position.set(0, 3.12, 0.22);
  bezelMesh.rotation.x = -0.20;
  cabinetGroup.add(bezelMesh);

  // Live 2D Game Texture
  const screenTexture = new THREE.CanvasTexture(game2d.canvas);
  screenTexture.colorSpace = THREE.SRGBColorSpace;
  screenTexture.minFilter = THREE.LinearFilter;
  screenTexture.magFilter = THREE.NearestFilter;

  const screenMat = new THREE.MeshStandardMaterial({
    color: 0x111111,
    map: screenTexture,
    emissive: 0xffffff,
    emissiveMap: screenTexture,
    emissiveIntensity: 1.05,
    roughness: 0.18,
    metalness: 0.1
  });

  const screenMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.34, 1.12), screenMat);
  screenMesh.position.set(0, 3.12, 0.315);
  screenMesh.rotation.x = -0.20;
  cabinetGroup.add(screenMesh);

  // Subtle CRT Frame Border
  const frameBorderMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4 });
  const topFrame = new THREE.Mesh(new THREE.BoxGeometry(1.46, 0.06, 0.04), frameBorderMat);
  topFrame.position.set(0, 3.69, 0.21);
  topFrame.rotation.x = -0.20;
  cabinetGroup.add(topFrame);

  // 5. Control Deck (Joystick & Push Buttons)
  const deckGroup = new THREE.Group();
  deckGroup.position.set(0, 2.32, 0.62);
  deckGroup.rotation.x = 0.24;
  cabinetGroup.add(deckGroup);

  const deckBoard = new THREE.Mesh(
    new THREE.BoxGeometry(1.68, 0.12, 0.62),
    new THREE.MeshStandardMaterial({ color: 0x161b33, roughness: 0.3, metalness: 0.5 })
  );
  deckGroup.add(deckBoard);

  // Neon front lip on control deck
  const deckLip = new THREE.Mesh(
    new THREE.BoxGeometry(1.70, 0.05, 0.04),
    new THREE.MeshStandardMaterial({ color: 0xff007f, emissive: 0xff007f, emissiveIntensity: 0.8 })
  );
  deckLip.position.set(0, 0.03, 0.31);
  deckGroup.add(deckLip);

  // --- 3D Joystick (Tilts dynamically with WASD / Arrow Keys) ---
  const joyBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.11, 0.13, 0.02, 24),
    new THREE.MeshStandardMaterial({ color: 0x090b10, roughness: 0.4 })
  );
  joyBase.position.set(-0.42, 0.07, 0.04);
  deckGroup.add(joyBase);

  const joystickPivot = new THREE.Group();
  joystickPivot.position.set(-0.42, 0.07, 0.04);
  deckGroup.add(joystickPivot);

  const joyShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.19, 16), chromeMat);
  joyShaft.position.y = 0.095;
  joystickPivot.add(joyShaft);

  const joyBallMat = new THREE.MeshStandardMaterial({
    color: 0xff1744,
    emissive: 0xff1744,
    emissiveIntensity: 0.25,
    roughness: 0.12,
    metalness: 0.2
  });
  const joyBall = new THREE.Mesh(new THREE.SphereGeometry(0.068, 24, 24), joyBallMat);
  joyBall.position.y = 0.20;
  joystickPivot.add(joyBall);

  // --- 3D Arcade Push Buttons (Interactive & Raycastable) ---
  const interactiveMeshes = [];

  function createArcadeButton(x, z, colorHex, actionName) {
    const bezel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.058, 0.065, 0.022, 24),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4 })
    );
    bezel.position.set(x, 0.07, z);
    deckGroup.add(bezel);

    const capMat = new THREE.MeshStandardMaterial({
      color: colorHex,
      emissive: colorHex,
      emissiveIntensity: 0.35,
      roughness: 0.2
    });
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.048, 0.036, 24), capMat);
    cap.position.set(x, 0.088, z);
    cap.userData = { action: actionName, baseY: 0.088, pressed: false };
    deckGroup.add(cap);
    interactiveMeshes.push(cap);
    return cap;
  }

  const btnAMesh     = createArcadeButton(0.16, 0.08, 0xff2a85, 'BTN_A');
  const btnBMesh     = createArcadeButton(0.35, 0.02, 0x00f7ff, 'BTN_B');
  const btnStartMesh = createArcadeButton(-0.12, -0.16, 0xfacc15, 'START');
  const btnMenuMesh  = createArcadeButton(0.12, -0.16, 0xa855f7, 'MENU');

  // 6. Lower Coin Door & Glowing 25c Coin Slots
  const coinDoor = new THREE.Mesh(new THREE.BoxGeometry(0.92, 1.05, 0.06), darkMetalMat);
  coinDoor.position.set(0, 1.02, 0.72);
  cabinetGroup.add(coinDoor);

  const coinTex = createCoinSlotTexture();
  const coinSlotMat = new THREE.MeshStandardMaterial({
    map: coinTex,
    emissive: 0xffaa00,
    emissiveMap: coinTex,
    emissiveIntensity: 0.9
  });

  const coinSlotLeft = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.22, 0.04), coinSlotMat);
  coinSlotLeft.position.set(-0.18, 1.25, 0.745);
  coinSlotLeft.userData = { action: 'COIN' };
  cabinetGroup.add(coinSlotLeft);
  interactiveMeshes.push(coinSlotLeft);

  const coinSlotRight = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.22, 0.04), coinSlotMat);
  coinSlotRight.position.set(0.18, 1.25, 0.745);
  coinSlotRight.userData = { action: 'COIN' };
  cabinetGroup.add(coinSlotRight);
  interactiveMeshes.push(coinSlotRight);

  // =========================================================================
  // INPUT HANDLING (Keyboard + 3D Raycaster Click + HUD Buttons)
  // =========================================================================
  function setKeyState(code, isDown) {
    if (code === 'ArrowUp' || code === 'KeyW') game2d.keys.up = isDown;
    if (code === 'ArrowDown' || code === 'KeyS') game2d.keys.down = isDown;
    if (code === 'ArrowLeft' || code === 'KeyA') game2d.keys.left = isDown;
    if (code === 'ArrowRight' || code === 'KeyD') game2d.keys.right = isDown;
    if (code === 'Space' || code === 'KeyZ') {
      game2d.keys.btnA = isDown;
      btnAMesh.userData.pressed = isDown;
    }
    if (code === 'KeyX' || code === 'ShiftLeft' || code === 'ShiftRight') {
      game2d.keys.btnB = isDown;
      btnBMesh.userData.pressed = isDown;
    }
    if (code === 'Enter') {
      btnStartMesh.userData.pressed = isDown;
    }
  }

  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      e.preventDefault();
    }
    if (e.repeat) return;
    setKeyState(e.code, true);

    if (e.code === 'KeyC') {
      game2d.insertCoin();
    } else if (e.code === 'Enter') {
      game2d.pressStart();
    } else if (e.code === 'KeyM') {
      btnMenuMesh.userData.pressed = true;
      setTimeout(() => { btnMenuMesh.userData.pressed = false; }, 140);
      game2d.returnToMenu();
    } else {
      game2d.onKeyTrigger(e.code);
    }
  });

  window.addEventListener('keyup', (e) => {
    setKeyState(e.code, false);
  });

  // Raycaster for clicking 3D Buttons & Coin Slots directly
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  renderer.domElement.addEventListener('pointerdown', (e) => {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);

    const hits = raycaster.intersectObjects(interactiveMeshes, false);
    if (hits.length > 0) {
      const obj = hits[0].object;
      const act = obj.userData.action;
      if (obj.userData.baseY !== undefined) {
        obj.userData.pressed = true;
        setTimeout(() => { obj.userData.pressed = false; }, 150);
      }
      if (act === 'COIN') game2d.insertCoin();
      else if (act === 'START') game2d.pressStart();
      else if (act === 'MENU') game2d.returnToMenu();
      else if (act === 'BTN_A') {
        game2d.keys.btnA = true;
        game2d.onKeyTrigger('Space');
        setTimeout(() => { game2d.keys.btnA = false; }, 150);
      } else if (act === 'BTN_B') {
        game2d.keys.btnB = true;
        game2d.onKeyTrigger('KeyX');
        setTimeout(() => { game2d.keys.btnB = false; }, 150);
      }
    }
  });

  // HUD Buttons Binding
  const btnCoin = document.getElementById('btn-insert-coin');
  if (btnCoin) {
    btnCoin.addEventListener('click', () => {
      btnCoin.blur();
      game2d.insertCoin();
    });
  }

  const btnSound = document.getElementById('btn-sound');
  if (btnSound) {
    btnSound.addEventListener('click', () => {
      btnSound.blur();
      const on = sound.toggle();
      btnSound.textContent = on ? '사운드: ON' : '사운드: OFF';
    });
  }

  const camButtons = document.querySelectorAll('[data-cam]');
  camButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      btn.blur();
      camButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeCamMode = btn.getAttribute('data-cam');
      if (activeCamMode === 'orbit') {
        controls.enabled = true;
      } else {
        controls.enabled = false;
      }
    });
  });

  // Bottom Quick Mini-Pad Binding
  const padStart = document.getElementById('pad-start');
  if (padStart) padStart.addEventListener('click', () => { padStart.blur(); game2d.pressStart(); });

  const padMenu = document.getElementById('pad-menu');
  if (padMenu) padMenu.addEventListener('click', () => { padMenu.blur(); game2d.returnToMenu(); });

  const padA = document.getElementById('pad-a');
  if (padA) {
    padA.addEventListener('pointerdown', () => { game2d.keys.btnA = true; btnAMesh.userData.pressed = true; game2d.onKeyTrigger('Space'); });
    padA.addEventListener('pointerup', () => { game2d.keys.btnA = false; btnAMesh.userData.pressed = false; });
  }

  const padB = document.getElementById('pad-b');
  if (padB) {
    padB.addEventListener('pointerdown', () => { game2d.keys.btnB = true; btnBMesh.userData.pressed = true; game2d.onKeyTrigger('KeyX'); });
    padB.addEventListener('pointerup', () => { game2d.keys.btnB = false; btnBMesh.userData.pressed = false; });
  }

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // =========================================================================
  // MAIN ANIMATION LOOP
  // =========================================================================
  function animate() {
    requestAnimationFrame(animate);

    // 1. Update 2D Arcade Game & Refresh CRT CanvasTexture
    game2d.update();
    screenTexture.needsUpdate = true;

    // Sync CRT Glow Light color with active 2D game
    crtGlowLight.color.setHex(game2d.lightHex);

    // 2. Animate 3D Joystick Tilt based on Player Input
    const targetTiltX = (game2d.keys.down ? 0.36 : 0) + (game2d.keys.up ? -0.36 : 0);
    const targetTiltZ = (game2d.keys.left ? 0.36 : 0) + (game2d.keys.right ? -0.36 : 0);
    joystickPivot.rotation.x += (targetTiltX - joystickPivot.rotation.x) * 0.25;
    joystickPivot.rotation.z += (targetTiltZ - joystickPivot.rotation.z) * 0.25;

    // 3. Animate 3D Push Buttons (Depress when pressed)
    [btnAMesh, btnBMesh, btnStartMesh, btnMenuMesh].forEach((btn) => {
      const targetY = btn.userData.pressed ? btn.userData.baseY - 0.018 : btn.userData.baseY;
      btn.position.y += (targetY - btn.position.y) * 0.35;
    });

    // 4. Camera Smooth Transition or OrbitControls
    if (activeCamMode === 'orbit') {
      controls.update();
    } else {
      const preset = camPresets[activeCamMode] || camPresets.arcade;
      camera.position.lerp(preset.pos, 0.08);
      controls.target.lerp(preset.target, 0.08);
      camera.lookAt(controls.target);
    }

    renderer.render(scene, camera);
  }

  animate();
};
