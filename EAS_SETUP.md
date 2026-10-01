# EAS Setup Guide for ParksGuide Chat

This guide explains how to set up EAS (Expo Application Services) for building and submitting your app to the App Store.

## Prerequisites

- Apple Developer account
- Xcode 15+
- npm installed globally

## Step 1: Install EAS CLI

```bash
npm install -g eas-cli@latest
```

## Step 2: Log in to EAS

```bash
eas login
```

This will open a browser where you can log in with your Expo account (create one if needed).

## Step 3: Initialize EAS Project

```bash
eas init
```

This command will:
- Ask if you want to create a new project or link an existing one
- Generate your project ID (a unique identifier for your app)
- Update `eas.json` with the project ID

When prompted, select "Create new project".

## Step 4: Set Up Environment Variables

The chat feature requires two environment variables:

```bash
eas env:create
```

When prompted, create a production environment with these variables:

```
EXPO_PUBLIC_CHAT_API_URL=https://your-chat-server.com
EXPO_PUBLIC_CHAT_APP_TOKEN=your-secret-app-token
```

Replace:
- `https://your-chat-server.com` with the URL of your deployed chat proxy server on Hostinger
- `your-secret-app-token` with the same token you set as `APP_TOKEN` on your server (see `server/.env`)

**Important:** These variables are public (prefixed with `EXPO_PUBLIC_`), so the app token is extractable from the app bundle. Treat it as a rate-limit speed bump, not security. See the plan for more details on security considerations.

## Step 5: Configure App Store Connect

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Create a new app:
   - Platform: iOS
   - Name: ParksGuide
   - Bundle ID: `com.nitinfed.parksguide` (must match `app.json`)
   - SKU: Any unique identifier (e.g., `parksguide-2026`)
3. Fill out the app details, privacy policy, screenshots, etc.
4. Create an App Store Connect API key for EAS:
   - In App Store Connect: Users and Access → Keys → In-App Purchase
   - Or: Users and Access → Keys → App Store Connect API
   - Add a new key with "Developer" role
   - Download the key file

## Step 6: Add App Store Connect Key to EAS

```bash
eas credentials
```

Follow the prompts to:
1. Select iOS
2. Select "production"
3. Upload your App Store Connect API key (from Step 5)
4. Let EAS create a certificate and provisioning profile

## Step 7: Build for App Store

```bash
eas build -p ios --profile production
```

This will:
- Build your app in the cloud
- Code-sign it with your certificate
- Generate an `.ipa` file (app binary)
- Take 10-20 minutes to complete

Monitor progress with:
```bash
eas build:list
eas build:view <build-id>
```

## Step 8: Submit to App Store

Once the build completes:

```bash
eas submit -p ios --profile production
```

This will prompt you to:
1. Select the build to submit
2. Confirm submission

The build will be reviewed by Apple (typically 24-48 hours).

## Step 9: Set Up App Review Requirements

Before submission, ensure your app meets App Review guidelines for the chat feature:

1. **Privacy Policy:** Update your privacy policy to disclose:
   - Chat messages are sent to a third-party LLM provider (Groq)
   - Trip data is sent with chat messages to provide context
   - Link to Groq's privacy policy

2. **In-App Disclosure:** Add a first-run screen that:
   - Informs users that chat uses AI
   - Names the provider (Groq)
   - Requires consent to proceed

3. **Content Moderation:**
   - Your chat system has a system prompt that prevents harmful requests
   - Consider implementing a "Report" feature (already in ChatView.tsx)
   - Keep logs for abuse patterns (without storing message content)

4. **Demo Account:**
   - Create a test trip with parks for reviewers
   - Prepare demo text showing chat features
   - Include in review notes

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `eas login` fails | Ensure you have an Expo account and are logged in |
| Build fails with certificate error | Run `eas credentials` to update your signing credentials |
| App crashes on launch | Check that `EXPO_PUBLIC_CHAT_API_URL` and `EXPO_PUBLIC_CHAT_APP_TOKEN` are set correctly |
| Chat feature unavailable | Verify the proxy server is running and accessible at the configured URL |
| App rejected for "AI content" | Review the content moderation guidelines above and update your app privacy labels |

## Useful Commands

```bash
# View build history
eas build:list

# View specific build details
eas build:view <build-id>

# Check submission status
eas submit:list

# View credentials
eas credentials

# Update environment variables
eas env:update
```

## Next Steps

1. Deploy the chat proxy server to Hostinger (see `server/README.md`)
2. Update `EXPO_PUBLIC_CHAT_API_URL` in EAS environment
3. Complete the app privacy policy and in-app disclosures
4. Test the app on a physical device or TestFlight
5. Submit to App Store

## References

- [EAS Build Documentation](https://docs.expo.dev/eas/index.md)
- [App Store Connect Help](https://help.apple.com/app-store-connect/)
- [Groq API Docs](https://console.groq.com/docs)
