#!/bin/bash

echo "🚀 Final Clean Deployment"
echo "========================"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Go to web directory
cd apps/web

echo -e "${BLUE}🔧 Creating clean package.json for deployment...${NC}"

# Backup original package.json
cp package.json package.json.backup

# Create clean package.json without problematic dependencies
cat > package.json << 'EOF'
{
  "name": "web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.38.0",
    "lucide-react": "^0.263.1",
    "next": "^15.3.4",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.0.0",
    "@types/react-dom": "^18.0.0",
    "autoprefixer": "^10.4.21",
    "postcss": "^8.5.6",
    "tailwindcss": "^3.4.17",
    "typescript": "^5.0.0"
  }
}
EOF

echo -e "${BLUE}🧹 Cleaning node_modules and lock files...${NC}"
rm -rf node_modules package-lock.json

echo -e "${BLUE}📦 Installing clean dependencies...${NC}"
npm install

echo -e "${BLUE}🔨 Testing build...${NC}"
npm run build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Clean build successful!${NC}"
else
    echo "❌ Build failed! Restoring original package.json..."
    mv package.json.backup package.json
    exit 1
fi

echo -e "${BLUE}🚀 Deploying clean version...${NC}"
vercel --prod --yes

echo -e "${YELLOW}🔄 Restoring original package.json...${NC}"
mv package.json.backup package.json

echo -e "${GREEN}✅ Deployment complete!${NC}"