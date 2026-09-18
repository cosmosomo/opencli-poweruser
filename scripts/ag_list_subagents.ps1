# ag_list_subagents.ps1 - List sub-agents spawned by a parent AntiGravity conversation
# Usage: .\ag_list_subagents.ps1 -ConversationId <parent-uuid>
# Reads brain/<parent>/.system_generated/subagents/*.json metadata files.
# Sub-agents are independent conversations with their own brain directories.

param(
    [Parameter(Mandatory=$true)]
    [string]$ConversationId,

    [string]$BrainRoot = "$env:USERPROFILE\.gemini\antigravity\brain"
)

$ErrorActionPreference = "Stop"

$subagentDir = Join-Path $BrainRoot "$ConversationId\.system_generated\subagents"

if (-not (Test-Path $subagentDir)) {
    Write-Output "No sub-agents found for conversation $ConversationId"
    Write-Output "Path checked: $subagentDir"

    # Try to find which conversations DO have sub-agents
    Write-Output ""
    Write-Output "Conversations with sub-agents:"
    Get-ChildItem $BrainRoot -Directory -ErrorAction SilentlyContinue | ForEach-Object {
        $saDir = Join-Path $_.FullName ".system_generated\subagents"
        if (Test-Path $saDir) {
            $count = (Get-ChildItem $saDir -Filter "*.json" -ErrorAction SilentlyContinue | Measure-Object).Count
            Write-Output "  $($_.Name) ($count sub-agent(s))"
        }
    }
    exit 0
}

$subagentFiles = Get-ChildItem $subagentDir -Filter "*.json" -ErrorAction SilentlyContinue

if (-not $subagentFiles -or $subagentFiles.Count -eq 0) {
    Write-Output "Sub-agent directory exists but contains no .json metadata files."
    exit 0
}

Write-Output "=== Sub-agents of $ConversationId ==="
Write-Output "Total: $($subagentFiles.Count)"
Write-Output ""

$results = @()
foreach ($f in $subagentFiles) {
    try {
        $meta = Get-Content $f.FullName -Raw -Encoding utf8 | ConvertFrom-Json
        $subId = $meta.conversationId
        $role = if ($meta.subagentDescriptor -and $meta.subagentDescriptor.role) { $meta.subagentDescriptor.role } else { '(unknown)' }
        $typeName = if ($meta.subagentDescriptor -and $meta.subagentDescriptor.typeName) { $meta.subagentDescriptor.typeName } else { '?' }
        $state = $meta.state
        $spawnStep = $meta.spawnStepIndex

        # Check if sub-agent's own brain directory exists and get stats
        $subBrain = Join-Path $BrainRoot $subId
        $hasBrain = Test-Path $subBrain
        $transcriptPath = Join-Path $subBrain ".system_generated\logs\transcript.jsonl"
        $transcriptLines = 0
        $lastWrite = $null
        if (Test-Path $transcriptPath) {
            $transcriptLines = (Get-Content $transcriptPath -Encoding utf8 | Measure-Object -Line).Lines
            $lastWrite = (Get-Item $transcriptPath).LastWriteTime
        }
        $stepsDir = Join-Path $subBrain ".system_generated\steps"
        $stepCount = 0
        if (Test-Path $stepsDir) {
            $stepCount = (Get-ChildItem $stepsDir -Directory -ErrorAction SilentlyContinue | Measure-Object).Count
        }
        $messagesDir = Join-Path $subBrain ".system_generated\messages"
        $msgCount = 0
        if (Test-Path $messagesDir) {
            $msgCount = (Get-ChildItem $messagesDir -Filter "*.json" -ErrorAction SilentlyContinue | Measure-Object).Count
        }

        $results += [PSCustomObject]@{
            Role        = $role
            State       = $state
            SubId       = $subId
            Type        = $typeName
            SpawnStep   = $spawnStep
            Transcript  = $transcriptLines
            Steps       = $stepCount
            Messages    = $msgCount
            LastActive  = $lastWrite
        }
    } catch {
        Write-Output "WARN: Failed to parse $($f.Name): $($_.Exception.Message)"
    }
}

$results | Format-Table -AutoSize -Wrap @(
    @{N='Role';E={$_.Role}},
    @{N='State';E={$_.State}},
    @{N='SubId (short)';E={$_.SubId.Substring(0,8) + '...'}},
    @{N='Spawn';E={$_.SpawnStep}},
    @{N='Transcript';E={$_.Transcript}},
    @{N='Steps';E={$_.Steps}},
    @{N='Msgs';E={$_.Messages}},
    @{N='LastActive';E={if($_.LastActive){$_.LastActive.ToString('MM-dd HH:mm')}else{'?'}}}
)

Write-Output ""
Write-Output "Full sub-agent IDs (for ag_read_transcript.ps1 or ag_goto.ps1):"
$results | ForEach-Object { Write-Output "  $($_.SubId)  [$($_.State)] $($_.Role)" }
