# Repo notes for Claude

## Two-repo setup

Anahit works day to day from this repo, `designature-studio-website`. There is
a second, separate repository called `anahit-bit/doc`, her documentation repo,
where plans, roadmaps, brand material and other non-code documentation live.

When she refers to "the doc repo," she means `anahit-bit/doc`, not a folder in
this repo. Add it to session scope and clone it (`add_repo` with owner
`anahit-bit`, repo `doc`) whenever she asks for something there, without
asking her to re-explain this setup. Push directly to its `main` branch
following the same no-PR rule below, unless she asks for a PR.

## Pull requests

Do not ask whether to open a pull request after pushing a commit to a branch.
Push directly and say it's pushed. Only open a PR if explicitly asked for one
in that request.
