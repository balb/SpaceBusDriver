/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import * as Phaser from 'phaser';
import {
    ALIEN_SPEED_RED,
    ALIEN_SPEED_GREEN,
    ALIEN_SPEED_PURPLE,
    WORLD_WIDTH,
    WORLD_HEIGHT,
    MINIMAP_WIDTH,
    MINIMAP_HEIGHT
} from '../constants';

import Player from '../sprites/Player';
import Alien from '../sprites/Alien';

// --- Main Game Scene ---
export default class MainScene extends Phaser.Scene {
    private player!: Player;
    private aliens!: Phaser.Physics.Arcade.Group;
    private passengers!: Phaser.Physics.Arcade.Group;
    private homePlanet!: Phaser.GameObjects.Arc;
    private destPlanet!: Phaser.GameObjects.Arc;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private stars!: Phaser.GameObjects.Group;
    
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

    constructor() {
        super({ key: 'main' });
    }

    create() {
        this.score = 0;

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

        // --- Controls (must be created before Player) ---
        this.cursors = this.input.keyboard.createCursorKeys();

        // --- Player (Space Bus) ---
        const playerStartX = this.homePlanet.x + 150;
        const playerStartY = this.homePlanet.y;
        this.player = new Player(this, playerStartX, playerStartY, this.cursors);
        this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
        
        // --- Aliens ---
        this.aliens = this.physics.add.group();
        const spawnAlien = (texture: string, speed: number) => {
            let alienX, alienY;
            const safeDistance = 400; // Minimum distance from the player
            
            do {
                alienX = Phaser.Math.Between(0, WORLD_WIDTH);
                alienY = Phaser.Math.Between(0, WORLD_HEIGHT);
            } while (Phaser.Math.Distance.Between(playerStartX, playerStartY, alienX, alienY) < safeDistance);
            
            // The Alien class now accepts a texture key
            const alien = new Alien(this, alienX, alienY, texture, this.player, speed);
            this.aliens.add(alien);
        };
        
        // Spawn multiple aliens of each type
        const alienCounts = {
            red: 4,
            green: 6,
            purple: 6
        };

        for (let i = 0; i < alienCounts.red; i++) {
            spawnAlien('alien-red', ALIEN_SPEED_RED);
        }
        for (let i = 0; i < alienCounts.green; i++) {
            spawnAlien('alien-green', ALIEN_SPEED_GREEN);
        }
        for (let i = 0; i < alienCounts.purple; i++) {
            spawnAlien('alien-purple', ALIEN_SPEED_PURPLE);
        }


        // --- Passenger ---
        this.passengers = this.physics.add.group();
        this.spawnPassenger();
        
        // --- Collisions ---
        this.physics.add.overlap(this.player, this.passengers, this.handlePickupPassenger, undefined, this);
        this.physics.add.collider(this.player, this.aliens, this.handleGameOver, undefined, this);

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
        this.game.events.emit('updatePassengerStatus', this.player.hasPassenger);
    }

    spawnPassenger() {
        // Create a new passenger sprite and add it to our group.
        const passenger = this.passengers.create(this.homePlanet.x, this.homePlanet.y, 'passenger');
        passenger.setScale(2).setOrigin(0.5).refreshBody();
    }

    handlePickupPassenger(player: Phaser.Types.Physics.Arcade.GameObjectWithBody, passenger: Phaser.Types.Physics.Arcade.GameObjectWithBody) {
        if (!this.player.hasPassenger) {
            // The destroy() method exists on the base GameObject, so no cast is needed.
            passenger.destroy();
            
            this.player.pickupPassenger();
            this.game.events.emit('updatePassengerStatus', this.player.hasPassenger);
        }
    }

    update() {
        // --- Passenger Drop-off ---
        if (this.player.hasPassenger) {
            const distanceToDest = Phaser.Math.Distance.Between(
                this.player.x, this.player.y,
                this.destPlanet.x, this.destPlanet.y
            );

            if (distanceToDest < this.destPlanet.radius + 16) { // 16 is ~half player width
                this.player.dropOffPassenger();
                this.score += 10;
                this.game.events.emit('updateScore', this.score);
                this.game.events.emit('updatePassengerStatus', this.player.hasPassenger);
                this.spawnPassenger();
            }
        }
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