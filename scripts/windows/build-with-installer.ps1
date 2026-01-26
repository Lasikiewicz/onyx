# Build script that creates installer even if code signing fails
Write-Host "Building application..."
$env:CSC_IDENTITY_AUTO_DISCOVERY = 'false'
$env:WIN_CSC_LINK = ''
$env:BUILD_PROFILE = 'production'

# Run the build (it will fail at code signing, but unpacked build will be created)
npm run build:prod 2>&1 | Out-Null

# Check if unpacked build exists
if (Test-Path "dist\win-unpacked\onyx-launcher.exe") {
    Write-Host "✓ Unpacked build created successfully"
    
    # Get version
    $version = (Get-Content package.json | ConvertFrom-Json).version
    $productName = "Onyx"
    
    Write-Host "Creating installer from unpacked build..."
    
    # Use electron-builder to create just the installer, skipping the problematic signing step
    # We'll use a workaround: build only the NSIS installer target
    $env:CSC_IDENTITY_AUTO_DISCOVERY = 'false'
    $env:WIN_CSC_LINK = ''
    
    # Try to build just the installer with signing completely disabled
    $env:CSC_IDENTITY_AUTO_DISCOVERY = 'false'
    $env:WIN_CSC_LINK = ''
    npx electron-builder build --win nsis --publish never 2>&1 | Out-Null
    
    # Check if installer was created
    $installer = Get-ChildItem dist\*.exe | Where-Object { $_.Name -like "*Setup*" } | Select-Object -First 1
    
    if ($installer) {
        Write-Host "✓ Installer created: $($installer.Name)"
    } else {
        Write-Host "⚠ Installer not created by electron-builder"
        Write-Host "  Using unpacked build at: dist\win-unpacked\onyx-launcher.exe"
        Write-Host "  You can manually create an installer or use the portable ZIP"
    }
} else {
    Write-Host "✗ Build failed - unpacked build not found"
    exit 1
}
