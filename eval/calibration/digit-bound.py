"""Independent conservative bound using just the pinned tokenizer header.

Usage: python digit-bound.py MODEL TOKENIZER_JSON_OR_FIRST_8192_BYTES
BPE cannot merge separate pre-tokenizer pieces. Only count all-digit pieces,
not whitespace or other text. No vocabulary download or provider call needed.
"""
import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys

from tokenizers import Regex, pre_tokenizers

root = Path(__file__).resolve().parents[1]
task = json.loads((root / "study/task.json").read_text())
model, filename = sys.argv[1:]
with open(filename, "rb") as f:
    header = f.read(8192)
text = header.decode("utf8", errors="ignore")
def field(name):
    match = re.search(r'^\s*"' + name + r'":\s*', text, re.M)
    return json.JSONDecoder().raw_decode(text[match.end():])[0]

assert field("normalizer") is None
pre = field("pre_tokenizer")["pretokenizers"]
pattern = pre[0]["pattern"]["Regex"]
assert pre[0]["behavior"] == "Isolated" and not pre[0]["invert"]
assert pre[1]["type"] == "ByteLevel" and not pre[1]["use_regex"]
assert re.search(r'"model":\s*\{\s*"type":\s*"BPE"', text)
split = pre_tokenizers.Split(Regex(pattern), behavior="isolated")
pages = json.loads(subprocess.check_output(["node", "--input-type=module", "-e",
    "import {pages} from './study/fixture.mjs';console.log(JSON.stringify(pages))"], cwd=root))
floors = []
for page in pages:
    payload = json.dumps(page, separators=(",", ":"))
    left = payload.index(page["serialLedger"])
    right = left + len(page["serialLedger"])
    parts = [word for word, (a,b) in split.pre_tokenize_str(payload)
             if left <= a < b <= right and word.isascii() and word.isdigit()]
    assert "".join(parts) == page["serialLedger"].replace(" ", "")
    assert all(1 <= len(word) <= 3 for word in parts)
    floors.append(len(parts))
assert sum(floors[:6]) > task["limit"]
print(json.dumps(dict(model=model, kind="offline-digit-bound", scored=False,
    revision=task["tokenizerRevisions"][task["models"].index(model)],
    headerBytes=len(header), headerSha256=hashlib.sha256(header).hexdigest(),
    sourceFreeze=subprocess.check_output(["git","rev-parse","HEAD"],cwd=root,text=True).strip(),
    ledgerFloorByPage=floors, floorThroughSix=sum(floors[:6]), limit=task["limit"],
    premise="Each fresh ledger is sent intact once, in a distinct request.",
    providerCalls=0, liveCalibration="not run: no provider credentials"), indent=2))
