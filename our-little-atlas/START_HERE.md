# Our Little Atlas — easy launch

The app is ready. You do not need to edit any code.

## Easiest assisted route: Railway in ChatGPT

Connect the Railway app in ChatGPT and ask: "Deploy the attached Our Little Atlas website as a private Node.js app with persistent storage. Help me set the password and give me the final URL." Keep the password out of messages you share publicly. Confirm that the deployment has persistent storage before using the journal.

## Self-service route: Render Blueprint

1. Download and unzip the website package. Create a **private** GitHub repository at https://github.com/new (name it `our-little-atlas`). On the repository page choose **Add file → Upload files** and upload the *contents* of the `our-little-atlas` folder, including `render.yaml` and `public` folder files, then commit. GitHub's browser upload may not preserve folders when selecting individual files: dragging the unzipped folder contents onto the upload area usually preserves them; verify `public/index.html` appears in GitHub. If necessary use GitHub Desktop to commit the folder.
2. Visit https://dashboard.render.com/select-repo?type=blueprint (or Render dashboard → New → Blueprint). Connect GitHub, select your private repository, and approve the Blueprint.
3. When prompted, enter **ATLAS_PASSWORD** (at least 12 characters). The signing secret is generated automatically. Confirm the paid Starter service and 1 GB persistent disk. Review Render's displayed price before approving.
4. Wait for the deployment to finish. Render will give you an `https://...onrender.com` URL. Open it, enter your password, and send the URL and password to Mia privately.

No code edits, database setup, or manual environment configuration required on the Render route. The included `render.yaml` sets up the service, generated signing secret, and persistent disk.

## Important

- The website is not online until you deploy it. The ZIP itself cannot be shared as a live website.
- A persistent disk is necessary: without it, your notes could disappear on restart or redeploy.
- This is a shared-password private space, not separate verified user accounts. Anyone with the URL and password can see and change both people's notes.
- Render's persistent disk requires a paid service; review pricing at checkout. No hosting purchase is made by this package.
- When you change your password, existing sessions may remain valid until the signing secret is rotated. Change `ATLAS_SECRET` as well to invalidate previous sessions.
- The original 50-page PDF is separate; the web app includes the activity content and shared journal, not a collaborative PDF viewer.
