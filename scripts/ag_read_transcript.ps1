# ag_read_transcript.ps1 - Read AntiGravity conversation from transcript.jsonl
# Usage: .\ag_read_transcript.ps1 -ConversationId <uuid> [-LastN <N>] [-IncludeTools]
# Reads from disk (brain directory), bypassing broken `read` and `copy-message` cache issues.
# This is the MOST RELIABLE way to read conversation content.

param(
    [Parameter(Mandatory=$true)]
    [string]$ConversationId,

    [int]$LastN = 0,  # 0 = show all messages

    [switch]$IncludeTools,  # include tool call details

    [string]$BrainRoot = "$env:USERPROFILE\.gemini\antigravity\brain"
)

$ErrorActionPreference = "Stop"

$transcriptPath = Join-Path $BrainRoot "$ConversationId\.system_generated\logs\transcript.jsonl"

if (-not (Test-Path $transcriptPath)) {
    Write-Error "transcript.jsonl not found: $transcriptPath"
    Write-Output "Available conversations (run ag_list.ps1 for full list):"
    if (Test-Path $BrainRoot) {
        Get-ChildItem $BrainRoot -Directory |
            Where-Object { Test-Path (Join-Path $_.FullName '.system_generated\logs\transcript.jsonl') } |
            Select-Object -First 10 | ForEach-Object { Write-Output "  $($_.Name)" }
    }
    exit 1
}

# Parse JSONL
$lines = Get-Content $transcriptPath -Encoding utf8
$entries = @()
foreach ($line in $lines) {
    if ($line.Trim()) {
        try {
            $entries += $line | ConvertFrom-Json
        } catch {
            Write-Warning "Skipping malformed line: $($_.Exception.Message)"
        }
    }
}

if ($LastN -gt 0) {
    $entries = $entries | Select-Object -Last $LastN
}

Write-Output "=== AntiGravity Conversation: $ConversationId ==="
Write-Output "Total steps: $($entries.Count) | File: $transcriptPath"
Write-Output ""

foreach ($e in $entries) {
    $time = if ($e.created_at) {
        ([DateTime]$e.created_at).ToLocalTime().ToString('HH:mm:ss')
    } else { '?' }

    switch ($e.source) {
        'USER_EXPLICIT' {
            $role = 'USER'
            $content = $e.content
            # Strip XML-like metadata tags for readability
            $content = $content -replace '<ADDITIONAL_METADATA>[\s\S]*?</ADDITIONAL_METADATA>', ''
            $content = $content -replace '<USER_REQUEST>', ''
            $content = $content -replace '</USER_REQUEST>', ''
            $content = $content.Trim()
            Write-Output "[$time] === $role ==="
            Write-Output $content
            Write-Output ""
        }
        'MODEL' {
            $role = 'MODEL'
            if ($e.content) {
                Write-Output "[$time] === $role ($($e.type)) ==="
                Write-Output $e.content
                Write-Output ""
            }
            if ($IncludeTools -and $e.tool_calls) {
                Write-Output "  [Tool calls]"
                foreach ($tc in $e.tool_calls) {
                    $argsStr = if ($tc.args) { ($tc.args | ConvertTo-Json -Compress -Depth 3) } else { '' }
                    if ($argsStr.Length -gt 200) { $argsStr = $argsStr.Substring(0,200) + '...' }
                    Write-Output "    - $($tc.name): $argsStr"
                }
                Write-Output ""
            }
        }
        default {
            Write-Output "[$time] [$($e.source)] $($e.type)"
            if ($e.content) { Write-Output $e.content }
            Write-Output ""
        }
    }
}

Write-Output "=== End of transcript ($($entries.Count) steps) ==="
