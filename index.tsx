/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import * as Phaser from 'phaser';

// --- Game Constants ---
// TUNING: Reduced acceleration and rotation for more controlled movement.
const ACCELERATION = 300;
const PLAYER_ROTATION_SPEED = 150; // in degrees/sec
const ALIEN_SPEED = 180;

// --- Boot Scene (for generating assets) ---
class BootScene extends Phaser.Scene {
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
        // Start the main game scene. The main scene will be responsible for launching the UI.
        this.scene.start('main');
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
        
        graphics.destroy();
    }
}

// --- UI Scene (Overlay) ---
class UIScene extends Phaser.Scene {
    private scoreLabel!: Phaser.GameObjects.Text;
    private passengerStatus!: Phaser.GameObjects.Text;

    // FIX: Explicitly declare scene properties to satisfy TypeScript.
    add!: Phaser.GameObjects.GameObjectFactory;
    scene!: Phaser.Scenes.ScenePlugin;
    events!: Phaser.Events.EventEmitter;
    game!: Phaser.Game;

    constructor() {
        super({ key: 'ui' });
    }

    create() {
        this.scoreLabel = this.add.text(12, 12, 'Score: 0', { fontSize: '24px' });
        this.passengerStatus = this.add.text(12, 42, 'Find passenger', { fontSize: '20px' });

        // ARCHITECTURAL FIX: Listen on the global game event bus to decouple from MainScene.
        this.game.events.on('updateScore', this.updateScore, this);
        this.game.events.on('updatePassengerStatus', this.updatePassengerStatus, this);

        // IMPORTANT: Clean up listeners when this scene is shut down to prevent memory leaks.
        this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.game.events.off('updateScore', this.updateScore, this);
            this.game.events.off('updatePassengerStatus', this.updatePassengerStatus, this);
        });
    }

    updateScore(score: number) {
        if (this.scoreLabel) {
            this.scoreLabel.setText(`Score: ${score}`);
        }
    }

    updatePassengerStatus(hasPassenger: boolean) {
        if (this.passengerStatus) {
            this.passengerStatus.setText(hasPassenger ? 'Drop off passenger' : 'Find passenger');
        }
    }
}

// --- Main Game Scene ---
class MainScene extends Phaser.Scene {
    private player!: Phaser.Physics.Arcade.Sprite;
    private alien!: Phaser.Physics.Arcade.Sprite;
    private passengers!: Phaser.Physics.Arcade.Group;
    private homePlanet!: Phaser.GameObjects.Arc;
    private destPlanet!: Phaser.GameObjects.Arc;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    
    private score = 0;
    private hasPassenger = false;

    // FIX: Explicitly declare scene properties to satisfy TypeScript.
    add!: Phaser.GameObjects.GameObjectFactory;
    events!: Phaser.Events.EventEmitter;
    game!: Phaser.Game;
    input!: Phaser.Input.InputPlugin;
    physics!: Phaser.Physics.Arcade.ArcadePhysics;
    scale!: Phaser.Scale.ScaleManager;
    scene!: Phaser.Scenes.ScenePlugin;

    constructor() {
        super({ key: 'main' });
    }

    create() {
        this.score = 0;
        this.hasPassenger = false;

        // --- Background Stars ---
        for (let i = 0; i < 100; i++) {
            const x = Phaser.Math.Between(0, this.scale.width);
            const y = Phaser.Math.Between(0, this.scale.height);
            const size = Phaser.Math.Between(1, 2);
            const alpha = Phaser.Math.FloatBetween(0.5, 1);
            this.add.rectangle(x, y, size, size, 0xffffff, alpha);
        }

        // --- Planets ---
        this.homePlanet = this.add.circle(100, 150, 40, 0x6464ff).setZ(-1);
        this.destPlanet = this.add.circle(this.scale.width - 100, this.scale.height - 150, 40, 0x64ff64).setZ(-1);

        // --- Player (Space Bus) ---
        this.player = this.physics.add.sprite(this.scale.width / 2, this.scale.height / 2, 'bus');
        this.player.setOrigin(0.5).setScale(2);
        this.player.setDamping(true);
        // TUNING: Increased drag for less "slippery" movement.
        this.player.setDrag(0.95);
        this.player.setMaxVelocity(400);

        // --- Alien ---
        this.alien = this.physics.add.sprite(
            Phaser.Math.Between(0, this.scale.width),
            Phaser.Math.Between(0, this.scale.height),
            'alien'
        );
        this.alien.setScale(2.5).setOrigin(0.5);

        // --- Passenger ---
        this.passengers = this.physics.add.group();
        this.spawnPassenger();

        // --- Controls ---
        this.cursors = this.input.keyboard.createCursorKeys();
        
        // --- Collisions ---
        this.physics.add.overlap(this.player, this.passengers, this.handlePickupPassenger, undefined, this);
        this.physics.add.collider(this.player, this.alien, this.handleGameOver, undefined, this);

        // Launch the UI scene in parallel and emit initial state to the global bus
        this.scene.launch('ui');
        this.game.events.emit('updateScore', this.score);
        this.game.events.emit('updatePassengerStatus', this.hasPassenger);
    }

    spawnPassenger() {
        // Create a new passenger sprite and add it to our group.
        const passenger = this.passengers.create(this.homePlanet.x, this.homePlanet.y, 'passenger');
        passenger.setScale(2).setOrigin(0.5).refreshBody();
    }

    handlePickupPassenger(player