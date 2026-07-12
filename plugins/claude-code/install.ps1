[CmdletBinding()]
param(
  [switch]$Force,
  [string]$DestinationRoot = $HOME
)

$ErrorActionPreference = 'Stop'

$sourceRoot = $PSScriptRoot
$pluginRoot = Join-Path $DestinationRoot 'plugins\claude-code'
$node = Get-Command node.exe -ErrorAction SilentlyContinue
if (-not $node -or -not (Test-Path -LiteralPath $node.Source)) {
  throw 'Node.js was not found. Install Node.js, then run this installer again.'
}
$nodeSignature = Get-AuthenticodeSignature -LiteralPath $node.Source
if ($nodeSignature.Status -ne 'Valid') {
  throw "Node.js at $($node.Source) does not have a valid code signature."
}

if (Test-Path -LiteralPath $pluginRoot) {
  if (-not $Force) {
    throw "Plugin already exists at $pluginRoot. Re-run with -Force to replace it."
  }
  Remove-Item -LiteralPath $pluginRoot -Recurse -Force
}

New-Item -ItemType Directory -Path $pluginRoot -Force | Out-Null
Get-ChildItem -LiteralPath $sourceRoot -Force | ForEach-Object {
  Copy-Item -LiteralPath $_.FullName -Destination $pluginRoot -Recurse -Force
}

$mcpConfig = [ordered]@{
  mcpServers = [ordered]@{
    'claude-code-local' = [ordered]@{
      type = 'stdio'
      command = $node.Source
      args = @((Join-Path $pluginRoot 'scripts\claude-code-mcp.js'))
    }
  }
}
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$mcpConfigPath = Join-Path $pluginRoot '.mcp.json'
[System.IO.File]::WriteAllText($mcpConfigPath, ($mcpConfig | ConvertTo-Json -Depth 6), $utf8NoBom)

$marketplaceDir = Join-Path $DestinationRoot '.agents\plugins'
$marketplacePath = Join-Path $marketplaceDir 'marketplace.json'
New-Item -ItemType Directory -Path $marketplaceDir -Force | Out-Null

if (Test-Path -LiteralPath $marketplacePath) {
  $marketplace = Get-Content -LiteralPath $marketplacePath -Raw | ConvertFrom-Json
} else {
  $marketplace = [pscustomobject]@{
    name = 'personal'
    interface = [pscustomobject]@{ displayName = 'Personal' }
    plugins = @()
  }
}

$entry = [pscustomobject]@{
  name = 'claude-code'
  source = [pscustomobject]@{
    source = 'local'
    path = './plugins/claude-code'
  }
  policy = [pscustomobject]@{
    installation = 'AVAILABLE'
    authentication = 'ON_INSTALL'
  }
  category = 'Productivity'
}
$marketplace.plugins = @($marketplace.plugins | Where-Object { $_.name -ne 'claude-code' }) + $entry
[System.IO.File]::WriteAllText($marketplacePath, ($marketplace | ConvertTo-Json -Depth 8), $utf8NoBom)

Write-Host "Installed Claude Code plugin source at $pluginRoot"
Write-Host 'Start a new Codex task, then install or enable Claude Code from the Personal marketplace.'
