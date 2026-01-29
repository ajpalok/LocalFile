# Quick Start Guide

## Running the Application

1. **Install dependencies** (first time only):
   ```bash
   npm install
   ```

2. **Start the server**:
   ```bash
   npm run dev
   ```

3. **Open in browser**:
   - On the same computer: http://localhost:3000
   - On other devices in the network: http://[YOUR_IP]:3000
   
   To find your IP address:
   - Windows: Open Command Prompt and run `ipconfig`
   - Mac/Linux: Open Terminal and run `ifconfig` or `ip addr`

## What You'll See

### Main Screen
- Your randomly generated device name (top right)
- Connection status indicator (green = connected, red = disconnected)
- List of available devices on your network

### Device Selection
- Click on any device to open a chat window with that device
- Your device name is shown to help others identify you

### Chat Interface
- **Send Messages**: Type in the input box and press Enter or click Send
- **Attach Files**: Click the paperclip icon to select a file to share
- **Receive Files**: When someone sends you a file, you'll see Download and Cancel buttons
- **Back Button**: Click the back arrow to return to the device list

## Important Notes

⚠️ **Messages are temporary**: All messages are stored only in your browser's memory. Refreshing the page will clear all chat history.

⚠️ **File transfers**: Files are transferred in real-time. If the connection is lost during transfer, you'll need to send the file again.

⚠️ **Device names**: Your device name is randomly generated and saved in your browser. It will remain the same until you clear your browser data.

⚠️ **Network security**: This app works on your local network only. Make sure you trust all devices on your network.

## Testing on the Same Device

You can test the app on a single device by opening multiple browser windows or tabs:

1. Open http://localhost:3000 in multiple tabs
2. Each tab will appear as a separate device
3. You can send messages and files between tabs

## Troubleshooting

**No devices showing up?**
- Make sure the server is running (`npm run dev`)
- Refresh the page
- Check that JavaScript is enabled in your browser

**Can't connect from another device?**
- Verify both devices are on the same WiFi network
- Check if your firewall is blocking port 3000
- Try using your computer's IP address instead of localhost

**Files not transferring?**
- Large files may take time - be patient
- Check browser console (F12) for errors
- Try with a smaller file first

## Keyboard Shortcuts

- **Enter**: Send message (when typing in the message box)
- **Ctrl + V / Cmd + V**: You can paste text into the message box

## Privacy

- No data is stored on the server
- No analytics or tracking
- All communication happens directly between devices
- Messages and files are not encrypted (use on trusted networks only)

## Support

For issues or questions, check the main README.md file or create an issue on GitHub.
