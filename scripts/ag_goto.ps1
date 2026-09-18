# ag_goto.ps1 - Navigate AntiGravity to a specific conversation by ID
# Usage: .\ag_goto.ps1 -ConversationId <uuid>
# Requires: AntiGravity running with --remote-debugging-port=9234
# Mechanism: CDP Page.navigate via WebSocket (bypasses missing goto in opencli adapter)

param(
    [Parameter(Mandatory=$true)]
    [string]$ConversationId,

    [string]$CdpEndpoint = "http://127.0.0.1:9234",

    # Section ID is constant across all conversations (observed empirically)
    [string]$SectionId = "f2e7e3a6-0af3-4ee1-a2b6-01068ac9f4ac"
)

$ErrorActionPreference = "Stop"

# 1. Fetch CDP target list
try {
    $resp = Invoke-WebRequest -Uri "$CdpEndpoint/json" -UseBasicParsing -TimeoutSec 5
    $targets = $resp.Content | ConvertFrom-Json
} catch {
    Write-Error "Cannot connect to CDP $CdpEndpoint : $($_.Exception.Message)"
    exit 1
}

$page = $null
foreach ($t in $targets) {
    if ($t.type -eq "page") { $page = $t; break }
}
if (-not $page) {
    Write-Error "No page-type CDP target found."
    exit 1
}
if (-not $page.url -or -not $page.webSocketDebuggerUrl) {
    Write-Error "Page target missing url or webSocketDebuggerUrl. Raw: $($page | ConvertTo-Json -Compress)"
    exit 1
}

# 2. Build target URL (app port changes every launch, extract from current URL)
$currentUrl = [Uri]$page.url
$origin = $currentUrl.GetLeftPart([UriPartial]::Authority)
$origin = "$($currentUrl.Scheme)://$($currentUrl.Authority)"
$targetUrl = "$origin/c/$ConversationId`?section=$SectionId"

Write-Output "Current : $($page.url)"
Write-Output "Target  : $targetUrl"

# 3. CDP Page.navigate via native WebSocket (Node 22+)
$wsUrl = $page.webSocketDebuggerUrl
$nodeCode = @"
const ws = new WebSocket('$wsUrl');
let done = false;
ws.onopen = () => ws.send(JSON.stringify({id:1, method:'Page.navigate', params:{url:'$targetUrl'}}));
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id === 1) {
    if (m.result && m.result.frameId) { console.log('OK frameId=' + m.result.frameId); }
    else { console.log('RESULT: ' + JSON.stringify(m.result || m.error)); }
    done = true;
    setTimeout(() => { ws.close(); process.exit(0); }, 1500);
  }
};
ws.onerror = () => { if (!done) { console.error('WS error'); process.exit(1); } };
setTimeout(() => { if (!done) { console.error('timeout'); process.exit(1); } }, 10000);
"@

$nodeOut = node -e $nodeCode 2>&1
Write-Output $nodeOut

# 4. Verify
Start-Sleep -Milliseconds 800
try {
    $vResp = Invoke-WebRequest -Uri "$CdpEndpoint/json" -UseBasicParsing -TimeoutSec 5
    $vTargets = $vResp.Content | ConvertFrom-Json
    $vPage = $null
    foreach ($t in $vTargets) { if ($t.type -eq "page") { $vPage = $t; break } }
    if ($vPage -and $vPage.url -match [regex]::Escape($ConversationId)) {
        Write-Output "VERIFIED: now on conversation $ConversationId"
    } else {
        Write-Output "WARN: current URL = $($vPage.url)"
    }
} catch {
    Write-Output "WARN: verification skipped: $($_.Exception.Message)"
}
