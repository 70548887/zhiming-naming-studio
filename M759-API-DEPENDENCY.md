# M759 API dependency

The renderer owns a local type overlay for `BaziRootFeedbackV132PreviewApi` because the dev06 shared API file is not present in this baseline. The expected contract is:

`previewBaziRootFeedbackV132(profile: BirthProfile, options?: RootFeedbackFacadeOptions): Promise<RootFeedbackV132FacadeDTO>`

The view does not replace the existing 1.3.1 model or saved tuple. It runs only after an explicit button click, passes the current profile, and rejects late results after profile/API/entry changes or unmount. The r2 DTO application gate remains blocked and the UI states that the preview is not used for naming generation, saving, scoring, or sorting.

No screenshot was executed; focused renderer/harness tests and TypeScript validation are the acceptance evidence.
