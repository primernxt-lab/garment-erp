C:\Users\ACER\garment-erp>git pull
remote: Enumerating objects: 3, done.
remote: Counting objects: 100% (3/3), done.
remote: Compressing objects: 100% (2/2), done.
remote: Total 2 (delta 1), reused 0 (delta 0), pack-reused 0 (from 0)
Unpacking objects: 100% (2/2), 889 bytes | 296.00 KiB/s, done.
From https://github.com/primernxt-lab/garment-erp
   1f7baab..f24684b  main       -> origin/main
Updating 1f7baab..f24684b
Fast-forward
 package.json | 23 ++++++++++++++++++-----
 1 file changed, 18 insertions(+), 5 deletions(-)

C:\Users\ACER\garment-erp>npm install

added 60 packages, and audited 61 packages in 11s

7 packages are looking for funding
  run `npm fund` for details

2 moderate severity vulnerabilities

To address all issues (including breaking changes), run:
  npm audit fix --force

Run `npm audit` for details.

C:\Users\ACER\garment-erp>npm run dev

> garment-erp@1.0.0 dev
> vite

X [ERROR] Expected ";" but found ":"

    vite.config.js:2:8:
      2 │   "name": "garment-erp",
        │         ^
        ╵         ;

failed to load config from C:\Users\ACER\garment-erp\vite.config.js
error when starting dev server:
Error: Build failed with 1 error:
vite.config.js:2:8: ERROR: Expected ";" but found ":"
    at failureErrorWithLog (C:\Users\ACER\garment-erp\node_modules\esbuild\lib\main.js:1649:15)
    at C:\Users\ACER\garment-erp\node_modules\esbuild\lib\main.js:1058:25
    at runOnEndCallbacks (C:\Users\ACER\garment-erp\node_modules\esbuild\lib\main.js:1484:45)
    at buildResponseToResult (C:\Users\ACER\garment-erp\node_modules\esbuild\lib\main.js:1056:7)
    at C:\Users\ACER\garment-erp\node_modules\esbuild\lib\main.js:1085:16
    at responseCallbacks.<computed> (C:\Users\ACER\garment-erp\node_modules\esbuild\lib\main.js:703:9)
    at handleIncomingPacket (C:\Users\ACER\garment-erp\node_modules\esbuild\lib\main.js:762:9)
    at Socket.readFromStdout (C:\Users\ACER\garment-erp\node_modules\esbuild\lib\main.js:679:7)
    at Socket.emit (node:events:509:28)
    at addChunk (node:internal/streams/readable:563:12)

C:\Users\ACER\garment-erp>
