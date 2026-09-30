import 'server-only';
import {put} from '@vercel/blob';

const MAX_VETTING_FILE_BYTES=10*1024*1024;
const TYPES=new Set(['application/pdf','image/png','image/jpeg']);
const safeName=value=>String(value||'evidence').replace(/[^a-zA-Z0-9._-]/g,'_').slice(0,180);

export async function storeVettingEvidence(file,workspaceId,checkToken) {
  if(!file||typeof file.arrayBuffer!=='function'||!file.size)return null;
  if(file.size>MAX_VETTING_FILE_BYTES)throw new Error('Evidence file must be 10 MB or smaller.');
  if(!TYPES.has(file.type))throw new Error('Upload a PDF, PNG, or JPG evidence file.');
  const bytes=new Uint8Array(await file.slice(0,8).arrayBuffer());
  const matches=file.type==='application/pdf'?String.fromCharCode(...bytes.slice(0,5))==='%PDF-':file.type==='image/png'?bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71:bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
  if(!matches)throw new Error('The evidence file content does not match its stated type.');
  if(!process.env.BLOB_READ_WRITE_TOKEN)throw new Error('Private file storage is not configured.');
  const filename=safeName(file.name),blob=await put(`vetting/${workspaceId}/${checkToken}/${filename}`,file,{access:'private',addRandomSuffix:true});
  return {id:crypto.randomUUID(),filename,mime:file.type,size:file.size,url:blob.url,uploaded_at:new Date().toISOString()};
}
