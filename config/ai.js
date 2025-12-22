function konfigurasiAI() {
  return {
    token: process.env.HF_TOKEN,
    model: process.env.HF_MODEL || "HuggingFaceTB/SmolLM3-3B:hf-inference",
  };
}

module.exports = { konfigurasiAI };
