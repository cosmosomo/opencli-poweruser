# ag_quota.ps1 - View AntiGravity membership quota (5-hour + weekly limits)
# Usage: .\ag_quota.ps1 [-Raw]
# Mechanism: CDP navigate to Settings > Models & Usage, dump DOM, parse quota circles
# Requires: AntiGravity running with --remote-debugging-port=9234

param(
    [switch]$Raw,  # Output raw JSON instead of formatted table
    [string]$CdpEndpoint = "http://127.0.0.1:9234",
    # opencli dump 受 Node 的 /tmp 解析影响，落在当前工作盘根目录的 tmp 目录下
    [string]$DumpPath = (Join-Path ([System.IO.Path]::GetPathRoot($PWD.Path)) "tmp\antigravity-dom.html")
)

$ErrorActionPreference = "Stop"
$env:OPENCLI_PROFILE = "v6pz9gjx"
$env:OPENCLI_WINDOW = "background"

# 1. Get current page URL and webSocketDebuggerUrl
try {
    $targets = Invoke-RestMethod -Uri "$CdpEndpoint/json" -TimeoutSec 5
} catch {
    Write-Error "Cannot connect to CDP $CdpEndpoint. Is AntiGravity running with --remote-debugging-port=9234?"
    exit 1
}

$page = $null
foreach ($t in $targets) { if ($t.type -eq "page") { $page = $t; break } }
if (-not $page) { Write-Error "No page-type CDP target found."; exit 1 }

$wsUrl = $page.webSocketDebuggerUrl
$currentUrl = $page.url

# 2. Build Models & Usage settings URL
if ($currentUrl -match 'settingsScreen=') {
    $modelsUrl = $currentUrl -replace 'settingsScreen=[^&]+', 'settingsScreen=Models'
} elseif ($currentUrl -match '\?') {
    $modelsUrl = $currentUrl + '&settingsOpen=true&settingsScreen=Models'
} else {
    $modelsUrl = $currentUrl + '?settingsOpen=true&settingsScreen=Models'
}

# 3. CDP Page.navigate via Node.js WebSocket
$nodeCode = @"
const ws = new WebSocket('$wsUrl');
let done = false;
ws.onopen = () => ws.send(JSON.stringify({id:1, method:'Page.navigate', params:{url:'$modelsUrl'}}));
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id === 1) {
    if (m.result && m.result.frameId) { console.log('OK'); }
    else { console.log('ERROR: ' + JSON.stringify(m.error || m.result)); }
    done = true;
    setTimeout(() => { ws.close(); process.exit(0); }, 500);
  }
};
ws.onerror = () => { if (!done) { console.error('WS error'); process.exit(1); } };
setTimeout(() => { if (!done) { console.error('timeout'); process.exit(1); } }, 10000);
"@

$navResult = node -e $nodeCode 2>&1
if ($navResult -notmatch 'OK') {
    Write-Error "CDP navigate failed: $navResult"
    exit 1
}

# 4. Wait for quota data to load
Start-Sleep -Seconds 4

# 5. Dump DOM
$dumpResult = opencli antigravity dump -f json 2>&1 | Out-String
if ($dumpResult -notmatch 'htmlFile') {
    Write-Error "DOM dump failed: $dumpResult"
    exit 1
}

# 6. Parse quota from DOM
if (-not (Test-Path $DumpPath)) {
    Write-Error "DOM file not found: $DumpPath"
    exit 1
}

$html = Get-Content $DumpPath -Raw -Encoding utf8

$result = [ordered]@{
    plan = $null
    gemini = [ordered]@{
        fiveHourRemaining = $null
        fiveHourRefreshIn = $null
        weeklyRemaining = $null
        weeklyRefreshIn = $null
    }
    claudeGpt = [ordered]@{
        fiveHourRemaining = $null
        fiveHourRefreshIn = $null
        weeklyRemaining = $null
        weeklyRefreshIn = $null
    }
    tokenUsage = [ordered]@{
        rulesTokens = $null
        rulesPercent = $null
        skillsTokens = $null
        skillsPercent = $null
        customizationBudgetAvailable = $null
    }
    aiCreditOverages = $null
    upgradeUrl = $null
}

# Plan
if ($html -match 'Your Plan:\s*([^<]+)') {
    $result.plan = $Matches[1].Trim()
}

