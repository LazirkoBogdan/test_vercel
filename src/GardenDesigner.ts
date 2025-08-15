import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import * as TWEEN from "@tweenjs/tween.js";
import { AssetManager } from "./AssetManager";
import { GardenItem } from "./GardenItem";
import { UIManager } from "./UIManager";
import { DragAndDropManager } from "./DragAndDropManager";
import { DayNightSystem } from "./DayNightSystem";
import { AudioManager } from "./AudioManager";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export class GardenDesigner {
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private composer!: EffectComposer;
  private controls!: OrbitControls;
  private assetManager!: AssetManager;
  private uiManager!: UIManager;
  private dragAndDropManager!: DragAndDropManager;
  private dayNightSystem!: DayNightSystem;
  private audioManager!: AudioManager;

  private gardenPlane!: THREE.Mesh;
  private gardenBounds!: THREE.Box3;
  private gridHelper!: THREE.GridHelper;
  private placedItems: GardenItem[] = [];
  private previewItem: GardenItem | null = null;
  private raycaster!: THREE.Raycaster;
  private mouse!: THREE.Vector2;

  private isPlacing = false;
  private selectedItemType: string | null = null;
  private selectedItem: GardenItem | null = null;
  private isDragging: boolean = false;
  private dragOffset: THREE.Vector3 = new THREE.Vector3();
  private capturedLogs: Array<{
    type: string;
    timestamp: string;
    args: any[];
  }> = [];
  private lightpoleBulb: THREE.Mesh | null = null;
  private lightpoleBulbMaterial: THREE.MeshStandardMaterial | null = null;
  private lightpoleLight: THREE.PointLight | null = null;

  // Gnome tracking
  private totalGnomes: number = 8; // 5 static + 3 walking gnomes
  private foundGnomes: number = 0;

  constructor() {
    this.initializeScene();
    this.initializeCamera();
    this.initializeRenderer();
    this.initializePostProcessing();
    this.initializeControls();
    this.initializeGarden();
    this.initializeAssetManager();
    this.initializeUI();
    this.initializeEventListeners();
    this.animate();
  }

  private initializeScene(): void {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xb3d9ff);

    const ambientLight = new THREE.AmbientLight(0xfff4e6, 0.4);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xfff4e6, 1.2);
    directionalLight.position.set(40, 80, 40);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.camera.left = -100;
    directionalLight.shadow.camera.right = 100;
    directionalLight.shadow.camera.top = 100;
    directionalLight.shadow.camera.bottom = -100;
    this.scene.add(directionalLight);

    const hemisphereLight = new THREE.HemisphereLight(0xb3d9ff, 0xf4f1de, 0.5);
    this.scene.add(hemisphereLight);

    this.dayNightSystem = new DayNightSystem(
      this.scene,
      ambientLight,
      directionalLight,
      hemisphereLight
    );
  }

  private initializeCamera(): void {
    this.camera = new THREE.PerspectiveCamera(60, 1920 / 1080, 0.1, 1000);
    this.camera.position.set(30, 25, 30);
    this.camera.lookAt(0, 0, 0);
  }

  private initializeRenderer(): void {
    const container = document.getElementById("canvas-container");
    if (!container) throw new Error("Canvas container not found");

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    this.renderer.setSize(1920, 1080);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    container.appendChild(this.renderer.domElement);
  }

  private initializePostProcessing(): void {
    this.composer = new EffectComposer(this.renderer);

    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(1920, 1080),
      0.5,
      0.4,
      0.85
    );
    this.composer.addPass(bloomPass);
  }

  private initializeControls(): void {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 15;
    this.controls.maxDistance = 80;
    this.controls.minPolarAngle = Math.PI / 6;
    this.controls.maxPolarAngle = Math.PI / 2.5;
    this.controls.maxAzimuthAngle = Math.PI / 2;
    this.controls.minAzimuthAngle = -Math.PI / 2;
  }

  private showGrid(): void {
    if (this.gridHelper) {
      this.gridHelper.visible = true;
    }
  }

  private hideGrid(): void {
    if (this.gridHelper) {
      this.gridHelper.visible = false;
    }
  }

  private initializeGarden(): void {
    const planeGeometry = new THREE.PlaneGeometry(40, 30);
    const grassMaterial = new THREE.MeshStandardMaterial({
      color: 0x7cb342,
      roughness: 0.9,
      metalness: 0.0,
    });

    this.gardenPlane = new THREE.Mesh(planeGeometry, grassMaterial);
    this.gardenPlane.rotation.x = -Math.PI / 2;
    this.gardenPlane.receiveShadow = true;
    this.scene.add(this.gardenPlane);

    this.gardenBounds = new THREE.Box3(
      new THREE.Vector3(-20, -0.1, -15),
      new THREE.Vector3(20, 0.1, 15)
    );

    this.gridHelper = new THREE.GridHelper(40, 40, 0x666666, 0x444444);
    this.gridHelper.position.y = 0.01;
    this.gridHelper.visible = false;
    this.scene.add(this.gridHelper);

    this.createSurroundingElements();
  }

  private showLoadingStatus(): void {
    const statusDiv = document.createElement("div");
    statusDiv.id = "loading-status";
    statusDiv.style.cssText = `
      position: absolute;
      top: 20px;
      right: 20px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      font-family: Arial, sans-serif;
      font-size: 14px;
      z-index: 1000;
      border: 1px solid rgba(255, 255, 255, 0.1);
    `;
    statusDiv.innerHTML = "🔄 Loading 3D Models...";

    document.getElementById("ui-overlay")?.appendChild(statusDiv);

    setTimeout(() => {
      statusDiv.innerHTML = "✅ 3D Models Loaded!";
      statusDiv.style.background = "rgba(76, 175, 80, 0.9)";
      statusDiv.style.borderColor = "rgba(76, 175, 80, 0.3)";

      setTimeout(() => {
        statusDiv.style.opacity = "0";
        statusDiv.style.transition = "opacity 0.5s ease-out";
        setTimeout(() => statusDiv.remove(), 500);
      }, 3000);
    }, 3000);
  }

  private setupConsoleCapture(): void {
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;

    this.capturedLogs = [];

    console.log = (...args) => {
      this.capturedLogs.push({
        type: "log",
        timestamp: new Date().toISOString(),
        args,
      });
      originalLog.apply(console, args);
    };

    console.warn = (...args) => {
      this.capturedLogs.push({
        type: "warn",
        timestamp: new Date().toISOString(),
        args,
      });
      originalWarn.apply(console, args);
    };

    console.error = (...args) => {
      this.capturedLogs.push({
        type: "error",
        timestamp: new Date().toISOString(),
        args,
      });
      originalError.apply(console, args);
    };
  }

  private createSurroundingElements(): void {
    // Create simple hedge walls around the garden
    this.createHedgeWalls();
  }

  private createHedgeWalls(): void {
    const hedgeMaterial = new THREE.MeshStandardMaterial({
      color: 0x2e7d32,
      roughness: 0.9,
      metalness: 0.0,
    });

    // North wall
    const northWall = new THREE.Mesh(
      new THREE.BoxGeometry(42, 2.5, 1.2),
      hedgeMaterial
    );
    northWall.position.set(0, 1.25, -15.5);
    northWall.castShadow = true;
    this.scene.add(northWall);

    // South wall
    const southWall = new THREE.Mesh(
      new THREE.BoxGeometry(42, 2.5, 1.2),
      hedgeMaterial
    );
    southWall.position.set(0, 1.25, 15.5);
    southWall.castShadow = true;
    this.scene.add(southWall);

    // East wall
    const eastWall = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 2.5, 32),
      hedgeMaterial
    );
    eastWall.position.set(20.5, 1.25, 0);
    eastWall.castShadow = true;
    this.scene.add(eastWall);

    // West wall
    const westWall = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 2.5, 32),
      hedgeMaterial
    );
    westWall.position.set(-20.5, 1.25, 0);
    westWall.castShadow = true;
    this.scene.add(westWall);
  }

  private initializeAssetManager(): void {
    this.assetManager = new AssetManager();

    this.dragAndDropManager = new DragAndDropManager(
      this.scene,
      this.camera,
      this.renderer,
      this.assetManager,
      this.gardenBounds,
      this.placedItems
    );

    this.audioManager = new AudioManager();

    setTimeout(() => {
      this.assetManager.debugLoadedModels();
      this.addPrePlacedGardenItems();
    }, 3000);
  }

  private addPrePlacedGardenItems(): void {
    this.addProceduralGardenItems();
    this.tryLoadGLTFModels();
  }

  private addProceduralGardenItems(): void {
    this.createProceduralTree(-18, 0, -13, 0);
    this.createProceduralTree(18, 0, -13, 0);

    this.createProceduralBench(-13, 0, -13, 0);
    this.createProceduralBench(-6, 0, -13, 0);
    this.createProceduralBench(-18, 0, -8.5, Math.PI / 2);
    this.createProceduralBench(-18, 0, -1, Math.PI / 2);
    this.createProceduralBench(13, 0, -13, 0);
    this.createProceduralBench(6, 0, -13, 0);
    this.createProceduralBench(18, 0, -8.5, -Math.PI / 2);
    this.createProceduralBench(18, 0, -1, -Math.PI / 2);

    this.createProceduralLightpole(-9.5, 0, -13, 0);
    this.createProceduralLightpole(-18, 0, -4.75, 0);
    this.createProceduralLightpole(9.5, 0, -13, 0);
    this.createProceduralLightpole(18, 0, -4.75, 0);
    this.createProceduralLightpole(9.5, 0, 13, 0);
    this.createProceduralLightpole(-9.5, 0, 13, 0);

    this.createProceduralFlowerPot(-18, 0, 2.5, Math.PI * 0.6);
    this.createProceduralFlowerPot(-2, 0, -13, Math.PI * 0.3);
    this.createProceduralFlowerPot(18, 0, 2.5, Math.PI * -0.6);
    this.createProceduralFlowerPot(2, 0, -13, Math.PI * -0.3);

    this.integratePrePlacedLightpoles();

    this.createProceduralStonePath(-9, 0, -11, 0, 9);
    this.createProceduralStonePath(9, 0, -11, Math.PI, 9);
    this.createProceduralStonePath(0, 0, -4.5, 0, 7);
    this.createProceduralStonePath(0, 0, 14, 0, 11);
    this.createProceduralStonePath(-13, 0, 5, 0, 7);
    this.createProceduralStonePath(13, 0, 5, Math.PI, 7);
    this.createProceduralStonePath(7, 0, -0.4, Math.PI / 2, 5);
    this.createProceduralStonePath(-7, 0, -0.4, -Math.PI / 2, 5);
    this.createProceduralStonePath(-10.5, 0, 10, Math.PI / 2, 5);
    this.createProceduralStonePath(10.5, 0, 10, -Math.PI / 2, 5);
    this.createProceduralStonePath(-16, 0, -3, Math.PI / 2, 8);
    this.createProceduralStonePath(16, 0, -3, -Math.PI / 2, 8);
    this.createProceduralStonePath(0, 0, -10, Math.PI / 2, 5);

    this.createProceduralHouse(-15, 0, 10, 0);
    this.createProceduralHouse(15, 0, 10, Math.PI);

    this.createProceduralGnome(16, 0, -13, 0, 0, 0);
    this.createProceduralGnome(18, -0.1, 2.5, 0, -Math.PI / 2, 0);
    this.createProceduralGnome(-15.5, 0, -13, 0, Math.PI / 2, 0);
    this.createProceduralGnome(-12, 1, -13, Math.PI / 2, 0, Math.PI / 2);
    this.createProceduralGnome(-16, 3, 14.5, Math.PI / 2, 0.5, Math.PI);

    this.createWalkingGnome(-15.5, 0, 5, Math.PI / 2, 8, 0, 0.006);
    this.createWalkingGnome(7, 0, -4, 0, 9, Math.PI / 2, 0.003);
    this.createWalkingGnome(15, 0, -11, -Math.PI / 2, 31.5, Math.PI, 0.001);
  }

  private createProceduralTree(
    x: number,
    _y: number,
    z: number,
    rotationY: number = 0
  ): void {
    const trunkMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b4513,
      roughness: 0.9,
      metalness: 0.0,
    });

    const leavesMaterial = new THREE.MeshStandardMaterial({
      color: 0x228b22,
      roughness: 0.8,
      metalness: 0.0,
    });

    const treeGroup = new THREE.Group();
    treeGroup.position.set(x, 0, z);
    treeGroup.rotation.y = rotationY;
    this.scene.add(treeGroup);

    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.4, 0.6, 3, 8),
      trunkMaterial
    );
    trunk.position.set(0, 1.5, 0);
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    treeGroup.add(trunk);

    const leaves = new THREE.Mesh(
      new THREE.SphereGeometry(2.5, 8, 6),
      leavesMaterial
    );
    leaves.position.set(0, 4.5, 0);
    leaves.castShadow = true;
    leaves.receiveShadow = true;
    treeGroup.add(leaves);
  }

  private createProceduralBench(
    x: number,
    _y: number,
    z: number,
    rotationY: number = 0
  ): void {
    const woodMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b4513,
      roughness: 0.8,
      metalness: 0.0,
    });

    const metalMaterial = new THREE.MeshStandardMaterial({
      color: 0x696969,
      roughness: 0.3,
      metalness: 0.8,
    });

    const benchGroup = new THREE.Group();
    benchGroup.position.set(x, 0, z);
    benchGroup.rotation.y = rotationY;
    this.scene.add(benchGroup);

    const seat = new THREE.Mesh(
      new THREE.BoxGeometry(3, 0.3, 1.2),
      woodMaterial
    );
    seat.position.set(0, 0.65, 0);
    seat.castShadow = true;
    seat.receiveShadow = true;
    benchGroup.add(seat);

    const back = new THREE.Mesh(
      new THREE.BoxGeometry(3, 1.2, 0.2),
      woodMaterial
    );
    back.position.set(0, 1.25, -0.5);
    back.castShadow = true;
    back.receiveShadow = true;
    benchGroup.add(back);

    const legPositions = [
      [-1, 0.325, 0],
      [1, 0.325, 0],
    ];

    legPositions.forEach((pos) => {
      const leg = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 0.65, 0.2),
        metalMaterial
      );
      leg.position.set(pos[0], pos[1], pos[2]);
      leg.castShadow = true;
      leg.receiveShadow = true;
      benchGroup.add(leg);
    });
  }

  private createProceduralLightpole(
    x: number,
    _y: number,
    z: number,
    rotationY: number = 0
  ): void {
    const poleMaterial = new THREE.MeshStandardMaterial({
      color: 0x696969,
      roughness: 0.7,
      metalness: 0.3,
    });

    const bulbMaterial = new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      roughness: 0.2,
      metalness: 0.8,
      emissive: 0x000000,
      emissiveIntensity: 0.0,
    });

    const lightpoleGroup = new THREE.Group();
    lightpoleGroup.position.set(x, 0, z);
    lightpoleGroup.rotation.y = rotationY;
    lightpoleGroup.userData.isLightpole = true;
    this.scene.add(lightpoleGroup);

    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.2, 6, 8),
      poleMaterial
    );
    pole.position.set(0, 3, 0);
    pole.castShadow = true;
    pole.receiveShadow = true;
    lightpoleGroup.add(pole);

    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.4, 8, 6),
      bulbMaterial
    );
    bulb.position.set(0, 6.2, 0);
    bulb.castShadow = true;
    bulb.receiveShadow = true;
    lightpoleGroup.add(bulb);

    const lightpoleLight = new THREE.PointLight(0xffffaa, 0, 15, 2);
    lightpoleLight.position.set(x, 6.2, z);
    lightpoleLight.castShadow = true;
    lightpoleLight.shadow.mapSize.width = 1024;
    lightpoleLight.shadow.mapSize.height = 1024;
    lightpoleLight.shadow.camera.near = 0.1;
    lightpoleLight.shadow.camera.far = 20;
    lightpoleLight.shadow.camera.fov = 90;
    this.scene.add(lightpoleLight);

    this.lightpoleBulb = bulb;
    this.lightpoleBulbMaterial = bulbMaterial;
    this.lightpoleLight = lightpoleLight;
  }

  private integratePrePlacedLightpoles(): void {
    this.scene.traverse((child) => {
      if (child instanceof THREE.Group && child.userData.isLightpole) {
        this.setupPrePlacedLightpole(child);
      }
    });
  }

  private setupPrePlacedLightpole(lightpoleGroup: THREE.Group): void {
    let bulbMesh: THREE.Mesh | null = null;
    let bulbMaterial: THREE.MeshStandardMaterial | null = null;

    lightpoleGroup.traverse((child: THREE.Object3D) => {
      if (
        child instanceof THREE.Mesh &&
        child.geometry instanceof THREE.SphereGeometry
      ) {
        bulbMesh = child;
        if (child.material instanceof THREE.MeshStandardMaterial) {
          bulbMaterial = child.material;
        }
      }
    });

    if (bulbMesh && bulbMaterial) {
      const light = new THREE.PointLight(0xffffaa, 0, 15, 2);
      light.position.copy(lightpoleGroup.position);
      light.position.y = 6.2;
      light.castShadow = true;
      light.shadow.mapSize.width = 1024;
      light.shadow.mapSize.height = 1024;
      light.shadow.camera.near = 0.1;
      light.shadow.camera.far = 20;
      light.shadow.camera.fov = 90;
      this.scene.add(light);

      lightpoleGroup.userData.lightpoleBulb = bulbMesh;
      lightpoleGroup.userData.lightpoleBulbMaterial = bulbMaterial;
      lightpoleGroup.userData.lightpoleLight = light;

      if (this.dayNightSystem) {
        const currentMode = this.dayNightSystem.getCurrentMode();
        if (currentMode === "night") {
          (bulbMaterial as THREE.MeshStandardMaterial).color.setHex(0xffffaa);
          (bulbMaterial as THREE.MeshStandardMaterial).emissive.setHex(
            0xffffaa
          );
          (bulbMaterial as THREE.MeshStandardMaterial).emissiveIntensity = 0.8;
          light.intensity = 1.5;
        } else {
          (bulbMaterial as THREE.MeshStandardMaterial).color.setHex(0xcccccc);
          (bulbMaterial as THREE.MeshStandardMaterial).emissive.setHex(
            0x000000
          );
          (bulbMaterial as THREE.MeshStandardMaterial).emissiveIntensity = 0.0;
          light.intensity = 0;
        }
      }
    } else {
      console.warn(
        "⚠️ Could not find bulb mesh or material in pre-placed lightpole"
      );
    }
  }

  private createProceduralFlowerPot(
    x: number,
    _y: number,
    z: number,
    rotationY: number = 0
  ): void {
    const potMaterial = new THREE.MeshStandardMaterial({
      color: 0xcd853f,
      roughness: 0.8,
      metalness: 0.0,
    });

    const soilMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b4513,
      roughness: 0.9,
      metalness: 0.0,
    });

    const flowerMaterial = new THREE.MeshStandardMaterial({
      color: 0xff69b4,
      roughness: 0.3,
      metalness: 0.0,
    });

    const flowerPotGroup = new THREE.Group();
    flowerPotGroup.position.set(x, 0, z);
    flowerPotGroup.rotation.y = rotationY;
    this.scene.add(flowerPotGroup);

    const pot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.8, 0.6, 1.2, 8),
      potMaterial
    );
    pot.position.set(0, 0.6, 0);
    pot.castShadow = true;
    pot.receiveShadow = true;
    flowerPotGroup.add(pot);

    const soil = new THREE.Mesh(
      new THREE.CylinderGeometry(0.7, 0.7, 0.3, 8),
      soilMaterial
    );
    soil.position.set(0, 1.05, 0);
    soil.castShadow = true;
    soil.receiveShadow = true;
    flowerPotGroup.add(soil);

    const flowerPositions = [
      [0, 1.4, 0],
      [-0.3, 1.3, 0.2],
      [0.3, 1.3, -0.2],
      [0.2, 1.4, 0.3],
      [-0.2, 1.4, -0.3],
    ];

    flowerPositions.forEach((pos) => {
      const flower = new THREE.Mesh(
        new THREE.SphereGeometry(0.15, 6, 4),
        flowerMaterial
      );
      flower.position.set(pos[0], pos[1], pos[2]);
      flower.castShadow = true;
      flower.receiveShadow = true;
      flowerPotGroup.add(flower);
    });

    const flowerColors = [0xff1493, 0xff69b4, 0xffb6c1, 0xffc0cb, 0xdb7093];
    flowerPotGroup.children.forEach((child, index) => {
      if (
        child instanceof THREE.Mesh &&
        child.geometry instanceof THREE.SphereGeometry &&
        index > 1
      ) {
        const material = child.material as THREE.MeshStandardMaterial;
        material.color.setHex(flowerColors[index - 2]);
      }
    });
  }

  private createProceduralStonePath(
    x: number,
    _y: number,
    z: number,
    rotationY: number = 0,
    stoneCount: number = 6
  ): void {
    const stoneMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b8b8b,
      roughness: 0.9,
      metalness: 0.0,
    });

    const pathGroup = new THREE.Group();
    pathGroup.position.set(x, -0.2, z);
    pathGroup.rotation.y = rotationY;
    this.scene.add(pathGroup);

    const pathLength = stoneCount;
    const stoneWidth = 1.5;
    const stoneHeight = 0.3;
    const stoneDepth = 1.0;
    const spacing = 1.8;

    for (let i = 0; i < pathLength; i++) {
      const stone = new THREE.Mesh(
        new THREE.BoxGeometry(stoneWidth, stoneHeight, stoneDepth),
        stoneMaterial
      );

      const xOffset = (i - (pathLength - 1) / 2) * spacing;
      const yOffset = stoneHeight / 2;
      const zOffset = 0;

      stone.position.set(xOffset, yOffset, zOffset);

      const randomRotation = (Math.random() - 0.5) * 0.4;
      stone.rotation.y = randomRotation;

      stone.castShadow = true;
      stone.receiveShadow = true;
      pathGroup.add(stone);
    }

    // Removed decorative stones for cleaner appearance
  }

  private createProceduralHouse(
    x: number,
    y: number,
    z: number,
    rotationY: number = 0
  ): void {
    const loader = new GLTFLoader();
    loader.load(
      "/assets/gltf/cottage.glb",
      (gltf) => {
        const root = gltf.scene;

        let picked: THREE.Mesh | null = null;
        root.traverse((child: THREE.Object3D) => {
          if (child instanceof THREE.Mesh && !picked) {
            picked = child;
          }
        });

        if (!picked) {
          console.warn("⚠️ No mesh found in cottage.glb");
          return;
        }

        //@ts-ignore
        const mesh = picked.clone() as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        mesh.geometry.computeBoundingBox();
        const bb = mesh.geometry.boundingBox!;
        const size = new THREE.Vector3();
        bb.getSize(size);
        const center = new THREE.Vector3();
        bb.getCenter(center);

        mesh.geometry.translate(-center.x, -bb.min.y, -center.z);

        mesh.scale.setScalar(0.75);

        const item = new GardenItem(mesh, "cottage", 2.0);
        item.mesh.position.set(x, y, z);
        item.mesh.rotation.set(0, rotationY, 0);
        item.originalScale.copy(mesh.scale);

        (mesh as any).isSelected = false;

        mesh.userData.onSelect = () => {
          (mesh as any).isSelected = true;
        };

        mesh.userData.onDeselect = () => {
          (mesh as any).isSelected = false;
          item.resetScale();
        };

        const originalScale = item.originalScale.clone();
        let time = 0;
        const pulse = () => {
          if ((mesh as any).isSelected) {
            time += 0.05;
            const scaleFactor = 1 + Math.sin(time * 5) * 0.05;
            mesh.scale.set(
              originalScale.x * scaleFactor,
              originalScale.y * scaleFactor,
              originalScale.z * scaleFactor
            );
          }
          requestAnimationFrame(pulse);
        };
        pulse();

        this.scene.add(item.mesh);
        this.placedItems.push(item);

        if (this.dragAndDropManager) {
          this.dragAndDropManager.updatePlacedItems(this.placedItems);
        }
      },
      undefined,
      (err) => console.error("❌ Failed to load cottage.glb:", err)
    );
  }

  private createProceduralGnome(
    x: number,
    y: number,
    z: number,
    rotationX: number = 0,
    rotationY: number = 0,
    rotationZ: number = 0
  ): void {
    // Load the gnome GLTF model
    const loader = new GLTFLoader();
    loader.load(
      "/assets/gltf/gnome.glb",
      (gltf) => {
        const root = gltf.scene;

        let picked: THREE.Mesh | null = null;
        root.traverse((child: THREE.Object3D) => {
          if (child instanceof THREE.Mesh && !picked) {
            picked = child;
          }
        });

        if (!picked) {
          console.warn("⚠️ No mesh found in gnome.glb");
          return;
        }

        //@ts-ignore
        const mesh = picked.clone() as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        mesh.geometry.computeBoundingBox();
        const bb = mesh.geometry.boundingBox!;
        const size = new THREE.Vector3();
        bb.getSize(size);
        const center = new THREE.Vector3();
        bb.getCenter(center);

        mesh.geometry.translate(-center.x, -bb.min.y, -center.z);

        const targetSize = 0.075;
        mesh.scale.setScalar(targetSize);

        const item = new GardenItem(mesh, "gnome", 1.0);
        item.mesh.position.set(x, y, z);
        item.mesh.rotation.set(rotationX, rotationY, rotationZ);
        item.originalScale.copy(mesh.scale);

        (mesh as any).isSelected = false;

        // Add special property to make gnomes disappear when clicked
        mesh.userData.isGnome = true;

        mesh.userData.onSelect = () => {
          (mesh as any).isSelected = true;
        };

        mesh.userData.onDeselect = () => {
          (mesh as any).isSelected = false;
          item.resetScale();
        };

        const originalScale = item.originalScale.clone();
        let time = 0;
        const pulse = () => {
          if ((mesh as any).isSelected) {
            time += 0.05;
            const scaleFactor = 1 + Math.sin(time * 5) * 0.05;
            mesh.scale.set(
              originalScale.x * scaleFactor,
              originalScale.y * scaleFactor,
              originalScale.z * scaleFactor
            );
          }
          requestAnimationFrame(pulse);
        };
        pulse();

        this.scene.add(item.mesh);
        this.placedItems.push(item);

        if (this.dragAndDropManager) {
          this.dragAndDropManager.updatePlacedItems(this.placedItems);
        }
      },
      undefined,
      (err) => console.error("❌ Failed to load gnome.glb:", err)
    );
  }

  private createWalkingGnome(
    x: number,
    y: number,
    z: number,
    rotationY: number = 0,
    walkDistance: number = 8,
    pathRotation: number = 0,
    walkSpeed: number = 0.00045
  ): void {
    const loader = new GLTFLoader();
    loader.load(
      "/assets/gltf/gnome.glb",
      (gltf) => {
        const root = gltf.scene;

        let picked: THREE.Mesh | null = null;
        root.traverse((child: THREE.Object3D) => {
          if (child instanceof THREE.Mesh && !picked) {
            picked = child;
          }
        });

        if (!picked) {
          console.warn("⚠️ No mesh found in gnome.glb");
          return;
        }

        //@ts-ignore
        const mesh = picked.clone() as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        mesh.geometry.computeBoundingBox();
        const bb = mesh.geometry.boundingBox!;
        const size = new THREE.Vector3();
        bb.getSize(size);
        const center = new THREE.Vector3();
        bb.getCenter(center);

        mesh.geometry.translate(-center.x, -bb.min.y, -center.z);

        const targetSize = 0.075;
        mesh.scale.setScalar(targetSize);

        const item = new GardenItem(mesh, "gnome", 1.0);
        item.mesh.position.set(x, y, z);
        item.mesh.rotation.set(0, rotationY, 0);
        item.originalScale.copy(mesh.scale);

        (mesh as any).isSelected = false;

        // Add special property to make gnomes disappear when clicked
        mesh.userData.isGnome = true;

        mesh.userData.onSelect = () => {
          (mesh as any).isSelected = true;
        };

        mesh.userData.onDeselect = () => {
          (mesh as any).isSelected = false;
          item.resetScale();
        };

        const originalScale = item.originalScale.clone();
        let time = 0;
        const pulse = () => {
          if ((mesh as any).isSelected) {
            time += 0.05;
            const scaleFactor = 1 + Math.sin(time * 5) * 0.05;
            mesh.scale.set(
              originalScale.x * scaleFactor,
              originalScale.y * scaleFactor,
              originalScale.z * scaleFactor
            );
          }
          requestAnimationFrame(pulse);
        };
        pulse();

        const startX = x;
        let currentX = startX;
        let walkDirection = 1;

        const walkAnimation = () => {
          currentX += walkSpeed * walkDirection * walkDistance;

          if (currentX >= startX + walkDistance) {
            walkDirection = -1;
            currentX = startX + walkDistance;
            mesh.rotation.y = rotationY + Math.PI;
          } else if (currentX <= startX) {
            walkDirection = 1;
            currentX = startX;
            mesh.rotation.y = rotationY;
          }

          const rotatedX =
            startX + (currentX - startX) * Math.cos(pathRotation);
          const rotatedZ = z + (currentX - startX) * Math.sin(pathRotation);
          mesh.position.x = rotatedX;
          mesh.position.z = rotatedZ;

          const bobHeight = 0.1;
          const bobSpeed = 8;
          const walkProgress = (currentX - startX) / walkDistance;
          mesh.position.y =
            y +
            Math.abs(Math.sin(walkProgress * Math.PI * bobSpeed)) * bobHeight;

          requestAnimationFrame(walkAnimation);
        };

        walkAnimation();

        this.scene.add(item.mesh);
        this.placedItems.push(item);

        if (this.dragAndDropManager) {
          this.dragAndDropManager.updatePlacedItems(this.placedItems);
        }
      },
      undefined,
      (err) => console.error("❌ Failed to load gnome.glb:", err)
    );
  }

  private updateLightpoleBulb(): void {
    // Update the pre-placed lightpole
    if (
      this.lightpoleBulb &&
      this.lightpoleBulbMaterial &&
      this.lightpoleLight &&
      this.dayNightSystem
    ) {
      this.dayNightSystem.updateLightpoleBulb(
        this.lightpoleBulb,
        this.lightpoleBulbMaterial,
        this.lightpoleLight
      );
    }

    // Update all pre-placed lightpoles in the scene
    this.scene.traverse((child) => {
      if (
        child instanceof THREE.Group &&
        child.userData.isLightpole &&
        child.userData.lightpoleBulb &&
        child.userData.lightpoleBulbMaterial &&
        child.userData.lightpoleLight &&
        this.dayNightSystem
      ) {
        this.dayNightSystem.updateLightpoleBulb(
          child.userData.lightpoleBulb,
          child.userData.lightpoleBulbMaterial,
          child.userData.lightpoleLight
        );
      }
    });

    // Update all user-placed lightpoles
    this.placedItems.forEach((item) => {
      if (
        item.type === "lightpole" &&
        item.mesh.userData.lightpoleBulb &&
        item.mesh.userData.lightpoleBulbMaterial &&
        item.mesh.userData.lightpoleLight &&
        this.dayNightSystem
      ) {
        this.dayNightSystem.updateLightpoleBulb(
          item.mesh.userData.lightpoleBulb,
          item.mesh.userData.lightpoleBulbMaterial,
          item.mesh.userData.lightpoleLight
        );
      }
    });
  }

  private setupPlacedLightpole(lightpoleItem: GardenItem): void {
    let bulbMesh: THREE.Mesh | null = null;
    let bulbMaterial: THREE.MeshStandardMaterial | null = null;

    if (lightpoleItem.mesh.userData.group) {
      const group = lightpoleItem.mesh.userData.group;
      group.traverse((child: THREE.Object3D) => {
        if (
          child instanceof THREE.Mesh &&
          child.geometry instanceof THREE.SphereGeometry
        ) {
          bulbMesh = child;
          if (child.material instanceof THREE.MeshStandardMaterial) {
            bulbMaterial = child.material;
          }
        }
      });
    }

    if (bulbMesh && bulbMaterial) {
      const light = new THREE.PointLight(0xffffaa, 0, 15, 2);
      light.position.copy(lightpoleItem.position);
      light.position.y = 6.2;
      light.castShadow = true;
      light.shadow.mapSize.width = 1024;
      light.shadow.mapSize.height = 1024;
      light.shadow.camera.near = 0.1;
      light.shadow.camera.far = 20;
      light.shadow.camera.fov = 90;
      this.scene.add(light);

      lightpoleItem.mesh.userData.lightpoleBulb = bulbMesh;
      lightpoleItem.mesh.userData.lightpoleBulbMaterial = bulbMaterial;
      lightpoleItem.mesh.userData.lightpoleLight = light;

      if (this.dayNightSystem) {
        const currentMode = this.dayNightSystem.getCurrentMode();
        if (currentMode === "night") {
          (bulbMaterial as THREE.MeshStandardMaterial).color.setHex(0xffffaa);
          (bulbMaterial as THREE.MeshStandardMaterial).emissive.setHex(
            0xffffaa
          );
          (bulbMaterial as THREE.MeshStandardMaterial).emissiveIntensity = 0.8;
          light.intensity = 1.5;
        } else {
          (bulbMaterial as THREE.MeshStandardMaterial).color.setHex(0xcccccc);
          (bulbMaterial as THREE.MeshStandardMaterial).emissive.setHex(
            0x000000
          );
          (bulbMaterial as THREE.MeshStandardMaterial).emissiveIntensity = 0.0;
          light.intensity = 0;
        }
      }
    } else {
      console.warn(
        "⚠️ Could not find bulb mesh or material in placed lightpole"
      );
    }
  }

  private tryLoadGLTFModels(): void {}

  private initializeUI(): void {
    this.uiManager = new UIManager();
    this.uiManager.onCategorySelect = (category: string) => {
      this.uiManager.showItemsForCategory(category);
    };

    this.uiManager.onItemSelect = (itemType: string) => {
      this.selectedItemType = itemType;

      if (this.audioManager) {
        this.audioManager.playClick();
      }

      this.startPlacingItem(itemType);
    };

    this.showLoadingStatus();

    // Initialize gnome counter
    this.updateGnomeCounter();

    this.setupDebugButtons();
  }

  private initializeEventListeners(): void {
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.setupConsoleCapture();

    this.renderer.domElement.addEventListener("mousemove", (event) => {
      this.onMouseMove(event);
    });

    this.renderer.domElement.addEventListener("click", (event) => {
      this.onMouseClick(event);
    });

    this.renderer.domElement.addEventListener("mouseup", (event) => {
      this.onMouseUp(event);
    });

    this.renderer.domElement.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      this.cancelPlacement();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        if (this.isPlacing) {
          this.cancelPlacement();
        } else if (this.selectedItem) {
          this.deselectItem();
        }
      }

      if (event.key === "Delete" && this.selectedItem) {
        this.deleteSelectedItem();
      }
    });

    window.addEventListener("resize", () => {
      this.onWindowResize();
    });

    this.onWindowResize();
  }

  private onMouseMove(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    if (this.isDragging && this.selectedItem) {
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersects = this.raycaster.intersectObject(this.gardenPlane);

      if (intersects.length > 0) {
        const point = intersects[0].point;
        this.selectedItem.position.copy(point);
        this.selectedItem.position.y = 0;

        this.selectedItem.mesh.position.copy(this.selectedItem.position);

        if (this.selectedItem.mesh.userData.group) {
          const group = this.selectedItem.mesh.userData.group;
          group.position.copy(point);
          group.position.y = 0;

          console.log(
            `🔄 Dragg ing group item - Item pos:`,
            this.selectedItem.position,
            `Group pos:`,
            group.position
          );
        } else {
          console.log(
            `🔄 Dragging single mesh item - Item pos:`,
            this.selectedItem.position,
            `Mesh pos:`,
            this.selectedItem.mesh.position
          );
        }

        if (this.selectedItem.selectionRing) {
          this.selectedItem.selectionRing.position.copy(point);
          this.selectedItem.selectionRing.position.y = 0.01;
        }

        if (this.selectedItem.selectionText) {
          this.selectedItem.selectionText.position.copy(point);

          if (this.selectedItem.mesh.userData.group) {
            const group = this.selectedItem.mesh.userData.group;
            const box = new THREE.Box3().setFromObject(group);
            this.selectedItem.selectionText.position.y = box.max.y + 0.5;
          } else {
            this.selectedItem.selectionText.position.y =
              this.selectedItem.mesh.geometry.boundingBox?.max.y || 2;
          }
        }
      }
    }
  }

  private onMouseClick(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    if (this.isPlacing && this.previewItem && this.selectedItemType) {
      const intersects = this.raycaster.intersectObject(this.gardenPlane);

      if (intersects.length > 0) {
        const point = intersects[0].point;

        const newItem = this.assetManager.createItem(this.selectedItemType);
        if (newItem) {
          if (!this.isPositionValid(point)) {
            console.log(
              `❌ Position not valid for ${this.selectedItemType} at:`,
              point
            );
            return;
          }

          // Check for overlaps
          if (this.wouldOverlap(point, newItem.radius)) {
            console.log(
              `❌ Overlap detected for ${this.selectedItemType} at:`,
              point
            );
            return;
          }

          // Set position on both the item and its mesh
          newItem.position.copy(point);
          newItem.position.y = 0;
          newItem.mesh.position.copy(point);
          newItem.mesh.position.y = 0;

          newItem.originalScale = newItem.mesh.scale.clone();

          this.ensureCleanMaterials(newItem);

          if (newItem.mesh.userData.group) {
            const group = newItem.mesh.userData.group;
            group.position.copy(point);
            group.position.y = 0;
            this.scene.add(group);

            newItem.mesh.position.copy(point);
            newItem.mesh.position.y = 0;
          } else {
            this.scene.add(newItem.mesh);
          }

          this.placedItems.push(newItem);

          if (this.selectedItemType === "lightpole") {
            this.setupPlacedLightpole(newItem);
          }

          this.animateItemSpawn(newItem);

          if (this.dragAndDropManager) {
            this.dragAndDropManager.updatePlacedItems(this.placedItems);
          }
        } else {
          console.error(`❌ Failed to create item for placement`);
        }

        this.cancelPlacement();
      }
    } else {
      this.selectItemAtMouse();
    }
  }

  private onMouseUp(_event: MouseEvent): void {
    if (this.isDragging && this.selectedItem) {
      this.isDragging = false;

      if (!this.isPositionValid(this.selectedItem.position)) {
        this.selectedItem.position.copy(this.selectedItem.mesh.position);

        if (this.selectedItem.mesh.userData.group) {
          const group = this.selectedItem.mesh.userData.group;
          group.position.copy(this.selectedItem.position);
          group.position.y = 0;
        }
      } else {
        if (this.selectedItem.mesh.userData.group) {
          const group = this.selectedItem.mesh.userData.group;
          group.position.copy(this.selectedItem.position);
          group.position.y = 0;
        }
      }
      this.deselectItem();
    }
  }

  private selectItemAtMouse(): void {
    const allMeshes: THREE.Mesh[] = [];
    const meshToItemMap = new Map<THREE.Mesh, GardenItem>();

    this.placedItems.forEach((item) => {
      allMeshes.push(item.mesh);
      meshToItemMap.set(item.mesh, item);

      if (item.mesh.userData.group) {
        const group = item.mesh.userData.group;
        group.traverse((child: THREE.Object3D) => {
          if (child instanceof THREE.Mesh) {
            allMeshes.push(child);
            meshToItemMap.set(child, item);
          }
        });
      }
    });

    const intersects = this.raycaster.intersectObjects(allMeshes, true);

    if (intersects.length > 0) {
      const clickedMesh = intersects[0].object as THREE.Mesh;
      const clickedItem = meshToItemMap.get(clickedMesh);

      if (clickedItem) {
        // Check if clicked item is a gnome - make it disappear
        if (clickedMesh.userData.isGnome) {
          this.makeGnomeDisappear(clickedItem, clickedMesh);
          return;
        }

        if (this.selectedItem === clickedItem) {
          this.deselectItem();
        } else {
          this.selectItem(clickedItem);
        }
      }
    } else {
      this.deselectItem();
    }
  }

  private selectItem(item: GardenItem): void {
    if (this.selectedItem) {
      this.deselectItem();
    }

    this.selectedItem = item;

    this.highlightItem(item);

    this.startDragging(item);
  }

  private deselectItem(): void {
    if (this.selectedItem) {
      this.removeHighlight(this.selectedItem);
      this.selectedItem = null;
      this.isDragging = false;
      console.log("❌ Item deselected");
    }
  }

  private highlightItem(item: GardenItem): void {
    if (item.mesh.material) {
      const material = Array.isArray(item.mesh.material)
        ? item.mesh.material[0]
        : item.mesh.material;

      if (material instanceof THREE.MeshStandardMaterial) {
        if (!item.originalMaterialProps) {
          item.originalMaterialProps = {
            emissive: material.emissive.clone(),
            emissiveIntensity: material.emissiveIntensity,
            color: material.color.clone(),
          };
          console.log(`💾 Stored original material props for: ${item.type}`, {
            emissive: item.originalMaterialProps.emissive.getHexString(),
            emissiveIntensity: item.originalMaterialProps.emissiveIntensity,
            color: item.originalMaterialProps.color.getHexString(),
          });
        }

        if (!item.uniqueMaterial) {
          item.uniqueMaterial = material.clone();
          item.mesh.material = item.uniqueMaterial;
        }

        item.uniqueMaterial.emissive.setHex(0x0066ff);
        item.uniqueMaterial.emissiveIntensity = 0.6;

        console.log(`🔵 Applied highlighting to: ${item.type}`, {
          newEmissive: item.uniqueMaterial.emissive.getHexString(),
          newEmissiveIntensity: item.uniqueMaterial.emissiveIntensity,
        });
      }
    }

    this.addSelectionRing(item);

    this.startPulseAnimation(item);

    this.addSelectionText(item);

    if (item.mesh.userData.group) {
      const group = item.mesh.userData.group;
      group.traverse((child: THREE.Object3D) => {
        if (child instanceof THREE.Mesh && child.material) {
          const material = Array.isArray(child.material)
            ? child.material[0]
            : child.material;
          if (material instanceof THREE.MeshStandardMaterial) {
            if (!child.userData.originalMaterial) {
              child.userData.originalMaterial = {
                emissive: material.emissive.clone(),
                emissiveIntensity: material.emissiveIntensity,
                color: material.color.clone(),
              };
            }
            material.emissive.setHex(0x0066ff);
            material.emissiveIntensity = 0.4;
          }
        }
      });
      console.log(`✨ Group highlighting applied to: ${item.type}`);
    }

    console.log(`✨ Enhanced highlighting applied to: ${item.type}`);
  }

  private removeHighlight(item: GardenItem): void {
    if (item.mesh.material) {
      const material = Array.isArray(item.mesh.material)
        ? item.mesh.material[0]
        : item.mesh.material;

      if (
        material instanceof THREE.MeshStandardMaterial &&
        item.originalMaterialProps
      ) {
        console.log(`🔄 Restoring material for: ${item.type}`, {
          before: {
            emissive: material.emissive.getHexString(),
            emissiveIntensity: material.emissiveIntensity,
            color: material.color.getHexString(),
          },
          original: {
            emissive: item.originalMaterialProps.emissive.getHexString(),
            emissiveIntensity: item.originalMaterialProps.emissiveIntensity,
            color: item.originalMaterialProps.color.getHexString(),
          },
        });

        material.emissive.copy(item.originalMaterialProps.emissive);
        material.emissiveIntensity =
          item.originalMaterialProps.emissiveIntensity;
        material.color.copy(item.originalMaterialProps.color);

        console.log(`✅ Material restored for: ${item.type}`, {
          after: {
            emissive: material.emissive.getHexString(),
            emissiveIntensity: material.emissiveIntensity,
            color: material.color.getHexString(),
          },
        });
      } else {
        console.warn(`⚠️ Cannot restore material for: ${item.type}`, {
          hasMaterial: !!item.mesh.material,
          isStandardMaterial:
            item.mesh.material instanceof THREE.MeshStandardMaterial,
          hasOriginalProps: !!item.originalMaterialProps,
        });

        this.forceResetMaterial(item);
      }
    }

    if (item.uniqueMaterial && item.originalMaterialProps) {
      const originalItem = this.assetManager.createItem(item.type);
      if (originalItem && originalItem.mesh.material) {
        const originalMaterial = Array.isArray(originalItem.mesh.material)
          ? originalItem.mesh.material[0]
          : originalItem.mesh.material;

        item.mesh.material = originalMaterial;
        item.uniqueMaterial = undefined;

        console.log(
          `🔄 Restored original material reference for: ${item.type}`
        );
      }
    }

    this.removeSelectionRing(item);

    this.stopPulseAnimation(item);

    this.removeSelectionText(item);

    // If this item has a group, also remove highlighting from all group meshes
    if (item.mesh.userData.group) {
      const group = item.mesh.userData.group;
      group.traverse((child: THREE.Object3D) => {
        if (
          child instanceof THREE.Mesh &&
          child.material &&
          child.userData.originalMaterial
        ) {
          const material = Array.isArray(child.material)
            ? child.material[0]
            : child.material;
          if (material instanceof THREE.MeshStandardMaterial) {
            // Restore original material for group meshes
            material.emissive.copy(child.userData.originalMaterial.emissive);
            material.emissiveIntensity =
              child.userData.originalMaterial.emissiveIntensity;
            material.color.copy(child.userData.originalMaterial.color);
          }
        }
      });
      console.log(`✨ Group highlighting removed from: ${item.type}`);
    }

    console.log(`❌ Highlighting removed from: ${item.type}`);
  }

  private addSelectionRing(item: GardenItem): void {
    const ringGeometry = new THREE.RingGeometry(
      item.radius + 0.2,
      item.radius + 0.4,
      32
    );
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff88,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
    });

    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = -Math.PI / 2;
    ring.position.copy(item.position);
    ring.position.y = 0.01;

    item.selectionRing = ring;
    this.scene.add(ring);
  }

  private removeSelectionRing(item: GardenItem): void {
    if (item.selectionRing) {
      this.scene.remove(item.selectionRing);
      item.selectionRing = undefined;
    }
  }

  private startPulseAnimation(item: GardenItem): void {
    const originalScale = item.mesh.scale.clone();

    // If this item has a group, animate the group instead of just the mesh
    if (item.mesh.userData.group) {
      const group = item.mesh.userData.group;
      const groupOriginalScale = group.scale.clone();

      const pulseTween = new TWEEN.Tween(group.scale)
        .to(
          {
            x: groupOriginalScale.x * 1.1,
            y: groupOriginalScale.y * 1.1,
            z: groupOriginalScale.z * 1.1,
          },
          800
        )
        .easing(TWEEN.Easing.Quadratic.InOut)
        .yoyo(true)
        .repeat(Infinity);

      pulseTween.start();
      item.pulseAnimation = pulseTween;
    } else {
      // Standard animation for single mesh items
      const pulseTween = new TWEEN.Tween(item.mesh.scale)
        .to(
          {
            x: originalScale.x * 1.1,
            y: originalScale.y * 1.1,
            z: originalScale.z * 1.1,
          },
          800
        )
        .easing(TWEEN.Easing.Quadratic.InOut)
        .yoyo(true)
        .repeat(Infinity);

      pulseTween.start();
      item.pulseAnimation = pulseTween;
    }
  }

  private stopPulseAnimation(item: GardenItem): void {
    if (item.pulseAnimation) {
      item.pulseAnimation.stop();
      item.pulseAnimation = null;

      // If this item has a group, reset the group scale
      if (item.mesh.userData.group) {
        const group = item.mesh.userData.group;
        group.scale.setScalar(1.0);
      } else if (item.originalScale) {
        // Standard reset for single mesh items
        item.mesh.scale.copy(item.originalScale);
      }
    }
  }

  private addSelectionText(item: GardenItem): void {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d")!;
    canvas.width = 256;
    canvas.height = 64;

    context.fillStyle = "#00FF88";
    context.font = "bold 24px Arial";
    context.textAlign = "center";
    context.fillText("DRAG TO MOVE", canvas.width / 2, 40);

    context.strokeStyle = "#FFFFFF";
    context.lineWidth = 2;
    context.strokeText("DRAG TO MOVE", canvas.width / 2, 40);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(material);

    sprite.position.copy(item.position);

    // For group items, calculate height from the group
    if (item.mesh.userData.group) {
      const group = item.mesh.userData.group;
      const box = new THREE.Box3().setFromObject(group);
      sprite.position.y = box.max.y + 0.5;
    } else {
      sprite.position.y = item.mesh.geometry.boundingBox?.max.y || 2;
    }

    sprite.scale.set(2, 0.5, 1);

    item.selectionText = sprite;
    this.scene.add(sprite);
  }

  private removeSelectionText(item: GardenItem): void {
    if (item.selectionText) {
      this.scene.remove(item.selectionText);
      item.selectionText = undefined;
    }
  }

  private forceResetMaterial(item: GardenItem): void {
    if (item.mesh.material) {
      const material = Array.isArray(item.mesh.material)
        ? item.mesh.material[0]
        : item.mesh.material;

      if (material instanceof THREE.MeshStandardMaterial) {
        console.log(`🔄 Force resetting material for: ${item.type}`);

        material.emissive.setHex(0x000000);
        material.emissiveIntensity = 0;

        if (item.originalMaterialProps) {
          material.color.copy(item.originalMaterialProps.color);
        }

        console.log(`✅ Material force reset for: ${item.type}`);
      }
    }

    if (item.uniqueMaterial && item.originalMaterialProps) {
      const originalItem = this.assetManager.createItem(item.type);
      if (originalItem && originalItem.mesh.material) {
        const originalMaterial = Array.isArray(originalItem.mesh.material)
          ? originalItem.mesh.material[0]
          : originalItem.mesh.material;

        item.mesh.material = originalMaterial;
        item.uniqueMaterial = undefined;

        console.log(
          `🔄 Force restored original material reference for: ${item.type}`
        );
      }
    }
  }

  private startDragging(item: GardenItem): void {
    this.isDragging = true;

    const rect = this.renderer.domElement.getBoundingClientRect();
    const mouseX = ((this.mouse.x + 1) / 2) * rect.width;
    const mouseY = ((1 - this.mouse.y) / 2) * rect.height;

    const mouseWorldPos = new THREE.Vector3(mouseX, 0, mouseY);
    this.dragOffset.copy(item.position).sub(mouseWorldPos);

    console.log("🚀 Started dragging item");
  }

  private startPlacingItem(itemType: string): void {
    this.isPlacing = true;
    this.selectedItemType = itemType;
    console.log(
      `🎯 Starting placement for ${itemType} - isPlacing: ${this.isPlacing}, selectedType: ${this.selectedItemType}`
    );

    // Clear any previously selected item to remove highlighting
    if (this.selectedItem) {
      console.log(`🔄 Clearing previous selection before starting placement`);
      this.deselectItem();
    }

    // Show grid when starting to place item
    this.showGrid();

    // Update UI status
    if (this.uiManager) {
      this.uiManager.updatePlacementStatus("Click on garden to place item");
    }

    // Create a temporary preview item for validation only
    this.previewItem = this.assetManager.createItem(itemType);
    if (!this.previewItem) {
      console.error(`❌ Failed to create item for ${itemType}`);
      this.cancelPlacement();
    } else {
      console.log(
        `✅ Preview item created for ${itemType}, ready for placement. State: isPlacing=${this.isPlacing}, selectedType=${this.selectedItemType}`
      );
    }
  }

  private isPositionValid(position: THREE.Vector3): boolean {
    // Special handling for stone paths - allow them to be placed in a wider area
    if (this.selectedItemType === "stone_path") {
      // Allow stone paths to be placed in a wider area, including near edges
      const margin = 2.0; // Reduced margin for paths
      const isValid =
        position.x >= -20 + margin &&
        position.x <= 20 - margin &&
        position.z >= -15 + margin &&
        position.z <= 15 - margin;
      console.log(
        `🧱 Stone path position validation:`,
        position,
        `Valid:`,
        isValid
      );
      return isValid;
    }

    // Standard validation for other items
    const isValid = this.gardenBounds.containsPoint(position);
    console.log(
      `📍 Position validation:`,
      position,
      `Bounds:`,
      this.gardenBounds.min,
      `to`,
      this.gardenBounds.max,
      `Valid:`,
      isValid
    );
    return isValid;
  }

  private wouldOverlap(position: THREE.Vector3, radius: number): boolean {
    for (const item of this.placedItems) {
      if (item === this.selectedItem) continue;

      // Special handling for stone paths - allow them to be placed closer together
      const isStonePath =
        this.selectedItemType === "stone_path" && item.type === "stone_path";
      const minDistance = isStonePath ? 2.0 : radius + item.radius;

      const distance = position.distanceTo(item.position);
      if (distance < minDistance) {
        console.log(
          `⚠️ Overlap detected: ${
            this.selectedItemType
          } at distance ${distance.toFixed(2)} from ${
            item.type
          } (min: ${minDistance.toFixed(2)})`
        );
        return true;
      }
    }
    console.log(
      `✅ No overlap detected for ${this.selectedItemType} at:`,
      position
    );
    return false;
  }

  private animateItemSpawn(item: GardenItem): void {
    item.mesh.scale.set(0.6, 0.6, 0.6);

    const scaleTween = new TWEEN.Tween(item.mesh.scale)
      .to({ x: 1.0, y: 1.0, z: 1.0 }, 500)
      .easing(TWEEN.Easing.Back.Out);

    const originalY = item.position.y;
    item.position.y = -0.5;

    const bounceTween = new TWEEN.Tween(item.position)
      .to({ y: originalY + 0.3 }, 300)
      .easing(TWEEN.Easing.Bounce.Out)
      .onComplete(() => {
        new TWEEN.Tween(item.position)
          .to({ y: originalY }, 200)
          .easing(TWEEN.Easing.Quadratic.Out)
          .start();
      });

    scaleTween.start();
    bounceTween.start();
  }

  private cancelPlacement(): void {
    this.isPlacing = false;
    this.selectedItemType = null;
    this.hideGrid(); // Ensure grid is hidden when cancelling placement

    // Reset UI status
    if (this.uiManager) {
      this.uiManager.updatePlacementStatus("Click an item to start placing");
    }

    // Clean up preview item
    if (this.previewItem) {
      this.previewItem = null;
    }
  }

  private deleteSelectedItem(): void {
    if (this.selectedItem) {
      this.removeHighlight(this.selectedItem);

      this.scene.remove(this.selectedItem.mesh);

      const index = this.placedItems.indexOf(this.selectedItem);
      if (index > -1) {
        this.placedItems.splice(index, 1);
      }

      if (this.dragAndDropManager) {
        this.dragAndDropManager.updatePlacedItems(this.placedItems);
      }

      console.log(`🗑️ Deleted item: ${this.selectedItem.type}`);

      this.selectedItem = null;
      this.isDragging = false;
    }
  }

  private makeGnomeDisappear(item: GardenItem, mesh: THREE.Mesh): void {
    // Play click sound
    this.audioManager.playClick();

    // Add a fun disappearing animation
    const targetScale = new THREE.Vector3(0, 0, 0);

    // Animate the gnome shrinking and fading away
    const animate = () => {
      mesh.scale.lerp(targetScale, 0.1);

      if (mesh.scale.length() > 0.01) {
        requestAnimationFrame(animate);
      } else {
        // Remove the gnome from the scene
        this.scene.remove(mesh);

        // Remove from placed items
        const index = this.placedItems.indexOf(item);
        if (index > -1) {
          this.placedItems.splice(index, 1);
        }

        // Update drag and drop manager
        if (this.dragAndDropManager) {
          this.dragAndDropManager.updatePlacedItems(this.placedItems);
        }

        // Increment found gnomes counter
        this.foundGnomes++;
        this.updateGnomeCounter();

        console.log(
          `🧙‍♂️ Gnome disappeared! Found: ${this.foundGnomes}/${this.totalGnomes}`
        );
      }
    };

    animate();
  }

  private updateGnomeCounter(): void {
    if (this.uiManager) {
      this.uiManager.updateGnomeCounter(this.foundGnomes, this.totalGnomes);
    }
  }

  private onWindowResize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    // //@ts-expect-error as aspect is not in the type
    // camera.aspect = width / height;
    // //@ts-expect-error  as updateProjectionMatrix is not in the type
    // camera.updateProjectionMatrix();
    // renderer.setSize(width, height);
    // renderer.setPixelRatio(window.devicePixelRatio);

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(window.devicePixelRatio);
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());

    TWEEN.update();
    this.controls.update();

    // Update lightpole bulb based on day/night
    this.updateLightpoleBulb();

    this.composer.render();
  }

  private setupDebugButtons(): void {
    const debugPanel = document.getElementById("debug-panel");
    if (debugPanel) {
      import("./config/uiConfig").then(({ UI_CONFIG }) => {
        if (UI_CONFIG.debug) {
          debugPanel.style.display = "block";
          this.setupDebugButtonListeners();
        } else {
          debugPanel.style.display = "none";
        }
      });
    }

    this.setupDayNightButton();
  }

  private setupDebugButtonListeners(): void {
    const debugConsoleBtn = document.getElementById("debug-console-btn");
    if (debugConsoleBtn) {
      debugConsoleBtn.addEventListener("click", () => {
        console.log("🔧 Debug console button clicked!");
        this.showDebugInfo();
      });
      console.log("✅ Debug console button event listener added");
    } else {
      console.log("❌ Debug console button not found in HTML");
    }
  }

  private showDebugInfo(): void {
    const debugInfo = {
      assetManager: this.assetManager ? "Initialized" : "Not initialized",
      scene: this.scene
        ? `Children: ${this.scene.children.length}`
        : "Not initialized",
      placedItems: this.placedItems.length,
      capturedLogs: this.capturedLogs.length,
    };

    console.log("🔍 Debug Info:", debugInfo);

    alert(`Debug Info:\n${JSON.stringify(debugInfo, null, 2)}`);
  }

  private toggleDayNight(): void {
    if (this.dayNightSystem) {
      this.dayNightSystem.toggleDayNight();
      this.updateDayNightButton();
    }
  }

  private setupDayNightButton(): void {
    const dayNightBtn = document.getElementById("day-night-toggle");
    if (dayNightBtn) {
      dayNightBtn.addEventListener("click", () => {
        console.log("🌅 Day/Night toggle button clicked!");
        this.toggleDayNight();
      });
      console.log("✅ Day/Night toggle button event listener added");
    } else {
      console.log("❌ Day/Night toggle button not found in HTML");
    }

    const musicBtn = document.getElementById("music-toggle");
    if (musicBtn) {
      musicBtn.addEventListener("click", () => {
        console.log("🎵 Music toggle button clicked!");
        this.toggleMusic();
      });
      console.log("✅ Music toggle button event listener added");
    } else {
      console.log("❌ Music toggle button not found in HTML");
    }
  }

  private updateDayNightButton(): void {
    const dayNightBtn = document.getElementById("day-night-toggle");
    if (dayNightBtn && this.dayNightSystem) {
      const currentMode = this.dayNightSystem.getCurrentMode();
      if (currentMode === "day") {
        dayNightBtn.textContent = "🌅 Day Mode";
        dayNightBtn.classList.remove("night");
      } else {
        dayNightBtn.textContent = "🌙 Night Mode";
        dayNightBtn.classList.add("night");
      }
    }
  }

  private toggleMusic(): void {
    if (this.audioManager) {
      this.audioManager.toggleTheme();
      this.updateMusicButton();
    }
  }

  private updateMusicButton(): void {
    const musicBtn = document.getElementById("music-toggle");
    if (musicBtn && this.audioManager) {
      const isPlaying = this.audioManager.isThemeActive();
      if (isPlaying) {
        musicBtn.textContent = "🔇 Stop Music";
        musicBtn.classList.add("playing");
      } else {
        musicBtn.textContent = "🎵 Play Music";
        musicBtn.classList.remove("playing");
      }
    }
  }

  public dispose(): void {
    if (this.controls) {
      this.controls.dispose();
    }

    if (this.renderer) {
      this.renderer.dispose();
    }

    if (this.composer) {
      this.composer.dispose();
    }
  }

  private ensureCleanMaterials(item: GardenItem): void {
    console.log(
      `🧹 Ensuring clean materials for newly placed item: ${item.type}`
    );

    // Reset main mesh materials
    if (item.mesh.material) {
      const material = Array.isArray(item.mesh.material)
        ? item.mesh.material[0]
        : item.mesh.material;

      if (material instanceof THREE.MeshStandardMaterial) {
        // Store original material properties if not already stored
        if (!item.originalMaterialProps) {
          item.originalMaterialProps = {
            emissive: material.emissive.clone(),
            emissiveIntensity: material.emissiveIntensity,
            color: material.color.clone(),
          };
          console.log(
            `💾 Stored original material props for new item: ${item.type}`
          );
        }

        // Ensure no highlighting is applied
        material.emissive.setHex(0x000000);
        material.emissiveIntensity = 0;
        console.log(`🧹 Cleaned main mesh materials for: ${item.type}`);
      }
    }

    // Reset group mesh materials if this item has a group
    if (item.mesh.userData.group) {
      const group = item.mesh.userData.group;
      group.traverse((child: THREE.Object3D) => {
        if (child instanceof THREE.Mesh && child.material) {
          const material = Array.isArray(child.material)
            ? child.material[0]
            : child.material;
          if (material instanceof THREE.MeshStandardMaterial) {
            // Store original material if not already stored
            if (!child.userData.originalMaterial) {
              child.userData.originalMaterial = {
                emissive: material.emissive.clone(),
                emissiveIntensity: material.emissiveIntensity,
                color: material.color.clone(),
              };
            }

            // Ensure no highlighting is applied
            material.emissive.setHex(0x000000);
            material.emissiveIntensity = 0;
          }
        }
      });
      console.log(`🧹 Cleaned group mesh materials for: ${item.type}`);
    }

    // Clear any unique material references
    item.uniqueMaterial = undefined;

    console.log(`✅ Materials cleaned for newly placed item: ${item.type}`);
  }
}
