# How to Access from Other Devices

## Step 1: Find Your Computer's IP Address

### On Windows:
1. Open Command Prompt (Press `Win + R`, type `cmd`, press Enter)
2. Type: `ipconfig`
3. Look for "IPv4 Address" under your active network adapter (usually WiFi or Ethernet)
4. Example: `192.168.1.100`

### On Mac:
1. Open Terminal (Press `Cmd + Space`, type `Terminal`, press Enter)
2. Type: `ifconfig | grep "inet "`
3. Look for an IP address starting with 192.168.x.x or 10.x.x.x
4. Example: `192.168.1.100`

### On Linux:
1. Open Terminal
2. Type: `ip addr` or `ifconfig`
3. Look for an IP address starting with 192.168.x.x or 10.x.x.x
4. Example: `192.168.1.100`

## Step 2: Make Sure the Server is Running

On your computer, make sure the development server is running:

```bash
npm run dev
```

You should see: `> Ready on http://0.0.0.0:3000`

## Step 3: Access from Other Devices

On any device connected to the same WiFi network:

1. Open a web browser
2. Type in the address bar: `http://YOUR_IP_ADDRESS:3000`
   - Example: `http://192.168.1.100:3000`
3. Press Enter

## Step 4: Start Sharing!

- Each device will get a random name
- You'll see all connected devices in the list
- Share your device name verbally so others know which one is you
- Click on a device to start chatting and sharing files

## Common Issues

### "Can't connect" or "Page not loading"

1. **Check WiFi**: Make sure both devices are on the SAME WiFi network
2. **Check Firewall**: 
   - Windows: Windows Defender might block port 3000
   - Mac: System Preferences > Security & Privacy > Firewall
   - Temporarily disable firewall to test
3. **Check Server**: Make sure `npm run dev` is still running on your computer
4. **Try Different Port**: Edit `server.js` and change `port = 3000` to `port = 3001`, then use `:3001` in the URL

### Windows Firewall (Allow port 3000)

1. Open Windows Defender Firewall
2. Click "Advanced settings"
3. Click "Inbound Rules" > "New Rule"
4. Select "Port" > Next
5. Select "TCP" and enter "3000" > Next
6. Select "Allow the connection" > Next
7. Check all profiles > Next
8. Name it "Local P2P Share" > Finish

### Device not showing in list

1. Refresh both browser windows
2. Check the connection status (green dot = connected)
3. Open browser console (F12) and check for errors

## Testing on Same Computer

You can test without other devices:

1. Open `http://localhost:3000` in one browser tab
2. Open `http://localhost:3000` in another tab
3. Each tab acts as a separate device

## Network Types

✅ **Works on**:
- Home WiFi networks
- Office WiFi networks (if firewall allows)
- Mobile hotspots
- Local area networks (LAN)

❌ **Won't work on**:
- Public WiFi with client isolation (hotels, airports, cafes)
- Different networks (one on WiFi, one on cellular data)
- VPNs that route traffic differently

## Security Note

⚠️ This app has NO security features. Only use on networks you trust!

- No passwords or authentication
- No encryption
- Anyone on your network can see your device
- Files and messages are sent in plain text

Perfect for: Home networks, small offices, trusted friends
Not for: Public networks, sensitive data, untrusted environments
