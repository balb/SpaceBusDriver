/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import * as Phaser from 'phaser';

// --- Title Scene (Atari-style) ---
export default class TitleScene extends Phaser.Scene {
    // Explicitly declare scene properties to satisfy TypeScript.
    add!: Phaser.GameObjects.GameObjectFactory;
    input!: Phaser.Input.InputPlugin;
    scene!: Phaser.Scenes.ScenePlugin;
    // FIX: Corrected the type for `sound` to match the base `Phaser.Scene` type definition.
    // The property on the Scene is a specific sound manager (e.g., WebAudioSoundManager), not the generic base class.
    sound!: Phaser.Sound.NoAudioSoundManager | Phaser.Sound.HTML5AudioSoundManager | Phaser.Sound.WebAudioSoundManager;
    tweens!: Phaser.Tweens.TweenManager;
    scale!: Phaser.Scale.ScaleManager;
    cache!: Phaser.Cache.CacheManager;

    constructor() {
        super({ key: 'title' });
    }

    create() {
        const centerX = this.scale.width / 2;
        const centerY = this.scale.height / 2;

        this.cameras.main.setBackgroundColor('#000');

        const graphics = this.add.graphics();
        
        // --- Draw Title Text ---
        this.drawVectorText(graphics, 'SPACE', centerX, 80, 64, 6, 0x6464ff); // Blue
        this.drawVectorText(graphics, 'BUS', centerX, 160, 64, 6, 0xffff00); // Yellow
        this.drawVectorText(graphics, 'DRIVER', centerX, 240, 64, 6, 0x64ff64); // Green

        // --- Draw Vector Art ---
        const graphicCenterY = centerY + 80;
        // Bus
        graphics.lineStyle(4, 0xffff00, 1); // Yellow
        graphics.beginPath();
        // Body
        graphics.moveTo(centerX - 100, graphicCenterY);
        graphics.lineTo(centerX - 40, graphicCenterY - 20);
        graphics.lineTo(centerX + 80, graphicCenterY - 20);
        graphics.lineTo(centerX + 100, graphicCenterY);
        graphics.lineTo(centerX + 80, graphicCenterY + 20);
        graphics.lineTo(centerX - 40, graphicCenterY + 20);
        graphics.closePath();
        graphics.strokePath();
        // Cockpit
        graphics.lineStyle(3, 0xadd8e6, 1); // Light Blue
        graphics.strokeRect(centerX + 50, graphicCenterY - 12, 25, 24);
        
        // Alien
        graphics.lineStyle(4, 0x00ff00, 1); // Green
        graphics.strokeCircle(centerX - 200, graphicCenterY - 80, 30);
        graphics.lineStyle(3, 0x00ff00, 1);
        graphics.strokeCircle(centerX - 190, graphicCenterY - 90, 8); // eye

        // --- Draw Instructions ---
        const instructionGraphics = this.add.graphics();
        this.drawVectorText(instructionGraphics, 'PRESS SPACE TO START', centerX, this.scale.height - 100, 24, 3, 0xffffff); // White

        // Blinking effect for instructions
        this.tweens.add({
            targets: instructionGraphics,
            alpha: { from: 1, to: 0.3 },
            ease: 'Sine.InOut',
            duration: 1000,
            yoyo: true,
            repeat: -1
        });

        // --- Audio Handling ---
        // FIX: Reworked the audio unlock flow to be more robust using Phaser's `sound.locked` property.
        if (this.sound.locked) {
            const overlay = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x000000, 0.7).setOrigin(0);
            const text = this.add.text(centerX, centerY, 'Click to enable audio', { fontSize: '32px', color: '#ffffff', align: 'center' }).setOrigin(0.5);

            // Once the user clicks, unlock the sound and play the music.
            this.input.once('pointerdown', () => {
                overlay.destroy();
                text.destroy();
                // The sound manager will be unlocked automatically by the first play call.
                this.playTitleMusic();
            }, this);
        } else {
            // If sound is already unlocked, just play the music.
            this.playTitleMusic();
        }
        
