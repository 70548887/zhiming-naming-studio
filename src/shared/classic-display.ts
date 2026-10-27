/**
 * Display-only conversion for the two wiki formatting forms used by the fixed
 * transcription. Original snapshot text remains untouched. Templates and HTML
 * are deliberately left as text for the rendering surface to escape.
 */
export function classicDisplay(text: string): string {
  return text
    .replace(/^([ \t]*)(={2,6})(?!=)[ \t]*(.*?)[ \t]*\2(?![=])[ \t]*$/gm, '$1$3')
    .replace(/(?<!')'''(?!')([\s\S]*?)(?<!')'''(?!')/g, '$1')
    .replace(/(?<!')''(?!')([\s\S]*?)(?<!')''(?!')/g, '$1');
}
