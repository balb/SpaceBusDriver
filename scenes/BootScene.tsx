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

        // --- Create Alien Texture ---
        graphics.fillStyle(0x00ff00, 1); // Green body
        graphics.fillCircle(12, 12, 12);
        graphics.fillStyle(0x000000, 1); // Black eye
        graphics.fillCircle(16, 8, 4);
        graphics.generateTexture('alien', 24, 24);
        graphics.clear();

        // --- Create Passenger Texture ---
        graphics.fillStyle(0x0000ff, 1); // Blue body
        graphics.fillCircle(8, 5, 5); // Head
        graphics.fillRect(4, 10, 8, 10); // Body
        graphics.generateTexture('passenger', 16, 20);
        graphics.clear();

        // --- Create Particle Texture ---
        graphics.fillStyle(0xffffff, 1);
        graphics.fillCircle(2, 2, 2);
        graphics.generateTexture('particle', 4, 4);
        
        graphics.destroy();
    }
}
