/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import * as Phaser from 'phaser';

// --- Game Constants ---
// TUNING: Renamed ACCELERATION for clarity. Forward thrust sets velocity directly.
const FORWARD_THRUST_SPEED = 300;
const REVERSE_ACCELERATION = 150;
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
        // Reduce hitbox size to be about 80% of the visual sprite for fairer collisions
        (this.player.body as Phaser.Physics.Arcade.Body).setSize(26, 12);
        this.player.setDamping(true);
        // TUNING: Increased drag for less "slippery" movement.
        this.player.setDrag(0.95);
        this.player.setMaxVelocity(400);

        // --- Alien ---
        // Ensure the alien doesn't spawn on top of the player.
        let alienX, alienY;
        const safeDistance = 250; // Minimum distance from the player
        const playerStartX = this.scale.width / 2;
        const playerStartY = this.scale.height / 2;
        
        do {
            alienX = Phaser.Math.Between(0, this.scale.width);
            alienY = Phaser.Math.Between(0, this.scale.height);
        } while (Phaser.Math.Distance.Between(playerStartX, playerStartY, alienX, alienY) < safeDistance);

        this.alien = this.physics.add.sprite(alienX, alienY, 'alien');
        this.alien.setScale(2.5).setOrigin(0.5);
        // The alien texture is a 12px radius circle. We set the hitbox to be a smaller circle.
        (this.alien.body as Phaser.Physics.Arcade.Body).setCircle(10);


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

    handlePickupPassenger(player: Phaser.Types.Physics.Arcade.GameObjectWithBody, passenger: Phaser.Types.Physics.Arcade.GameObjectWithBody) {
        if (!this.hasPassenger) {
            // Cast the passenger back to a sprite to access sprite-specific methods like destroy()
            const passengerSprite = passenger as Phaser.Physics.Arcade.Sprite;
            passengerSprite.destroy();
            
            this.hasPassenger = true;
            this.game.events.emit('updatePassengerStatus', this.hasPassenger);
        }
    }

    update() {
        // --- Player Rotation ---
        if (this.cursors.left.isDown) {
            this.player.setAngularVelocity(-PLAYER_ROTATION_SPEED);
        } else if (this.cursors.right.isDown) {
            this.player.setAngularVelocity(PLAYER_ROTATION_SPEED);
        } else {
            this.player.setAngularVelocity(0);
        }

        // --- Player Thrust (Hybrid: direct velocity for forward, acceleration for reverse) ---
        if (this.cursors.up.isDown) {
            // Set velocity directly for a more immediate "arcade" feel.
            this.physics.velocityFromRotation(this.player.rotation, FORWARD_THRUST_SPEED, (this.player.body as Phaser.Physics.Arcade.Body).velocity);
            // Ensure any braking acceleration is cancelled.
            this.player.setAcceleration(0, 0);
        } else if (this.cursors.down.isDown) {
            // Apply reverse acceleration to act as a brake.
            this.physics.velocityFromRotation(this.player.rotation, -REVERSE_ACCELERATION, (this.player.body as Phaser.Physics.Arcade.Body).acceleration);
        } else {
            // No thrust, so stop accelerating. Drag will slow the ship down.
            this.player.setAcceleration(0, 0);
        }

        // Wrap the player and alien around the screen edges
        this.physics.world.wrap(this.player, 32);
        this.physics.world.wrap(this.alien, 32);


        // --- Alien AI ---
        this.physics.moveToObject(this.alien, this.player, ALIEN_SPEED);


        // --- Passenger Drop-off ---
        if (this.hasPassenger) {
            const distanceToDest = Phaser.Math.Distance.Between(
                this.player.x, this.player.y,
                this.destPlanet.x, this.destPlanet.y
            );

            if (distanceToDest < this.destPlanet.radius + 16) { // 16 is ~half player width
                this.hasPassenger = false;
                this.score += 10;
                this.game.events.emit('updateScore', this.score);
                this.game.events.emit('updatePassengerStatus', this.hasPassenger);
                this.spawnPassenger();
            }
        }
    }

    handleGameOver() {
        // Stop all physics and animations
        this.physics.pause();
        this.player.setTint(0xff0000);

        // Show "Game Over" text
        this.add.text(
            this.scale.width / 2,
            this.scale.height / 2 - 50,
            'GAME OVER',
            { fontSize: '64px', color: '#ff0000' }
        ).setOrigin(0.5);
        
        this.add.text(
            this.scale.width / 2,
            this.scale.height / 2 + 10,
            `Final Score: ${this.score}`,
            { fontSize: '32px' }
        ).setOrigin(0.5);

        this.add.text(
            this.scale.width / 2,
            this.scale.height / 2 + 60,
            'Press Space to Restart',
            { fontSize: '24px' }
        ).setOrigin(0.5);

        // Listen for the spacebar to restart the game
        this.input.keyboard.once('keydown-SPACE', () => {
            // Stop the UI scene before restarting the main scene
            this.scene.stop('ui');
            this.scene.restart();
        });
    }
}

// --- Phaser Game Configuration ---
const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: document.body,
    physics: {
        default: 'arcade',
        arcade: {
            // FIX: The gravity object requires both x and y properties to match the Vector2Like type.
            gravity: { x: 0, y: 0 },
        }
    },
    scene: [BootScene, MainScene, UIScene]
};

// --- Start the Game ---
new Phaser.Game(config);