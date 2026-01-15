# Fix Call of Duty Black Ops 7 launch properties
# This script updates the game library JSON to add the proper Xbox launch properties

$libraryPath = "$env:APPDATA\onyx-launcher\game-library.json"

if (!(Test-Path $libraryPath)) {
    Write-Error "Game library not found at: $libraryPath"
    exit 1
}

# Backup the library
Copy-Item $libraryPath "$libraryPath.backup" -Force
Write-Host "✓ Created backup: $libraryPath.backup" -ForegroundColor Green

# Read library
$data = Get-Content $libraryPath -Raw | ConvertFrom-Json

# Find Call of Duty game
$gameIndex = -1
for ($i = 0; $i -lt $data.library.Count; $i++) {
    if ($data.library[$i].id -like "*Call of Duty*") {
        $gameIndex = $i
        break
    }
}

if ($gameIndex -eq -1) {
    Write-Error "Call of Duty game not found in library"
    exit 1
}

$game = $data.library[$gameIndex]
Write-Host "`nFound game:" -ForegroundColor Cyan
Write-Host "  ID: $($game.id)"
Write-Host "  Title: $($game.title)"

# Update properties
$game.xboxKind = "pc"
$game.appUserModelId = "38985CA0.COREBase_5bkah9njm3e9g!codShip"
$game.launchUri = "shell:AppsFolder\38985CA0.COREBase_5bkah9njm3e9g!codShip"

Write-Host "`nUpdating properties:" -ForegroundColor Yellow
Write-Host "  xboxKind: pc"
Write-Host "  appUserModelId: 38985CA0.COREBase_5bkah9njm3e9g!codShip"
Write-Host "  launchUri: shell:AppsFolder\38985CA0.COREBase_5bkah9njm3e9g!codShip"

# Save library
$data.library[$gameIndex] = $game
$data | ConvertTo-Json -Depth 100 | Set-Content $libraryPath -Force

Write-Host "`n✓ Successfully updated Call of Duty launch properties!" -ForegroundColor Green
Write-Host "`nRestart Onyx for changes to take effect." -ForegroundColor Cyan
