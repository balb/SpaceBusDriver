/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

// This is a declaration file for overriding/extending Phaser's built-in types.
// It addresses inconsistencies between the official type definitions and the
// actual Phaser 3 API, making the project truly type-safe.

import 'phaser';

declare module 'phaser' {
    namespace GameObjects {
        namespace Particles {
            // The built-in definition for ParticleEmitter's setAngle method is too restrictive.
            // It doesn't include the overload that accepts a { min, max } object for a random range.
            // This augmentation adds the correct signature.
            interface ParticleEmitter {
                setAngle(config: { min: number; max: number }): this;
            }
        }
    }
}