# Queued Tracks Time

Spicetify extension that shows **only** the duration of manually queued tracks in Spotify's queue, excluding playlist autoplay.

## Features

- Shows time remaining for manually queued tracks only
- Excludes playlist/album autoplay from calculation
- Clean and minimal display
- Updates in real-time

## Preview

<img width="360" height="619" alt="image" src="https://github.com/user-attachments/assets/2364ea14-e722-40e2-95d6-d86a71306621" />

## Installation

### Via Marketplace (Recommended)
1. Open Spotify with Spicetify installed
2. Go to the Marketplace
3. Search for "Queued Tracks Time"
4. Click Install

### Manual Installation
1. Download `queued-tracks-time.js`
2. Copy to your Spicetify Extensions folder:
   - Windows: `%appdata%\spicetify\Extensions` or `%localappdata%\spicetify\Extensions`
   - Linux/Mac: `~/.config/spicetify/Extensions`
3. Run:
``spicetify config extensions queued-tracks-time.js
spicetify apply``

## Credits

Based on the [original QueueTime extension](https://github.com/Theblockbuster1/spicetify-extensions/tree/main/QueueTime) by [Theblockbuster1](https://github.com/Theblockbuster1). Modified to show only manually queued tracks duration, excluding playlist autoplay.

## License

MIT License
