/**
 * AI Content Moderation Helper
 * ─────────────────────────────────────────────────────────────────────────────
 * Evaluates a document's title, description, and filename against community
 * standards before it is stored in the database.
 *
 * Provider selection
 * ──────────────────
 * The helper reads GEMINI_API_KEY from the environment and calls the Google
 * Gemini REST API.  To switch to OpenAI, set OPENAI_API_KEY and replace the
 * `callGemini` implementation with the `callOpenAI` stub below — the rest of
 * the module is provider-agnostic.
 *
 * Environment variables
 * ─────────────────────
 *   GEMINI_API_KEY   — Google AI Studio key  (default provider)
 *   OPENAI_API_KEY   — OpenAI key           (alternative provider)
 */

// ── Constants ─────────────────────────────────────────────────────────────────

const GEMINI_MODEL   = 'gemini-2.0-flash';
const OPENAI_MODEL   = 'gpt-4o-mini';
const TIMEOUT_MS     = 10_000; // 10 s — upload should not stall indefinitely

// ── Public result type ────────────────────────────────────────────────────────

export type ModerationResult = {
  approved: boolean;
  reason: string;
};

// ── Prompt builder ────────────────────────────────────────────────────────────

function buildPrompt(title: string, description: string, filename: string): string {
  return `Bạn là chuyên gia kiểm duyệt nội dung của một nền tảng học tập trực tuyến.
Hãy đánh giá tài liệu sau và kiểm tra xem nó có vi phạm bất kỳ tiêu chí nào dưới đây không:

1. Nội dung đồi trụy / khiêu dâm / 18+
2. Nội dung chính trị độc hại, phản quốc, phản động
3. Nội dung kích động bạo lực, thù hận, phân biệt chủng tộc
4. Spam hoặc rác vô nghĩa (ví dụ: tiêu đề toàn ký tự lặp lại, không có nghĩa)
5. Quảng cáo sản phẩm, dịch vụ không liên quan đến học tập

Thông tin tài liệu cần đánh giá:
- Tiêu đề: "${title}"
- Mô tả: "${description || '(không có mô tả)'}"
- Tên file gốc: "${filename}"

Chỉ trả về kết quả dưới dạng JSON hợp lệ, không thêm bất kỳ văn bản nào khác:
{"approved": true, "reason": ""}
hoặc
{"approved": false, "reason": "Lý do từ chối ngắn gọn bằng tiếng Việt"}`;
}

// ── Provider: Google Gemini (default) ─────────────────────────────────────────

async function callGemini(prompt: string): Promise<ModerationResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set.');
  }

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/` +
    `${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0,        // deterministic judgements
          maxOutputTokens: 256,
          responseMimeType: 'application/json',
        },
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Gemini API error ${response.status}: ${body}`);
  }

  const json = await response.json();
  const text: string =
    json?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

  return parseAIResponse(text);
}

// ── Provider: OpenAI (alternative — swap callGemini → callOpenAI below) ───────

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function callOpenAI(prompt: string): Promise<ModerationResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set.');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`OpenAI API error ${response.status}: ${body}`);
  }

  const json = await response.json();
  const text: string = json?.choices?.[0]?.message?.content ?? '';
  return parseAIResponse(text);
}

// ── JSON parser ───────────────────────────────────────────────────────────────

function parseAIResponse(raw: string): ModerationResult {
  // Strip markdown fences the model sometimes wraps around JSON
  const cleaned = raw.replace(/```json\s*/gi, '').replace(/```/g, '').trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`AI returned non-JSON response: ${raw.slice(0, 200)}`);
  }

  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    typeof (parsed as Record<string, unknown>).approved !== 'boolean'
  ) {
    throw new Error(`AI response missing required "approved" boolean: ${cleaned}`);
  }

  const { approved, reason } = parsed as Record<string, unknown>;
  return {
    approved: approved as boolean,
    reason: typeof reason === 'string' ? reason : '',
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Evaluate document metadata against community content standards.
 *
 * @param title       - Document title entered by the user
 * @param description - Document description entered by the user
 * @param filename    - Original filename (additional signal for the model)
 * @returns           - { approved, reason }
 *
 * Failure mode: if the AI call throws (network error, quota exceeded, bad key),
 * the function returns `approved: true` with a note so uploads are never
 * silently blocked by an infrastructure outage.  Change the fallback to
 * `approved: false` if you prefer a conservative / deny-by-default policy.
 */
export async function moderateContentWithAI(
  title: string,
  description: string,
  filename = '',
): Promise<ModerationResult> {
  // ── To swap provider: replace `callGemini` with `callOpenAI` here ──────────
  const callProvider = callGemini;
  // ───────────────────────────────────────────────────────────────────────────

  const prompt = buildPrompt(title, description, filename);

  try {
    const result = await callProvider(prompt);
    console.log('[ai-moderation] result:', result);
    return result;
  } catch (err) {
    // Log the error but don't block the upload — fail open.
    // Swap `approved: true` → `approved: false` to fail closed instead.
    console.error('[ai-moderation] provider error, failing open:', err);
    return {
      approved: true,
      reason: 'Kiểm duyệt tự động tạm thời không khả dụng — tài liệu được duyệt sơ bộ.',
    };
  }
}
