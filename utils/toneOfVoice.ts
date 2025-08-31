export interface ToneOfVoiceResult {
  message: string;
  emoji: string;
  fullMessage: string;
}

export function getToneOfVoice(score: number, grade: string): ToneOfVoiceResult {
  const messages = {
    excellent: [
      { message: "Protein bomb — keep stacking wins", emoji: "🔥" },
      { message: "Clean and fresh — your body will thank you", emoji: "🌱" },
      { message: "Absolute unit — this is how it's done", emoji: "💪" },
      { message: "Peak performance fuel right here", emoji: "⚡" },
      { message: "Chef's kiss — nutritional perfection", emoji: "👨‍🍳" },
    ],
    good: [
      { message: "Solid choice — you're on the right track", emoji: "👍" },
      { message: "Pretty decent — better than most picks", emoji: "✨" },
      { message: "Not bad at all — keep this energy", emoji: "🎯" },
      { message: "Good vibes — your future self approves", emoji: "😊" },
      { message: "Smart pick — you know what's up", emoji: "🧠" },
    ],
    mediocre: [
      { message: "A little high on sugar, but better than most", emoji: "😅" },
      { message: "Not bad, one swap and you're golden", emoji: "⚖️" },
      { message: "Could be worse — room for improvement", emoji: "🤷" },
      { message: "Meh territory — let's find something better", emoji: "😐" },
      { message: "Average Joe — time to level up", emoji: "📈" },
    ],
    poor: [
      { message: "Ultra-processed trap — wanna see a better swap?", emoji: "⚠️" },
      { message: "Too much hidden junk here, let's find cleaner fuel", emoji: "🥴" },
      { message: "Yikes — your body deserves better than this", emoji: "😬" },
      { message: "Red flag city — time for a major upgrade", emoji: "🚩" },
      { message: "Nope nope nope — let's find you something good", emoji: "🙅" },
    ],
  };

  const gradeKey = grade as keyof typeof messages;
  const gradeMessages = messages[gradeKey] || messages.mediocre;
  
  // Select message based on score for more variety
  const messageIndex = Math.floor((score / 100) * gradeMessages.length);
  const selectedMessage = gradeMessages[Math.min(messageIndex, gradeMessages.length - 1)];
  
  const scorePhrase = getScorePhrase(score);
  
  return {
    message: selectedMessage.message,
    emoji: selectedMessage.emoji,
    fullMessage: `${selectedMessage.emoji} ${selectedMessage.message}`,
  };
}

function getScorePhrase(score: number): string {
  if (score >= 85) return "Legendary pick";
  if (score >= 75) return "Solid choice";
  if (score >= 65) return "Pretty good";
  if (score >= 50) return "Decent pick";
  if (score >= 35) return "Mediocre pick";
  if (score >= 25) return "Questionable choice";
  return "Avoid this one";
}

export function getParticleEffect(score: number): 'confetti' | 'shake' | 'none' {
  if (score >= 75) return 'confetti';
  if (score < 40) return 'shake';
  return 'none';
}

export function getLoadingMessages(): string[] {
  return [
    "Analyzing nutritional content...",
    "Checking ingredient quality...",
    "Calculating health score...",
    "Scanning for additives...",
    "Evaluating protein content...",
    "Assessing sugar levels...",
    "Reviewing sodium content...",
    "Finalizing your score...",
  ];
}