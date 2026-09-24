# Content snippets

Reusable HTML-card content for posts/pages on this fork's Ghost site. These
are content assets, not code Ghost runs — nothing here is wired into the
build. Turn one into a reusable Koenig snippet once, then insert it from the
editor's slash menu (`/`) on any future post.

## `three-js-scene.html`

A self-contained, interactive-free (auto-rotating) Three.js scene: an
icosahedron lit by an ambient + directional light, loaded from a CDN with no
build step. Pauses via `IntersectionObserver` when scrolled out of view so it
doesn't burn CPU on posts nobody is looking at.

**Note on where this came from:** it exists because visitor-facing 3D content
in a post needs to run in the reader's browser, on the published page — an
MCP server (like `mcpservers.org`'s Three.js 3D Viewer) only renders inside
an AI chat conversation and has no way to publish anything to a site. HTML
cards are Ghost's actual mechanism for this: they pass their content through
to the rendered post unsanitized by design (confirmed against
`koenig/kg-default-nodes/src/nodes/html/html-renderer.ts` and
`ghost/core/core/server/lib/lexical.js` — the HTML card is Ghost's
intentional raw-HTML/script escape hatch), so a `<script type="module">`
inside one runs normally for visitors.

### Turn it into a snippet (one-time setup)

1. Open any post in Ghost Admin's editor.
2. Add an **HTML card** (`/html`), paste the contents of
   `three-js-scene.html` into it.
3. Click the card, open its **⋯** menu → **Save as snippet**, name it (e.g.
   "3D scene — icosahedron").
4. Discard the post if it was just for this setup — the snippet itself is
   saved independently of the post.

From then on, typing `/` in any post/page and picking that snippet inserts a
working 3D scene. Duplicate the HTML card and edit the `IcosahedronGeometry`/
`MeshStandardMaterial` calls for a different shape or color per use.

Only one `<script type="importmap">` is allowed per page, so this snippet
deliberately imports Three.js by full CDN URL rather than a bare `'three'`
specifier — safe to use more than once on the same page. Keep that in mind
before adding controls/addons (e.g. `OrbitControls`), which import Three.js
via a bare specifier and do need an import map.
