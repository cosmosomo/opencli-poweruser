# ag_list.ps1 - List all AntiGravity conversations with titles and timestamps
# Usage: .\ag_list.ps1 [-Limit <N>] [-IncludeArchived]
# Reads from disk (app_storage.json + brain directories), bypassing broken `history` command.

param(
    [int]$Limit = 50,
    [switch]$IncludeArchived
)

$ErrorActionPreference = "Stop"

$appStorage = "$env:APPDATA\Antigravity\app_storage.json"
$brainRoot = "$env:USERPROFILE\.gemini\antigravity\brain"

# 1. Active conversation IDs from app_storage.json
$activeIds = @{}
if (Test-Path $appStorage) {
    $data = Get-Content $appStorage -Raw -Encoding utf8 | ConvertFrom-Json
    foreach ($prop in $data.PSObject.Properties) {
        if ($prop.Name -match '^antigravity-multi-conversation-layout-v3-([0-9a-f-]{36})$') {
            $activeIds[$Matches[1]] = $true
        }
    }
}

# 2. Enumerate brain directories
$results = @()
if (Test-Path $brainRoot) {
    $dirs = Get-ChildItem $brainRoot -Directory | Where-Object { $_.Name -match '^[0-9a-f-]{36}$' }
    foreach ($d in $dirs) {
        $id = $d.Name
        $isActive = $activeIds.ContainsKey($id)

        if (-not $IncludeArchived -and -not $isActive) { continue }

        # Title: prefer task.md, fall back to first user message in transcript.jsonl
        $taskFile = Join-Path $d.FullName 'task.md'
        $title = $null
        if (Test-Path $taskFile) {
            $firstLine = Get-Content $taskFile -TotalCount 1 -Encoding utf8 -ErrorAction SilentlyContinue
            if ($firstLine) {
                $title = $firstLine.Trim()
                if ($title.Length -gt 90) { $title = $title.Substring(0, 90) + '...' }
            }
        }
        if (-not $title) {
            $transcriptFile = Join-Path $d.FullName '.system_generated\logs\transcript.jsonl'
            if (Test-Path $transcriptFile) {
                $firstLine = Get-Content $transcriptFile -TotalCount 1 -Encoding utf8 -ErrorAction SilentlyContinue
                if ($firstLine) {
                    try {
                        $firstEntry = $firstLine | ConvertFrom-Json
                        if ($firstEntry.content) {
                            # Extract first meaningful line, strip metadata tags
                            $c = $firstEntry.content -replace '<ADDITIONAL_METADATA>[\s\S]*', ''
                            $c = $c -replace '<USER_REQUEST>', '' -replace '</USER_REQUEST>', ''
                            $c = ($c -split "`n" | Where-Object { $_.Trim() } | Select-Object -First 1).Trim()
                            if ($c) {
                                $title = $c
                                if ($title.Length -gt 90) { $title = $title.Substring(0, 90) + '...' }
                            }
                        }
                    } catch {}
                }
            }
        }
        if (-not $title) { $title = '(no title)' }

        # Count artifacts
        $artifactCount = (Get-ChildItem $d.FullName -Recurse -File -ErrorAction SilentlyContinue | Measure-Object).Count

        $results += [PSCustomObject]@{
            Id         = $id
            Active     = $isActive
            LastWrite  = $d.LastWriteTime
            Title      = $title
            Files      = $artifactCount
        }
    }
}

# 3. Sort and output
$results = $results | Sort-Object LastWrite -Descending | Select-Object -First $Limit

Write-Output "AntiGravity conversations ($($results.Count) shown, $($activeIds.Count) active in app_storage.json):"
Write-Output ""
$results | Format-Table -AutoSize -Wrap @(
    @{N='Active';E={if($_.Active){'*'}else{' '}}},
    @{N='LastWrite';E={$_.LastWrite.ToString('yyyy-MM-dd HH:mm')}},
    @{N='Files';E={$_.Files}},
    @{N='Id';E={$_.Id.Substring(0,8) + '...'}},
    @{N='Title';E={$_.Title}}
)

Write-Output ""
Write-Output "Full IDs (for ag_goto.ps1):"
$results | ForEach-Object { Write-Output "  $($_.Id)  $($_.Title)" }
