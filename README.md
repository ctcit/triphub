# Triphub
Christchurch Tramping Club "TripHub" trip management system.

## Building
There are a number of different build configurations.
### Local testing
This runs the triphub application from a local http-server instance, but uses the API from a remote location (e.g. ctc.org.nz)
   * Not sources need to be changed.
   * Deploy the API somewhere, (e.g. ctc.org.nz/triphub-bruce/api) or use the standard ctc.org.nz/triphub/api if you haven't made any API changes.
   * Edit config.php in the deployed API (e.g. ctc.org.nz/triphub-bruce/api) and set `apiKeyExpiry` and `apiKeyUserId`.
   * Ddd new local file `public/runtime-config.js` (won't be committed due to exclusion in .gitignore) and edit:

    window.RunConfig = {
        ApiKey: '8674e5d6-bef3-4f49-9a6c-5143c7556155',
        BaseUrl: 'https://ctc.org.nz/triphub-bruce/api/api.php',
        DbApiURL: 'https://ctc.org.nz/db/index.php/rest'
    }

   * Use `npm run start` script to run on localhost:3000
### Staging
This builds the triphub application and the API to deploy on a remote server, but not the standard location (`ctc.org.nz/triphub`).
   * Not sources need to be changed.
   * Deploy api to e..g ctc.org.nz/triphub-bruce/api
   * Run `npm run build:stg` to build portable build
   * Copy the build folder contents to e.g. ctc.org.nz/triphub-bruce/web

   * Add file `runtime-config.js` to the deployed build (e.g at ctc.org.nz/triphub-bruce/web/runtime-config.js) and edit:

    window.RunConfig = {
        BaseUrl: 'https://ctc.org.nz/triphub-bruce/api/api.php',
        DbApiURL: 'https://ctc.org.nz/db/index.php/rest'
    }

   * Access the web app at on https://ctc.org.nz/triphub-bruce/web/
### Production
   * Not sources need to be changed.
   * Deploy the API to ctc.org.nz/triphub/api
   * Run `npm run build` script to build production build
   * Copy the build folder contents to ctc.org.nz/triphub/web
   * There is no runtime-config.js for production
   * Access the web app at https://ctc.org.nz/triphub/web/