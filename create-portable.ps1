# Create portable version from unpacked build (code signing not needed for Windows)
$sourceDir = "dist\win-unpacked"
$outputDir = "dist"
$version = (Get-Content package.json | ConvertFrom-Json).version
$portableName = "Onyx $version Portable.exe"

if (Test-Path "$sourceDir\onyx-launcher.exe") {
    Write-Host "Creating portable ZIP from unpacked build..."
    
    # Create a ZIP file with all necessary files
    $zipPath = "$outputDir\Onyx-$version-Portable.zip"
    if (Test-Path $zipPath) {
        Remove-Item $zipPath -Force
    }
    
    Compress-Archive -Path "$sourceDir\*" -DestinationPath $zipPath -Force
    
    Write-Host "✓ Portable ZIP created: $zipPath"
    Write-Host "✓ Unpacked EXE available at: $sourceDir\onyx-launcher.exe"
    Write-Host ""
    Write-Host "Note: Code signing is disabled (not needed for Windows)."
    Write-Host "The unpacked EXE in win-unpacked folder is fully functional."
} else {
    Write-Host "Error: Unpacked build not found at $sourceDir"
    exit 1
}
