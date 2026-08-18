# @godpowers/provenance-pack

Authorized AI provenance inspection and cleaning for Godpowers.

The pack adds `/god-remove-ai-marks`, which coordinates the
[`watermarks-remover`](https://github.com/guillaumemeyer/watermarks-remover)
HTTP service selected for this feature. The deterministic client supports the
upstream `0.5.x` contract and was designed against v0.5.0 at repository commit
`c2ac8eeef3ff1a17aaab0cdb86889c7ad21675a7`.

## What it adds

| Slash command | Specialist | Purpose |
|---|---|---|
| `/god-remove-ai-marks` | `god-ai-provenance-cleaner` | Inspect first, clean supported provenance signals, preserve the source by default, and report residual risk. |

Supported upstream capabilities include:

- Invisible Unicode and unusual spacing inspection and deterministic cleanup.
- C2PA, EXIF, XMP, document-property, and supported container cleanup.
- Optional, user-approved prose rewriting for statistical text marks.
- Optional pixel regeneration when the configured service reports a matching backend.

## Install

```text
/god-extension-add @godpowers/provenance-pack
```

For local development:

```text
/god-extension-add ./extensions/provenance-pack
```

## Service requirement

This pack is a thin client. It does not install or start the service, vendor
its Python implementation, or add a Godpowers runtime dependency.

The bundled dependency-free Node.js client validates the service version and
OpenAPI shape before upload, pins resolved addresses, rejects redirects and
special-use or mixed-trust destinations, enforces absolute request deadlines,
strictly validates responses and file formats, pins the output parent and
destination before upload, and writes outputs atomically through a guarded
recovery protocol. The client accepts files up to 64 MiB. Use the upstream
CLI directly for larger authorized files.

The client accepts extensionless UTF-8 text and the upstream v0.5.0 extension
set: `.txt`, `.text`, `.css`, `.js`, `.py`, `.rs`, `.go`, `.json`, `.yaml`,
`.yml`, `.toml`, `.csv`, `.png`, `.jpg`, `.jpeg`, `.webp`, `.avif`, `.heic`,
`.heif`, `.bmp`, `.gif`, `.tiff`, `.tif`, `.svg`, `.pdf`, `.docx`, `.xlsx`,
`.pptx`, `.odt`, `.epub`, `.html`, `.htm`, `.md`, `.markdown`, and `.mdx`.
Unknown extensions fail before upload.

Start the upstream service separately, following its current documentation.
The default endpoint is loopback:

```bash
export WATERMARKS_SERVICE_URL=http://127.0.0.1:8765
```

If the service requires bearer authentication, expose the client credential
only through the process environment:

```bash
export WATERMARKS_SERVICE_API_KEY='replace-with-your-client-token'
```

The command will not print or persist that value. A non-loopback service must
use HTTPS and requires explicit destination-specific consent before any file
bytes are uploaded. Private-network destinations require a separate internal
network grant. Both grants name the exact normalized origin, for example
`--approve-remote-origin https://service.example` and
`--approve-internal-origin https://service.example`; a grant for one origin
cannot authorize another. Unknown local service builds require separate
approval for a compatibility override.

## Use

```text
/god-remove-ai-marks draft.md
/god-remove-ai-marks image.png --inspect-only
/god-remove-ai-marks report.pdf --output=report.cleaned.pdf
/god-remove-ai-marks draft.md --rewrite=paraphrase
/god-remove-ai-marks image.png --remove-pixel=ctrlregen
```

The default output is a sibling `*.cleaned.*` file. `--in-place` is explicit,
creates a recoverable backup, and is never implied by the command name.

## Honest limits

Deterministic Unicode and metadata actions can be verified by inspecting the
cleaned output. Statistical rewriting and pixel regeneration are best-effort
transformations. They cannot prove that an official vendor detector will stop
recognizing the content.

The pack does not cover C2PA soft binding, audio or video watermarks, secret-key
detectors, or model-training backdoors. A successful run is not proof of human
authorship and does not remove disclosure obligations.

The command refuses mutation when the stated purpose is disclosure evasion,
false-authorship preparation, assessment cheating, or policy bypass.

Use the pack only for content you own or are authorized to process. See
[`references/responsible-use.md`](references/responsible-use.md).

## License and upstream relationship

This Godpowers extension is MIT licensed. It does not redistribute the
upstream service. `watermarks-remover` is a separate MIT-licensed project with
its own maintainers, release cycle, optional tools, and model-backend licenses.
