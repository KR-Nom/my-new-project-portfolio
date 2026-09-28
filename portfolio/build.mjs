import {fileURLToPath} from 'node:url';
process.env.PORTFOLIO_SKIP_BACKUP='1';
process.argv[2]=fileURLToPath(new URL('./index.html',import.meta.url));
await import('./source/build-html.mjs');
