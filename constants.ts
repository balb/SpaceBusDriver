/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

// --- Game Constants ---
// TUNING: Renamed ACCELERATION for clarity. Forward thrust sets velocity directly.
export const FORWARD_THRUST_SPEED = 300;
export const REVERSE_ACCELERATION = 150;
export const PLAYER_ROTATION_SPEED = 150; // in degrees/sec

// Player Bus
export const BUS_CAPACITY = 5;
export const PASSENGER_RESPAWN_DELAY = 10000; // ms
export const FULL_BUS_BONUS = 50;

// Alien Speeds
export const ALIEN_SPEED_RED = 220;    // Fastest
export const ALIEN_SPEED_GREEN = 180;  // Medium
export const ALIEN_SPEED_PURPLE = 130; // Slowest

// Alien AI
export const ALIEN_DETECTION_RADIUS = 400;
export const ALIEN_ROAM_SPEED = 70;
export const ALIEN_ROAM_CHANGE_DIR_DELAY = 3000; // ms

// World and Minimap constants
export const WORLD_WIDTH = 800 * 4;
export const WORLD_HEIGHT = 600 * 4;
export const MINIMAP_WIDTH = 200;
export const MINIMAP_HEIGHT = 150;