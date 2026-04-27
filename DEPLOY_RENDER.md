# Deploy To GitHub And Render

## 1. Create a Git repository

Run these commands in the project root:

```bash
git init
git add .
git commit -m "Initial Company Staff Order Notifier app"
```

## 2. Push to GitHub

Create an empty GitHub repository first, then run:

```bash
git branch -M main
git remote add origin <YOUR_GITHUB_REPO_URL>
git push -u origin main
```

## 3. Create the Render services

Use Render Blueprint deploy from the repo root. This project includes `render.yaml`.

Render will create:

- A Node web service named `company-staff-order-notifier`
- A PostgreSQL database named `company-staff-order-notifier-db`

## 4. Set required Render environment variables

Set these secret values in Render during Blueprint creation:

- `SHOPIFY_API_KEY`
- `SHOPIFY_API_SECRET`
- `SHOPIFY_APP_URL`

Render provides `DATABASE_URL` automatically from the Render Postgres service.

## 5. After Render creates the app URL

Copy your Render URL, for example:

```text
https://company-staff-order-notifier.onrender.com
```

Then:

1. Set Render env var `SHOPIFY_APP_URL` to that exact URL
2. Update your active Shopify app TOML config so `application_url` and auth redirects use that same URL
3. Run `shopify app deploy`

## 6. Shopify app config values to update before deploy

Use your production app config file and set:

- `application_url = "https://your-render-url.onrender.com"`
- auth redirect URLs that point to that same Render URL

Example:

```toml
application_url = "https://your-render-url.onrender.com"

[auth]
redirect_urls = [
  "https://your-render-url.onrender.com/auth/callback",
  "https://your-render-url.onrender.com/auth/shopify/callback",
  "https://your-render-url.onrender.com/api/auth/callback"
]
```

## 7. Required SMTP setup in the app UI

After the app is live and installed on the real store:

1. Open the embedded app
2. Go to Settings
3. Enter SMTP values
4. Save
5. Send a test email

## 8. Important note about staff lookup

This deployment is configured to rely on fallback company recipient mappings by default.

The app currently requests:

- `read_orders`
- `read_customers`

It does not request `read_users`, because Shopify commonly restricts that scope for standard app installs.
