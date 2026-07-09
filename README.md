# Stealth Chat (System Update)

A highly advanced, 100% camouflaged WhatsApp client built with Electron and React. It completely disguises itself as native OS components or blends seamlessly into other applications like VS Code, Excel, Notion, and Slack.

## Features
- **Camouflage Skins:** Cycle through 8 distinct UI skins (Glass, Terminal, Ghost, VS Code, Slack, Excel, Notion) to perfectly match whatever app you have open.
- **Ghost Mode:** A completely invisible UI that floats text directly over your existing applications.
- **Boss Key (Panic Mask):** Press `Ctrl + Space` instantly to mask the chat with a fake "System Diagnostics" compiling screen.
- **Secret Notifications:** Uses native OS APIs to trigger fake "Background sync complete" system notifications when a message arrives.
- **Cross-Platform:** Builds native `.dmg` (macOS) and `.exe` (Windows) installers disguised as "System Update".

## Installation

### Development
1. Clone the repository.
2. Run `npm install`
3. Run `npm run electron:dev`

### Production Build
To create standalone installers for your specific OS:
1. Run `npm run electron:build`
2. Check the `dist-electron` folder for your installer.

## Usage
- Press `Option + Space` (macOS) or `Alt + Space` (Windows) from ANYWHERE on your computer to instantly toggle the stealth window.
- Press `Ctrl + Space` inside the app to trigger the Panic Mask.
- Click the "Palette" icon to cycle through the camouflage skins.

> **Disclaimer:** This tool is for educational purposes only. WhatsApp Web JS is an unofficial library. Use responsibly.
