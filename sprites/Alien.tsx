/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import * as Phaser from 'phaser';

export default class Alien extends Phaser.Physics.Arcade.Sprite {
    private target: Phaser.Types.Physics.Arcade.GameObjectWithBody;
    private moveSpeed: number;

    constructor(scene: Phaser.Scene, x: number, y: number, target: Phaser.Types.Physics.Arcade.GameObjectWithBody, speed: number) {
        super(scene, x, y, 'alien');

        this.target = target;
        this.moveSpeed = speed;

        // Add this entity to the scene's display list and physics world
        scene.add.existing(this);
        scene.physics.add.existing(this);

        // Configuration moved from MainScene
        this.setScale(2.5).setOrigin(0.5);
        (this.body as Phaser.Physics.Arcade.Body).setCircle(10);
        this.setCollideWorldBounds(true);
        this.setDepth(5);
    }
    
    // preUpdate is a built-in Phaser method that runs for every Sprite, every frame.
    preUpdate(time: number, delta: number) {
        super.preUpdate(time, delta);
        this.followTarget();
    }
    
    private followTarget() {
        // Ensure the sprite is active and its target has a physics body before moving
        if (this.active && this.target.body) {
            this.scene.physics.moveToObject(this, this.target, this.moveSpeed);
        }
    }
}