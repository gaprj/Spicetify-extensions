# Track Producers

Displays the producer(s) of the currently playing track directly in the Now Playing bar.

<img width="271" height="63" alt="preview" src="https://github.com/user-attachments/assets/1781ad6c-323f-476d-8c52-d1031b56f259" />

## Features
* **Native Integration:** Blends seamlessly into Spotify's UI, appearing right next to the track artists.
* **Clickable Profiles:** Click on a producer's name to instantly open their Spotify artist page using the internal router (no heavy page reloads).
* **Clean Layout:** Displays a maximum of two producers inline to avoid breaking the player UI or triggering native marquee glitches.
* **Expanded Credits Modal:** If a track has more than two producers, a clickable `+X` button appears. Clicking it opens a native Spicetify modal containing the full, clickable list of producers.
* **Optimized API Calls:** Uses in-memory caching to prevent redundant requests to Spotify's internal servers on loops or replays.

## Installation

### Marketplace (Recommended)
1. Open the Spicetify Marketplace within Spotify.
2. Search for **Track Producers**.
3. Click Install.

### Manual Installation
1. Download the `track-producers.js` file from the [latest release](https://github.com/gaprj/Spicetify-extensions).
2. Place the file inside your Spicetify extensions directory:
   * **Windows:** `%appdata%\spicetify\Extensions`
   * **Linux/macOS:** `~/.config/spicetify/Extensions`
3. Run the following commands in your terminal:
   ```bash
   spicetify config extensions track-producers.js
   spicetify apply
