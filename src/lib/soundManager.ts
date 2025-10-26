class SoundManager {
  private sounds: Map<string, HTMLAudioElement> = new Map();
  private enabled: boolean = true;

  constructor() {
    if (typeof window !== 'undefined') {
      // Load from localStorage
      const saved = localStorage.getItem('soundEnabled');
      this.enabled = saved === null ? true : saved === 'true';
    }
  }

  private getSound(name: string): HTMLAudioElement | null {
    if (typeof window === 'undefined') return null;
    
    if (!this.sounds.has(name)) {
      const audio = new Audio(`/sounds/${name}.mp3`);
      audio.preload = 'auto';
      this.sounds.set(name, audio);
    }
    return this.sounds.get(name) || null;
  }

  play(soundName: string, volume: number = 0.5) {
    if (!this.enabled) return;
    
    const sound = this.getSound(soundName);
    if (sound) {
      sound.volume = volume;
      sound.currentTime = 0;
      sound.play().catch(err => console.log('Sound play failed:', err));
    }
  }

  toggle(): boolean {
    this.enabled = !this.enabled;
    if (typeof window !== 'undefined') {
      localStorage.setItem('soundEnabled', String(this.enabled));
    }
    return this.enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}

export const soundManager = new SoundManager();

// Sound effects you can add:
export const SOUNDS = {
  CORRECT_GUESS: 'correct',
  WRONG_GUESS: 'wrong',
  PLAYER_JOIN: 'join',
  PLAYER_LEAVE: 'leave',
  GAME_START: 'start',
  ROUND_START: 'round-start',
  ROUND_END: 'round-end',
  TIMER_TICK: 'tick',
  GAME_OVER: 'game-over',
};
