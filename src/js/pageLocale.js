const LOCALE_ALIASES = {
  'pt-br': 'pt-BR',
  'pt_BR': 'pt-BR',
  'zh-cn': 'zh',
  'zh-CN': 'zh',
  'zh-hans': 'zh',
  'zh-Hans': 'zh',
};

const MESSAGES = {
  en: {
    wordsReady: '{count} words ready',
    sampleLoaded: '{count} sample words loaded',
    wordsInRound: '{count} words in this round',
    summaryTitle: 'Practice Complete',
    summaryMissed: '{count} words need another round',
    summaryClean: 'Clean round. No missed words left.',
    linkCopied: 'Practice link copied',
    linkReady: 'Practice link ready',
    copyPrompt: 'Copy this practice link:',
    startDictation: 'Start Spelling Test',
    startTyping: 'Start Typing Rain',
    dictationTitle: 'Spelling Test',
    typingTitle: 'Typing Rain',
    speechUnsupported: 'Speech playback is not supported in this browser. You can continue, but another browser is recommended for dictation.',
    dictationProgress: 'Word {current} of {total}',
    answerRequired: 'Type an answer before submitting.',
    answerCorrect: 'Correct!',
    answerIncorrect: 'Not quite. The correct spelling is {word}.',
    dictationComplete: 'Spelling Test Complete',
    dictationMissed: '{count} words to practice again',
    dictationPerfect: 'Perfect score. No missed words.',
    clearConfirm: 'Clear the spelling list and practice preferences saved in this browser?',
    clearSuccess: 'Your local spelling practice data has been cleared.',
    dateLocale: 'en-US',
  },
  es: {
    wordsReady: '{count} palabras listas',
    sampleLoaded: '{count} palabras de ejemplo cargadas',
    wordsInRound: '{count} palabras en esta ronda',
    summaryTitle: 'Práctica terminada',
    summaryMissed: '{count} palabras necesitan otra ronda',
    summaryClean: 'Ronda limpia. No quedan palabras falladas.',
    linkCopied: 'Enlace de práctica copiado',
    linkReady: 'Enlace de práctica listo',
    copyPrompt: 'Copia este enlace de práctica:',
    startDictation: 'Empezar prueba de spelling',
    startTyping: 'Empezar lluvia de palabras',
    dictationTitle: 'Prueba de spelling',
    typingTitle: 'Lluvia de palabras',
    speechUnsupported: 'Este navegador no admite la lectura por voz. Puedes continuar, pero se recomienda otro navegador para el dictado.',
    dictationProgress: 'Palabra {current} de {total}',
    answerRequired: 'Escribe una respuesta antes de enviarla.',
    answerCorrect: '¡Correcto!',
    answerIncorrect: 'No exactamente. La forma correcta es {word}.',
    dictationComplete: 'Prueba de spelling terminada',
    dictationMissed: '{count} palabras para volver a practicar',
    dictationPerfect: 'Puntuación perfecta. No hay palabras falladas.',
    clearConfirm: '¿Borrar la lista de palabras y las preferencias guardadas en este navegador?',
    clearSuccess: 'Se borraron los datos locales de práctica.',
    dateLocale: 'es',
  },
  'pt-BR': {
    wordsReady: '{count} palavras prontas',
    sampleLoaded: '{count} palavras de exemplo carregadas',
    wordsInRound: '{count} palavras nesta rodada',
    summaryTitle: 'Prática concluída',
    summaryMissed: '{count} palavras precisam de outra rodada',
    summaryClean: 'Rodada limpa. Nenhuma palavra ficou para trás.',
    linkCopied: 'Link de prática copiado',
    linkReady: 'Link de prática pronto',
    copyPrompt: 'Copie este link de prática:',
    startDictation: 'Começar teste de spelling',
    startTyping: 'Começar chuva de palavras',
    dictationTitle: 'Teste de spelling',
    typingTitle: 'Chuva de palavras',
    speechUnsupported: 'Este navegador não oferece leitura por voz. Você pode continuar, mas outro navegador é recomendado para o ditado.',
    dictationProgress: 'Palavra {current} de {total}',
    answerRequired: 'Digite uma resposta antes de enviar.',
    answerCorrect: 'Correto!',
    answerIncorrect: 'Quase. A grafia correta é {word}.',
    dictationComplete: 'Teste de spelling concluído',
    dictationMissed: '{count} palavras para praticar novamente',
    dictationPerfect: 'Pontuação perfeita. Nenhuma palavra errada.',
    clearConfirm: 'Apagar a lista de palavras e as preferências salvas neste navegador?',
    clearSuccess: 'Os dados locais de prática foram apagados.',
    dateLocale: 'pt-BR',
  },
  fr: {
    wordsReady: '{count} mots prêts',
    sampleLoaded: '{count} mots d’exemple chargés',
    wordsInRound: '{count} mots dans cette partie',
    summaryTitle: 'Entraînement terminé',
    summaryMissed: '{count} mots à refaire',
    summaryClean: 'Partie réussie. Aucun mot manqué.',
    linkCopied: 'Lien d’entraînement copié',
    linkReady: 'Lien d’entraînement prêt',
    copyPrompt: 'Copiez ce lien d’entraînement :',
    startDictation: 'Commencer le test d’orthographe',
    startTyping: 'Commencer la pluie de mots',
    dictationTitle: 'Test d’orthographe',
    typingTitle: 'Pluie de mots',
    speechUnsupported: 'La lecture vocale n’est pas disponible dans ce navigateur. Vous pouvez continuer, mais un autre navigateur est conseillé pour la dictée.',
    dictationProgress: 'Mot {current} sur {total}',
    answerRequired: 'Saisissez une réponse avant de valider.',
    answerCorrect: 'Correct !',
    answerIncorrect: 'Pas tout à fait. L’orthographe correcte est {word}.',
    dictationComplete: 'Test d’orthographe terminé',
    dictationMissed: '{count} mots à retravailler',
    dictationPerfect: 'Score parfait. Aucun mot manqué.',
    clearConfirm: 'Effacer la liste de mots et les préférences enregistrées dans ce navigateur ?',
    clearSuccess: 'Les données locales d’entraînement ont été effacées.',
    dateLocale: 'fr',
  },
  id: {
    wordsReady: '{count} kata siap',
    sampleLoaded: '{count} contoh kata dimuat',
    wordsInRound: '{count} kata di ronde ini',
    summaryTitle: 'Latihan selesai',
    summaryMissed: '{count} kata perlu diulang',
    summaryClean: 'Ronde bersih. Tidak ada kata yang terlewat.',
    linkCopied: 'Link latihan disalin',
    linkReady: 'Link latihan siap',
    copyPrompt: 'Salin link latihan ini:',
    startDictation: 'Mulai tes spelling',
    startTyping: 'Mulai hujan kata',
    dictationTitle: 'Tes spelling',
    typingTitle: 'Hujan kata',
    speechUnsupported: 'Browser ini tidak mendukung pembacaan suara. Anda tetap dapat melanjutkan, tetapi gunakan browser lain untuk dikte.',
    dictationProgress: 'Kata {current} dari {total}',
    answerRequired: 'Ketik jawaban sebelum mengirim.',
    answerCorrect: 'Benar!',
    answerIncorrect: 'Belum tepat. Ejaan yang benar adalah {word}.',
    dictationComplete: 'Tes spelling selesai',
    dictationMissed: '{count} kata untuk dilatih lagi',
    dictationPerfect: 'Nilai sempurna. Tidak ada kata yang salah.',
    clearConfirm: 'Hapus daftar kata dan pilihan latihan yang tersimpan di browser ini?',
    clearSuccess: 'Data latihan lokal sudah dihapus.',
    dateLocale: 'id-ID',
  },
  zh: {
    wordsReady: '已准备 {count} 个单词',
    sampleLoaded: '已载入 {count} 个示例单词',
    wordsInRound: '本轮 {count} 个单词',
    summaryTitle: '练习完成',
    summaryMissed: '还有 {count} 个单词需要再练一轮',
    summaryClean: '这一轮很干净，没有漏掉的单词。',
    linkCopied: '练习链接已复制',
    linkReady: '练习链接已准备好',
    copyPrompt: '复制这个练习链接：',
    startDictation: '开始听写测试',
    startTyping: '开始单词雨',
    dictationTitle: '听写测试',
    typingTitle: '单词雨',
    speechUnsupported: '当前浏览器不支持语音朗读。你仍可继续，但建议换用支持语音的浏览器进行听写。',
    dictationProgress: '第 {current} 个，共 {total} 个',
    answerRequired: '请先输入答案再提交。',
    answerCorrect: '正确！',
    answerIncorrect: '还差一点，正确拼写是 {word}。',
    dictationComplete: '听写测试完成',
    dictationMissed: '有 {count} 个单词需要再练习',
    dictationPerfect: '全部正确，没有错词。',
    clearConfirm: '要清除这个浏览器里保存的单词表和练习设置吗？',
    clearSuccess: '本地练习数据已清除。',
    dateLocale: 'zh-CN',
  },
};

function normalizeLocale(locale) {
  const raw = locale || 'en';
  return LOCALE_ALIASES[raw] || LOCALE_ALIASES[raw.toLowerCase?.()] || raw.split('-')[0] || 'en';
}

export function getPageLocale() {
  if (typeof window === 'undefined') return 'en';
  return normalizeLocale(window.pageLocale || document.documentElement.lang || 'en');
}

export function t(key, values = {}) {
  const locale = getPageLocale();
  const pack = MESSAGES[locale] || MESSAGES.en;
  const template = pack[key] || MESSAGES.en[key] || key;
  return template.replace(/\{(\w+)\}/g, (_, name) => String(values[name] ?? ''));
}

export function dateLocale() {
  const locale = getPageLocale();
  return (MESSAGES[locale] || MESSAGES.en).dateLocale;
}

if (typeof window !== 'undefined') {
  window.pageLocaleAPI = { getPageLocale, t, dateLocale };
  window.currentLanguage = getPageLocale();
}