# Helper: extract quota block for a model group
function Extract-QuotaBlock {
    param([string]$Html, [string]$GroupHeader)
    
    $idx = $Html.IndexOf($GroupHeader)
    if ($idx -lt 0) { return $null }
    
    # Find the next 6000 chars after the group header (enough for both weekly + 5hr)
    $block = $Html.Substring($idx, [Math]::Min(6000, $Html.Length - $idx))
    
    $quota = @{}
    
    # Weekly limit
    if ($block -match 'Weekly Limit Remaining[\s\S]{0,800}?>(\d+)%<') {
        $quota.weeklyRemaining = [int]$Matches[1]
    }
    if ($block -match 'weekly limit[\s\S]{0,100}?refresh in ([\s\S]{1,80}?)(?:</span>|\.)') {
        $quota.weeklyRefreshIn = ($Matches[1] -replace '<[^>]+>', '').Trim()
    }
    
    # Five hour limit
    if ($block -match 'Five Hour Limit Remaining[\s\S]{0,800}?>(\d+)%<') {
        $quota.fiveHourRemaining = [int]$Matches[1]
    }
    if ($block -match '5-hour limit[\s\S]{0,100}?refresh in ([\s\S]{1,80}?)(?:</span>|\.)') {
        $quota.fiveHourRefreshIn = ($Matches[1] -replace '<[^>]+>', '').Trim()
    }
    
    return $quota
}

# Gemini Models quota (first occurrence)
$geminiQuota = Extract-QuotaBlock -Html $html -GroupHeader 'Gemini Models'
if ($geminiQuota) {
    $result.gemini.fiveHourRemaining = $geminiQuota.fiveHourRemaining
    $result.gemini.fiveHourRefreshIn = $geminiQuota.fiveHourRefreshIn
    $result.gemini.weeklyRemaining = $geminiQuota.weeklyRemaining
    $result.gemini.weeklyRefreshIn = $geminiQuota.weeklyRefreshIn
}

# Claude and GPT models quota
$claudeQuota = Extract-QuotaBlock -Html $html -GroupHeader 'Claude and GPT models'
if ($claudeQuota) {
    $result.claudeGpt.fiveHourRemaining = $claudeQuota.fiveHourRemaining
    $result.claudeGpt.fiveHourRefreshIn = $claudeQuota.fiveHourRefreshIn
    $result.claudeGpt.weeklyRemaining = $claudeQuota.weeklyRemaining
    $result.claudeGpt.weeklyRefreshIn = $claudeQuota.weeklyRefreshIn
}

# Token usage
if ($html -match 'Rules:\s*([\d,]+)\s*tokens[\s\S]{0,200}?([\d.]+)%') {
    $result.tokenUsage.rulesTokens = $Matches[1]
    $result.tokenUsage.rulesPercent = [double]$Matches[2]
}
if ($html -match 'Skills:\s*([\d,]+)\s*tokens[\s\S]{0,200}?([\d.]+)%') {
    $result.tokenUsage.skillsTokens = $Matches[1]
    $result.tokenUsage.skillsPercent = [double]$Matches[2]
}
if ($html -match '([\d.]+)% of the customization budget is available') {
    $result.tokenUsage.customizationBudgetAvailable = [double]$Matches[1]
}

# AI Credit Overages toggle
if ($html -match 'Enable AI Credit Overages') {
    $result.aiCreditOverages = $true
}

# Upgrade URL
if ($html -match 'href="(https://antigravity\.google/[^"]+upgrade[^"]*)"') {
    $result.upgradeUrl = $Matches[1]
}

# 7. Output
if ($Raw) {
    $result | ConvertTo-Json -Depth 5
} else {
    Write-Output ""
    Write-Output "=== AntiGravity Membership Quota ==="
    Write-Output "Plan: $($result.plan)"
    Write-Output ""
    
    Write-Output "--- Gemini Models ---"
    Write-Output "  5-Hour Limit:  $($result.gemini.fiveHourRemaining)% remaining (refreshes in $($result.gemini.fiveHourRefreshIn))"
    Write-Output "  Weekly Limit:  $($result.gemini.weeklyRemaining)% remaining (refreshes in $($result.gemini.weeklyRefreshIn))"
    Write-Output ""
    
    Write-Output "--- Claude & GPT Models ---"
    Write-Output "  5-Hour Limit:  $($result.claudeGpt.fiveHourRemaining)% remaining (refreshes in $($result.claudeGpt.fiveHourRefreshIn))"
    Write-Output "  Weekly Limit:  $($result.claudeGpt.weeklyRemaining)% remaining (refreshes in $($result.claudeGpt.weeklyRefreshIn))"
    Write-Output ""
    
    Write-Output "--- Token Usage (Customizations) ---"
    Write-Output "  Rules:  $($result.tokenUsage.rulesTokens) tokens ($($result.tokenUsage.rulesPercent)%)"
    Write-Output "  Skills: $($result.tokenUsage.skillsTokens) tokens ($($result.tokenUsage.skillsPercent)%)"
    Write-Output "  Budget: $($result.tokenUsage.customizationBudgetAvailable)% available"
    Write-Output ""
    
    if ($result.upgradeUrl) {
        Write-Output "Upgrade to Ultra: $($result.upgradeUrl)"
    }
    Write-Output ""
}
