import React from 'react';

/** Keep imported/historical notes verbatim without presenting them as the current scheme's reading instruction. */
export function CharacterSourceNote({warning}:{warning:string}) {
  return warning ? <details className="original-text character-source-note"><summary>字库原备注（保留原文，可能未随所选读音调整）</summary><p className="inline-warning">{warning}</p></details> : null;
}
