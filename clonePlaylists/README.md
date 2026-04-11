# Spicetify Extensions

A collection of custom extensions for [Spicetify](https://spicetify.app).

---

## Clone Playlist

<img width="773" height="765" alt="preview" src="https://github.com/user-attachments/assets/f7568e7d-c1ec-44ed-b684-d23abf03f188" />


Clone any Spotify playlist directly from the right-click context menu.
Copies all tracks, description, and cover art into a new playlist in your library.

### Features

- Works on any playlist (yours or someone else's)
- Copies all tracks, description, and cover image
- Handles Spotify API rate limits automatically
- If the cover upload is blocked by Spotify's quota, it saves the pending upload to `localStorage` — you can retry it later without re-cloning the playlist

### Installation

#### Manual

1. Download [`clonePlaylist.js`](clonePlaylists/clonePlaylist.js)
2. Copy it to your Spicetify extensions folder:
   - **Windows:** `%appdata%\spicetify\Extensions\`
   - **Linux/macOS:** `~/.config/spicetify/Extensions/`
3. Run:
```powershell
spicetify config extensions clonePlaylist.js
spicetify apply
```

### Usage

Right-click any playlist → **Clone Playlist**

The cloned playlist will be named `[Original Name] Clone` and added to your library.

### Cover upload — rate limit note

Spotify's image upload endpoint (`PUT /playlists/{id}/images`) has a strict rate limit.
If the cover fails to apply, you'll see a notification. Open the Spicetify developer console (`Ctrl+Shift+I`) and run:

```javascript
retryPendingImages()
```

This retries all pending cover uploads saved in `localStorage`.

### Requirements

- [Spicetify](https://spicetify.app) v2.x or later
- Spotify desktop client (Windows, macOS, Linux)

### Credits

This extension is based on the original **Save Playlists** extension by [**daksh2k**](https://github.com/daksh2k), available at [daksh2k/Spicetify-stuff](https://github.com/daksh2k/Spicetify-stuff/blob/master/Extensions/savePlaylists.js).

The original extension has been rewritten to be compatible with **Spotify 1.2.72+**, fixing internal API calls, token expiration handling, rate limit management, and cover image upload.
