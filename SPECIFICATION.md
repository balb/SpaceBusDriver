# Space Bus Driver - Game Specification

## 1. Overview

**Space Bus Driver** is a 2D top-down arcade game set in space. The player pilots a space bus across a large, scrollable map, picking up passengers from multiple "bus stop" planets and safely transporting them to the central Terminus, all while being pursued by hostile aliens. The goal is to achieve the highest score possible.

## 2. Core Gameplay Mechanics

### 2.1. Player Control
- The player controls the "space bus" using the keyboard arrow keys.
- **Up Arrow:** Instantly sets the bus's forward velocity, providing an immediate and responsive thrust.
- **Down Arrow:** Applies a weaker reverse acceleration, acting as a brake to slow the bus down before moving it backward.
- **Left/Right Arrows:** Rotate the bus counter-clockwise and clockwise, respectively.
- The bus has physics-based movement, including acceleration and drag, making it feel like it's gliding through space.

### 2.2. The Passenger Loop
1.  Passengers spawn at multiple **Bus Stop Planets** scattered throughout the world.
2.  The player can navigate to any bus stop to pick up a waiting passenger. Overlapping with the passenger is sufficient.
3.  The bus has a maximum capacity of **5 passengers**. The player can continue picking up passengers from different bus stops until the bus is full.
4.  Once a passenger is picked up, a new one will respawn at that same bus stop after a short delay.
5.  The player must travel across the map to the central **Terminus Planet**.
6.  Upon getting close to the Terminus Planet, all passengers currently on board are dropped off.
7.  The player's score increases by 10 points for each passenger dropped off, and the bus's passenger count resets to zero, allowing the loop to begin again.

### 2.3. The Aliens
- Multiple aliens act as the primary obstacles, each with a unique speed and appearance.
- **AI Behavior:** Aliens have two states: roaming and chasing.
    - **Roaming:** When the player is far away, aliens move slowly in random directions, changing course every few seconds.
    - **Chasing:** When the player comes within an alien's detection radius, it will begin to actively and directly chase the player at its top speed.
- The aliens collide with the world boundaries.
- Aliens will also collide and bounce off of each other.
- Contact between the player's bus and any alien results in a "Game Over".
- **Red Alien (Fast):** The most dangerous alien, it moves at a high speed, forcing the player to stay alert. Its appearance is aggressive. There are 4 in the world.
- **Green Alien (Medium):** The original alien, it moves at a moderate speed and poses a standard threat. There are 6 in the world.
- **Purple Alien (Slow):** The least dangerous alien, it moves slowly and is easier to evade, but can still corner an unwary player. Its appearance is sluggish or sleepy. There are 6 in the world.

### 2.4. Game World & Camera
- The game world is a large, rectangular area, equivalent to a 4x4 grid of screens (3200x2400 pixels).
- The main camera smoothly follows the player's bus as it moves through the world.
- The world has hard boundaries. The player bus and the aliens cannot pass through the edges of the world and will collide with them.
- The Bus Stop and Terminus planets are placed far apart to encourage exploration of the large map.

## 3. Scoring & UI

- The player's score is displayed in the top-left corner of the screen.
- A status message below the score displays the number of passengers on board and the bus's capacity (e.g., "Passengers: 3/5").
- A **minimap** is displayed in the top-right corner.
    - It shows a scaled-down, real-time overview of the entire game world.
    - It displays markers for the player's bus, all aliens, all Bus Stop Planets, and the Terminus Planet.
- Players earn **10 points** for each successfully delivered passenger.

## 4. Game State

- **Title Screen:** The game begins on a retro-styled title screen featuring vector graphics. The player presses the **Spacebar** to start the game.
- **Gameplay Start:** The game begins with the player's bus near the Terminus Planet, passengers at each Bus Stop Planet, and the aliens at random positions a safe distance away.
- **Game Over:** Occurs when the player collides with any alien.
    - All game movement stops.
    - A "GAME OVER" message is displayed along with the final score.
    - The player can restart the game by pressing the **Spacebar**, which returns them to the Title Screen.

## 5. Assets & Visuals

All visual assets are generated programmatically (procedurally) at runtime.
- **Background:** A black void with small, white, randomly placed rectangles representing stars, filling the entire game world.
- **Space Bus:** A yellow rectangular body with a light blue "cockpit" section.
- **Aliens:**
    - **Red Alien:** A red circle with a single, aggressive-looking triangular eye.
    - **Green Alien:** A green circle with a smaller black circle for an eye, looking off to the side.
    - **Purple Alien:** A purple circle with a single, sleepy-looking oval eye.
- **Passenger:** A blue character with a circular head and a rectangular body.
- **Planets:**
    - **Bus Stop Planet:** A medium-sized orange circle.
    - **Terminus Planet:** A medium-sized green circle with a flag sticking out of its top. The flag is white and reads "Terminus" in black text.

## 6. Technical Architecture

- **Engine:** Phaser 3
- **Language:** TypeScript
- **File Structure:** The project is organized by responsibility. Phaser Scenes, which manage game state and flow, are in a `scenes/` directory. Reusable game entities (like the Player and Alien) are defined as classes in a `sprites/` directory. A central `constants.ts` file holds shared game parameters for easy tuning.
- **Scene Management:**
    - `BootScene`: Responsible for procedurally generating all textures once at the start of the game.
    - `TitleScene`: Displays the retro-styled title screen and waits for player input to start the main game.
    - `MainScene`: Contains core game logic, camera control, and collision handling, acting as a director for the various game entities.
    - `UIScene`: Runs as a parallel overlay scene to display the score, status, and minimap border. It is decoupled from the main game via a global event bus for updates.