#!/bin/bash

# post-merge-workflow.sh
# Automates the workflow after merging a PR in GitHub

set -e  # Exit on any error

# Configuration - Edit these variables to match your setup
MAIN_BRANCH="main"
DEV_BRANCH="yannik/dev" # $(git rev-parse --abbrev-ref HEAD)"

echo "🚀 Starting post-merge workflow..."

# Function to handle errors
handle_error() {
    echo "❌ Error occurred at line $1"
    echo "💡 You may need to manually resolve the issue and run the script again"
    exit 1
}

# Set up error handling
trap 'handle_error $LINENO' ERR

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "❌ Error: Not in a git repository"
    exit 1
fi

# Check if we have uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo "❌ Error: You have uncommitted changes. Please commit or stash them first."
    exit 1
fi

# Safety check - confirm before proceeding
echo ""
echo "📋 This script will:"
echo "   • Update $MAIN_BRANCH branch"
echo "   • Delete local $DEV_BRANCH branch (if it exists)"
echo "   • Create a new $DEV_BRANCH branch from $MAIN_BRANCH"
echo ""
read -p "🤔 Are you sure you want to continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Operation cancelled"
    exit 0
fi

# Switch to main and pull latest
echo "📥 Updating $MAIN_BRANCH branch..."
git checkout $MAIN_BRANCH
git pull origin $MAIN_BRANCH

# Delete local dev branch if it exists
if git show-ref --verify --quiet refs/heads/$DEV_BRANCH; then
    echo "🗑️  Deleting local $DEV_BRANCH branch..."
    git branch -d $DEV_BRANCH || {
        echo "⚠️  Branch has unmerged changes. Use -D to force delete? (y/N): "
        read -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            git branch -D $DEV_BRANCH
            echo "🗑️  Force deleted local $DEV_BRANCH branch"
        else
            echo "❌ Cannot delete branch with unmerged changes. Please resolve manually."
            exit 1
        fi
    }
    echo "🗑️  Deleted local $DEV_BRANCH branch"
fi

# Clean up remote tracking branches
git fetch --prune origin

# Create new dev branch from main
echo "🌿 Creating new $DEV_BRANCH branch..."
git checkout -b $DEV_BRANCH

# Push and set upstream
echo "📤 Publishing new $DEV_BRANCH branch..."
git push -u origin $DEV_BRANCH

echo ""
echo "✅ Post-merge workflow completed successfully!"
echo "🌿 You're now on $DEV_BRANCH branch and ready to continue development!"
echo ""
echo "📋 Summary of what was done:"
echo "   • Updated $MAIN_BRANCH branch with latest changes"
echo "   • Cleaned up old $DEV_BRANCH branch"
echo "   • Created new $DEV_BRANCH branch from $MAIN_BRANCH"
echo "   • Published new $DEV_BRANCH branch to remote" 