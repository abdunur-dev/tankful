"""Offline tokenizer calibration; never a provider observation or scored run.

Requires tokenizers==0.22.2. Pass path to the tokenizer.json at the task's
specified model revision. Outputs JSON to stdout without modifying the freeze.
"""
import hashlib
import json
from pathlib import Path
import subprocess
import sys

from tokenizers import Tokenizer

root = Path(__file__).resolve().parents[1]
task = json.loads((root / "study/task.json").read_text())
model, filename = sys.argv[1:]
index = task["models"].index(model)
pages = json.loads(subprocess.check_output(
    ["node", "--input-type=module", "-e",
     "import {pages} from './study/fixture.mjs';console.log(JSON.stringify(pages))"],
    cwd=root))
raw = Path(filename).read_bytes()
tok = Tokenizer.from_str(raw.decode())
counts = []
floors = []
for page in pages:
    payload = json.dumps(page, separators=(",", ":"))
    counts.append(len(tok.encode(payload, add_special_tokens=False).ids))
    # Count only tokens strictly internal to the uninterrupted ledger. No chat
    # wrappers, old pages, instructions, output, tool schemas, or JSON overhead.
    left = payload.index(page["serialLedger"])
    right = left + len(page["serialLedger"])
    offsets = tok.encode(payload, add_special_tokens=False).offsets
    floors.append(sum(left < a < b < right for a,b in offsets))
assert sum(floors[:6]) > task["limit"]
print(json.dumps(dict(kind="offline-tokenizer-bound", scored=False, model=model,
    revision=task["tokenizerRevisions"][index], tokenizerSha256=hashlib.sha256(raw).hexdigest(),
    payloadTokens=counts, internalLedgerTokens=floors, floorThroughSix=sum(floors[:6]),
    limit=task["limit"], assumption="Each newly delivered ledger is present intact in its own next request.",
    providerCalls=0), indent=2))
