import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { GardenItem } from "./GardenItem";
import { getAllItems } from "./config/uiConfig";

interface AssetDefinition {
  type: string;
  category: string;
  modelPath?: string;
  thumbnailPath?: string;
  radius: number;
  scale?: number;
  gltfName?: string;
  fallbackGeometry?: "box" | "cylinder" | "sphere" | "cone";
  fallbackMaterial?: {
    color?: number;
    roughness?: number;
    metalness?: number;
  };
}

export class AssetManager {
  private loader: GLTFLoader;
  private loadedModels: Map<string, THREE.Group> = new Map();
  private assetDefinitions: AssetDefinition[] = [];

  constructor() {
    this.loader = new GLTFLoader();
    this.generateAssetDefinitions();
    this.preloadAssets();
  }

  private generateAssetDefinitions(): void {

    const configItems = getAllItems();


    this.assetDefinitions = configItems.map((item) => ({
      type: item.id,
      category: item.category,
      modelPath: "/assets/gltf/objects.glb",
      thumbnailPath: item.thumbnail,
      radius: item.radius,
      scale: item.scale || 1.0,
      gltfName: item.meshName,
    }));
  }

  private async preloadAssets(): Promise<void> {
    const modelPaths = new Set<string>();
    for (const asset of this.assetDefinitions) {
      if (asset.modelPath) {
        modelPaths.add(asset.modelPath);
      }
    }
    for (const modelPath of modelPaths) {
      try {
        await this.loadModelFile(modelPath);
      } catch (error) {
        console.error(`❌ Failed to load model file ${modelPath}:`, error);
      }
    }
  }

