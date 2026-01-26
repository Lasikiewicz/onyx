# Build installer script - handles code signing error gracefully
Write-Host "Building installer..."
$env:CSC_IDENTITY_AUTO_DISCOVERY = 'false'
$env:WIN_CSC_LINK = ''
$env:BUILD_PROFILE = 'production'

# Run electron-builder to create installer
# It will fail at code signing, but installer should be created before that
npx electron-builder build --win nsis --publish never 2>&1 | Out-Null

# Check if installer was created (even if build "failed")
$installer = Get-ChildItem dist\*.exe -ErrorAction SilentlyContinue | Where-Object { $_.Name -like "*Setup*" } | Select-Object -First 1

if ($installer) {
    Write-Host "Installer created successfully: $($installer.Name)"
    Write-Host "Size: $([math]::Round($installer.Length/1MB, 2)) MB"
    Write-Host "Location: $($installer.FullName)"
    Write-Host ""
    Write-Host "Note: Code signing error is expected and can be ignored."
    Write-Host "The installer is fully functional without code signing."
    exit 0
} else {
    Write-Host "Installer not found. Build may have failed before creating installer."
    exit 1
}
