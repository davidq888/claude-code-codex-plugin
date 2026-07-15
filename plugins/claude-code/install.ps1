[CmdletBinding()]
param(
  [switch]$Force,
  [string]$DestinationRoot = $HOME
)

$ErrorActionPreference = 'Stop'

$node = Get-Command node.exe -ErrorAction SilentlyContinue
if (-not $node -or -not (Test-Path -LiteralPath $node.Source)) {
  throw 'Node.js was not found. Install Node.js, then run this installer again.'
}
$nodeSignature = Get-AuthenticodeSignature -LiteralPath $node.Source
if ($nodeSignature.Status -ne 'Valid') {
  throw "Node.js at $($node.Source) does not have a valid code signature."
}

$installer = Join-Path $PSScriptRoot 'scripts\install.mjs'
$arguments = @($installer, 'install', '--destination-root', $DestinationRoot)
if ($Force) {
  $arguments += '--force'
}

& $node.Source @arguments
if ($LASTEXITCODE -ne 0) {
  throw "Plugin installation failed with exit code $LASTEXITCODE."
}
