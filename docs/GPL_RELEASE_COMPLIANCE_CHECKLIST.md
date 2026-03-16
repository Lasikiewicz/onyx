# GPL Release Compliance Checklist

Use this checklist before publishing any installer/binary that includes GPL-covered code.

## Repository & Source
- [ ] `LICENSE` contains full GNU GPL v3 text.
- [ ] `README.md` license section matches `GPL-3.0-or-later`.
- [ ] [`package.json`](../package.json) and [`package-lock.json`](../package-lock.json) top-level license fields are aligned.
- [ ] Provenance doc is updated: `docs/NYRNA_PROVENANCE.md`.

## Notices & Attribution
- [ ] Upstream copyright/license notices are preserved.
- [ ] Any required attribution files from reused projects are carried forward.
- [ ] In-app About/Settings includes GPL notice and source/provenance links.

## Release Artifacts
- [ ] Binary artifacts are published with clear GPL notice.
- [ ] Corresponding source is available via tag source links.
- [ ] Additional source tarball is attached to the release.
- [ ] Release notes include links to source and `docs/NYRNA_PROVENANCE.md`.

## Verification
- [ ] Suspend/Resume feature tested locally on Windows (launch, suspend, resume, failure paths).
- [ ] Feature toggle/shortcut behavior validated after save and after app restart.
- [ ] No stale MIT references in primary project metadata/docs.

## Notes
This checklist supports engineering compliance workflow and is not legal advice.
