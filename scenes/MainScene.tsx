/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import * as Phaser from 'phaser';
import {
    WORLD_WIDTH,
    WORLD_HEIGHT,
    MINIMAP_WIDTH,
    MINIMAP_HEIGHT,
    PASSENGER_RESPAWN_DELAY,
    FULL_BUS_BONUS
} from '../constants';

import Player from '../sprites/Player';
import WorldBuilder from '../world/WorldBuilder';
import EnemyManager from '../managers/EnemyManager';

// --- Main Game Scene ---
export default class MainScene extends Phaser.Scene {
    private player!: Player;
    private enemyManager!: EnemyManager;
    private passengers!: Phaser.Physics.Arcade.Group;
    private busStops!: Phaser.Physics.Arcade.StaticGroup;
    private destPlanet!: Phaser.GameObjects.Image;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private starsFar!: Phaser.GameObjects.Group;
    private starsNear!: Phaser.GameObjects.Group;
    
    private score = 0;

    // FIX: Explicitly declare scene properties to satisfy TypeScript.
    add!: Phaser.GameObjects.GameObjectFactory;
    cameras!: Phaser.Cameras.Scene2D.CameraManager;
    events!: Phaser.Events.EventEmitter;
    game!: Phaser.Game;
    input!: Phaser.Input.InputPlugin;
    physics!: Phaser.Physics.Arcade.ArcadePhysics;
    scale!: Phaser.Scale.ScaleManager;
    scene!: Phaser.Scenes.ScenePlugin;
    // FIX: Corrected the type for `sound` to match the base `Phaser.Scene` type definition.
    // The property on the Scene is a specific sound manager (e.g., WebAudioSoundManager), not the generic base class.
    sound!: Phaser.Sound.NoAudioSoundManager | Phaser.Sound.HTML5AudioSoundManager | Phaser.Sound.WebAudioSoundManager;
    time!: Phaser.Time.Clock;
    tweens!: Phaser.Tweens.TweenManager;
    cache!: Phaser.Cache.CacheManager;

    constructor() {
        super({ key: 'main' });
    }

    create() {
        this.score = 0;

        // --- Play Main Music ---
        this.playMainMusic();

        // --- Set World and Camera Bounds ---
        this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
        this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

        // --- Background & Planets (Refactored) ---
        const { starsFar, starsNear } = WorldBuilder.createStarfield(this);
        this.starsFar = starsFar;
        this.starsNear = starsNear;

        const { destPlanet, busStops } = WorldBuilder.createPlanets(this);
        this.destPlanet = destPlanet;
        this.busStops = busStops;

        // --- Controls (must be created before Player) ---
        this.cursors = this.input.keyboard.createCursorKeys();

        // --- Player (Space Bus) ---
        const playerStartX = this.destPlanet.x - 200;
        const playerStartY = this.destPlanet.y;
        this.player = new Player(this, playerStartX, playerStartY, this.cursors);
        this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
        
        // --- Aliens (Refactored) ---
        this.enemyManager = new EnemyManager(this, this.player);
        this.enemyManager.create();

        // --- Passenger ---
        this.passengers = this.physics.add.group();
        this.busStops.getChildren().forEach(stop => {
            const busStop = stop as Phaser.Physics.Arcade.Sprite;
            this.spawnPassenger(busStop.x, busStop.y);
        });
        
        // --- Collisions ---
        this.physics.add.overlap(this.player, this.passengers, this.handlePickupPassenger, undefined, this);
        this.physics.add.collider(this.player, this.enemyManager.aliens, this.handleGameOver, undefined, this);
        this.physics.add.collider(this.enemyManager.aliens, this.enemyManager.aliens); // Make aliens bounce off each other

        // --- Minimap ---
        const minimapX = this.scale.width - MINIMAP_WIDTH - 10;
        const minimapY = 10;
        const minimap = this.cameras.add(minimapX, minimapY, MINIMAP_WIDTH, MINIMAP_HEIGHT)
            .setZoom(MINIMAP_WIDTH / WORLD_WIDTH)
            .setName('minimap');
        minimap.setBackgroundColor(0x000000);
        minimap.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
        minimap.ignore(this.starsFar);
        minimap.ignore(this.starsNear);

        // Launch the UI scene in parallel and emit initial state to the global bus
        this.scene.launch('ui');
        this.game.events.emit('updateScore', this.score);
        this.game.events.emit('updatePassengerCount', this.player.passengerCount, this.player.passengerCapacity);
    }

