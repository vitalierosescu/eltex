# Webflow Custom Code Starter

Vite dev server for local Webflow JavaScript development with HMR.

## Setup

```bash
# Install dependencies
yarn install

# Start dev server (localhost:4000)
yarn dev
```

## Webflow Integration

Paste this in **Project Settings > Custom Code > Before </body>**:

```html
<script>
  (function () {
    var LOCALHOST_URL = [
      'http://localhost:4000/@vite/client',
      'http://localhost:4000/src/main.js',
    ]
    var PROD_URL = ['https://MY-PROJECT.vercel.app/main.js']

    function createScripts(arr, isDevMode) {
      return arr.map(function (url) {
        var s = document.createElement('script')
        s.src = url
        if (isDevMode) s.type = 'module'
        return s
      })
    }

    function insertScript(scriptArr) {
      scriptArr.forEach(function (script) {
        document.body.appendChild(script)
      })
    }

    var localhostScripts = createScripts(LOCALHOST_URL, true)
    var prodScripts = createScripts(PROD_URL, false)
    var chosen = null

    fetch(LOCALHOST_URL[0], {})
      .then(function () { chosen = localhostScripts })
      .catch(function () { chosen = prodScripts })
      .finally(function () {
        if (chosen) { insertScript(chosen); return }
        console.error('No scripts loaded')
      })
  })()
</script>
```

This auto-detects if the dev server is running and falls back to production.

## Production

1. Push to GitHub: `git push`
2. Deploy to Vercel: `vercel --prod --yes`
3. Update `PROD_URL` above with your Vercel domain
4. Or connect the GitHub repo to Vercel for auto-deploy on push

## External Scripts (load in Webflow head)

Add these in **Project Settings > Custom Code > Head Code** for GSAP:

```html
<script src="https://cdn.jsdelivr.net/npm/gsap@3/dist/gsap.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3/dist/ScrollTrigger.min.js"></script>
```

## Notes

- Ad blockers / Brave Shield must be disabled on the live site during dev
- Does not work in Safari during development
- jQuery is excluded from the build (Webflow includes it)
- GSAP is loaded externally in Webflow, declared as global in ESLint config
