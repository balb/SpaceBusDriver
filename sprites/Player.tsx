/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import * as Phaser from 'phaser';
import { FORWARD_THRUST_SPEED, PLAYER_ROTATION_SPEED, REVERSE_ACCELERATION, BUS_CAPACITY, TEXTURES } from '../constants';

export default class Player extends Phaser.Physics.Arcade.Sprite {
    private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
    public passengerCount = 0;
    public readonly passengerCapacity = BUS_CAPACITY;

    constructor(scene: Phaser.Scene, x: number, y: number, cursors: Phaser.Types.Input.Keyboard.CursorKeys) {
        super(scene, x, y, TEXTURES.BUS_IDLE);

        this.cursors = cursors;

        // Add this entity to the scene's display list and physics world
        scene.add.existing(this);
        scene.physics.add.existing(this);

        // Configuration moved from MainScene
        this.setOrigin(0.5).setScale(2);
        // Adjust the physics body to match the new, more detailed sprite.
        (this.body as Phaser.Physics.Arcade.Body).setSize(40, 14);
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
            this.setTexture(TEXTURES.BUS_THRUST); // Set thrust texture
        } else if (this.cursors.down.isDown) {
            // FIX: Replaced non-existent `accelerationFromRotation` with `velocityFromRotation`.
            this.scene.physics.velocityFromRotation(this.rotation, -REVERSE_ACCELERATION, (this.body as Phaser.Physics.Arcade.Body).acceleration);
            this.setTexture(TEXTURES.BUS_IDLE); // Revert to idle texture when reversing
        } else {
            this.setAcceleration(0, 0);
            this.setTexture(TEXTURES.BUS_IDLE); // Revert to idle texture when not moving
        }
    }
    
    /**
     * Attempts to add a passenger to the bus.
     * @returns `true` if the passenger was picked up successfully, `false` if the bus was full.
     */
    public pickupPassenger(): boolean {
        if (this.passengerCount < this.passengerCapacity) {
            this.passengerCount++;
            return true;
        }
        return false;
    }
    
    /**
     * Drops off all passengers.
     * @returns The number of passengers that were on the bus.
     */
    public dropOffAllPassengers(): number {
        const numDroppedOff = this.passengerCount;
        this.passengerCount = 0;
        return numDroppedOff;
    }
}
