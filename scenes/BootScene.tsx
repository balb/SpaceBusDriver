/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import * as Phaser from 'phaser';
import { SCENES, AUDIO, TEXTURES, ANIMATIONS } from '../constants';

// --- Boot Scene (for generating assets) ---
export default class BootScene extends Phaser.Scene {
    // FIX: Explicitly declare scene properties to satisfy TypeScript.
    add!: Phaser.GameObjects.GameObjectFactory;
    load!: Phaser.Loader.LoaderPlugin;
    scene!: Phaser.Scenes.ScenePlugin;
    textures!: Phaser.Textures.TextureManager;
    anims!: Phaser.Animations.AnimationManager;

    constructor() {
        super({ key: SCENES.BOOT });
    }

    preload() {
        // Set the base URL for all subsequent asset loads. This is the "proper"
        // Phaser way to manage asset paths, making them easier to maintain.
        this.load.setBaseURL('https://cdn.jsdelivr.net/gh/balb/SpaceBusDriver@main/assets/');

        // FIX: Add a listener to catch file loading errors, especially for audio.
        // This provides clear feedback in the console if MP3 files are missing.
        this.load.on('loaderror', (file: Phaser.Loader.File) => {
            if (file.type === 'audio') {
                console.error(`Error loading audio: ${file.key}. URL: ${file.url}. Check that the file exists and the path is correct in your project structure.`);
            }
        });
        
        // Load music using paths relative to the new base URL.
        this.load.audio(AUDIO.TITLE_MUSIC, 'audio/galactic-pulse.mp3');
        this.load.audio(AUDIO.MAIN_MUSIC, 'audio/galactic-rush.mp3');
    }

    create() {
        this.createProceduralAssets();
        // Start the title scene.
        this.scene.start(SCENES.TITLE);
    }

