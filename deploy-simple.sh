#!/bin/bash

echo "🚀 Simple Direct Deployment"
echo "=========================="

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

# Go to web directory
cd apps/web

echo -e "${BLUE}🔨 Testing build locally first...${NC}"
npm run build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Local build successful!${NC}"
else
    echo "❌ Local build failed!"
    exit 1
fi

echo -e "${BLUE}🚀 Deploying from web directory...${NC}"
vercel --prod --yes

echo -e "${GREEN}✅ Deployment initiated!${NC}"