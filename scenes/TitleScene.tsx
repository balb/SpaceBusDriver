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
    tweens!: Phaser.Tweens.TweenManager;
    scale!: Phaser.Scale.ScaleManager;

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
            alpha: 0,
            duration: 800,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1
        });
        
        // --- Input to Start Game ---
        this.input.keyboard.once('keydown-SPACE', () => {
            this.scene.start('main');
        });
    }

    /**
     * Draws text using vector lines for a retro arcade look.
     */
    drawVectorText(graphics: Phaser.GameObjects.Graphics, text: string, x: number, y: number, size: number, thickness: number, color: number) {
        graphics.lineStyle(thickness, color, 1);
        const charWidth = size * 0.7;
        const kerning = 1.2; // Increase spacing between letters
        const totalWidth = (text.length * charWidth * kerning) - (charWidth * (kerning - 1));
        let currentX = x - totalWidth / 2;

        const charMap: { [key: string]: Array<[number, number, number, number]> } = {
            'A': [[0.5, 0, 0, 1], [0.5, 0, 1, 1], [0.2, 0.5, 0.8, 0.5]],
            'B': [[0, 0, 0, 1], [0, 0, 0.8, 0], [0.8, 0, 0.8, 0.5], [0.8, 0.5, 0, 0.5], [0.8, 0.5, 0.8, 1], [0.8, 1, 0, 1]],
            'C': [[0.8, 0, 0, 0], [0, 0, 0, 1], [0, 1, 0.8, 1]],
            'D': [[0, 0, 0, 1], [0, 0, 0.6, 0], [0.6, 0, 1, 0.5], [1, 0.5, 0.6, 1], [0.6, 1, 0, 1]],
            'E': [[1, 0, 0, 0], [0, 0, 0, 1], [0, 1, 1, 1], [0, 0.5, 0.7, 0.5]],
            'I': [[0.2, 0, 0.8, 0], [0.5, 0, 0.5, 1], [0.2, 1, 0.8, 1]],
            'O': [[0, 0, 1, 0], [1, 0, 1, 1], [1, 1, 0, 1], [0, 1, 0, 0]],
            'P': [[0, 1, 0, 0], [0, 0, 0.8, 0], [0.8, 0, 0.8, 0.5], [0.8, 0.5, 0, 0.5]],
            'R': [[0, 1, 0, 0], [0, 0, 0.8, 0], [0.8, 0, 0.8, 0.5], [0.8, 0.5, 0, 0.5], [0.4, 0.5, 1, 1]],
            'S': [[1, 0, 0, 0], [0, 0, 0, 0.5], [0, 0.5, 1, 0.5], [1, 0.5, 1, 1], [1, 1, 0, 1]],
            'T': [[0, 0, 1, 0], [0.5, 0, 0.5, 1]],
            'U': [[0, 0, 0, 1], [0, 1, 1, 1], [1, 1, 1, 0]],
            'V': [[0, 0, 0.5, 1], [0.5, 1, 1, 0]],
            ' ': [],
        };

        for (const char of text.toUpperCase()) {
            const lines = charMap[char];
            if (lines) {
                graphics.beginPath();
                for (const line of lines) {
                    graphics.moveTo(currentX + line[0] * charWidth, y + line[1] * size);
                    graphics.lineTo(currentX + line[2] * charWidth, y + line[3] * size);
                }
                graphics.strokePath();
            }
            currentX += charWidth * kerning;
        }
    }
}
