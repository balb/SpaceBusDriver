/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import * as Phaser from 'phaser';
import { MINIMAP_WIDTH, MINIMAP_HEIGHT, SCENES, EVENTS } from '../constants';

// --- UI Scene (Overlay) ---
export default class UIScene extends Phaser.Scene {
    private scoreLabel!: Phaser.GameObjects.Text;
    private passengerCountLabel!: Phaser.GameObjects.Text;

    // FIX: Explicitly declare scene properties to satisfy TypeScript.
    add!: Phaser.GameObjects.GameObjectFactory;
    scene!: Phaser.Scenes.ScenePlugin;
    events!: Phaser.Events.EventEmitter;
    game!: Phaser.Game;

    constructor() {
        super({ key: SCENES.UI });
    }

    create() {
        // FIX: Per Phaser's API, text style properties like `fontSize` expect a string (e.g., '24px').
        this.scoreLabel = this.add.text(12, 12, 'Score: 0', { fontSize: '24px' });
        this.passengerCountLabel = this.add.text(12, 42, 'Passengers: 0/0', { fontSize: '20px' });

        // --- Minimap Border ---
        const minimapX = this.scale.width - MINIMAP_WIDTH - 10;
        const minimapY = 10;
        this.add.rectangle(minimapX, minimapY, MINIMAP_WIDTH, MINIMAP_HEIGHT)
            .setOrigin(0)
            .setStrokeStyle(2, 0xffffff, 0.8);

        // ARCHITECTURAL FIX: Listen on the global game event bus to decouple from MainScene.
        this.game.events.on(EVENTS.UPDATE_SCORE, this.updateScore, this);
        this.game.events.on(EVENTS.UPDATE_PASSENGER_COUNT, this.updatePassengerCount, this);

        // IMPORTANT: Clean up listeners when this scene is shut down to prevent memory leaks.
        this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.game.events.off(EVENTS.UPDATE_SCORE, this.updateScore, this);
            this.game.events.off(EVENTS.UPDATE_PASSENGER_COUNT, this.updatePassengerCount, this);
        });
    }

    updateScore(score: number) {
        if (this.scoreLabel) {
            this.scoreLabel.setText(`Score: ${score}`);
        }
    }

    updatePassengerCount(count: number, capacity: number) {
        if (this.passengerCountLabel) {
            this.passengerCountLabel.setText(`Passengers: ${count}/${capacity}`);
        }
    }
}
