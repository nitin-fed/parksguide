# FeatherGlobe Chat Proxy Server

A lightweight Node.js/Express proxy that forwards chat requests from the FeatherGlobe mobile app to the Groq API.

## Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your Groq API key and app token
   ```

3. **Get a Groq API key:**
   - Go to https://console.groq.com
   - Create a free account (no card required)
   - Generate an API key
   - Add it to `.env` as `GROQ_API_KEY`

4. **Run the dev server:**
   ```bash
   npm run dev
   ```
   The server will start on `http://localhost:3000`

5. **Test the server:**
   ```bash
   curl -X POST http://localhost:3000/v1/chat \
     -H "Content-Type: application/json" \
     -H "X-App-Token: your_secret_app_token_here" \
     -d '{
       "messages": [
         {"role": "user", "content": "What national parks are in California?"}
       ]
     }'
   ```

## Deployment on Hostinger VPS

### Prerequisites
- Hostinger VPS with SSH access
- SSH key set up
- Domain name (optional but recommended)

### Step 1: Initial Setup on VPS

```bash
# SSH into your VPS
ssh root@your_vps_ip

# Update system
apt update && apt upgrade -y

# Install Node.js (latest LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt install -y nodejs

# Install Caddy (automatic HTTPS)
apt install -y caddy

# Install UFW firewall
apt install -y ufw

# Configure firewall
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw enable

# Create app directory
mkdir -p /opt/featherglobe-chat
cd /opt/featherglobe-chat
```

### Step 2: Deploy the App

```bash
# On your local machine, build the server:
npm run build

# Copy to VPS:
scp -r dist/ package.json package-lock.json ecosystem.config.cjs .env root@your_vps_ip:/opt/featherglobe-chat/

# SSH back in and install production dependencies:
ssh root@your_vps_ip
cd /opt/featherglobe-chat
npm install --production

# Install pm2 globally:
npm install -g pm2
```

### Step 3: Set Up pm2

```bash
# Start the app with pm2
pm2 start ecosystem.config.cjs --env production

# Save pm2 state so it auto-restarts on reboot
pm2 startup
pm2 save

# Check status
pm2 status
pm2 logs featherglobe-chat-proxy
```

### Step 4: Configure Caddy (HTTPS)

Create `/etc/caddy/Caddyfile`:

```
your-domain.com {
  reverse_proxy localhost:3000
  
  # Security headers
  header / {
    Strict-Transport-Security "max-age=31536000; includeSubDomains"
    X-Content-Type-Options "nosniff"
  }
  
  # Rate limiting at reverse proxy level (optional, Caddy handles it)
}
```

Start Caddy:
```bash
systemctl start caddy
systemctl enable caddy
```

### Step 5: Verify Deployment

```bash
# From local machine, test the deployed server:
curl -X POST https://your-domain.com/v1/chat \
  -H "Content-Type: application/json" \
  -H "X-App-Token: your_secret_app_token_here" \
  -d '{"messages": [{"role": "user", "content": "Hello"}]}'

# Check health
curl https://your-domain.com/health
```

### Monitoring

```bash
# View logs
pm2 logs featherglobe-chat-proxy

# Restart the app
pm2 restart featherglobe-chat-proxy

# Stop the app
pm2 stop featherglobe-chat-proxy
```

### Maintenance

1. **Rotate Groq API key:**
   - Update `.env` on the VPS
   - Restart: `pm2 restart featherglobe-chat-proxy`

2. **Update the app:**
   - Build locally: `npm run build`
   - Copy to VPS
   - Restart: `pm2 restart featherglobe-chat-proxy`

3. **Check Groq usage:**
   - Go to https://console.groq.com and check your API usage
   - Monitor `pm2 logs` for rate limit errors (429 responses)

## Architecture Notes

- **Non-streaming:** The server responds with a single `{reply}` object for simplicity on React Native
- **Rate limiting:** 20 requests per 10 minutes per IP + 500 per day globally (prevent abuse of free Groq tier)
- **Request validation:** Zod schema enforces message count, size, and role restrictions
- **HTTPS required:** Caddy provides automatic Let's Encrypt certificates
- **No message logging:** Chat content is never logged to disk (only Groq sees it)

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `GROQ_API_KEY not found` | Make sure `.env` is created and has a valid Groq API key |
| `Address already in use` | Port 3000 is in use. Change `PORT` in `.env` or kill the process: `lsof -i :3000` |
| `Connection refused` from app | Check that the server URL in the app matches your domain, and Caddy is running |
| `429 Too Many Requests` | Groq free tier or your rate limits exceeded. Check `pm2 logs` for details |
| `Caddy certificate errors` | Ensure your domain's DNS points to the VPS IP. Caddy will auto-create certificates on first request |
