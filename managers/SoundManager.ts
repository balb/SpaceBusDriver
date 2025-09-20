/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { AUDIO } from '../constants';

// --- Note Definitions ---
const FREQUENCIES: { [key: string]: number } = {
    'G2': 98.00, 'A#2': 116.54, 'C3': 130.81, 'E3': 164.81, 'A3': 220.00, 
    'B3': 246.94, 'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23, 
    'G4': 392.00, 'A#4': 466.16, 'C5': 523.25
};

// --- Type Definitions for Sound Effects ---
type SoundEffectStep = {
    frequency: number;
    duration: number;
    volume: number;
    type: OscillatorType;
    delay: number;
} | {
    type: 'noise';
    duration: number;
    volume: number;
    delay: number;
};

interface SoundEffect {
    steps: SoundEffectStep[];
}

// --- Sound Effect Data ---
const SOUND_EFFECTS: { [key: string]: SoundEffect } = {
    [AUDIO.SFX_PICKUP]: { // Quick, rising arpeggio
        steps: [
            { type: 'triangle', frequency: FREQUENCIES['G4'], volume: 0.6, duration: 0.07, delay: 0 },
            { type: 'triangle', frequency: FREQUENCIES['A#4'], volume: 0.6, duration: 0.07, delay: 0.08 },
            { type: 'triangle', frequency: FREQUENCIES['C5'], volume: 0.6, duration: 0.07, delay: 0.16 },
        ]
    },
    [AUDIO.SFX_DROPOFF]: { // Two-tone, falling "success" chime
        steps: [
            { type: 'square', frequency: FREQUENCIES['C5'], volume: 0.5, duration: 0.1, delay: 0 },
            { type: 'square', frequency: FREQUENCIES['G4'], volume: 0.5, duration: 0.15, delay: 0.11 },
        ]
    }
};

// --- Type Definitions for Music Tracks ---
type Note = {
    pitch: number;
    volume: number;
    type: OscillatorType;
} | 'noise';

type TrackSequence = (string | null)[];

interface MusicTrack {
    tempo: number;
    sequences: {
        instrument: Note;
        pattern: TrackSequence;
    }[];
}

// --- Music Track Data ---
const MUSIC_TRACKS: { [key: string]: MusicTrack } = {
    [AUDIO.MUSIC_TITLE]: {
        tempo: 120,
        sequences: [
            { // Bassline
                instrument: { pitch: 1, volume: 0.6, type: 'sawtooth' },
                pattern: ['A#2', null, 'E3', null, 'C3', null, 'E3', null, 'A#2', null, 'E3', null, 'C3', null, 'E3', null]
            },
            { // Lead Melody
                instrument: { pitch: 1, volume: 0.4, type: 'square' },
                pattern: [null, null, null, null, 'E4', null, 'D4', 'C4', null, null, null, null, 'A3', 'B3', 'C4', null]
            }
        ]
    },
    [AUDIO.MUSIC_MAIN]: {
        tempo: 150,
        sequences: [
            { // Bassline
                instrument: { pitch: 1, volume: 0.7, type: 'sawtooth' },
                pattern: ['C3', 'C3', 'G2', 'G2', 'A#2', 'A#2', 'G2', 'G2', 'C3', 'C3', 'G2', 'G2', 'A#2', 'A#2', 'G2', 'G2']
            },
            { // Lead Melody
                instrument: { pitch: 1, volume: 0.4, type: 'square' },
                pattern: ['G4', null, 'A#4', null, 'G4', 'F4', 'G4', null, 'G4', null, 'A#4', 'C5', 'G4', 'F4', 'G4', null]
            },
            { // Percussion
                instrument: 'noise',
                pattern: [null, null, 'noise', null, null, null, 'noise', null, null, null, 'noise', null, null, 'noise', 'noise', null]
            }
        ]
    }
};

/**
 * A singleton class to manage procedural audio synthesis using the Web Audio API.
 */
export default class SoundManager {
    private static instance: SoundManager;
    private audioContext?: AudioContext;
    private masterGain?: GainNode;
    private musicGain?: GainNode; // For ducking music
    private noiseBuffer?: AudioBuffer;
    private isInitialized = false;
    private isPlaying = false;
    
    private musicScheduler: any = null;
    private currentTrackKey: string | null = null;

    private constructor() {}

    public static getInstance(): SoundManager {
        if (!SoundManager.instance) {
            SoundManager.instance = new SoundManager();
        }
        return SoundManager.instance;
    }

    /**
     * Initializes the AudioContext. Must be called after a user gesture.
     * @returns `true` if initialization is successful or was already done.
     */
    public initialize(): boolean {
        if (this.isInitialized) return true;
        
        try {
            const Ctx = window.AudioContext || (window as any).webkitAudioContext;
            if (!Ctx) {
                console.warn('Web Audio API is not supported in this browser.');
                return false;
            }
            this.audioContext = new Ctx();

            // Master Gain
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.value = 0.25; // Master volume
            this.masterGain.connect(this.audioContext.destination);
            
            // Music Gain (for ducking)
            this.musicGain = this.audioContext.createGain();
            this.musicGain.gain.value = 1.0; // Music volume relative to master
            this.musicGain.connect(this.masterGain);

            this.noiseBuffer = this.createNoiseBuffer();
            this.isInitialized = true;
            console.log('SoundManager initialized.');
        } catch (e) {
            console.error('Could not initialize Web Audio API', e);
            this.isInitialized = false;
        }
        return this.isInitialized;
    }

