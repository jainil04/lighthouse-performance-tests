// api/ai-summary.js

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Only POST requests are allowed" });
    return;
  }

  const { tableComparison, allRunsData, coreMetrics, scores, opportunities = {} } = req.body;

  try {
    let summary;
    if (tableComparison) {
      summary = await summarizeComparison(allRunsData);
    } else {
      summary = await summarizeSingleResult(coreMetrics, scores, opportunities);
    }
    res.status(200).json({ summary });
  } catch (err) {
    console.error("Error generating summary:", err);
    res.status(500).json({ error: err.message });
  }
}

// Centralized OpenAI Chat completion
async function openaiChat(messages, { model = "gpt-3.5-turbo", max_tokens = 1500, temperature = 0.7 } = {}) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({ model, messages, max_tokens, temperature })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content.trim() ?? "";
}

// Summarize comparison between two CSV-derived JSON objects
async function summarizeComparison(arrayOfCsvObjects) {
  const systemMessage = {
    role: "system",
    content: "You are a senior web-performance analyst. You will compare multiple Lighthouse audit JSON arrays run-by-run, where each object corresponds to tests at different times. Highlight the biggest absolute and percentage deltas for each metric."
  };

  const jsonData = JSON.stringify(arrayOfCsvObjects, null, 2);
  const userMessage = {
    role: "user",
    content: `Here are two Lighthouse audit result sets in JSON:

\`\`\`json
${jsonData}
\`\`\`

**Text Summary**:
Give me the deltas between the multiple sets of results in 3-4 lines.
Express changes strictly in percentages.
Use user-friendly language, avoiding technical jargon.
...`
  };

  return openaiChat([systemMessage, userMessage], { max_tokens: 700, temperature: 0.7 });
}

// Summarize a single Lighthouse audit result
async function summarizeSingleResult(coreMetrics, scores, opportunities) {
  const systemMessage = {
    role: "system",
    content: "You are an expert web performance engineer. Summarize Lighthouse audit results clearly and concisely."
  };

  const runLines = coreMetrics
    .map(
      (metrics, idx) => `Run ${idx + 1}:\n  • FCP: ${metrics.fcp}\n  • LCP: ${metrics.lcp}\n  • TTI: ${metrics.tti}\n  • CLS: ${metrics.cls}\n  • SI: ${metrics.si}\n  • TBT: ${metrics.tbt}\n  • SRT: ${metrics.srt}`
    )
    .join("\n\n");

  const formattedOpps = Object.values(opportunities).map(
    (opp) => `- ${opp.title}: ${opp.description}`
  );

  const userContent = [
    `Write a concise executive summary of this Lighthouse audit:`,
    `• Performance: ${scores.performance}`,
    `• Accessibility: ${scores.accessibility}`,
    `• Best Practices: ${scores['best-practices']}`,
    `• SEO: ${scores.seo}`,
    ``,
    `Key metrics for each run:`,
    runLines,
    ``,
    `Top improvement opportunities:`,
    formattedOpps.length ? formattedOpps.join("\n") : "None provided.",
    ``,
    `Respond in 2–3 short paragraphs, highlighting strengths and the most critical areas for improvement.`
  ].join("\n");

  const userMessage = { role: "user", content: userContent };
  return openaiChat([systemMessage, userMessage], { max_tokens: 500, temperature: 0.7 });
}
