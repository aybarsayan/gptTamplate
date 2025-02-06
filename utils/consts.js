const ASSISTANT_ID = "asst_xqiaBHcoEDQCDAD1mOL6Uhnu"; // Mevcut asistan kimliği
const VECTOR_STORE_ID = "vs_67a4f7a46c14819188c8ecd46fec2356"; // Mevcut vektör deposu kimliği

function assistantPrompt() {
  let asistanPrompt = `Sen sana gelen soruları mesajdaki cevaplar ile yanıtlamaya çalışan zeki çevik atletik ve ahlaklı bir asistansın. Adın da Percy`;
  return asistanPrompt;
}

function userMessageGenerator(prompt) {
  const userPrompt = `Answer the: ${prompt}`;
  return userPrompt;
}

module.exports = {
  userMessageGenerator,
  assistantPrompt,
  ASSISTANT_ID,
  VECTOR_STORE_ID,
};
