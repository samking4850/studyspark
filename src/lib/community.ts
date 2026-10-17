export type Member = { id:string; name:string; token:string };
export type Reply = { id:string; authorId:string; author:string; body:string; createdAt:number };
export type Thread = { id:string; authorId:string; author:string; kind:'question'|'meetup'; title:string; body:string; when:string; where:string; going:string[]; replies:Reply[]; createdAt:number };
export type Community = { code:string; course:string; members:Member[]; threads:Thread[]; revision:number; expiresAt:number };
export type CommunityView = { code:string; course:string; me:string; host:boolean; members:{id:string;name:string}[]; threads:Thread[]; revision:number; expiresAt:number };
export class CommunityError extends Error { status:number; constructor(message:string,status=400){super(message);this.status=status;} }
function text(value:unknown,label:string,max:number,optional=false){if(typeof value!=='string'||value.trim().length>max||(!optional&&!value.trim()))throw new CommunityError(`Enter ${label}${optional?'':` (up to ${max} characters)`}.`);return value.trim();}
export function nickname(value:unknown){return text(value,'a nickname',32);}
export function createCommunity(name:unknown,now=Date.now()):{room:Community;token:string}{const token=crypto.randomUUID(),member={id:crypto.randomUUID(),name:nickname(name),token};return {token,room:{code:crypto.randomUUID().replaceAll('-','').slice(0,20).toUpperCase(),course:'FIN101',members:[member],threads:[],revision:0,expiresAt:now+30*86400000}};}
export function getMember(room:Community,token:string){const m=room.members.find(m=>m.token===token);if(!m)throw new CommunityError('Join this class space with its invitation first.',401);return m;}
export function joinCommunity(room:Community,name:unknown){const clean=nickname(name);if(room.members.length>=100)throw new CommunityError('This preview space has reached 100 members.');if(room.members.some(m=>m.name.toLowerCase()===clean.toLowerCase()))throw new CommunityError('That nickname is in use. Add an initial or choose another.');const member={id:crypto.randomUUID(),name:clean,token:crypto.randomUUID()};room.members.push(member);return member;}
export function communityView(room:Community,token:string):CommunityView{const m=getMember(room,token);return {code:room.code,course:room.course,me:m.id,host:room.members[0].id===m.id,members:room.members.map(({id,name})=>({id,name})),threads:room.threads,revision:room.revision,expiresAt:room.expiresAt};}
export function communityAction(room:Community,token:string,body:Record<string,unknown>,now=Date.now()){
 const m=getMember(room,token);
 if(body.action==='post'){
  if(room.threads.length>=100)throw new CommunityError('This space has reached 100 posts. Remove an old post before adding another.');
  if(body.kind!=='question'&&body.kind!=='meetup')throw new CommunityError('Choose course question or study get-together.');
  const when=text(body.when??'','a study time',80,true),where=text(body.where??'','a meeting place or link',240,true);
  if(body.kind==='meetup'&&!when)throw new CommunityError('Add a time for the study get-together.');
  room.threads.unshift({id:crypto.randomUUID(),authorId:m.id,author:m.name,kind:body.kind,title:text(body.title,'a post title',120),body:text(body.body,'a message',2000),when:body.kind==='meetup'?when:'',where:body.kind==='meetup'?where:'',going:[],replies:[],createdAt:now});return;
 }
 const thread=room.threads.find(t=>t.id===body.threadId);if(!thread)throw new CommunityError('This post is no longer available.',404);
 if(body.action==='reply'){if(thread.replies.length>=50)throw new CommunityError('This post has reached 50 replies. Start a new question.');thread.replies.push({id:crypto.randomUUID(),authorId:m.id,author:m.name,body:text(body.body,'a reply',2000),createdAt:now});}
 else if(body.action==='rsvp'){if(thread.kind!=='meetup')throw new CommunityError('Only get-togethers have attendance.');thread.going=thread.going.includes(m.id)?thread.going.filter(id=>id!==m.id):[...thread.going,m.id];}
 else if(body.action==='delete'){if(thread.authorId!==m.id&&room.members[0].id!==m.id)throw new CommunityError('Only the author or space creator can remove this post.',403);room.threads=room.threads.filter(t=>t.id!==thread.id);}
 else throw new CommunityError('Unknown discussion action.');
}
export function parseCommunity(raw:string|null):Community|null{try{const r=JSON.parse(raw||'null') as Community;if(!r||typeof r.code!=='string'||typeof r.course!=='string'||!Number.isFinite(r.expiresAt)||!Number.isInteger(r.revision)||!Array.isArray(r.members)||!r.members.length||r.members.length>100||!r.members.every(m=>m&&[m.id,m.name,m.token].every(v=>typeof v==='string'))||!Array.isArray(r.threads)||r.threads.length>100)return null;for(const t of r.threads){if(!t||![t.id,t.authorId,t.author,t.title,t.body,t.when,t.where].every(v=>typeof v==='string')||!['question','meetup'].includes(t.kind)||!Number.isFinite(t.createdAt)||!Array.isArray(t.going)||!t.going.every(v=>typeof v==='string')||!Array.isArray(t.replies)||t.replies.length>50||!t.replies.every(p=>p&&[p.id,p.authorId,p.author,p.body].every(v=>typeof v==='string')&&Number.isFinite(p.createdAt)))return null;}return r;}catch{return null;}}
