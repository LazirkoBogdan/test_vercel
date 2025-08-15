# Vercel Deployment Guide

This guide will help you deploy your Garden Designer application to Vercel.

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **Vercel CLI** (optional but recommended):
   ```bash
   npm i -g vercel
   ```

## Project Structure

The build process creates the following structure in the `dist` directory:
```
dist/
├── index.html
└── assets/
    ├── icon.png
    ├── index.js
    ├── three.js
    ├── tween.js
    ├── objects.blend
    ├── ground.blend
    ├── gltf/          # 3D models
    ├── images/        # Textures
    └── sounds/        # Audio files
```

## Deployment Steps

### Option 1: Deploy via Vercel Dashboard (Recommended)

1. **Push your code to GitHub/GitLab/Bitbucket**
2. **Connect your repository to Vercel**:
   - Go to [vercel.com/new](https://vercel.com/new)
   - Import your Git repository
   - Vercel will automatically detect it's a Vite project

3. **Configure build settings**:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

4. **Deploy**: Click "Deploy" and wait for the build to complete

### Option 2: Deploy via Vercel CLI

1. **Login to Vercel**:
   ```bash
   vercel login
   ```

2. **Deploy from your project directory**:
   ```bash
   vercel
   ```

3. **Follow the prompts**:
   - Link to existing project or create new
   - Confirm build settings
   - Deploy

## Build Configuration

The project is configured with:
- **Build Command**: `npm run build` (includes asset copying)
- **Output Directory**: `dist`
- **Node.js Version**: Latest LTS (automatically detected)
- **Asset Management**: Automatic copying of all assets to `dist/assets/`

## Environment Variables

No environment variables are required for this project.

## Custom Domain (Optional)

After deployment:
1. Go to your project dashboard on Vercel
2. Navigate to "Settings" → "Domains"
3. Add your custom domain
4. Configure DNS records as instructed

## Troubleshooting

### Build Failures
- Ensure all dependencies are in `package.json`
- Check that TypeScript compilation succeeds locally
- Verify the build command works: `npm run build`
- Ensure the `copyfiles` package is installed for asset copying

### Asset Loading Issues
- All assets are automatically copied to `dist/assets/` during build
- Check that file paths in your code reference `/assets/...`
- Verify the `vercel.json` routing configuration handles all asset types
- Ensure GLB/GLTF files are properly included in the build

### Performance Issues
- The build is optimized with code splitting for Three.js and Tween.js
- All assets are cached with appropriate headers (1 year cache)
- JavaScript, CSS, images, audio, and 3D models have separate cache policies
- Consider enabling Vercel's Edge Network for global performance

## Monitoring

After deployment, you can:
- View real-time logs in the Vercel dashboard
- Monitor performance with Vercel Analytics
- Set up alerts for build failures

## Updates

To update your deployment:
1. Push changes to your Git repository
2. Vercel will automatically trigger a new deployment
3. Preview deployments are created for pull requests

## Support

- [Vercel Documentation](https://vercel.com/docs)
- [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html)
- [Vercel Community](https://github.com/vercel/vercel/discussions)
