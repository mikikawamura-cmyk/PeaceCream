# PeaceCream visual review

This is a browser-local design prototype for reviewing the homepage and the Create Your PeaceCream flow. It is a buildless HTML/CSS/JavaScript preview, not the finished Next.js application.

Open `http://127.0.0.1:4173/#home` or `http://127.0.0.1:4173/#create` while the preview server is running. To restart from this directory: `python3 -m http.server 4173 --bind 127.0.0.1`.

## Photographic preview

The preview now uses an editorial photo atlas for all ten plain flavors. Each of the ten toppings has a corresponding full photo atlas covering all ten flavors. These images have the ingredient photographed into the scoop, including texture, light, occlusion, and contact shadows. The popular Hope + Dignity pair also has a complete photo atlas, plus a larger strawberry hero photo.

For other two-topping combinations, `gelato-renderer.js` starts with the first topping's full photo and blends the second topping's photographic changes within the scoop surface. This preserves the immediate 56-combination interaction without relying on individual ingredient stickers. The old cutout compositor remains a fallback if a photo cannot load. This hybrid technique looks substantially more natural than the previous overlay, although a dedicated pre-generated photograph for every pair would offer the most exact product-photo consistency.

The caption is in its own normal-flow row below the square photo at desktop, tablet and mobile sizes. The striped PeaceCream cup, typography, colors, selection/removal/replacement controls, and Peace Card export remain in place. The export calls the same renderer as the live preview.

## Verification

- Browser audit passed all 560 render states: ten flavors × 56 topping selections, with zero failures.
- Visually reviewed representative single-topping and paired compositions in the browser, including Strawberry and Pistachio.
- Tested selecting, removing and switching toppings and flavors in the creator. A single topping uses a complete photograph; two toppings use a complete Hope + Dignity photograph or a photo blend.
- Reviewed the desktop preview and confirmed the flavor name and value caption sit below the image with clear spacing. The prior mobile layout was also reviewed at 390px. The current browser session's viewport override did not change its 1280px capture, so this latest photo set has not been re-captured at 390px.

Repeat the render audit at `/tests/render-audit.html` and click “Run all 560 render checks”. Placement fallback checks: `node tests/test-placement.cjs`.

Images are custom AI-generated concept assets, not commissioned food photography. Prompt direction and asset mapping are in `assets/editorial-photo-prompts.txt`. They should receive product/art-direction review before production use. The Discovery Quiz is now implemented; see DISCOVERY.md for scoring, verification and pilot guidance. Gift Box and server APIs remain outside this prototype. PNG export was subsequently verified during the Discovery Quiz integration. Nothing is collected or automatically published; refreshing clears the creation.
