import type { APIRoute } from 'astro';
export const POST:APIRoute=({cookies})=>{cookies.delete('admin_session',{path:'/'});return Response.json({ok:true});};
