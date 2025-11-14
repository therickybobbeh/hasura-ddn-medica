# Docker Hub Build and Push Setup

This guide explains how to set up and use the GitHub Actions workflow to build and push Docker images to Docker Hub.

## Docker Hub Repositories

Your images will be pushed to these Docker Hub repositories:

- `rickybobbeh/ddn-engine` - Hasura DDN Engine
- `rickybobbeh/ddn-connector-1` - neon_postgres_1 connector
- `rickybobbeh/ddn-connector-2` - neon_postgres_2 connector
- `rickybobbeh/ddn-connector-3` - neon_postgres_lean connector

## Prerequisites

### 1. Create Docker Hub Access Token

You need a Docker Hub access token (not your password) for secure authentication:

1. Go to [Docker Hub](https://hub.docker.com/)
2. Log in to your account (`rickybobbeh`)
3. Click on your username in the top right → **Account Settings**
4. Go to **Security** tab
5. Click **New Access Token**
6. Name it something like `github-actions`
7. Set permissions to **Read & Write**
8. Click **Generate**
9. **IMPORTANT**: Copy the token immediately - you won't be able to see it again!

### 2. Add GitHub Secrets

Add your Docker Hub credentials as GitHub repository secrets:

1. Go to your GitHub repository
2. Click **Settings** tab
3. In the left sidebar, click **Secrets and variables** → **Actions**
4. Click **New repository secret**
5. Add two secrets:

**Secret 1: DOCKERHUB_USERNAME**
- Name: `DOCKERHUB_USERNAME`
- Value: `rickybobbeh`
- Click **Add secret**

**Secret 2: DOCKERHUB_TOKEN**
- Name: `DOCKERHUB_TOKEN`
- Value: [Paste the access token you copied earlier]
- Click **Add secret**

## Using the Workflow

### Manual Trigger (Default)

The workflow is set up for manual triggering only:

1. Go to your GitHub repository
2. Click the **Actions** tab
3. In the left sidebar, click **Build and Push Docker Images**
4. Click **Run workflow** button (on the right)
5. You'll see options:
   - **Branch**: Select the branch to build from (usually `main` or `sample-implementation`)
   - **Custom version tag**: (Optional) Enter a version like `v1.0.0` or leave empty
6. Click the green **Run workflow** button
7. Wait for the workflow to complete (all 4 jobs run in parallel)

### Workflow Behavior

**Tagging:**
- All builds are tagged with `latest`
- If you provide a custom version (e.g., `v1.0.0`), images are also tagged with that version
- If triggered by a git tag, images are tagged with the git tag name

**Examples:**

**Example 1: Without custom version**
```bash
# Run workflow without version input
# Results in:
rickybobbeh/ddn-engine:latest
rickybobbeh/ddn-connector-1:latest
rickybobbeh/ddn-connector-2:latest
rickybobbeh/ddn-connector-3:latest
```

**Example 2: With custom version v1.0.0**
```bash
# Run workflow with version input: v1.0.0
# Results in:
rickybobbeh/ddn-engine:latest
rickybobbeh/ddn-engine:v1.0.0
rickybobbeh/ddn-connector-1:latest
rickybobbeh/ddn-connector-1:v1.0.0
rickybobbeh/ddn-connector-2:latest
rickybobbeh/ddn-connector-2:v1.0.0
rickybobbeh/ddn-connector-3:latest
rickybobbeh/ddn-connector-3:v1.0.0
```

**Example 3: From git tag**
```bash
# Create and push a git tag
git tag v1.2.0
git push origin v1.2.0

# Then run workflow (it auto-detects the tag)
# Results in:
rickybobbeh/ddn-engine:latest
rickybobbeh/ddn-engine:v1.2.0
# ... same for all connectors
```

## Using the Images

### In Docker Compose

Update your `compose.yaml` to use the Docker Hub images:

```yaml
services:
  engine:
    image: rickybobbeh/ddn-engine:latest  # or use specific version like :v1.0.0
    # Remove the 'build' section
    environment:
      # ... existing environment variables

  # In connector compose files:
  app_neon_postgres_1:
    image: rickybobbeh/ddn-connector-1:latest
    # Remove the 'build' section
```

### In Kubernetes

Reference the images in your Kubernetes deployment manifests:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: hasura-engine
spec:
  template:
    spec:
      containers:
      - name: engine
        image: rickybobbeh/ddn-engine:latest
        # or use pinned version for production:
        # image: rickybobbeh/ddn-engine:v1.0.0
```

### Pulling Images Locally

```bash
# Pull latest versions
docker pull rickybobbeh/ddn-engine:latest
docker pull rickybobbeh/ddn-connector-1:latest
docker pull rickybobbeh/ddn-connector-2:latest
docker pull rickybobbeh/ddn-connector-3:latest

# Or pull specific version
docker pull rickybobbeh/ddn-engine:v1.0.0
```

## Workflow Features

### Build Caching
The workflow uses Docker layer caching to speed up builds. The first build may take longer, but subsequent builds will be much faster.

### Parallel Builds
All 4 images build simultaneously in parallel jobs, reducing total build time.

### Build Metadata
Each image includes metadata labels with:
- Git commit SHA
- Build date
- GitHub repository information
- Any custom tags you provide

## Troubleshooting

### Authentication Failed

**Error**: `unauthorized: incorrect username or password`

**Solution**:
1. Verify your GitHub Secrets are set correctly:
   - Check spelling: `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN`
   - Ensure you're using an access token, not your password
   - Try regenerating a new Docker Hub access token

### Build Failed

**Error**: Build fails during image creation

**Solution**:
1. Check the build logs in GitHub Actions
2. Verify Dockerfiles exist at the expected paths
3. Ensure build contexts have required files (configuration.json, schema.json, etc.)
4. Try building locally first:
   ```bash
   docker build -t test-engine -f engine/Dockerfile.engine engine/
   ```

### Images Not Appearing on Docker Hub

**Solution**:
1. Check that the workflow completed successfully (all green checkmarks)
2. Verify repositories exist on Docker Hub
3. Check repository visibility settings (public vs private)
4. Wait a minute and refresh Docker Hub - sometimes there's a delay

## Version Strategy Recommendations

### For Development
Use `latest` tag for rapid iteration:
```yaml
image: rickybobbeh/ddn-engine:latest
```

### For Production
Use specific version tags for stability:
```yaml
image: rickybobbeh/ddn-engine:v1.0.0
```

### Semantic Versioning
Recommended version format:
- `v1.0.0` - Major release
- `v1.1.0` - Minor release (new features)
- `v1.1.1` - Patch release (bug fixes)
- `v1.0.0-beta.1` - Pre-release versions

## Quick Reference

| Action | Steps |
|--------|-------|
| Set up credentials | Add `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN` to GitHub Secrets |
| Build all images | Actions → Build and Push Docker Images → Run workflow |
| Build specific version | Run workflow with custom version input (e.g., `v1.0.0`) |
| Pull images locally | `docker pull rickybobbeh/ddn-engine:latest` |
| Use in K8s | `image: rickybobbeh/ddn-engine:v1.0.0` |
| View on Docker Hub | https://hub.docker.com/u/rickybobbeh |

## Next Steps

1. Set up GitHub Secrets (see above)
2. Run the workflow once to test
3. Verify images appear on Docker Hub
4. Update your Kubernetes manifests to use the images
5. Consider setting up automatic builds on main branch (optional)

For local development, continue using `ddn run docker-start` which builds from source.
For production deployments, use the pre-built images from Docker Hub.
