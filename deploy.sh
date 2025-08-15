#!/bin/bash

# Vercel Deployment Script for Garden Designer
# This script automates the deployment process to Vercel

set -e

echo "🌱 Garden Designer - Vercel Deployment"
echo "======================================"

# Check if Vercel CLI is available
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Check if user is logged in to Vercel
if ! vercel whoami &> /dev/null; then
    echo "🔐 Please log in to Vercel..."
    vercel login
fi

# Build the project
echo "🔨 Building project..."
npm run build:vercel

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
else
    echo "❌ Build failed!"
    exit 1
fi

# Deploy to Vercel
echo "🚀 Deploying to Vercel..."
if [ "$1" = "--prod" ]; then
    echo "📦 Deploying to production..."
    vercel --prod
else
    echo "🔍 Deploying preview..."
    vercel
fi

echo "🎉 Deployment complete!"
echo "📱 Check your Vercel dashboard for the deployment URL"
