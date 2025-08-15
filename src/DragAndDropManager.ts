import * as THREE from "three";
import { GardenItem } from "./GardenItem";
import { AssetManager } from "./AssetManager";

export interface DragState {
  isDragging: boolean;
  itemType: string | null;
  dragElement: HTMLElement | null;
  startPosition: { x: number; y: number };
  currentPosition: { x: number; y: number };
}

export class DragAndDropManager {
  private dragState: DragState = {
    isDragging: false,
    itemType: null,
    dragElement: null,
    startPosition: { x: 0, y: 0 },
    currentPosition: { x: 0, y: 0 },
  };

  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private renderer: THREE.WebGLRenderer;
  private assetManager: AssetManager;
  private gardenBounds: THREE.Box3;
  private placedItems: GardenItem[];
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private groundPlane: THREE.Plane;
  private dragPreview: THREE.Mesh | null = null;

  constructor(
      scene: THREE.Scene,
      camera: THREE.Camera,
      renderer: THREE.WebGLRenderer,
      assetManager: AssetManager,
      gardenBounds: THREE.Box3,
      placedItems: GardenItem[]
  ) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.assetManager = assetManager;
    this.gardenBounds = gardenBounds;
    this.placedItems = placedItems;

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

    this.initializeEventListeners();
  }

  private initializeEventListeners(): void {
    this.renderer.domElement.addEventListener("mousedown", this.onMouseDown.bind(this));
    this.renderer.domElement.addEventListener("mousemove", this.onMouseMove.bind(this));
    this.renderer.domElement.addEventListener("mouseup", this.onMouseUp.bind(this));

    document.addEventListener("dragstart", this.onDragStart.bind(this));
    document.addEventListener("dragend", this.onDragEnd.bind(this));

    this.renderer.domElement.addEventListener("dragover", this.onDragOver.bind(this));
    this.renderer.domElement.addEventListener("drop", this.onDrop.bind(this));
  }

  /** Вирівнює низ моделі на Y = 0 */
  private alignToGround(mesh: THREE.Object3D): void {
    const box = new THREE.Box3().setFromObject(mesh);
    const offsetY = box.min.y;
    mesh.position.y -= offsetY;
  }

  private onDragStart(event: DragEvent): void {
    if (event.target instanceof HTMLElement) {
      const itemButton = event.target.closest(".item-button");
      if (itemButton) {
        const itemType = itemButton.getAttribute("data-item-type");
        if (itemType) {
          this.startDrag(itemType, event);
        }
      }
    }
  }

  private onDragEnd(_event: DragEvent): void {
    this.endDrag();
  }

  private onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.dataTransfer!.dropEffect = "copy";
  }

  private onDrop(event: DragEvent): void {
    event.preventDefault();

    if (this.dragState.isDragging && this.dragState.itemType) {
      const rect = this.renderer.domElement.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      this.mouse.x = (x / rect.width) * 2 - 1;
      this.mouse.y = -(y / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersects = this.raycaster.ray.intersectPlane(this.groundPlane, new THREE.Vector3());

      if (intersects && this.isPositionValid(intersects)) {
        if (!this.wouldOverlap(intersects, this.dragState.itemType)) {
          this.placeItem(this.dragState.itemType, intersects);
        }
      }
      this.endDrag();
    }
  }

  private startDrag(itemType: string, event: DragEvent): void {
    this.dragState.isDragging = true;
    this.dragState.itemType = itemType;
    this.dragState.startPosition = { x: event.clientX, y: event.clientY };
    this.dragState.currentPosition = { x: event.clientX, y: event.clientY };

    this.createDragPreview(itemType);
    this.renderer.domElement.style.cursor = "grabbing";
    event.preventDefault();
  }

  private createDragPreview(itemType: string): void {
    const previewItem = this.assetManager.createItem(itemType);
    if (previewItem) {
      this.dragPreview = previewItem.mesh.clone();
      this.alignToGround(this.dragPreview);

      if (this.dragPreview.material) {
        if (Array.isArray(this.dragPreview.material)) {
          this.dragPreview.material.forEach((mat) => {
            if (mat instanceof THREE.Material) {
              mat.transparent = true;
              mat.opacity = 0.6;
            }
          });
        } else {
          this.dragPreview.material.transparent = true;
          this.dragPreview.material.opacity = 0.6;
        }
      }

      this.scene.add(this.dragPreview);
    }
  }

  private onMouseDown(_event: MouseEvent): void {
    if (this.dragState.isDragging) {
      this.renderer.domElement.style.cursor = "grabbing";
    }
  }

  private onMouseMove(event: MouseEvent): void {
    if (this.dragState.isDragging && this.dragPreview) {
      this.updateDragPreview(event);
    }
  }

  private updateDragPreview(event: MouseEvent): void {
    this.dragState.currentPosition = { x: event.clientX, y: event.clientY };

    this.mouse.x = (event.clientX / this.renderer.domElement.clientWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / this.renderer.domElement.clientHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.ray.intersectPlane(this.groundPlane, new THREE.Vector3());

    if (intersects) {
      if (this.isPositionValid(intersects)) {
        this.dragPreview!.position.copy(intersects);
        this.alignToGround(this.dragPreview!);
        this.setPreviewColor(0x00ff00, 0.6);
      } else {
        this.setPreviewColor(0xff0000, 0.6);
      }
    }
  }

  private onMouseUp(event: MouseEvent): void {
    if (this.dragState.isDragging) {
      this.placeDraggedItem(event);
      this.endDrag();
    }
  }

  private placeDraggedItem(event: MouseEvent): void {
    if (!this.dragState.itemType) return;

    this.mouse.x = (event.clientX / this.renderer.domElement.clientWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / this.renderer.domElement.clientHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.ray.intersectPlane(this.groundPlane, new THREE.Vector3());

    if (intersects && this.isPositionValid(intersects)) {
      if (!this.wouldOverlap(intersects, this.dragState.itemType)) {
        this.placeItem(this.dragState.itemType, intersects);
      }
    }
  }

  private placeItem(itemType: string, position: THREE.Vector3): void {
    const newItem = this.assetManager.createItem(itemType);
    if (newItem) {
      this.alignToGround(newItem.mesh);
      newItem.position.copy(position);
      newItem.position.y = 0;

      this.scene.add(newItem.mesh);
      this.placedItems.push(newItem);
      this.animateItemSpawn(newItem);
    }
  }

  private animateItemSpawn(item: GardenItem): void {
    item.mesh.scale.set(0.6, 0.6, 0.6);
    const targetScale = 1.0;
    const duration = 500;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentScale = 0.6 + (targetScale - 0.6) * easeOut;

      item.mesh.scale.setScalar(currentScale);
      if (progress < 1) requestAnimationFrame(animate);
    };

    animate();
  }

  private endDrag(): void {
    if (this.dragPreview) {
      this.scene.remove(this.dragPreview);
      this.dragPreview = null;
    }
    this.dragState.isDragging = false;
    this.dragState.itemType = null;
    this.dragState.dragElement = null;
    this.renderer.domElement.style.cursor = "default";
  }

  private isPositionValid(position: THREE.Vector3): boolean {
    return this.gardenBounds.containsPoint(position);
  }

  private wouldOverlap(position: THREE.Vector3, itemType: string): boolean {
    const definition = this.assetManager
        .getAssetDefinitions()
        .find((asset) => asset.type === itemType);
    if (!definition) return false;

    const radius = definition.radius;
    for (const item of this.placedItems) {
      const distance = position.distanceTo(item.position);
      if (distance < radius + item.radius) return true;
    }
    return false;
  }

  private setPreviewColor(color: number, opacity: number): void {
    if (!this.dragPreview) return;
    if (this.dragPreview.material) {
      if (Array.isArray(this.dragPreview.material)) {
        this.dragPreview.material.forEach((mat) => {
          if (mat instanceof THREE.MeshBasicMaterial || mat instanceof THREE.MeshStandardMaterial) {
            mat.color.setHex(color);
            mat.opacity = opacity;
          }
        });
      } else {
        const material = this.dragPreview.material as
            | THREE.MeshBasicMaterial
            | THREE.MeshStandardMaterial;
        material.color.setHex(color);
        material.opacity = opacity;
      }
    }
  }

  public updatePlacedItems(newPlacedItems: GardenItem[]): void {
    this.placedItems = newPlacedItems;
  }

  public destroy(): void {
    this.renderer.domElement.removeEventListener("mousedown", this.onMouseDown.bind(this));
    this.renderer.domElement.removeEventListener("mousemove", this.onMouseMove.bind(this));
    this.renderer.domElement.removeEventListener("mouseup", this.onMouseUp.bind(this));
    if (this.dragPreview) {
      this.scene.remove(this.dragPreview);
      this.dragPreview = null;
    }
  }
}
