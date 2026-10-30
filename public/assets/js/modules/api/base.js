export async function safeJson(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch (e) {
    return { _nonJson: true, status: res.status, raw: text };
  }
}