    public playMusic(key: string) {
        if (!this.isInitialized || !MUSIC_TRACKS[key]) {
            return;
        }
        // If the requested track is already playing, do nothing.
        if (this.isPlaying && this.currentTrackKey === key) {
            return;
        }

        this.stopMusic();
        this.currentTrackKey = key;
        this.isPlaying = true;
        
        const track = MUSIC_TRACKS[key];
        const noteDuration = 60 / track.tempo / 4; // 16th notes
        let currentStep = 0;

        this.musicScheduler = setInterval(() => {
            const patternLength = track.sequences[0].pattern.length;
            
            track.sequences.forEach(seq => {
                const noteName = seq.pattern[currentStep];
                if (noteName) {
                    if (seq.instrument === 'noise') {
                        this.playNoise(0.05, 0.4, undefined, true);
                    } else if (noteName in FREQUENCIES) {
                        const freq = FREQUENCIES[noteName] * seq.instrument.pitch;
                        this.playTone(freq, noteDuration * 0.9, seq.instrument.volume, seq.instrument.type, undefined, true);
                    }
                }
            });

            currentStep = (currentStep + 1) % patternLength;
        }, noteDuration * 1000);
    }

    public stopMusic() {
        if (this.musicScheduler) {
            clearInterval(this.musicScheduler);
        }
        // Reset music gain in case it was ducked when music stopped
        if (this.audioContext && this.musicGain) {
            this.musicGain.gain.cancelScheduledValues(this.audioContext.currentTime);
            this.musicGain.gain.value = 1.0;
        }
        this.isPlaying = false;
        this.currentTrackKey = null;
    }

    public playSoundEffect(key: string) {
        if (!this.isInitialized || !this.audioContext || !SOUND_EFFECTS[key]) {
            return;
        }
    
        const sfx = SOUND_EFFECTS[key];
        const now = this.audioContext.currentTime;
    
        // --- Music Ducking ---
        if (this.isPlaying && this.musicGain) {
            // Find the total duration of the SFX to know when to restore volume
            let maxDuration = 0;
            sfx.steps.forEach(step => {
                const endTime = step.delay + step.duration;
                if (endTime > maxDuration) {
                    maxDuration = endTime;
                }
            });

            const duckVolume = 0.3; // Lower music to 30%
            const duckTime = 0.05; // Quick fade out
            const restoreTime = 0.4; // Slower fade back in

            // Schedule the ducking
            this.musicGain.gain.cancelScheduledValues(now);
            this.musicGain.gain.linearRampToValueAtTime(duckVolume, now + duckTime);
            this.musicGain.gain.linearRampToValueAtTime(1.0, now + maxDuration + restoreTime);
        }

        sfx.steps.forEach(step => {
            // SFX sounds are not music, so pass `false` (or rely on default)
            if ('frequency' in step) {
                this.playTone(step.frequency, step.duration, step.volume, step.type, now + step.delay, false);
            } else {
                this.playNoise(step.duration, step.volume, now + step.delay, false);
            }
        });
    }

    private playTone(frequency: number, duration: number, volume: number, type: OscillatorType, startTime?: number, isMusic = false) {
        if (!this.audioContext || !this.masterGain) return;
        
        const destination = isMusic ? this.musicGain : this.masterGain;
        if (!destination) return;

        const playAt = startTime || this.audioContext.currentTime;

        const osc = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        osc.connect(gainNode);
        gainNode.connect(destination);

        osc.type = type;
        osc.frequency.value = frequency;
        
        // Simple ADSR envelope
        gainNode.gain.setValueAtTime(0, playAt);
        gainNode.gain.linearRampToValueAtTime(volume, playAt + duration * 0.1);
        gainNode.gain.exponentialRampToValueAtTime(0.001, playAt + duration);

        osc.start(playAt);
        osc.stop(playAt + duration);
    }

    private playNoise(duration: number, volume: number, startTime?: number, isMusic = false) {
        if (!this.audioContext || !this.masterGain || !this.noiseBuffer) return;

        const destination = isMusic ? this.musicGain : this.masterGain;
        if (!destination) return;

        const playAt = startTime || this.audioContext.currentTime;

        const noise = this.audioContext.createBufferSource();
        noise.buffer = this.noiseBuffer;

        const bandpass = this.audioContext.createBiquadFilter();
        bandpass.type = 'bandpass';
        bandpass.frequency.value = 1500;
        bandpass.Q.value = 1;

        const gainNode = this.audioContext.createGain();
        
        // Schedulable ADSR envelope for noise
        gainNode.gain.setValueAtTime(0, playAt);
        gainNode.gain.linearRampToValueAtTime(volume, playAt + 0.01); // Quick attack
        gainNode.gain.exponentialRampToValueAtTime(0.001, playAt + duration);

        noise.connect(bandpass).connect(gainNode).connect(destination);
        noise.start(playAt);
        noise.stop(playAt + duration);
    }

    private createNoiseBuffer(): AudioBuffer | undefined {
        if (!this.audioContext) return;
        const bufferSize = this.audioContext.sampleRate;
        const buffer = this.audioContext.createBuffer(1, bufferSize, bufferSize);
        const output = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }
        return buffer;
    }
}