import * as THREE from "three";

export class GardenItem {
  public mesh: THREE.Mesh;
  public position: THREE.Vector3;
  public radius: number;
  public type: string;


  public originalScale: THREE.Vector3;
  public originalMaterialProps?: {
    emissive: THREE.Color;
    emissiveIntensity: number;
    color: THREE.Color;

  };
  public uniqueMaterial?: THREE.MeshStandardMaterial;
  public selectionRing?: THREE.Mesh;
  public selectionText?: THREE.Sprite;
  public pulseAnimation?: any;

  constructor(mesh: THREE.Mesh, type: string, radius: number = 1.0) {
    this.mesh = mesh;
    this.type = type;
    this.radius = radius;
    this.position = new THREE.Vector3();


    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;


    this.mesh.position.copy(this.position);
    this.originalScale = mesh.scale.clone();
  }

  public setPosition(position: THREE.Vector3): void {
    this.position.copy(position);
    this.mesh.position.copy(position);
  }

  public getPosition(): THREE.Vector3 {
    return this.position.clone();
  }
  resetScale() {
    this.mesh.scale.copy(this.originalScale);
  }
  public dispose(): void {
    if (this.mesh.geometry) {
      this.mesh.geometry.dispose();
    }
    if (this.mesh.material) {
      if (Array.isArray(this.mesh.material)) {
        this.mesh.material.forEach((material) => material.dispose());
      } else {
        this.mesh.material.dispose();
      }
    }
  }
}
