# 🌱 Garden Designer - 3D Playable Ad

A beautiful 3D garden design application built with Three.js, TypeScript, and Vite. Create and customize your garden with interactive 3D objects, day/night cycles, and immersive audio.

## ✨ Features

- **3D Garden Environment**: Beautiful 3D scene with realistic lighting and shadows
- **Interactive Object Placement**: Drag and drop items from UI to 3D scene
- **Object Manipulation**: Select, move, and delete placed objects
- **Day/Night Cycle**: Toggle between day and night modes with dynamic lighting
- **Background Music**: Looping theme music with click sound effects
- **Visual Selection**: Enhanced highlighting with rings, text, and animations
- **Responsive Design**: Scales to fit any screen size

## 🚀 Quick Start

### Development
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Open http://localhost:3000
```

### Build
```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## 🌐 Deploy to Vercel

### Option 1: Automatic Deployment (Recommended)

1. **Fork or clone** this repository to your GitHub account
2. **Connect to Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Vercel will automatically detect the Vite configuration

3. **Deploy**: Vercel will automatically build and deploy your app

### Option 2: Manual Deployment

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Build the project**:
   ```bash
   npm run build
   ```

3. **Deploy**:
   ```bash
   vercel --prod
   ```

### Option 3: GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Vercel
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          working-directory: ./
```

## 🔧 Configuration

### Vercel Settings

The `vercel.json` file is pre-configured with:
- **Static build** from `dist` directory
- **SPA routing** (all routes serve `index.html`)
- **Optimized caching** for assets and HTML
- **Environment variables** for production

### Build Output

- **Source**: `src/` directory
- **Build**: `dist/` directory (auto-generated)
- **Assets**: `assets/` directory with 3D models and textures

## 📁 Project Structure

```
test_playable/
├── src/
│   ├── GardenDesigner.ts      # Main 3D scene manager
│   ├── AssetManager.ts        # 3D asset loading
│   ├── UIManager.ts          # User interface
│   ├── DragAndDropManager.ts # Drag and drop functionality
│   ├── DayNightSystem.ts     # Day/night cycle
│   ├── AudioManager.ts       # Audio management
│   ├── GardenItem.ts         # Individual garden items
│   └── config/
│       └── uiConfig.ts       # UI configuration
├── assets/
│   ├── gltf/                 # 3D models
│   ├── images/               # Textures and icons
│   └── sounds/               # Audio files
├── vercel.json               # Vercel configuration
├── .vercelignore            # Vercel ignore rules
└── package.json             # Dependencies and scripts
```

## 🎮 How to Use

1. **Choose Category**: Click "Plants" to see available items
2. **Place Items**: Click on items to place them in your garden
3. **Select Objects**: Click on placed objects to select them
4. **Move Objects**: Drag selected objects to new positions
5. **Delete Objects**: Press Delete key to remove selected objects
6. **Toggle Day/Night**: Use the day/night button for different lighting
7. **Music Control**: Toggle background music on/off

## 🛠️ Technologies

- **Three.js**: 3D graphics and rendering
- **TypeScript**: Type-safe JavaScript
- **Vite**: Build tool and development server
- **TWEEN.js**: Smooth animations
- **GLTF**: 3D model format

## 📱 Responsive Design

The application automatically scales to fit any screen size:
- **Desktop**: Full 1920x1080 experience
- **Tablet**: Scaled down proportionally
- **Mobile**: Optimized for touch interactions

## 🔍 Debug Features

- **Console Logging**: Detailed logs for development
- **Debug Panel**: Optional debug tools (configurable)
- **Asset Status**: Real-time loading information

## 📄 License

This project is part of a playable ad system. All rights reserved.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

For questions or issues:
- Check the console for error messages
- Review the configuration files
- Ensure all assets are properly loaded

---

**Happy Gardening! 🌿✨** 