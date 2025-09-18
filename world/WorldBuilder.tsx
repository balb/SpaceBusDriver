/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import * as Phaser from 'phaser';
import { WORLD_WIDTH, WORLD_HEIGHT, TEXTURES } from '../constants';

export default class WorldBuilder {
    public static createStarfield(scene: Phaser.Scene): { starsFar: Phaser.GameObjects.Group, starsNear: Phaser.GameObjects.Group } {
        const starsFar = scene.add.group();
        const starsNear = scene.add.group();

        // Layer 1: Far stars (slow parallax)
        for (let i = 0; i < 300; i++) {
            const x = Phaser.Math.Between(0, WORLD_WIDTH);
            const y = Phaser.Math.Between(0, WORLD_HEIGHT);
            const size = Phaser.Math.Between(1, 2);
            const alpha = Phaser.Math.FloatBetween(0.2, 0.6);
            const star = scene.add.rectangle(x, y, size, size, 0xffffff, alpha);
            star.setScrollFactor(0.3).setDepth(-3); // Moves slowly with camera
            starsFar.add(star);
        }

        // Layer 2: Near stars (faster parallax)
        for (let i = 0; i < 150; i++) {
            const x = Phaser.Math.Between(0, WORLD_WIDTH);
            const y = Phaser.Math.Between(0, WORLD_HEIGHT);
            const size = Phaser.Math.Between(2, 4);
            const alpha = Phaser.Math.FloatBetween(0.6, 1.0);
            const star = scene.add.rectangle(x, y, size, size, 0xffffff, alpha);
            star.setScrollFactor(0.6).setDepth(-2); // Moves faster with camera
            starsNear.add(star);
        }

        return { starsFar, starsNear };
    }

    public static createPlanets(scene: Phaser.Scene): { destPlanet: Phaser.GameObjects.Image, busStops: Phaser.Physics.Arcade.StaticGroup } {
        const destPlanet = scene.add.image(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, TEXTURES.PLANET_TERMINUS).setDepth(-1);
        // The text's position is calculated relative to the image's center (origin) to align with the flag.
        scene.add.text(destPlanet.x + 44.5, destPlanet.y - 72.5, 'Terminus', {
            fontSize: '16px',
            color: '#000000',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        const busStops = scene.physics.add.staticGroup();
        const busStopPositions = [
            { x: 300, y: 400 },
            { x: WORLD_WIDTH - 300, y: 500 },
            { x: 400, y: WORLD_HEIGHT - 400 },
            { x: WORLD_WIDTH - 500, y: WORLD_HEIGHT - 600 },
            { x: WORLD_WIDTH / 2, y: 300 },
        ];
        
        busStopPositions.forEach(pos => {
            busStops.create(pos.x, pos.y, TEXTURES.PLANET_BUSSTOP).setCircle(60).setDepth(-1);
        });

        return { destPlanet, busStops };
    }
}
