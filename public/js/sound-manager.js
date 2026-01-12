class SoundManager {
    constructor() {
        this.context = null;
        this.isMuted = localStorage.getItem('ciphernode_muted') === 'true';
        this.masterGain = null;

        // Initialize on first user interaction to handle autoplay policies
        this.initialized = false;

        // Bind methods
        this.init = this.init.bind(this);
        this.toggleMute = this.toggleMute.bind(this);
    }

    init() {
        if (this.initialized) return;

        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.context = new AudioContext();
            this.masterGain = this.context.createGain();
            this.masterGain.connect(this.context.destination);

            // Apply initial mute state
            this.masterGain.gain.value = this.isMuted ? 0 : 0.3; // Default volume 30%

            this.initialized = true;
            console.log('🔊 Audio System Initialized');
        } catch (e) {
            console.error('Audio initialization failed:', e);
        }
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        localStorage.setItem('ciphernode_muted', this.isMuted);

        if (this.masterGain) {
            this.masterGain.gain.value = this.isMuted ? 0 : 0.3;
        }

        return this.isMuted;
    }

    // Helper to create an oscillator node
    createOsc(type, freq, startTime, duration) {
        if (!this.context) return;

        const osc = this.context.createOscillator();
        const gain = this.context.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, startTime);

        osc.connect(gain);
        gain.connect(this.masterGain);

        return { osc, gain };
    }

    playHover() {
        if (!this.initialized || this.isMuted) return;

        const now = this.context.currentTime;
        const { osc, gain } = this.createOsc('sine', 400, now);

        // Short high blip
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

        osc.start(now);
        osc.stop(now + 0.05);
    }

    playClick() {
        if (this.init(), !this.initialized || this.isMuted) return;

        const now = this.context.currentTime;

        // Main click sound (square wave for digital feel)
        const { osc, gain } = this.createOsc('square', 800, now);

        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

        osc.frequency.exponentialRampToValueAtTime(400, now + 0.1);

        osc.start(now);
        osc.stop(now + 0.1);
    }

    playSuccess() {
        if (!this.initialized || this.isMuted) return;

        const now = this.context.currentTime;

        // Arpeggio
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6

        notes.forEach((freq, i) => {
            const time = now + (i * 0.05);
            const { osc, gain } = this.createOsc('triangle', freq, time);

            gain.gain.setValueAtTime(0.1, time);
            gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);

            osc.start(time);
            osc.stop(time + 0.3);
        });
    }

    playError() {
        if (!this.initialized || this.isMuted) return;

        const now = this.context.currentTime;

        // Dissonant buzz
        const { osc, gain } = this.createOsc('sawtooth', 150, now);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.3);

        osc.frequency.linearRampToValueAtTime(100, now + 0.3);

        osc.start(now);
        osc.stop(now + 0.3);
    }

    playGameStart() {
        if (!this.initialized || this.isMuted) return;

        const now = this.context.currentTime;

        // Power up sound
        const { osc, gain } = this.createOsc('sine', 220, now);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.2, now + 0.1);
        gain.gain.linearRampToValueAtTime(0, now + 1.0);

        osc.frequency.linearRampToValueAtTime(880, now + 1.0);

        osc.start(now);
        osc.stop(now + 1.0);
    }
}

// Export instance
window.soundManager = new SoundManager();
