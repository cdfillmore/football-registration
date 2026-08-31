import { createHmac, timingSafeEqual } from 'node:crypto';
export function signed(value:string){const secret=process.env.SESSION_SECRET??'dev-secret';const sig=createHmac('sha256',secret).update(value).digest('base64url');return `${value}.${sig}`;}
export function validCookie(value:string|undefined){if(!value)return false;const [v,s]=value.split('.');if(!v||!s)return false;const expected=signed(v).split('.')[1];return s.length===expected.length&&timingSafeEqual(Buffer.from(s),Buffer.from(expected));}
export function originOk(request:Request){const origin=request.headers.get('origin');if(!import.meta.env.PROD)return true;const expected=process.env.ORIGIN??import.meta.env.ORIGIN;return !expected||origin===expected;}
