import express from "express";

const router = express.Router();

router.post("/grammar-fix", async (req, res) => {
  try {
    const { text } = req.body;

    if (!text?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Text is required.",
      });
    }

    const response = await fetch("http://127.0.0.1:11434/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama3.2",
        stream: false,
        prompt: `
You are an English spelling and grammar correction engine.

Correct the text.

Rules:
- Fix spelling mistakes.
- Fix grammar.
- Fix punctuation.
- Do not explain.
- Do not add extra words.
- Do not answer questions.
- Return ONLY the corrected text.
- If one word is misspelled, return only its corrected spelling.


Examples:

Input:
printr
Output:
printer

Input:
printer not work from yesterday
Output:
The printer has not been working since yesterday.

Input:
helo
Output:
hello

Now correct this:

Input:
${text}

Output:
        `,
      }),
    });

    const data = await response.json();

    res.json({
      success: true,
      text: data.response.trim(),
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

export default router;