    /**
     * Creates game assets programmatically to avoid loading external files.
     * This now includes a crucial check to prevent re-creating textures on game restart.
     */
    createProceduralAssets() {
        // Prevent re-creating textures if they already exist from a previous game instance
        if (this.textures.exists(TEXTURES.BUS_IDLE)) {
            return;
        }
        
        const graphics = this.add.graphics();

        // --- Create Bus Textures (Idle and Thrusting) ---
        const busWidth = 48;
        const busHeight = 24;
        const busBodyX = 12; // Start drawing the bus body a bit into the texture
        const busBodyWidth = 32;
        const busBodyHeight = 16;
        
        // Helper function to draw the common bus body with more detail and better colors.
        const drawBusBody = () => {
            const bodyY = (busHeight - busBodyHeight) / 2; // Center the bus body vertically (y=4)

            // --- Engine Nacelle (left side) ---
            // A lighter grey that is more visible on a black background.
            graphics.fillStyle(0xb0b0b0, 1); // Medium-light grey
            graphics.fillRect(busBodyX, bodyY, 4, busBodyHeight);
            // Add a highlight and shadow to give it a rounded/metallic look.
            graphics.fillStyle(0xdedede, 1); // Highlight
            graphics.fillRect(busBodyX, bodyY, 2, busBodyHeight);
            graphics.fillStyle(0x888888, 1); // Shadow
            graphics.fillRect(busBodyX + 3, bodyY, 1, busBodyHeight);

            // --- Main Bus Body ---
            const mainBodyX = busBodyX + 4;
            const mainBodyWidth = busBodyWidth - 4;
            // Base color - a richer gold/yellow.
            graphics.fillStyle(0xffd700, 1);
            graphics.fillRect(mainBodyX, bodyY, mainBodyWidth, busBodyHeight);
            
            // Add highlights and shadows for dimension.
            graphics.fillStyle(0xfff8a8, 1); // Lighter yellow highlight on top.
            graphics.fillRect(mainBodyX, bodyY, mainBodyWidth, 4);
            graphics.fillStyle(0xcca300, 1); // Darker yellow shadow on bottom.
            graphics.fillRect(mainBodyX, bodyY + busBodyHeight - 4, mainBodyWidth, 4);

            // --- Stripe ---
            // A dark grey stripe, less harsh than pure black.
            graphics.fillStyle(0x444444, 1); 
            graphics.fillRect(mainBodyX, bodyY + 6, mainBodyWidth - 8, 4);

            // --- Cockpit ---
            const cockpitX = mainBodyX + mainBodyWidth - 8;
            // A slightly richer blue.
            graphics.fillStyle(0x87ceeb, 1);
            graphics.fillRect(cockpitX, bodyY + 4, 8, 8);
            // Add a 'glare' highlight.
            graphics.fillStyle(0xc0e8fa, 1);
            graphics.fillRect(cockpitX + 1, bodyY + 5, 3, 2);
        };

        // Create 'bus-idle' texture
        drawBusBody();
        graphics.generateTexture(TEXTURES.BUS_IDLE, busWidth, busHeight);
        graphics.clear();
        
        // Create 'bus-thrust' texture
        drawBusBody();
        // Add flames
        graphics.fillStyle(0xff0000, 1); // Red part of flame
        graphics.fillTriangle(0, busHeight / 2, busBodyX, 6, busBodyX, busHeight - 6);
        graphics.fillStyle(0xffa500, 1); // Orange part of flame
        graphics.fillTriangle(4, busHeight / 2, busBodyX, 9, busBodyX, busHeight - 9);
        graphics.fillStyle(0xffffff, 1); // White part of flame
        graphics.fillTriangle(8, busHeight / 2, busBodyX, 11, busBodyX, busHeight - 11);
        graphics.generateTexture(TEXTURES.BUS_THRUST, busWidth, busHeight);
        graphics.clear();

        // --- Create Alien Textures (Animated 80s Arcade Style) ---
        const blockSize = 4; // Each "pixel" of the alien is a 4x4 square
        const textureSize = 24; // 6x6 grid of blocks

        // Helper to draw a pattern of blocks with multiple colors.
        const drawAlienFromPattern = (key: string, colorMap: {[char: string]: number}, pattern: string[]) => {
            const pixelsByColor: { [color: number]: { x: number, y: number }[] } = {};

            // Group pixels by color to minimize fillStyle changes
            for (let r = 0; r < pattern.length; r++) {
                for (let c = 0; c < pattern[r].length; c++) {
                    const char = pattern[r][c];
                    const color = colorMap[char];
                    if (color !== undefined) {
                        if (!pixelsByColor[color]) {
                            pixelsByColor[color] = [];
                        }
                        pixelsByColor[color].push({ x: c * blockSize, y: r * blockSize });
                    }
                }
            }

            // Draw all pixels for each color
            for (const colorHex in pixelsByColor) {
                graphics.fillStyle(Number(colorHex), 1);
                const pixels = pixelsByColor[colorHex];
                for (const pixel of pixels) {
                    graphics.fillRect(pixel.x, pixel.y, blockSize, blockSize);
                }
            }

            graphics.generateTexture(key, textureSize, textureSize);
            graphics.clear();
        };
        
        // Red Alien (Fast - "Squid" style)
        const redColors = { 'X': 0xff4136, 'S': 0xc2342b, 'E': 0x000000, 'W': 0xffffff };
        drawAlienFromPattern(TEXTURES.ALIEN_RED_1, redColors, [
            '..XX..', '.XSSX.', 'XWEWXX', 'XSSSSS', 'X.XX.X', '.X..X.',
        ]);
        drawAlienFromPattern(TEXTURES.ALIEN_RED_2, redColors, [
            '..XX..', '.XSSX.', 'XWEWXX', 'XSSSSS', '.X.XX.', 'X..X.X',
        ]);

        // Green Alien (Medium - "Crab" style)
        const greenColors = { 'X': 0x2ecc40, 'S': 0x24a334, 'E': 0x000000, 'W': 0xffffff };
        drawAlienFromPattern(TEXTURES.ALIEN_GREEN_1, greenColors, [
            'X....X', '.X..X.', '.XSSX.', 'XWEWXX', 'XSSSSS', 'X.XX.X',
        ]);
        drawAlienFromPattern(TEXTURES.ALIEN_GREEN_2, greenColors, [
            '.X..X.', 'X.XX.X', '.XSSX.', 'XWEWXX', 'XSSSSS', '.X..X.',
        ]);

        // Purple Alien (Slow - "Jellyfish" style)
        const purpleColors = { 'X': 0xb10dc9, 'S': 0xc949e3, 'E': 0x000000, 'W': 0xffffff };
        drawAlienFromPattern(TEXTURES.ALIEN_PURPLE_1, purpleColors, [
            '..SS..', '.XXXX.', 'XWEEWX', 'XXXXXX', '.X..X.', 'X....X',
        ]);
        drawAlienFromPattern(TEXTURES.ALIEN_PURPLE_2, purpleColors, [
            '......', '..SS..', '.XXXX.', 'XWEEWX', 'XXXXXX', '.X..X.',
        ]);
        
        // --- Create Alien Animations ---
        this.anims.create({
            key: ANIMATIONS.ALIEN_RED,
            frames: [{ key: TEXTURES.ALIEN_RED_1 }, { key: TEXTURES.ALIEN_RED_2 }],
            frameRate: 4,
            repeat: -1
        });
        this.anims.create({
            key: ANIMATIONS.ALIEN_GREEN,
            frames: [{ key: TEXTURES.ALIEN_GREEN_1 }, { key: TEXTURES.ALIEN_GREEN_2 }],
            frameRate: 4,
            repeat: -1
        });
        this.anims.create({
            key: ANIMATIONS.ALIEN_PURPLE,
            frames: [{ key: TEXTURES.ALIEN_PURPLE_1 }, { key: TEXTURES.ALIEN_PURPLE_2 }],
            frameRate: 5,
            repeat: -1
        });

        // --- Create Terminus Planet Texture ---
        graphics.fillStyle(0x64ff64, 1); // Green planet
        graphics.fillCircle(90, 120, 60); // Planet at bottom of a 180x180 texture
        graphics.fillStyle(0xcccccc, 1); // Grey pole
        graphics.fillRect(88, 0, 4, 60);  // Pole centered on planet
        graphics.fillStyle(0xffffff, 1); // White flag
        graphics.fillRect(92, 5, 85, 25); // Wider flag rectangle
        graphics.generateTexture(TEXTURES.PLANET_TERMINUS, 180, 180);
        graphics.clear();

        // --- Create Bus Stop Planet Texture ---
        graphics.fillStyle(0xffa500, 1); // Orange planet
        graphics.fillCircle(60, 60, 60);
        graphics.generateTexture(TEXTURES.PLANET_BUSSTOP, 120, 120);
        graphics.clear();

        // --- Create Passenger Texture ---
        graphics.fillStyle(0x0000ff, 1); // Blue body
        graphics.fillCircle(8, 5, 5); // Head
        graphics.fillRect(4, 10, 8, 10); // Body
        graphics.generateTexture(TEXTURES.PASSENGER, 16, 20);
        graphics.clear();
        
        graphics.destroy();
    }
}
