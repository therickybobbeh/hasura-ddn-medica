# GitHub Secrets Setup Guide

This guide shows you how to set up the required GitHub Secrets for the Docker build workflow.

## Required Secrets

You need to create **3 secrets** in total:

### 1. DOCKERHUB_USERNAME
Your Docker Hub username.

**Value:** `rickybobbeh`

### 2. DOCKERHUB_TOKEN
Your Docker Hub access token (NOT your password).

**How to get it:**
1. Go to [Docker Hub](https://hub.docker.com/)
2. Log in
3. Click your username → **Account Settings**
4. Go to **Security** tab
5. Click **New Access Token**
6. Name: `github-actions`
7. Permissions: **Read & Write**
8. Click **Generate**
9. **Copy the token immediately** (you won't see it again!)

### 3. DDN_ENV_LOCAL
The contents of your local `.env` file.

**How to get it:**
```bash
# From the repository root
cat sample-project-1/.env
```

Copy the **entire output** - all environment variables.

## How to Add Secrets to GitHub

1. Go to your GitHub repository: https://github.com/therickybobbeh/hasura-ddn-poc

2. Click **Settings** tab

3. In left sidebar: **Secrets and variables** → **Actions**

4. Click **New repository secret**

5. Add each secret one at a time:

### Adding DOCKERHUB_USERNAME
- Name: `DOCKERHUB_USERNAME`
- Secret: `rickybobbeh`
- Click **Add secret**

### Adding DOCKERHUB_TOKEN
- Name: `DOCKERHUB_TOKEN`
- Secret: [Paste your Docker Hub access token]
- Click **Add secret**

### Adding DDN_ENV_LOCAL
- Name: `DDN_ENV_LOCAL`
- Secret: [Paste the entire contents of your .env file]
- Click **Add secret**

**Important:** Make sure to paste the ENTIRE .env file, including all lines with environment variables.

## Verify Secrets Are Set

After adding all secrets, you should see 3 secrets in the list:
- ✅ DOCKERHUB_USERNAME
- ✅ DOCKERHUB_TOKEN
- ✅ DDN_ENV_LOCAL

## Example .env File Structure

Your DDN_ENV_LOCAL secret should look something like this:

```bash
APP_NEON_POSTGRES_1_AUTHORIZATION_HEADER="Bearer xxx..."
APP_NEON_POSTGRES_1_CONNECTION_URI="postgresql://..."
APP_NEON_POSTGRES_1_HASURA_CONNECTOR_PORT=5637
APP_NEON_POSTGRES_1_HASURA_SERVICE_TOKEN_SECRET="xxx..."
APP_NEON_POSTGRES_1_OTEL_EXPORTER_OTLP_ENDPOINT="http://local.hasura.dev:4317"
APP_NEON_POSTGRES_1_OTEL_SERVICE_NAME="app_neon_postgres_1"
APP_NEON_POSTGRES_1_READ_URL="http://local.hasura.dev:5637"
APP_NEON_POSTGRES_1_WRITE_URL="http://local.hasura.dev:5637"
# ... and so on for all connectors
```

## Updating the .env File

If you change your local `.env` file and need to update the GitHub Secret:

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Find **DDN_ENV_LOCAL**
3. Click the pencil icon (Edit)
4. Paste the new .env file contents
5. Click **Update secret**

## Security Notes

- ✅ Secrets are encrypted and only exposed during workflow runs
- ✅ Secrets are not visible in logs or to other users
- ✅ Use access tokens, not passwords
- ❌ Never commit `.env` files to git
- ❌ Never paste secrets in PR comments or issues

## Testing the Workflow

After adding all secrets:

1. Go to **Actions** tab
2. Click **Push to Image Registry**
3. Click **Run workflow**
4. Select branch: `sample-implementaion`
5. Connectors: `all`
6. Tag: `latest`
7. Push to Docker Hub: ✅ checked
8. Click **Run workflow**

The workflow should now:
1. Install DDN CLI ✅
2. Create .env file from secret ✅
3. Build supergraph metadata ✅
4. Build and push all Docker images ✅

## Troubleshooting

### "DDN_ENV_LOCAL not found"
- Make sure you named the secret exactly `DDN_ENV_LOCAL` (case-sensitive)
- Check that you pasted the entire .env file content

### "node: .env: not found"
- The secret is empty or wasn't created
- Re-create the secret with the full .env file contents

### Docker login failed
- Check `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN` are set correctly
- Make sure you used an access token, not your password
- Try regenerating the Docker Hub access token
