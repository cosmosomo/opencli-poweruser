# ag_send_to_subagent.ps1 - Send a message to a sub-agent via the file-based message bus
# Usage: .\ag_send_to_subagent.ps1 -SubAgentId <uuid> -Message "text" [-Priority HIGH|NORMAL|LOW]
# WARNING: This writes to the sub-agent's messages/ directory. Use with caution.
# The message bus schema: messages/<msgId>.json with id/recipient/sender/priority/timestamp/content

param(
    [Parameter(Mandatory=$true)]
    [string]$SubAgentId,

    [Parameter(Mandatory=$true)]
    [string]$Message,

    [ValidateSet("HIGH", "NORMAL", "LOW")]
    [string]$Priority = "NORMAL",

    [string]$BrainRoot = "$env:USERPROFILE\.gemini\antigravity\brain",

    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

$messagesDir = Join-Path $BrainRoot "$SubAgentId\.system_generated\messages"

if (-not (Test-Path $messagesDir)) {
    Write-Error "Sub-agent messages directory not found: $messagesDir"
    Write-Output "Check that SubAgentId is correct and the sub-agent has been spawned."
    exit 1
}

$msgId = [guid]::NewGuid().ToString()
$timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
$priorityStr = "MESSAGE_PRIORITY_$Priority"

$msgObj = [ordered]@{
    id       = $msgId
    recipient = $SubAgentId
    sender   = "external-cli"
    priority = $priorityStr
    timestamp = $timestamp
    content  = $Message
}

$msgJson = $msgObj | ConvertTo-Json -Depth 5
$msgPath = Join-Path $messagesDir "$msgId.json"

if ($DryRun) {
    Write-Output "=== DRY RUN ==="
    Write-Output "Target: $messagesDir"
    Write-Output "File: $msgId.json"
    Write-Output "Content:"
    Write-Output $msgJson
    Write-Output "=== END DRY RUN ==="
    exit 0
}

# Check for undelivered lock
$lockPath = Join-Path $messagesDir "undelivered"
if (Test-Path $lockPath) {
    Write-Output "NOTE: 'undelivered' lock file exists (sub-agent may be actively processing messages)."
}

# Write the message file
[System.IO.File]::WriteAllText($msgPath, $msgJson, [System.Text.Encoding]::UTF8)

Write-Output "Message sent to sub-agent $SubAgentId"
Write-Output "  ID: $msgId"
Write-Output "  Priority: $priorityStr"
Write-Output "  File: $msgPath"
Write-Output ""
Write-Output "The sub-agent should pick up this message on its next processing cycle."
Write-Output "Monitor with: ag_read_transcript.ps1 -ConversationId $SubAgentId -LastN 5"