        // Listen for the spacebar to start the game
        this.input.keyboard.once('keydown-SPACE', () => {
            this.scene.start('main');
        });
    }

    private playTitleMusic() {
        // Stop any other music that might be playing (e.g., from a game over)
        this.sound.stopAll();

        if (this.cache.audio.has('music-title')) {
            // Check isPlaying to prevent restarting the track if it's already running
            if (!this.sound.get('music-title')?.isPlaying) {
                this.sound.play('music-title', { loop: true, volume: 0.7 });
            }
        } else {
            // This is a fallback warning. The error handler in BootScene should provide a more specific message.
            console.warn("Audio key 'music-title' not found. Music will not play. Check BootScene for loading errors.");
        }
    }

    /**
     * Helper function to draw text using lines, Atari vector-style.
     */
    drawVectorText(graphics: Phaser.GameObjects.Graphics, text: string, startX: number, startY: number, size: number, thickness: number, color: number) {
        graphics.lineStyle(thickness, color, 1);
        // FIX: Increased character spacing to prevent overlap and improved width calculation for accurate centering.
        const charSpacing = size * 1.1; // Character width (size) + 10% for padding
        const totalWidth = (text.length - 1) * charSpacing + size;
        let currentX = startX - totalWidth / 2;

        for (const char of text) {
            const letter = this.getVectorChar(char, size);
            for (const shape of letter) {
                graphics.beginPath();
                graphics.moveTo(currentX + shape[0][0], startY + shape[0][1]);
                for (let i = 1; i < shape.length; i++) {
                    graphics.lineTo(currentX + shape[i][0], startY + shape[i][1]);
                }
                graphics.strokePath();
            }
            currentX += charSpacing;
        }
    }

    /**
     * Returns line coordinates for a character.
     * A simple vector font definition.
     */
    getVectorChar(char: string, s: number): number[][][] {
        // s: size
        const c = char.toUpperCase();
        const font: { [key: string]: number[][][] } = {
            'A': [[ [0,s],[s/2,0],[s,s] ], [ [s/4,s/2],[s*3/4,s/2] ]],
            'B': [[ [0,0],[s*3/4,0],[s,s/4],[s,s*3/4],[s*3/4,s],[0,s],[0,0] ], [ [0,s/2],[s*3/4,s/2] ]],
            'C': [[ [s,0],[0,0],[0,s],[s,s] ]],
            'D': [[ [0,0],[s*3/4,0],[s,s/4],[s,s*3/4],[s*3/4,s],[0,s],[0,0] ]],
            'E': [[ [s,0],[0,0],[0,s],[s,s] ], [ [0,s/2],[s,s/2] ]],
            'F': [[ [s,0],[0,0],[0,s] ], [ [0,s/2],[s,s/2] ]],
            'G': [[ [s,0],[0,0],[0,s],[s,s],[s,s/2],[s/2,s/2] ]],
            'H': [[ [0,0],[0,s] ], [ [s,0],[s,s] ], [ [0,s/2],[s,s/2] ]],
            'I': [[ [0,0],[s,0] ], [ [s/2,0],[s/2,s] ], [ [0,s],[s,s] ]],
            'L': [[ [0,0],[0,s],[s,s] ]],
            'M': [[ [0,s],[0,0],[s/2,s/2],[s,0],[s,s] ]],
            'N': [[ [0,s],[0,0],[s,s],[s,0] ]],
            'O': [[ [0,0],[s,0],[s,s],[0,s],[0,0] ]],
            'P': [[ [0,s],[0,0],[s,0],[s,s/2],[0,s/2] ]],
            'R': [[ [0,s],[0,0],[s,0],[s,s/2],[0,s/2] ], [ [s/2,s/2],[s,s] ]],
            'S': [[ [s,0],[0,0],[0,s/2],[s,s/2],[s,s],[0,s] ]],
            'T': [[ [0,0],[s,0] ], [ [s/2,0],[s/2,s] ]],
            'U': [[ [0,0],[0,s],[s,s],[s,0] ]],
            'V': [[ [0,0],[s/2,s],[s,0] ]],
            ' ': [],
            '\'': [[ [s/2, 0], [s/2-s/8, s/4]]],
            '!': [[ [s/2, 0], [s/2, s*2/3]], [ [s/2, s], [s/2, s*5/6]]],
            '.': [[ [s/2, s], [s/2, s]]],
            '-': [[ [s/4,s/2],[s*3/4,s/2] ]],
            '1': [[ [s/2,0],[s/2,s],[s/4,s] ]],
            '2': [[ [0,0],[s,0],[s,s/2],[0,s/2],[0,s],[s,s] ]],
            '3': [[ [0,0],[s,0],[s,s],[0,s] ], [ [0,s/2],[s,s/2] ]],
            '4': [[ [0,0],[0,s/2],[s,s/2] ], [ [s,0],[s,s] ]],
            '5': [[ [s,0],[0,0],[0,s/2],[s,s/2],[s,s],[0,s] ]],
            '6': [[ [s,0],[0,0],[0,s],[s,s],[s,s/2],[0,s/2] ]],
            '7': [[ [0,0],[s,0],[s,s] ]],
            '8': [[ [0,0],[s,0],[s,s],[0,s],[0,0] ], [ [0,s/2],[s,s/2] ]],
            '9': [[ [0,s],[s,s],[s,0],[0,0],[0,s/2],[s,s/2] ]],
            '0': [[ [0,0],[s,0],[s,s],[0,s],[0,0] ], [ [0,s/2],[s,s/2] ]],
        };
        return font[c] || [];
    }
}