import React, { useId } from 'react';

/** Keeps the native file control reachable by keyboard and labelled for assistive technology. */
export function LogoFileInput({ onChange, disabled = false }: { onChange: React.ChangeEventHandler<HTMLInputElement>; disabled?: boolean }) {
  const id = useId();
  return <label className="button secondary upload-label" htmlFor={id}>
    选择图片
    <input id={id} className="logo-file-input" type="file" accept="image/png,image/jpeg,image/webp" disabled={disabled} onChange={onChange}/>
  </label>;
}
