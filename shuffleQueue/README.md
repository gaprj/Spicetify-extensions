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