    private playMainMusic() {
        this.sound.stopAll();
        if (this.cache.audio.has('music-main')) {
            this.sound.play('music-main', { loop: true, volume: 0.7 });
        } else {
            console.warn("Audio key 'music-main' not found. Music will not play. Check BootScene for loading errors.");
        }
    }

    spawnPassenger(x: number, y: number) {
        // Create a new passenger sprite and add it to our group.
        const passenger = this.passengers.create(x, y, 'passenger');
        passenger.setScale(2).setOrigin(0.5).refreshBody();
    }

    handlePickupPassenger(player: Phaser.Types.Physics.Arcade.GameObjectWithBody, passenger: Phaser.Types.Physics.Arcade.GameObjectWithBody) {
        // We cast player to the Player class to access custom properties/methods.
        const playerSprite = player as Player;
        // Attempt to pick up a passenger. The player method returns true if successful.
        if (playerSprite.pickupPassenger()) {
            const spawnX = passenger.body.x;
            const spawnY = passenger.body.y;
            
            passenger.destroy();
            this.game.events.emit('updatePassengerCount', playerSprite.passengerCount, playerSprite.passengerCapacity);
            
            // Respawn a new passenger at the same spot after a delay
            this.time.delayedCall(PASSENGER_RESPAWN_DELAY, () => {
                this.spawnPassenger(spawnX, spawnY);
            }, [], this);
        }
    }

    update() {
        // --- Passenger Drop-off ---
        if (this.player.passengerCount > 0) {
            const planetCenterX = this.destPlanet.x;
            // The planet's center is offset vertically within the sprite texture
            // because of the flagpole. The sprite's origin is its center.
            const planetCenterY = this.destPlanet.y + 30;

            const distanceToDest = Phaser.Math.Distance.Between(
                this.player.x, this.player.y,
                planetCenterX, planetCenterY
            );

            // Using the planet's radius (60) for the collision check.
            if (distanceToDest < 60 + 16) { // 16 is ~half player width
                const numDroppedOff = this.player.dropOffAllPassengers();
                this.score += numDroppedOff * 10;

                // Check for a full bus bonus
                if (numDroppedOff === this.player.passengerCapacity) {
                    this.score += FULL_BUS_BONUS;
                    this.showBonusText();
                }

                this.game.events.emit('updateScore', this.score);
                this.game.events.emit('updatePassengerCount', this.player.passengerCount, this.player.passengerCapacity);
            }
        }
    }

    private showBonusText() {
        const bonusText = this.add.text(
            this.scale.width / 2,
            this.scale.height / 2,
            `FULL BUS BONUS! +${FULL_BUS_BONUS}`,
            {
                fontSize: '32px',
                color: '#ffff00',
                fontStyle: 'bold',
                align: 'center',
                stroke: '#000000',
                strokeThickness: 4
            }
        ).setOrigin(0.5).setScrollFactor(0); // Sticks to the camera

        // Add a tween to make it fade out and move up
        this.tweens.add({
            targets: bonusText,
            alpha: 0,
            y: bonusText.y - 50,
            duration: 1500,
            ease: 'Power1',
            onComplete: () => {
                bonusText.destroy();
            }
        });
    }

    handleGameOver() {
        // --- Play Game Over Music ---
        this.sound.stopAll();
        if (this.cache.audio.has('music-title')) {
            this.sound.play('music-title', { loop: true, volume: 0.7 });
        } else {
            console.warn("Audio key 'music-title' not found. Music will not play. Check BootScene for loading errors.");
        }

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