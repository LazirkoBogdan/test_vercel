import * as THREE from "three";

export interface DayNightConfig {
  day: {
    skyColor: number;
    ambientIntensity: number;
    directionalIntensity: number;
    hemisphereIntensity: number;
    fogColor: number;
    fogDensity: number;
  };
  night: {
    skyColor: number;
    ambientIntensity: number;
    directionalIntensity: number;
    hemisphereIntensity: number;
    fogColor: number;
    fogDensity: number;
  };
}

export class DayNightSystem {
  private scene: THREE.Scene;
  private ambientLight: THREE.AmbientLight;
  private directionalLight: THREE.DirectionalLight;
  private hemisphereLight: THREE.HemisphereLight;
  private fog: THREE.Fog | null = null;
  private isDay: boolean = true;
  private config: DayNightConfig;
  private skybox: THREE.Mesh | null = null;
  private skyboxGeometry: THREE.SphereGeometry;
  private skyboxMaterial!: THREE.ShaderMaterial;

  constructor(
    scene: THREE.Scene,
    ambientLight: THREE.AmbientLight,
    directionalLight: THREE.DirectionalLight,
    hemisphereLight: THREE.HemisphereLight
  ) {
    this.scene = scene;
    this.ambientLight = ambientLight;
    this.directionalLight = directionalLight;
    this.hemisphereLight = hemisphereLight;

    // Enhanced natural lighting configuration
    this.config = {
      day: {
        skyColor: 0xb3d9ff, // Warmer, more natural sky blue
        ambientIntensity: 0.4, // Reduced for more contrast
        directionalIntensity: 1.2, // Increased for stronger sun
        hemisphereIntensity: 0.5, // Increased for better fill light
        fogColor: 0xb3d9ff,
        fogDensity: 0.0005, // Reduced fog for clearer day
      },
      night: {
        skyColor: 0x0b1426, 
        ambientIntensity: 0.2,
        directionalIntensity: 0.3,
        hemisphereIntensity: 0.1,
        fogColor: 0x0b1426,
        fogDensity: 0.002,
      },
    };

    
    this.skyboxGeometry = new THREE.SphereGeometry(500, 32, 32);
    this.createSkyboxMaterial();
    this.createSkybox();

    
    this.setDayMode();
  }

  private createSkyboxMaterial(): void {
    
    this.skyboxMaterial = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(0x0077ff) },
        bottomColor: { value: new THREE.Color(0xffffff) },
        offset: { value: 33 },
        exponent: { value: 0.6 },
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform float offset;
        uniform float exponent;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition + offset).y;
          gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
        }
      `,
      side: THREE.BackSide,
    });
  }

  private createSkybox(): void {
    this.skybox = new THREE.Mesh(this.skyboxGeometry, this.skyboxMaterial);
    this.scene.add(this.skybox);
  }

  private updateSkybox(): void {
    if (!this.skybox) return;

    if (this.isDay) {
      // Warmer, more natural sky colors for day
      this.skyboxMaterial.uniforms.topColor.value.setHex(0xb3d9ff);
      this.skyboxMaterial.uniforms.bottomColor.value.setHex(0xf0f8ff);
      this.skyboxMaterial.uniforms.exponent.value = 0.8;
    } else {
      // Night skybox colors
      this.skyboxMaterial.uniforms.topColor.value.setHex(0x0b1426);
      this.skyboxMaterial.uniforms.bottomColor.value.setHex(0x000000);
      this.skyboxMaterial.uniforms.exponent.value = 1.2;
    }
  }

  public toggleDayNight(): void {
    this.isDay = !this.isDay;
    if (this.isDay) {
      this.setDayMode();
    } else {
      this.setNightMode();
    }

    console.log(`🌅 Switched to ${this.isDay ? "day" : "night"} mode`);
  }

  public setDayMode(): void {
    this.isDay = true;
    const config = this.config.day;

    // Set scene background to warmer sky color
    this.scene.background = new THREE.Color(config.skyColor);

    // Update light intensities for natural day lighting
    this.ambientLight.intensity = config.ambientIntensity;
    this.directionalLight.intensity = config.directionalIntensity;
    this.hemisphereLight.intensity = config.hemisphereIntensity;

    // Update fog if present
    if (this.fog) {
      this.fog.color.setHex(config.fogColor);
    }

    // Update skybox for day mode
    this.updateSkybox();

    // Position sun for natural morning/afternoon lighting
    this.directionalLight.position.set(40, 80, 40);
    // Use warmer, more natural sunlight color (slightly warm white)
    this.directionalLight.color.setHex(0xfff4e6);
    
    // Update hemisphere light colors for natural day lighting
    this.hemisphereLight.color.setHex(0xb3d9ff); // Sky color
    this.hemisphereLight.groundColor.setHex(0xf4f1de); // Warm ground reflection
  }

  public setNightMode(): void {
    this.isDay = false;
    const config = this.config.night;

    
    this.scene.background = new THREE.Color(config.skyColor);

    
    this.ambientLight.intensity = config.ambientIntensity;
    this.directionalLight.intensity = config.directionalIntensity;
    this.hemisphereLight.intensity = config.hemisphereIntensity;

    
    if (this.fog) {
      this.fog.color.setHex(config.fogColor);
      
    }

    
    this.updateSkybox();

    
    this.directionalLight.position.set(-30, 80, -30);
    this.directionalLight.color.setHex(0xe6e6fa); 
  }

  public getCurrentMode(): string {
    return this.isDay ? "day" : "night";
  }

  public updateLightpoleBulb(_bulb: THREE.Mesh, material: THREE.MeshStandardMaterial, light?: THREE.PointLight): void {
    if (this.isDay) {
      // Day mode: gray bulb, no glow, light off
      material.color.setHex(0xcccccc);
      material.emissive.setHex(0x000000);
      material.emissiveIntensity = 0.0;
      
      // Turn off the light
      if (light) {
        light.intensity = 0;
      }
    } else {
      // Night mode: bright yellow bulb with glow, light on
      material.color.setHex(0xffffaa);
      material.emissive.setHex(0xffffaa);
      material.emissiveIntensity = 0.8;
      
      // Turn on the light with warm glow
      if (light) {
        light.intensity = 1.5;
        light.color.setHex(0xffffaa);
      }
    }
  }

  public addFogToScene(): void {
    const currentConfig = this.isDay ? this.config.day : this.config.night;
    this.fog = new THREE.Fog(currentConfig.fogColor, 100, 1000);
    this.scene.fog = this.fog;
  }

  public removeFogFromScene(): void {
    this.scene.fog = null;
    this.fog = null;
  }

  public updateLighting(intensity: number): void {
    
    this.ambientLight.intensity = this.config.day.ambientIntensity * intensity;
    this.directionalLight.intensity =
      this.config.day.directionalIntensity * intensity;
    this.hemisphereLight.intensity =
      this.config.day.hemisphereIntensity * intensity;
  }

  public destroy(): void {
    if (this.skybox) {
      this.scene.remove(this.skybox);
      this.skybox.geometry.dispose();

      
      if (this.skybox.material) {
        if (Array.isArray(this.skybox.material)) {
          this.skybox.material.forEach((mat) => mat.dispose());
        } else {
          this.skybox.material.dispose();
        }
      }

      this.skybox = null;
    }

    if (this.fog) {
      this.scene.fog = null;
      this.fog = null;
    }
  }
}
