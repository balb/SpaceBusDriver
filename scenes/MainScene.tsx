/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import * as Phaser from 'phaser';
import {
    FORWARD_THRUST_SPEED,
    REVERSE_ACCELERATION,
    PLAYER_ROTATION_SPEED,
    ALIEN_SPEED,
    WORLD_WIDTH,
    WORLD_HEIGHT,
    MINIMAP_WIDTH,
    MINIMAP_HEIGHT
} from '../constants';

// --- Main Game Scene ---
export default class MainScene extends Phaser.Scene {
    private player!: Phaser.Physics.Arcade.Sprite;
    private alien!: Phaser.Physics.Arcade.Sprite;
    private passengers!: Phaser.Physics.Arcade.Group;
    private homePlanet!: Phaser.GameObjects.Arc;
    private destPlanet!: Phaser.GameObjects.Arc;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    // API FIX: In modern Phaser, ParticleEmitter is a GameObject that controls itself.
    // The ParticleEmitterManager class has been removed.
    private thrusterManager!: Phaser.GameObjects.Particles.ParticleEmitter;
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
        // API FIX: `add.particles` returns a ParticleEmitter, which is both a GameObject and the emitter controller.
        this.thrusterManager = this.add.particles(0, 0, 'particle', {
            // angle will be updated dynamically
            speed: { min: 50, max: 150 },
            scale: { start: 1.5, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: 300,
            quantity: 2,
            frequency: 16,
            blendMode: 'ADD',
            tint: 0xffff00,
            emitting: false // Start turned off
        });
        
        // API FIX: Set depth on the ParticleEmitter GameObject.
        this.thrusterManager.setDepth(-1);


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
            // API FIX: Call start() on the emitter itself.
            this.thrusterManager.start();
        } else if (this.cursors.down.isDown) {
            // Apply reverse acceleration to act as a brake.
            this.physics.velocityFromRotation(this.player.rotation, -REVERSE_ACCELERATION, (this.player.body as Phaser.Physics.Arcade.Body).acceleration);

            // --- Stop Thruster Particles ---
            // API FIX: Call stop() on the emitter itself.
            this.thrusterManager.stop();
        } else {
            // No thrust, so stop accelerating. Drag will slow the ship down.
            this.player.setAcceleration(0, 0);

             // --- Stop Thruster Particles ---
             // API FIX: Call stop() on the emitter itself.
             this.thrusterManager.stop();
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

        // API FIX: Move the ParticleEmitter GameObject to the new position.
        this.thrusterManager.setPosition(this.player.x + offset.x, this.player.y + offset.y);

        // Angle particles to shoot out the back
        const baseAngle = Phaser.Math.RadToDeg(this.player.rotation) + 180;
        // API FIX: Update the angle on the emitter itself.
        this.thrusterManager.setAngle({ min: baseAngle - 15, max: baseAngle + 15 });
    }

    handleGameOver() {
        // Stop all physics and animations
        this.physics.pause();
        this.player.setTint(0xff0000);

        // Show "Game Over" text
        // @FIX: Per Phaser's API, text style properties like `color` and `fontSize` expect strings.
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

        // Listen for the spacebar to return to the title screen
        this.input.keyboard.once('keydown-SPACE', () => {
            // Stop the UI scene before restarting
            this.scene.stop('ui');
            this.scene.start('title');
        });
    }
}
