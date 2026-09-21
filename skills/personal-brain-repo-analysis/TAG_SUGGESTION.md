# Tag suggestion protocol

Use this optional protocol only when the user asks to tag a completed analysis.

1. Derive 3–8 concise semantic tags from the Creator View, Engineer View,
   repository metadata, and Value Map. Prefer existing Brain tags when they
   mean the same thing.
2. Cover the useful signals among domain, architecture, artifact type,
   language, lifecycle, audience, risk, and intended use. Do not add a category
   merely to fill a quota.
3. Present the proposed tags and one-line reasons to the user.
4. Stop the tagging follow-up with state `awaiting-tag-approval`. Never write
   proposed tags without explicit human approval; the underlying analysis
   remains complete.
5. After approval, write the approved tags to `analysis.json` and every
   extraction-journal row for that repository, validate, then mark complete.

Approval applies only to the displayed tag set. Any later tag change requires
new approval.
