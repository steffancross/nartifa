# Test images

Used by `tests/int/images.int.spec.ts` (Build Spec 05). Made with `sharp`; regenerate only if a test needs a new case.

| File | What it is |
| --- | --- |
| `portrait-phone.jpg` | A portrait photo stored the way phones do: 4032×3024 sideways pixels + EXIF Orientation 6, with camera make/model and GPS tags. Red square top-left, green bottom-right when upright |
| `small.png` | 300×200, to check nothing is upscaled |
| `huge-144mp.png` | 12000×12000 (144 MP, over Cloudflare's 100 MP limit). A flat colour, so the file stays small |
