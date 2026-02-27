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
1. Download `queued-tracks-time.js` from the `queued-tracks-time` folder.
2. Copy to your Spicetify Extensions folder:
   - Windows: `%appdata%\spicetify\Extensions` or `%localappdata%\spicetify\Extensions`
   - Linux/Mac: `~/.config/spicetify/Extensions`
3. Run:
``spicetify config extensions queued-tracks-time.js
spicetify apply``

## Credits

Based on the [original QueueTime extension](https://github.com/Theblockbuster1/spicetify-extensions/tree/main/QueueTime) by [Theblockbuster1](https://github.com/Theblockbuster1). Modified to show only manually queued tracks duration, excluding playlist autoplay.

# Shuffle Queue

Safe Fisher-Yates shuffle for playlist context using native reordering to avoid queue duplication.

## Features
- True Shuffle: Perfectly random order using the Fisher-Yates algorithm.
- Native Reorder: Moves existing tracks instead of adding new ones, preventing duplicates.
- Anti-Crash UI: Uses a floating action button to avoid conflicts with Spotify's React engine.

## Preview
<img width="243" height="323" alt="preview" src="https://github.com/user-attachments/assets/f4c9010b-5f6e-4965-9fe8-ad7aeca68ec6" />

## Manual Installation

Download shuffleQueue.js from the shuffleQueue folder.

Copy to your Spicetify Extensions folder.

Run:

`spicetify config extensions shuffleQueue/shuffleQueue.js`

`spicetify apply`

## License

MIT License
