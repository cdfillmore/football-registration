import { reconcile, finalize } from './db/service.js'; import './db/migrate.js';
const tick=()=>{ reconcile(); finalize(); }; tick(); setInterval(tick,60000);
