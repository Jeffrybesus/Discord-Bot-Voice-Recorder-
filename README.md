## Prerequisites

To successfully set up and run this bot, ensure you have the following components configured:

### System Software
* **Node.js Engine:** Must be installed on your computer to execute the JavaScript runtime and run the bot code.
* **FFmpeg & 7-Zip:** FFmpeg must be downloaded and extracted (using a tool like 7-Zip) to a known local path (e.g., `C:\ffmpeg`) so the script can convert raw audio files into clean MP3s.

### Local Project Files
* **Structured Local Folder:** A dedicated project directory containing your `index.js` script, the required dependencies installed via `npm install`, and a local `/recordings` folder (which the bot creates automatically).
* **Private `.env` File:** A configuration file sitting in the root of your project folder that securely holds your unique `DISCORD_TOKEN`.

### Discord Developer Portal Configuration
* **Message Content Intent:** This specific toggle **must** be turned **ON** inside the Discord Developer Portal under your Application's **Bot** tab so the script can read your text commands.
* **Bot Invite Permissions:** An authorization link generated through the OAuth2 URL Generator with the following permissions explicitly checked:
    * `View Channels`
    * `Send Messages`
    * `Connect`
    * `Speak`
### Server Access
* **Server Admin Rights:** You must possess **Manage Server** or **Administrator** permissions in the target Discord server to successfully authorize and add the bot to the member list.
