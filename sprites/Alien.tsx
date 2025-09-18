/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import * as Phaser from 'phaser';
import { ALIEN_DETECTION_RADIUS, ALIEN_ROAM_CHANGE_DIR_DELAY, ALIEN_ROAM_SPEED } from '../constants';

export default class Alien extends Phaser.Physics.Arcade.Sprite {
    // FIX: Using `protected` instead of `private` for compatibility with Phaser's class structure.
    // `private` members break structural typing for methods expecting `GameObject`.
    // The target is always the player sprite, so we use the more specific `Phaser.Physics.Arcade.Sprite` type
    // which correctly includes `x` and `y` properties.
    protected target: Phaser.Physics.Arcade.Sprite;
    protected chaseSpeed: number;
    // FIX: Renamed `state` to `aiState` to avoid conflicting with the base `GameObject.state` property.
    protected aiState: 'roaming' | 'chasing' = 'roaming';
    protected roamTimer?: Phaser.Time.TimerEvent;

    constructor(scene: Phaser.Scene, x: number, y: number, textureKey: string, target: Phaser.Physics.Arcade.Sprite, speed: number) {
        super(scene, x, y, textureKey);

        this.target = target;
        this.chaseSpeed = speed;

        // Add this entity to the scene's display list and physics world
        scene.add.existing(this);
        scene.physics.add.existing(this);

        // Configuration moved from MainScene
        this.setScale(2.5).setOrigin(0.5);
        // Use a rectangular body that better fits the new sprite shapes.
        (this.body as Phaser.Physics.Arcade.Body).setSize(24, 20);
        this.setCollideWorldBounds(true);
        this.setDepth(5);
        
        // Play the corresponding animation.
        // e.g., textureKey 'alien-red-1' -> animKey 'anim-alien-red'
        const baseName = textureKey.substring(0, textureKey.lastIndexOf('-'));
        this.play(`anim-${baseName}`);
        
        this.startRoaming();

        // Ensure timer is cleaned up when the sprite is destroyed
        this.on(Phaser.GameObjects.Events.DESTROY, () => {
            if (this.roamTimer) {
                this.roamTimer.destroy();
            }
        });
    }
    
    // preUpdate is a built-in Phaser method that runs for every Sprite, every frame.
    preUpdate(time: number, delta: number) {
        super.preUpdate(time, delta);
        this.updateAIState();
        this.executeBehavior();
    }

    protected updateAIState() {
        if (!this.active || !this.target.body) {
            return;
        }

        const distanceToTarget = Phaser.Math.Distance.Between(this.x, this.y, this.target.x, this.target.y);

        if (distanceToTarget < ALIEN_DETECTION_RADIUS) {
            // Player is close, switch to chasing
            if (this.aiState !== 'chasing') {
                this.aiState = 'chasing';
                if (this.roamTimer) {
                    this.roamTimer.destroy();
                    this.roamTimer = undefined;
                }
            }
        } else {
            // Player is far, switch to roaming
            if (this.aiState !== 'roaming') {
                this.aiState = 'roaming';
                this.startRoaming();
            }
        }
    }

    protected executeBehavior() {
        if (!this.active) return;
        
        if (this.aiState === 'chasing') {
            this.followTarget();
        }
        // Roaming behavior is handled by the timer, which sets velocity.
        // No additional action is needed in the update loop for roaming.
    }

    protected startRoaming() {
        this.changeRoamDirection(); // Pick an initial direction
        this.roamTimer = this.scene.time.addEvent({
            delay: ALIEN_ROAM_CHANGE_DIR_DELAY,
            callback: this.changeRoamDirection,
            callbackScope: this,
            loop: true
        });
    }

    protected changeRoamDirection() {
        if (this.active) {
            const angle = Phaser.Math.FloatBetween(0, 2 * Math.PI);
            this.scene.physics.velocityFromRotation(angle, ALIEN_ROAM_SPEED, (this.body as Phaser.Physics.Arcade.Body).velocity);
        }
    }
    
    protected followTarget() {
        // Ensure the sprite is active and its target has a physics body before moving
        if (this.active && this.target.body) {
            this.scene.physics.moveToObject(this, this.target, this.chaseSpeed);
        }
    }
}