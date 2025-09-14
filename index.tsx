/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import * as Phaser from 'phaser';

import BootScene from './scenes/BootScene';
import TitleScene from './scenes/TitleScene';
import MainScene from './scenes/MainScene';
import UIScene from './scenes/UIScene';

// --- Phaser Game Configuration ---
const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: document.body,
    physics: {
        default: 'arcade',
        arcade: {
            // FIX: The gravity object requires both x and y properties to match the Vector2Like type.
            gravity: { x: 0, y: 0 },
        }
    },
    scene: [BootScene, TitleScene, MainScene, UIScene]
};

// --- Start the Game ---
new Phaser.Game(config);
