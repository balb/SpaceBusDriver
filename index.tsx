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

// World and Minimap constants
const WORLD_WIDTH = 800 * 4;
const WORLD_HEIGHT = 600 * 4;
const MINIMAP_WIDTH = 200;
const MINIMAP_HEIGHT = 150;


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
        graphics.clear();

        // --- Create Particle Texture ---
        graphics.fillStyle(0xffffff, 1);
        graphics.fillCircle(2, 2, 2);
        graphics.generateTexture('particle', 4, 4);
        
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

        // --- Minimap Border ---
        const minimapX = this.scale.width - MINIMAP_WIDTH - 10;
        const minimapY = 10;
        this.add.rectangle(minimapX, minimapY, MINIMAP_WIDTH, MINIMAP_HEIGHT)
            .setOrigin(0)
            .setStrokeStyle(2, 0xffffff, 0.8);

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
    private thrusterEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
    private stars!: Phaser.GameObjects.Group;
    
    private score = 0;
    private hasPassenger = false;

    // FIX: Explicitly declare scene properties to satisfy TypeScript.
    add!: Phaser.GameObjects.GameObjectFactory;
    cameras!: Phaser.Cameras.Scene2D.CameraManager;
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

        // --- Set World and Camera Bounds ---
        this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
        this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

        // --- Background Stars ---
        this.stars = this.add.group();
        for (let i = 0; i < 400; i++) {
            const x = Phaser.Math.Between(0, WORLD_WIDTH);
            const y = Phaser.Math.Between(0, WORLD_HEIGHT);
            const size = Phaser.Math.Between(1, 3);
            const alpha = Phaser.Math.FloatBetween(0.5, 1);
            this.stars.add(this.add.rectangle(x, y, size, size, 0xffffff, alpha));
        }

        // --- Planets ---
        this.homePlanet = this.add.circle(200, 300, 60, 0x6464ff).setZ(-1);
        this.destPlanet = this.add.circle(WORLD_WIDTH - 200, WORLD_HEIGHT - 300, 60, 0x64ff64).setZ(-1);

        // --- Player (Space Bus) ---
        this.player = this.physics.add.sprite(this.homePlanet.x + 150, this.homePlanet.y, 'bus');
        this.player.setOrigin(0.5).setScale(2);
        // Reduce hitbox size to be about 80% of the visual sprite for fairer collisions
        (this.player.body as Phaser.Physics.Arcade.Body).setSize(26, 12);
        this.player.setDamping(true);
        // TUNING: Increased drag for less "slippery" movement.
        this.player.setDrag(0.95);
        this.player.setMaxVelocity(400);
        this.player.setCollideWorldBounds(true);
        this.cameras.main.startFollow(this.player, true, 0.08, 0.08);

        // --- Particle Emitter for Thruster ---
        // FIX: The 'on' property is not a valid ParticleEmitterConfig property. Emission is controlled via the start() and stop() methods on the emitter instance.
        this.thrusterEmitter = this.add.particles(0, 0, 'particle', {
            // FIX: Initialize `angle` with a range to ensure it's an object that can be updated dynamically.
            angle: { min: 0, max: 0 },
            speed: { min: 50, max: 150 },
            scale: { start: 1.5, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: 300,
            quantity: 2,
            frequency: 16,
            blendMode: 'ADD',
            tint: [0xffff00, 0xffd700, 0xffa500] // Yellow to orange gradient
        });
        // FIX: Emitters start on by default. Stop it initially as intended.
        this.thrusterEmitter.stop();
        this.thrusterEmitter.setDepth(-1); // Draw particles behind other objects

        // --- Alien ---
        // Ensure the alien doesn't spawn on top of the player.
        let alienX, alienY;
        const safeDistance = 400; // Minimum distance from the player
        const playerStartX = this.player.x;
        const playerStartY = this.player.y;
        
        do {
            alienX = Phaser.Math.Between(0, WORLD_WIDTH);
            alienY = Phaser.Math.Between(0, WORLD_HEIGHT);
        } while (Phaser.Math.Distance.Between(playerStartX, playerStartY, alienX, alienY) < safeDistance);

        this.alien = this.physics.add.sprite(alienX, alienY, 'alien');
        this.alien.setScale(2.5).setOrigin(0.5);
        // The alien texture is a 12px radius circle. We set the hitbox to be a smaller circle.
        (this.alien.body as Phaser.Physics.Arcade.Body).setCircle(10);
        this.alien.setCollideWorldBounds(true);


        // --- Passenger ---
        this.passengers = this.physics.add.group();
        this.spawnPassenger();

        // --- Controls ---
        this.cursors = this.input.keyboard.createCursorKeys();
        
        // --- Collisions ---
        this.physics.add.overlap(this.player, this.passengers, this.handlePickupPassenger, undefined, this);
        this.physics.add.collider(this.player, this.alien, this.handleGameOver, undefined, this);

        // --- Minimap ---
        const minimapX = this.scale.width - MINIMAP_WIDTH - 10;
        const minimapY = 10;
        const minimap = this.cameras.add(minimapX, minimapY, MINIMAP_WIDTH, MINIMAP_HEIGHT)
            .setZoom(MINIMAP_WIDTH / WORLD_WIDTH)
            .setName('minimap');
        minimap.setBackgroundColor(0x000000);
        minimap.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
        minimap.ignore(this.stars);

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
            
            // --- Handle Thruster Particles ---
            this.updateThrusterEmitter();
            // FIX: Use the start() method instead of setting the 'on' property, which is an EventEmitter method.
            this.thrusterEmitter.start();
        } else if (this.cursors.down.isDown) {
            // Apply reverse acceleration to act as a brake.
            this.physics.velocityFromRotation(this.player.rotation, -REVERSE_ACCELERATION, (this.player.body as Phaser.Physics.Arcade.Body).acceleration);

            // --- Stop Thruster Particles ---
            // FIX: Use the stop() method instead of setting the 'on' property.
            this.thrusterEmitter.stop();
        } else {
            // No thrust, so stop accelerating. Drag will slow the ship down.
            this.player.setAcceleration(0, 0);

             // --- Stop Thruster Particles ---
             // FIX: Use the stop() method instead of setting the 'on' property.
             this.thrusterEmitter.stop();
        }

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

    /**
     * Updates the position and angle of the thruster particle emitter
     * to match the back of the player's ship.
     */
    updateThrusterEmitter() {
        // Calculate position at the back of the bus.
        // Sprite is 32px long, scaled by 2. Origin is center. Offset is -16 * 2 = -32px.
        const offset = new Phaser.Math.Vector2().setToPolar(this.player.rotation, -32);

        this.thrusterEmitter.setPosition(this.player.x + offset.x, this.player.y + offset.y);

        // Angle particles to shoot out the back
        const baseAngle = Phaser.Math.RadToDeg(this.player.rotation) + 180;
        // FIX: The `angle` property is an EmitterOp. To update its range, use
        // the emitter's `setAngle` method. Direct assignment to `min`/`max` is
        // not valid and was causing type errors.
        this.thrusterEmitter.setAngle({ min: baseAngle - 15, max: baseAngle + 15 });
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
            { fontSize: '64px', color: '#ff0000', fixedWidth: this.scale.width, align: 'center'}
        ).setOrigin(0.5).setScrollFactor(0);
        
        this.add.text(
            this.scale.width / 2,
            this.scale.height / 2 + 10,
            `Final Score: ${this.score}`,
            { fontSize: '32px', fixedWidth: this.scale.width, align: 'center' }
        ).setOrigin(0.5).setScrollFactor(0);

        this.add.text(
            this.scale.width / 2,
            this.scale.height / 2 + 60,
            'Press Space to Restart',
            { fontSize: '24px', fixedWidth: this.scale.width, align: 'center' }
        ).setOrigin(0.5).setScrollFactor(0);

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