# Holographic artwork v4.3

The two project assets are generated raster illustrations, encoded as WebP with their original alpha channels. They are not patient images, medical scans, measured heatmaps or a reconstruction from bioimpedance.

- `public/assets/hologram-cyan-v43.webp`: 1024 × 1536, cyan front view.
- `public/assets/hologram-amber-v43.webp`: 1024 × 1536, illustrative amber overlay.

The built-in image generation tool produced the artwork. The successful final art direction was: a fully covered adult fitness figure in a smooth blue compression outfit, front view, realistic human proportions, slightly separated arms and legs, cyan wireframe and edge light, and an elliptical radar platform. The amber variant preserves the pose, proportions, outfit and platform, changes the face to cyan holographic shading, and adds amber to abdomen, hips and upper thighs while leaving the center clear for a separate data-driven marker. No UI, phone, text, numbers, diagnoses, red core or green core are baked into either asset.

The amber layer is shown only when total body fat is above its applicable reference band. The separate visceral marker uses its own classification, so normal visceral readings remain green even with high total fat. The existing rotatable Three.js model and original 2D diagram remain available through the 3D and 2D controls. The new Holo view is a front-view illustration, not a rotatable anatomical mesh.

The supplied screenshot was used only as a private visual reference; it was not added to the repository. No example measurements from that screenshot were imported.
