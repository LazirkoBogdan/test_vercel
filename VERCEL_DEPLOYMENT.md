# Vercel Deployment Guide

This guide will help you deploy your Garden Designer application to Vercel.

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **Vercel CLI**: Install globally or use the project-local version
3. **Git Repository**: Your project should be in a Git repository (GitHub, GitLab, etc.)

## Quick Deployment

### Option 1: Deploy via Vercel Dashboard (Recommended for first deployment)

1. **Push your code to GitHub/GitLab**
   ```bash
   git add .
   git commit -m "Add Vercel support"
   git push origin main
   ```

2. **Import to Vercel**
   - Go to [vercel.com/new](https://vercel.com/new)
   - Import your Git repository
   - Vercel will automatically detect it's a Vite project
   - Set build command: `npm run vercel-build`
   - Set output directory: `dist`
   - Deploy!

### Option 2: Deploy via CLI

1. **Install Vercel CLI** (if not already installed)
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   # Deploy to preview
   npm run deploy:preview
   
   # Deploy to production
   npm run deploy
   ```

## Build Configuration

The project is configured with the following build settings:

- **Build Command**: `npm run vercel-build`
- **Output Directory**: `dist`
- **Node.js Version**: 18.x

## Environment Variables

If you need to add environment variables:

1. **Via Dashboard**: Go to your project settings in Vercel
2. **Via CLI**: Use `vercel env add`
3. **Via vercel.json**: Add to the `env` section

## Custom Domain

1. Go to your project settings in Vercel
2. Navigate to "Domains"
3. Add your custom domain
4. Follow the DNS configuration instructions

## Performance Optimizations

The `vercel.json` includes:

- **Asset Caching**: 1-year cache for static assets
- **Route Optimization**: SPA fallback for client-side routing
- **Build Optimization**: Proper chunk splitting for Three.js

## Troubleshooting

### Build Failures

1. **Check build logs** in Vercel dashboard
2. **Verify Node.js version** (should be 18.x)
3. **Check TypeScript compilation** locally first

### Asset Loading Issues

1. **Verify asset paths** in the built files
2. **Check .vercelignore** doesn't exclude needed files
3. **Ensure copy-assets script** runs successfully

### Performance Issues

1. **Enable Vercel Analytics** for insights
2. **Check bundle size** with `npm run build`
3. **Verify asset compression** is working

## Monitoring & Analytics

- **Vercel Analytics**: Built-in performance monitoring
- **Real User Monitoring**: Track actual user experience
- **Speed Insights**: Core Web Vitals tracking

## Automatic Deployments

Vercel automatically deploys:
- **Preview deployments** for every pull request
- **Production deployments** when merging to main branch
- **Branch deployments** for feature branches

## Rollback

If something goes wrong:
1. Go to your project in Vercel dashboard
2. Navigate to "Deployments"
3. Find a working deployment
4. Click "Promote to Production"

## Support

- **Vercel Documentation**: [vercel.com/docs](https://vercel.com/docs)
- **Vercel Community**: [github.com/vercel/vercel/discussions](https://github.com/vercel/vercel/discussions)
- **Project Issues**: Check your project's issue tracker
