/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import * as Phaser from 'phaser';
import Alien from '../sprites/Alien';
import Player from '../sprites/Player';
import { ALIEN_SPEED_RED, ALIEN_SPEED_GREEN, ALIEN_SPEED_PURPLE, WORLD_WIDTH, WORLD_HEIGHT } from '../constants';

export default class EnemyManager {
    private scene: Phaser.Scene;
    private player: Player;
    public aliens: Phaser.Physics.Arcade.Group;

    constructor(scene: Phaser.Scene, player: Player) {
        this.scene = scene;
        this.player = player;
        this.aliens = this.scene.physics.add.group();
    }

    public create() {
        const spawnAlien = (texture: string, speed: number) => {
            let alienX, alienY;
            const safeDistance = 400; // Minimum distance from the player
            
            do {
                alienX = Phaser.Math.Between(0, WORLD_WIDTH);
                alienY = Phaser.Math.Between(0, WORLD_HEIGHT);
            } while (Phaser.Math.Distance.Between(this.player.x, this.player.y, alienX, alienY) < safeDistance);
            
            const alien = new Alien(this.scene, alienX, alienY, texture, this.player, speed);
            this.aliens.add(alien);
        };
        
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
    }
}