  private async loadModelFile(path: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.loader.load(
        path,
        (gltf) => {
          this.loadedModels.set(path, gltf.scene);
          resolve();
        },
        reject
      );
    });
  }

  private countMeshesInScene(scene: THREE.Group): number {
    let count = 0;
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        count++;
      }
    });
    return count;
  }

  public createItem(type: string): GardenItem | null {
    const definition = this.assetDefinitions.find(
      (asset) => asset.type === type
    );
    if (!definition) {
      console.warn(`Unknown item type: ${type}`);
      return null;
    }

    let mesh: THREE.Mesh;

    // Check if this is a procedural model first
    if (definition.category === "models") {
      const proceduralMesh = this.createProceduralModel(type);
      if (proceduralMesh) {
        return new GardenItem(proceduralMesh, type, definition.radius);
      }
    }

    if (definition.modelPath) {
      const loadedModel = this.loadedModels.get(definition.modelPath);

      if (loadedModel) {

        const clonedModel = loadedModel.clone();
        let foundMesh: THREE.Mesh | null = null;
        let meshCount = 0;

        if (definition.gltfName) {
          clonedModel.traverse((child) => {
            if (child instanceof THREE.Mesh && !foundMesh) {

              if (
                child.name === definition.gltfName ||
                child.parent?.name === definition.gltfName ||
                child.parent?.parent?.name === definition.gltfName
              ) {
                foundMesh = child.clone();
              }
            }
          });
        }

        if (!foundMesh) {
          clonedModel.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              meshCount++;
            }
          });
        }


        if (!foundMesh) {
          let deepestMesh: THREE.Mesh | null = null;
          let maxDepth = 0;

          let currentDepth = 0;
          clonedModel.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              if (currentDepth > maxDepth) {
                maxDepth = currentDepth;
                deepestMesh = child.clone();
              }
            }
            currentDepth++;
          });

          if (deepestMesh) {
            foundMesh = deepestMesh;
          }
        }


        if (!foundMesh) {

          const namePatterns = [
            type.toLowerCase(),
            type.replace("_", ""),
            type.split("_")[0],
            "mesh",
            "object",
            "model",
          ];

          clonedModel.traverse((child) => {
            if (child instanceof THREE.Mesh && !foundMesh) {
              const childName = (child.name || "").toLowerCase();
              for (const pattern of namePatterns) {
                if (childName.includes(pattern)) {
                  foundMesh = child.clone();
                  break;
                }
              }
            }
          });
        }
        if (foundMesh) {
          mesh = foundMesh;
          if (definition.scale) {
            mesh.scale.setScalar(definition.scale);
          }


          if (mesh.material) {
            if (Array.isArray(mesh.material)) {
              mesh.material.forEach((mat) => {
                if (mat instanceof THREE.Material) {
                  mat.needsUpdate = true;
                }
              });
            } else {
              mesh.material.needsUpdate = true;
            }
          }
        } else {
          mesh = this.createFallbackMesh(definition);
        }
      } else {
        mesh = this.createFallbackMesh(definition);
      }
    } else {

      mesh = this.createFallbackMesh(definition);
      console.warn(`⚠️ No model path specified for ${type}`);
    }

    return new GardenItem(mesh, type, definition.radius);
  }

  private createFallbackMesh(definition: AssetDefinition): THREE.Mesh {
    let geometry: THREE.BufferGeometry;

    switch (definition.fallbackGeometry) {
      case "box":
        geometry = new THREE.BoxGeometry(1, 1, 1);
        break;
      case "cylinder":
        geometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 8);
        break;
      case "sphere":
        geometry = new THREE.SphereGeometry(0.5, 16, 16);
        break;
      case "cone":
        geometry = new THREE.ConeGeometry(0.5, 1, 8);
        break;
      default:
        geometry = new THREE.BoxGeometry(1, 1, 1);
    }

    const material = new THREE.MeshStandardMaterial({
      color: definition.fallbackMaterial?.color || 0x808080,
      roughness: definition.fallbackMaterial?.roughness || 0.5,
      metalness: definition.fallbackMaterial?.metalness || 0.0,
    });

    const mesh = new THREE.Mesh(geometry, material);

    if (definition.scale) {
      mesh.scale.setScalar(definition.scale);
    }

    return mesh;
  }

  private createProceduralModel(type: string): THREE.Mesh | null {
    switch (type) {
      case "tree":
        return this.createProceduralTree();
      case "bench":
        return this.createProceduralBench();
      case "fountain":
        return this.createProceduralFountain();
      case "flower_pot":
        return this.createProceduralFlowerPot();
      case "stone_path":
        return this.createProceduralStonePath();
      case "lightpole":
        return this.createProceduralLightpole(Math.random() * Math.PI * 2); // Random rotation
      default:
        console.warn(`Unknown procedural model type: ${type}`);
        return null;
    }
  }

  private createProceduralTree(): THREE.Mesh {
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

    // Create a group for the tree
    const treeGroup = new THREE.Group();

    // Tree trunk
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.4, 0.6, 3, 8),
      trunkMaterial
    );
    trunk.position.y = 1.5;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    treeGroup.add(trunk);

    // Tree leaves
    const leaves = new THREE.Mesh(
      new THREE.SphereGeometry(2.5, 8, 6),
      leavesMaterial
    );
    leaves.position.y = 4.5;
    leaves.castShadow = true;
    leaves.receiveShadow = true;
    treeGroup.add(leaves);

    // Convert group to mesh for compatibility
    const treeMesh = new THREE.Mesh(
      new THREE.BoxGeometry(5, 6, 5), // Bounding box
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })
    );
    treeMesh.userData.group = treeGroup;
    treeMesh.castShadow = true;
    treeMesh.receiveShadow = true;

    return treeMesh;
  }

  private createProceduralBench(): THREE.Mesh {
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

    // Bench seat
    const seat = new THREE.Mesh(
      new THREE.BoxGeometry(3, 0.3, 1.2),
      woodMaterial
    );
    seat.position.y = 0.65;
    seat.castShadow = true;
    seat.receiveShadow = true;
    benchGroup.add(seat);

    // Bench back
    const back = new THREE.Mesh(
      new THREE.BoxGeometry(3, 1.2, 0.2),
      woodMaterial
    );
    back.position.set(0, 1.25, -0.6);
    back.castShadow = true;
    back.receiveShadow = true;
    benchGroup.add(back);

    // Bench legs
    const legPositions = [
      [-1.5, 0.325, 0], [1.5, 0.325, 0]
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

    const benchMesh = new THREE.Mesh(
      new THREE.BoxGeometry(3, 1.5, 1.2),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })
    );
    benchMesh.userData.group = benchGroup;
    benchMesh.castShadow = true;
    benchMesh.receiveShadow = true;

    return benchMesh;
  }

  private createProceduralFountain(): THREE.Mesh {
    const stoneMaterial = new THREE.MeshStandardMaterial({
      color: 0x808080,
      roughness: 0.8,
      metalness: 0.0,
    });

    const waterMaterial = new THREE.MeshStandardMaterial({
      color: 0x4a90e2,
      roughness: 0.1,
      metalness: 0.8,
      transparent: true,
      opacity: 0.7,
    });

    const fountainGroup = new THREE.Group();

    // Fountain base
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(2, 2.5, 0.5, 16),
      stoneMaterial
    );
    base.position.y = 0.25;
    base.castShadow = true;
    base.receiveShadow = true;
    fountainGroup.add(base);

    // Fountain center
    const center = new THREE.Mesh(
      new THREE.CylinderGeometry(0.8, 1.2, 1.5, 16),
      stoneMaterial
    );
    center.position.y = 1.25;
    center.castShadow = true;
    center.receiveShadow = true;
    fountainGroup.add(center);

    // Water in fountain
    const water = new THREE.Mesh(
      new THREE.CylinderGeometry(1.8, 1.8, 0.3, 16),
      waterMaterial
    );
    water.position.y = 0.4;
    water.castShadow = false;
    water.receiveShadow = true;
    fountainGroup.add(water);

    const fountainMesh = new THREE.Mesh(
      new THREE.BoxGeometry(5, 2, 5),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })
    );
    fountainMesh.userData.group = fountainGroup;
    fountainMesh.castShadow = true;
    fountainMesh.receiveShadow = true;

    return fountainMesh;
  }

  private createProceduralFlowerPot(): THREE.Mesh {
    const potMaterial = new THREE.MeshStandardMaterial({
      color: 0xcd853f,
      roughness: 0.8,
      metalness: 0.0,
    });

    const flowerMaterial = new THREE.MeshStandardMaterial({
      color: 0xff69b4,
      roughness: 0.7,
      metalness: 0.0,
    });

    const potGroup = new THREE.Group();

    // Pot
    const pot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.8, 0.6, 1.2, 8),
      potMaterial
    );
    pot.position.y = 0.6;
    pot.castShadow = true;
    pot.receiveShadow = true;
    potGroup.add(pot);

    // Flowers
    const flower = new THREE.Mesh(
      new THREE.SphereGeometry(0.6, 8, 6),
      flowerMaterial
    );
    flower.position.y = 1.5;
    flower.castShadow = true;
    flower.receiveShadow = true;
    potGroup.add(flower);

    const potMesh = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 2.1, 1.6),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })
    );
    potMesh.userData.group = potGroup;
    potMesh.castShadow = true;
    potMesh.receiveShadow = true;

    return potMesh;
  }

  private createProceduralStonePath(): THREE.Mesh {
    const stoneMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b8b8b,
      roughness: 0.9,
      metalness: 0.0,
    });

    const pathGroup = new THREE.Group();

    // Create a larger, more visible stone path
    const pathLength = 6; // Increased from 3
    const stoneWidth = 1.5; // Increased from 1.2
    const stoneHeight = 0.3; // Increased from 0.2
    const stoneDepth = 1.0; // Increased from 0.8
    const spacing = 1.8; // Increased spacing between stones

    for (let i = 0; i < pathLength; i++) {
      const stone = new THREE.Mesh(
        new THREE.BoxGeometry(stoneWidth, stoneHeight, stoneDepth),
        stoneMaterial
      );
      stone.position.set((i - (pathLength-1)/2) * spacing, stoneHeight/2, 0);
      stone.rotation.y = i * 0.2; // Reduced rotation for better alignment
      stone.castShadow = true;
      stone.receiveShadow = true;
      pathGroup.add(stone);
    }

    // Create a much larger bounding box for better placement and visibility
    const totalWidth = (pathLength - 1) * spacing + stoneWidth;
    const pathMesh = new THREE.Mesh(
      new THREE.BoxGeometry(totalWidth, stoneHeight, stoneDepth * 2), // Wider bounding box
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })
    );
    pathMesh.userData.group = pathGroup;
    pathMesh.userData.pathLength = pathLength; // Store path info for brick-by-brick spawning
    pathMesh.castShadow = true;
    pathMesh.receiveShadow = true;

    return pathMesh;
  }

  private createProceduralLightpole(rotationY: number = 0): THREE.Mesh {
    // Lightpole stick material
    const poleMaterial = new THREE.MeshStandardMaterial({
      color: 0x696969, // Dark gray
      roughness: 0.7,
      metalness: 0.3,
    });

    // Bulb material - will change based on day/night
    const bulbMaterial = new THREE.MeshStandardMaterial({
      color: 0xcccccc, // Light gray for day
      roughness: 0.2,
      metalness: 0.8,
      emissive: 0x000000, // No glow during day
      emissiveIntensity: 0.0,
    });

    // Create a group for the lightpole parts
    const lightpoleGroup = new THREE.Group();

    // Lightpole stick (tall cylinder)
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.2, 6, 8),
      poleMaterial
    );
    pole.position.y = 3; // 3 units high
    pole.castShadow = true;
    pole.receiveShadow = true;
    lightpoleGroup.add(pole);

    // Light bulb (sphere)
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.4, 8, 6),
      bulbMaterial
    );
    bulb.position.y = 6.2; // At the top of the pole
    bulb.castShadow = true;
    bulb.receiveShadow = true;
    lightpoleGroup.add(bulb);

    // Apply rotation to the group
    lightpoleGroup.rotation.y = rotationY;

    // Create a bounding box mesh for placement
    const lightpoleMesh = new THREE.Mesh(
      new THREE.BoxGeometry(2, 6.5, 2), // Bounding box
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })
    );
    lightpoleMesh.userData.group = lightpoleGroup;
    lightpoleMesh.castShadow = true;
    lightpoleMesh.receiveShadow = true;

    return lightpoleMesh;
  }

  // Method to create simple icon representations for UI
  public createModelIcon(type: string): string {
    switch (type) {
      case "tree":
        return this.createTreeIcon();
      case "bench":
        return this.createBenchIcon();
      case "fountain":
        return this.createFountainIcon();
      case "flower_pot":
        return this.createFlowerPotIcon();
      case "stone_path":
        return this.createStonePathIcon();
      case "lightpole":
        return this.createLightpoleIcon();
      default:
        return this.createDefaultIcon();
    }
  }

  private createTreeIcon(): string {
    return `
      <svg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <!-- Tree trunk -->
        <rect x="25" y="35" width="10" height="20" fill="#8B4513" rx="2"/>
        <!-- Tree leaves -->
        <circle cx="30" cy="25" r="15" fill="#228B22"/>
        <!-- Highlight -->
        <circle cx="27" cy="22" r="5" fill="#32CD32" opacity="0.7"/>
      </svg>
    `;
  }

  private createBenchIcon(): string {
    return `
      <svg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <!-- Bench seat -->
        <rect x="10" y="35" width="40" height="8" fill="#8B4513" rx="2"/>
        <!-- Bench back -->
        <rect x="10" y="25" width="40" height="8" fill="#8B4513" rx="2"/>
        <!-- Bench legs -->
        <rect x="15" y="35" width="4" height="15" fill="#696969"/>
        <rect x="41" y="35" width="4" height="15" fill="#696969"/>
      </svg>
    `;
  }

  private createFountainIcon(): string {
    return `
      <svg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <!-- Fountain base -->
        <ellipse cx="30" cy="45" rx="20" ry="8" fill="#808080"/>
        <!-- Fountain center -->
        <ellipse cx="30" cy="35" rx="8" ry="12" fill="#808080"/>
        <!-- Water -->
        <ellipse cx="30" cy="42" rx="18" ry="6" fill="#4A90E2" opacity="0.7"/>
        <!-- Water drops -->
        <circle cx="25" cy="30" r="2" fill="#4A90E2"/>
        <circle cx="35" cy="28" r="2" fill="#4A90E2"/>
      </svg>
    `;
  }

  private createFlowerPotIcon(): string {
    return `
      <svg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <!-- Pot -->
        <ellipse cx="30" cy="45" rx="12" ry="8" fill="#CD853F"/>
        <!-- Flowers -->
        <circle cx="30" cy="25" r="12" fill="#FF69B4"/>
        <!-- Flower petals -->
        <circle cx="25" cy="20" r="6" fill="#FF1493"/>
        <circle cx="35" cy="20" r="6" fill="#FF1493"/>
        <circle cx="30" cy="15" r="6" fill="#FF1493"/>
      </svg>
    `;
  }

  private createStonePathIcon(): string {
    return `
      <svg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <!-- Stone path pieces -->
        <rect x="5" y="25" width="12" height="8" fill="#8B8B8B" rx="2"/>
        <rect x="20" y="25" width="12" height="8" fill="#8B8B8B" rx="2"/>
        <rect x="35" y="25" width="12" height="8" fill="#8B8B8B" rx="2"/>
        <rect x="50" y="25" width="12" height="8" fill="#8B8B8B" rx="2"/>
        <!-- Path direction indicator -->
        <polygon points="30,20 25,30 35,30" fill="#696969"/>
      </svg>
    `;
  }

  private createLightpoleIcon(): string {
    return `
      <svg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <!-- Lightpole base -->
        <rect x="28" y="45" width="4" height="12" fill="#666" rx="1"/>
        <!-- Lightpole pole -->
        <rect x="29" y="25" width="6" height="20" fill="#444" rx="1"/>
        <!-- Light bulb -->
        <circle cx="32" cy="22" r="6" fill="#ffeb3b" stroke="#ff9800" stroke-width="1"/>
        <!-- Light glow -->
        <circle cx="32" cy="22" r="4" fill="#fff"/>
        <!-- Light rays -->
        <path d="M32 16 L34 14 M32 16 L30 14 M26 22 L24 20 M26 22 L24 24 M38 22 L40 20 M38 22 L40 24" 
              stroke="#ffeb3b" stroke-width="1" opacity="0.7"/>
        <!-- Ground shadow -->
        <ellipse cx="32" cy="58" rx="8" ry="2" fill="#000" opacity="0.2"/>
      </svg>
    `;
  }

  private createDefaultIcon(): string {
    return `
      <svg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <rect x="15" y="15" width="30" height="30" fill="#CCCCCC" rx="5"/>
        <text x="30" y="35" text-anchor="middle" fill="#666666" font-size="12">?</text>
      </svg>
    `;
  }

  public getAssetDefinitions(): AssetDefinition[] {
    return this.assetDefinitions;
  }

  public getAssetsByCategory(category: string): AssetDefinition[] {
    return this.assetDefinitions.filter((asset) => asset.category === category);
  }

  public getThumbnailPath(type: string): string | undefined {
    const definition = this.assetDefinitions.find(
      (asset) => asset.type === type
    );
    return definition?.thumbnailPath;
  }


  public debugLoadedModels(): void {
    console.log("=== Asset Manager Debug Info ===");
    console.log("Asset Definitions:", this.assetDefinitions);
    console.log("Loaded Models:", this.loadedModels);
    console.log("Model Paths:", Array.from(this.loadedModels.keys()));

    for (const [path, scene] of this.loadedModels.entries()) {
      console.log(`Model ${path}:`, {
        children: scene.children.length,
        meshes: scene.children.filter((child) => child instanceof THREE.Mesh)
          .length,
        groups: scene.children.filter((child) => child instanceof THREE.Group)
          .length,
        scene: scene,
      });
    }
  }


  public getDebugInfo(): any {
    return {
      assetDefinitions: this.assetDefinitions,
      loadedModelsCount: this.loadedModels.size,
      loadedModelPaths: Array.from(this.loadedModels.keys()),
      modelDetails: Array.from(this.loadedModels.entries()).map(
        ([path, scene]) => ({
          path,
          childrenCount: scene.children.length,
          meshCount: this.countMeshesInScene(scene),
          groupCount: scene.children.filter(
            (child) => child instanceof THREE.Group
          ).length,
        })
      ),
    };
  }


  public getLoadedModelPaths(): Set<string> {
    return new Set(this.loadedModels.keys());
  }
}
