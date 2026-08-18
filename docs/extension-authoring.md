# Extension Authoring

Want Godpowers to do something it does not do yet? Build a skill pack.

A pack bundles your own commands, specialists, and workflows into an npm package
that anyone can install. Godpowers ships a scaffold so you start from the same
contract the built-in packs use, rather than reverse-engineering it.

## Purpose

- [DECISION] Godpowers ships a first-party extension scaffold helper so
  external extension authors start from the same manifest and package contract
  as the built-in packs.
- [DECISION] The helper creates files only when they do not already exist
  unless overwrite is requested.
- [DECISION] The scaffold validates its manifest before reporting success.

That second point is a safety property worth knowing: running the scaffold twice
will not quietly overwrite work you have already done.

## Getting started

From inside your AI tool:

```bash
/god-extension-scaffold --name=@godpowers/my-pack --output=.
```

Or from a terminal:

```bash
npx godpowers extension-scaffold --name=@godpowers/my-pack --output=.
```

That gives you a working, valid pack skeleton. Everything below is optional
refinement.

### Optional arguments

- [DECISION] `--skill=custom-pack-command` sets the generated skill name.
- [DECISION] `--agent=custom-pack-agent` creates a generated agent contract.
- [DECISION] `--workflow=my-pack-workflow` creates a generated workflow YAML.

## What you get

| File | What it is |
|---|---|
| `manifest.yaml` | Declares the pack to Godpowers |
| `package.json` | Makes it publishable to npm |
| `README.md` | Lists what the pack contains |
| `skills/<skill>.md` | Your command, with frontmatter and label guidance |
| `agents/<agent>.md` | Your specialist, if requested |
| `workflows/<workflow>.yaml` | Your workflow, if requested |

The specifics:

- [DECISION] `manifest.yaml` uses `apiVersion: godpowers/v1` and
  `kind: Extension`.
- [DECISION] `package.json` declares `peerDependencies.godpowers` and
  `publishConfig.access: public`.
- [DECISION] `README.md` lists generated extension contents.
- [DECISION] `skills/<skill>.md` contains command frontmatter and placeholder
  three-label guidance.
- [DECISION] Optional `agents/<agent>.md` and `workflows/<workflow>.yaml`
  files are generated when requested.

## Before you publish

Your pack is held to the same standards as the core, so run these:

```bash
node scripts/test-extension-authoring.js
node scripts/test-extensions-publish.js
```

- [DECISION] The scaffold helper is package-guarded by
  `scripts/check-package-contents.js`.
- [DECISION] Release-surface sync checks that the authoring test remains wired
  into the release gate.
- [DECISION] First-party packs publish only from a `<pack>-v<version>` tag whose
  package name and version match the workflow input and whose commit is already
  merged into `main`.

Built something useful? Tell us. See [USERS.md](../USERS.md) for where.
