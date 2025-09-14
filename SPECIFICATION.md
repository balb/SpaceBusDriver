### 1. Project Overview

*   **Project Name:** Space Bus Driver
*   **Elevator Pitch:** A 2D, top-down, retro arcade game where the player pilots a space bus to ferry passengers between planets while avoiding a persistent alien threat. The game is built using Phaser 3 and TypeScript.

### 2. Core Gameplay & User Stories

This section describes the primary mechanics. User stories are a great way to frame this.

*   **Player Movement:**
    *   **As a player, I want to** rotate my bus left and right using the arrow keys.
    *   **As a player, I want to** accelerate my bus forward using the up arrow key.
    *   **As a player, I want my bus** to have momentum and drift in space, gradually slowing down when not accelerating.
    *   **As a player, I want my bus** to wrap around the screen when it goes off the edges.

*   **Passenger & Scoring:**
    *   **As a player, I want to** see a passenger appear at the "home" planet.
    *   **As a player, I want to** pick up the passenger by flying my bus over them.
    *   **As a player, I want to** drop off the passenger at the "destination" planet by flying near it.
    *   **As a player, I want my score** to increase by 10 points for every successful drop-off.
    *   **As a player, I want a new passenger** to immediately appear at the home planet after a drop-off.

*   **Enemy & Game Over:**
    *   **As a player, I need to** avoid an alien that constantly chases my bus.
    *   **As a player, I want the game** to end immediately if the alien touches my bus.
    *   **As a player, I want to** see a "Game Over" screen that displays my final score.
    *   **As a player, I want to** be able to restart the game from the "Game Over" screen by pressing the Spacebar.

### 3. Visuals & Aesthetics

*   **Overall Style:** Minimalist, retro, 8-bit arcade aesthetic. Use simple geometric shapes for all game objects.
*   **Color Palette:** Black background for space, bright primary colors (yellow, green, blue) for game objects to create high contrast.
*   **Background:** A static black background with 100 small, white, randomly placed stars of varying size and opacity to simulate a starfield.

### 4. Asset Descriptions (Procedurally Generated)

*   **Player (Bus):** A 32x16 yellow rectangle with a smaller, 8x8 light-blue rectangle at the front for the cockpit.
*   **Enemy (Alien):** A 24x24 green circle with a smaller, offset black circle for an eye.
*   **Passenger:** A 16x20 simple, blue humanoid figure (a circle for the head, a rectangle for the body).
*   **Home Planet:** A 40-pixel radius, solid blueish circle (`0x6464ff`).
*   **Destination Planet:** A 40-pixel radius, solid greenish circle (`0x64ff64`).

### 5. UI / Heads-Up Display (HUD)

*   **Location:** Top-left corner of the screen, overlaid on the game.
*   **Score Display:** Text reading `Score: [current_score]`. White text, 24px font size.
*   **Passenger Status:** Text below the score, reading `Find passenger` or `Drop off passenger`. White text, 20px font size.

### 6. Technical Specifications

*   **Framework:** Phaser 3 (latest stable version via ESM import).
*   **Language:** TypeScript.
*   **Physics:** Arcade Physics, with zero gravity.
*   **Project Structure:** A single `index.html`, `index.css`, and `index.tsx`.
