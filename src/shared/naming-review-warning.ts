/** Presentation labels for fixed review warnings; no eligibility, approval or score changes. */
const labels: Readonly<Record<string, string>> = Object.freeze({
  'negative-sense-coexists': '同一读音还存在不宜取用的负面义项，需结合完整名字辨明。',
  'whole-name-context-required': '需要结合完整名字的语境核对取义。',
  'composition-required': '需要结合完整名字确定语义。',
  'selected-traditional-word': '释义依据当前选定的繁体字词条，须结合该词条核对。',
  'reference-only': '当前词条仅提供参照，相关完整释义仍待核对。',
  'composition-preferred': '宜结合完整名字明确所取含义。',
  'polysemy-context-required': '本字含多种义项，需要结合完整名字明确所取含义。',
  'function-word': '涉及代词、语气或连接等用法，需结合完整语句取义。',
  'family-context-required': '需要结合家庭背景或命名意图确定是否适用。',
  'mythological-imagery': '涉及传说意象，采用时以所列原义与范围为准。',
  'polyphonic-default-only': '此处仅采用当前选定读音，不借用其他读音的义项。',
  'negative-primary-personality-sense': '常见人格义含高傲自满等贬义，暂不宜据此立意。',
  'pending-dictionary-identity': '本字与所选字典词条的对应关系尚待核对。',
  'stone-not-jade': '原义为美石，并非美玉，需保留两者区别。',
  'no-dawn-sense-transfer': '本字未确立晨光义，不能直接借用“黎明”的含义。',
  'editorial-analogy': '相关品格或家庭期许属于项目借喻，并非字典原义。',
  'number-only': '本条只有数目义，不能据此直接推导吉祥寓意。',
  'classical-usage': '此处采用古典用法，需结合该用法的具体语境。',
  'place-or-surname-only': '当前读音仅有地名或姓氏义，缺少可直接采用的品质义。',
  'cultural-symbol-only': '此处仅作传统文化象征，不据此判断命运。',
  'reference-sense-unresolved': '相关参照词条的含义与适用关系尚待审阅。',
  'insect-sense-family-context-required': '当前读音取昆虫义，需要核对家庭是否确有采用该意象的意愿。',
  'traditional-music-imagery': '此处取传统乐曲意象，须保留其历史与传说背景。',
  'default-heteronym-reference-only': '当前读音仅记为另一读音的又音，实体释义仍待核对。',
  'dynasty-or-surname-only': '当前词条仅有朝代或姓氏义，需明确历史或家族背景。',
  'broad-appearance-sense': '外观义范围较宽，具体形貌与组合语境尚待核对。',
  'no-near-form-transfer': '不能借用近形字或其他字头词条的含义。',
  'name-position-required': '需要确认用途及其在完整名字中的字位。',
  'appearance-sense-only': '当前取义限于外观与审美，不扩展为人格品质。',
  'historical-figure-context': '采用历史人物的文化意象时，需保留相应历史语境。',
  'cultural-object-imagery': '此处取传统器物的具体意象，不自动等同于品格或地位。',
  'cultural-wish-not-prediction': '仅表达文化祝愿，不作吉凶预测或结果保证。',
  'rank-sense': '涉及长幼排行或居中义，需核对家庭排行与习惯。',
  'no-dictionary-word-substitution': '应采用当前选定词条，不能用其他同音或相关字头替换释义。',
  'default-reference-only': '当前默认读音仅有参照，独立释义仍待核对。',
  'ritual-sense-coexists': '同一读音还存在祭祀义，须明确本名所取语境。',
  'not-construction-timber': '原词条说明木材不宜用于建筑，不能据此比作栋梁之材。',
});

/** Retain all prose verbatim; unknown internal-shaped codes remain explicitly unresolved. */
export function formatNamingReviewWarning(warning: string): string {
  if (Object.hasOwn(labels, warning)) return labels[warning];
  return /^[a-z][a-z0-9-]*$/.test(warning)
    ? '本条审阅提示尚待核对，请结合字义范围与审阅理由确认。'
    : warning;
}
