export class AudioManager {
  private themeAudio: HTMLAudioElement | null = null;
  private clickAudio: HTMLAudioElement | null = null;
  private isThemePlaying: boolean = false;
  private volume: number = 0.3;

  constructor() {
    this.initializeAudio();
  }

  private initializeAudio(): void {
    try {
      
      this.themeAudio = new Audio("/assets/sounds/theme.mp3");
      this.themeAudio.loop = true;
      this.themeAudio.volume = this.volume;
      this.themeAudio.preload = "auto";

      
      this.clickAudio = new Audio("/assets/sounds/click_003.mp3");
      this.clickAudio.volume = this.volume * 0.5; 
      this.clickAudio.preload = "auto";

      console.log("🎵 Audio initialized successfully");
    } catch (error) {
      console.error("❌ Error initializing audio:", error);
    }
  }

  public playTheme(): void {
    if (this.themeAudio && !this.isThemePlaying) {
      this.themeAudio
        .play()
        .then(() => {
          this.isThemePlaying = true;
          console.log("🎵 Theme music started");
        })
        .catch((error) => {
          console.error("❌ Error playing theme music:", error);
        });
    }
  }

  public stopTheme(): void {
    if (this.themeAudio && this.isThemePlaying) {
      this.themeAudio.pause();
      this.themeAudio.currentTime = 0;
      this.isThemePlaying = false;
      console.log("🎵 Theme music stopped");
    }
  }

  public toggleTheme(): void {
    if (this.isThemePlaying) {
      this.stopTheme();
    } else {
      this.playTheme();
    }
  }

  public playClick(): void {
    if (this.clickAudio) {
      
      this.clickAudio.currentTime = 0;
      this.clickAudio.play().catch((error) => {
        console.error("❌ Error playing click sound:", error);
      });
    }
  }

  public setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));

    if (this.themeAudio) {
      this.themeAudio.volume = this.volume;
    }

    if (this.clickAudio) {
      this.clickAudio.volume = this.volume * 0.5;
    }

    console.log(`🔊 Volume set to: ${Math.round(this.volume * 100)}%`);
  }

  public getVolume(): number {
    return this.volume;
  }

  public isThemeActive(): boolean {
    return this.isThemePlaying;
  }

  public destroy(): void {
    if (this.themeAudio) {
      this.themeAudio.pause();
      this.themeAudio.src = "";
      this.themeAudio = null;
    }

    if (this.clickAudio) {
      this.clickAudio.pause();
      this.clickAudio.src = "";
      this.clickAudio = null;
    }

    this.isThemePlaying = false;
    console.log("🎵 Audio manager destroyed");
  }
}
