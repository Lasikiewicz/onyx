# Google Analytics Setup Guide for Onyx

This guide explains how to set up Google Analytics (GA4) and connect it to your Onyx website.

## 1. Create a Google Analytics Account
1. Go to [analytics.google.com](https://analytics.google.com/).
2. Log in with your Google account.
3. Click **Start measuring**.
4. **Account setup**: Enter an Account Name (e.g., "Onyx Launcher").
5. Configure data sharing settings (optional) and click **Next**.

## 2. Create a Property
1. **Property details**:
   - **Property name**: Enter "Onyx Website".
   - **Reporting time zone**: Select your time zone.
   - **Currency**: Select your currency.
2. Click **Next**.
3. **Business details**: Select your industry (e.g., "Games" or "Computers & Electronics") and business size. Click **Next**.
4. **Business objectives**: Select "Generate leads" or "Examine user behavior" (or "Get baseline reports").
5. Click **Create** and accept the Terms of Service.

## 3. Set up a Web Data Stream
1. In the **Start collecting data** screen, choose **Web**.
2. **Website URL**: Enter your website URL (e.g., `onyxlauncher.com` or your cloudflare domain).
3. **Stream name**: Enter "Onyx Website".
4. Click **Create stream**.

## 4. Get Your Measurement ID
1. You will see a **Web stream details** screen.
2. Copy the **Measurement ID** in the top right `MEASUREMENT ID` card. It looks like `G-XXXXXXXXXX`.

## 5. Add to Project
You have two options to add this ID to your project:

### Option A: Environment Variable (Recommended)
1. In the `website/` root directory, create a file named `.env` if it doesn't exist.
2. Add the following line:
   ```
   PUBLIC_GA_ID=G-XXXXXXXXXX
   ```
   (Replace `G-XXXXXXXXXX` with your actual ID).
3. Restart your dev server (`npm run dev`).

### Option B: Hardcode in Layout (If .env doesn't work)
1. Open `src/layouts/Layout.astro`.
2. Find the line: `const GA_ID = import.meta.env.PUBLIC_GA_ID || 'G-XXXXXXXXXX';`
3. Replace `'G-XXXXXXXXXX'` with your actual ID string.
