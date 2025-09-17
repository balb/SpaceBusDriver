/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import * as Phaser from 'phaser';

// --- Boot Scene (for generating assets) ---
export default class BootScene extends Phaser.Scene {
    // FIX: Explicitly declare scene properties to satisfy TypeScript.
    add!: Phaser.GameObjects.GameObjectFactory;
    load!: Phaser.Loader.LoaderPlugin;
    scene!: Phaser.Scenes.ScenePlugin;
    textures!: Phaser.Textures.TextureManager;

    constructor() {
        super({ key: 'boot' });
    }

    create() {
        this.createProceduralAssets();
        // Start the title scene.
        this.scene.start('title');
    }

    /**
     * Creates game assets programmatically to avoid loading external files.
     * This now includes a crucial check to prevent re-creating textures on game restart.
     */
    createProceduralAssets() {
        // Prevent re-creating textures if they already exist from a previous game instance
        if (this.textures.exists('bus')) {
            return;
        }
        
        const graphics = this.add.graphics();

        // --- Create Bus Texture ---
        graphics.fillStyle(0xffff00, 1); // Yellow body
        graphics.fillRect(0, 0, 32, 16);
        graphics.fillStyle(0xadd8e6, 1); // Light blue cockpit
        graphics.fillRect(24, 4, 8, 8);
        graphics.generateTexture('bus', 32, 16);
        graphics.clear();

        // --- Create Alien Textures ---
        // Red Alien (Fast)
        graphics.fillStyle(0xff4136, 1); // Red body
        graphics.fillCircle(12, 12, 12);
        graphics.fillStyle(0x000000, 1); // Black angry eye
        graphics.beginPath();
        graphics.moveTo(13, 7);
        graphics.lineTo(19, 10);
        graphics.lineTo(13, 13);
        graphics.closePath();
        graphics.fillPath();
        graphics.generateTexture('alien-red', 24, 24);
        graphics.clear();

        // Green Alien (Medium)
        graphics.fillStyle(0x2ecc40, 1); // Green body
        graphics.fillCircle(12, 12, 12);
        graphics.fillStyle(0x000000, 1); // Black eye
        graphics.fillCircle(16, 8, 4);
        graphics.generateTexture('alien-green', 24, 24);
        graphics.clear();

        // Purple Alien (Slow)
        graphics.fillStyle(0xb10dc9, 1); // Purple body
        graphics.fillCircle(12, 12, 12);
        graphics.fillStyle(0x000000, 1); // Black sleepy eye
        graphics.fillEllipse(17, 9, 8, 4);
        graphics.generateTexture('alien-purple', 24, 24);
        graphics.clear();

        // --- Create Terminus Planet Texture ---
        graphics.fillStyle(0x64ff64, 1); // Green planet
        graphics.fillCircle(90, 120, 60); // Planet at bottom of a 180x180 texture
        graphics.fillStyle(0xcccccc, 1); // Grey pole
        graphics.fillRect(88, 0, 4, 60);  // Pole centered on planet
        graphics.fillStyle(0xffffff, 1); // White flag
        graphics.fillRect(92, 5, 85, 25); // Wider flag rectangle
        graphics.generateTexture('planet-terminus', 180, 180);
        graphics.clear();

        // --- Create Passenger Texture ---
        graphics.fillStyle(0x0000ff, 1); // Blue body
        graphics.fillCircle(8, 5, 5); // Head
        graphics.fillRect(4, 10, 8, 10); // Body
        graphics.generateTexture('passenger', 16, 20);
        graphics.clear();
        
        graphics.destroy();
    }
}