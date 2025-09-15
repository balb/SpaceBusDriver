/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import * as Phaser from 'phaser';
import { FORWARD_THRUST_SPEED, PLAYER_ROTATION_SPEED, REVERSE_ACCELERATION } from '../constants';

export default class Player extends Phaser.Physics.Arcade.Sprite {
    private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
    public hasPassenger = false;

    constructor(scene: Phaser.Scene, x: number, y: number, cursors: Phaser.Types.Input.Keyboard.CursorKeys) {
        super(scene, x, y, 'bus');

        this.cursors = cursors;

        // Add this entity to the scene's display list and physics world
        scene.add.existing(this);
        scene.physics.add.existing(this);

        // Configuration moved from MainScene
        this.setOrigin(0.5).setScale(2);
        (this.body as Phaser.Physics.Arcade.Body).setSize(26, 12);
        this.setDamping(true);
        this.setDrag(0.95);
        this.setMaxVelocity(400);
        this.setCollideWorldBounds(true);
        this.setDepth(10);
    }

    // preUpdate is a built-in Phaser method that runs for every Sprite, every frame.
    preUpdate(time: number, delta: number) {
        super.preUpdate(time, delta);
        this.handleInput();
    }

    private handleInput() {
        // Rotation
        if (this.cursors.left.isDown) {
            this.setAngularVelocity(-PLAYER_ROTATION_SPEED);
        } else if (this.cursors.right.isDown) {
            this.setAngularVelocity(PLAYER_ROTATION_SPEED);
        } else {
            this.setAngularVelocity(0);
        }

        // Thrust
        if (this.cursors.up.isDown) {
            this.scene.physics.velocityFromRotation(this.rotation, FORWARD_THRUST_SPEED, (this.body as Phaser.Physics.Arcade.Body).velocity);
            this.setAcceleration(0, 0);
        } else if (this.cursors.down.isDown) {
            this.scene.physics.velocityFromRotation(this.rotation, -REVERSE_ACCELERATION, (this.body as Phaser.Physics.Arcade.Body).acceleration);
        } else {
            this.setAcceleration(0, 0);
        }
    }
    
    public pickupPassenger() {
        this.hasPassenger = true;
    }
    
    public dropOffPassenger() {
        this.hasPassenger = false;
    }
}