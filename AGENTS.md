<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep PNG upscaling and SVG tracing in separate browser-safe library modules; load the tracer dynamically inside the browser action so adding vector processing cannot change the upscale algorithm or evaluate the tracer during SSR.
- Map vector controls through a pure, tested options function; preview generated SVG through a Blob image URL rather than inserting SVG markup into the document.
