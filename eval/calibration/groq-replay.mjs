// Leave the original body byte-for-byte alone when no adaptation is necessary.
export function groqReplayBody(raw) {
  const body = JSON.parse(raw);
  let changed = false;
  for (const message of body.messages) {
    if (message.role === "assistant" && Object.hasOwn(message, "reasoning_content")) {
      delete message.reasoning_content;
      changed = true;
    }
  }
  return changed ? JSON.stringify(body) : raw;
}
