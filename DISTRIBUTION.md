# Distribution Guide

## Publishing to npm

### Prerequisites

1. **npm account**: Create account at https://www.npmjs.com
2. **Login**: `npm login`
3. **Organization**: Request access to @absmartly org

### Publishing Steps

```bash
# 1. Build
npm run build

# 2. Test
npm run test:run

# 3. Version bump
npm version patch  # or minor, or major

# 4. Publish
npm publish --access public
```

### Version Management

```bash
# Patch release (0.1.0 → 0.1.1)
npm version patch

# Minor release (0.1.0 → 0.2.0)
npm version minor

# Major release (0.1.0 → 1.0.0)
npm version major
```

## Global Installation

Once published to npm:

```bash
# Install globally
npm install -g @absmartly/cli

# Use anywhere
abs experiments list
abs --version
```

## Creating Standalone Binaries

### Option 1: Using pkg

```bash
# Install pkg
npm install -g pkg

# Create binaries for all platforms
pkg . --out-path binaries

# This creates:
# - binaries/abs-linux
# - binaries/abs-macos
# - binaries/abs-win.exe
```

### Option 2: Using ncc + pkg

```bash
# Bundle with ncc first (smaller output)
npm install -g @vercel/ncc

# Bundle
ncc build dist/index.js -o bundle

# Then create binaries
pkg bundle/index.js --out-path binaries
```

### Binary Configuration

Add to `package.json`:

```json
{
  "pkg": {
    "scripts": "dist/**/*.js",
    "targets": [
      "node18-linux-x64",
      "node18-macos-x64",
      "node18-macos-arm64",
      "node18-win-x64"
    ],
    "outputPath": "binaries"
  }
}
```

## GitHub Releases

### Automated with GitHub Actions

Create `.github/workflows/release.yml`:

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          registry-url: 'https://registry.npmjs.org'

      - run: npm install
      - run: npm run build
      - run: npm run test:run

      - run: npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}

      - name: Create binaries
        run: |
          npm install -g pkg
          pkg . --out-path binaries

      - name: Create Release
        uses: softprops/action-gh-release@v1
        with:
          files: binaries/*
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## Homebrew Formula

Create a Homebrew tap:

```bash
# Create tap repository
# https://github.com/absmartly/homebrew-tap

# Create formula
brew create https://github.com/absmartly/cli-ts/archive/v0.1.0.tar.gz
```

Formula template (`Formula/absmartly-cli.rb`):

```ruby
class AbsmartlyCli < Formula
  desc "ABSmartly CLI - A/B Testing and Feature Flags"
  homepage "https://github.com/absmartly/cli-ts"
  url "https://github.com/absmartly/cli-ts/archive/v0.1.0.tar.gz"
  sha256 "..." # Calculate with: shasum -a 256 filename
  license "MIT"

  depends_on "node"

  def install
    system "npm", "install", *Language::Node.std_npm_install_args(libexec)
    bin.install_symlink Dir["#{libexec}/bin/*"]
  end

  test do
    assert_match "ABSmartly CLI", shell_output("#{bin}/abs --version")
  end
end
```

Install:
```bash
brew tap absmartly/tap
brew install absmartly-cli
```

## Docker Image

Create `Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist ./dist

RUN ln -s /app/dist/index.js /usr/local/bin/abs && \
    chmod +x /usr/local/bin/abs

ENTRYPOINT ["abs"]
CMD ["--help"]
```

Build and publish:

```bash
# Build
docker build -t absmartly/cli:latest .
docker build -t absmartly/cli:0.1.0 .

# Test
docker run --rm absmartly/cli:latest --version

# Publish
docker push absmartly/cli:latest
docker push absmartly/cli:0.1.0
```

## Installation Methods Summary

### npm (Recommended)
```bash
npm install -g @absmartly/cli
```

### Homebrew (macOS/Linux)
```bash
brew tap absmartly/tap
brew install absmartly-cli
```

### Binary Download
```bash
# Download from GitHub Releases
curl -L https://github.com/absmartly/cli-ts/releases/latest/download/abs-linux -o abs
chmod +x abs
sudo mv abs /usr/local/bin/
```

### Docker
```bash
docker pull absmartly/cli
docker run -it absmartly/cli experiments list
```

### From Source
```bash
git clone https://github.com/absmartly/cli-ts.git
cd cli-ts
npm install
npm run build
npm link
```

## Version Strategy

Follow semantic versioning:
- **Major** (1.0.0): Breaking changes
- **Minor** (0.2.0): New features, backward compatible
- **Patch** (0.1.1): Bug fixes

## Pre-release Checklist

Before publishing:
- [ ] All tests passing
- [ ] Build succeeds
- [ ] README updated
- [ ] CHANGELOG updated
- [ ] Version bumped
- [ ] Git tag created
- [ ] Binaries tested on all platforms

## Publishing Workflow

```bash
# 1. Ensure everything is committed
git status

# 2. Run tests
npm run test:run

# 3. Build
npm run build

# 4. Bump version
npm version patch -m "Release v%s"

# 5. Push with tags
git push && git push --tags

# 6. Publish to npm
npm publish --access public

# 7. Create GitHub release with binaries
# (automated via GitHub Actions)
```

## Current Status

- ✅ **Code**: Complete and tested
- ✅ **Build**: Successful
- ✅ **Tests**: 114 passing
- ✅ **Documentation**: Complete
- ⏳ **npm**: Ready to publish
- ⏳ **Binaries**: Ready to create
- ⏳ **Docker**: Ready to build
- ⏳ **Homebrew**: Ready to create formula

The project is **ready for distribution** whenever needed!
