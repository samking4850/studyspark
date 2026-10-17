import { NextResponse } from "next/server";
import { act, createRoom, GameError, getPlayer, joinRoom, view, type Room } from "../../../lib/study-night";
import { createHash } from "node:crypto";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const ttl=4*60*60;
const configured=()=>Boolean((process.env.UPSTASH_REDIS_REST_URL||process.env.KV_REST_API_URL)&&(process.env.UPSTASH_REDIS_REST_TOKEN||process.env.KV_REST_API_TOKEN));
async function redis(command:(string|number)[]) {
 const url=process.env.UPSTASH_REDIS_REST_URL||process.env.KV_REST_API_URL;
 const token=process.env.UPSTASH_REDIS_REST_TOKEN||process.env.KV_REST_API_TOKEN;
 if(!url||!token)throw new GameError("Online rooms are not connected yet. Try a practice round while shared rooms are being set up.",503);
 const response=await fetch(url,{method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify(command),cache:"no-store",signal:AbortSignal.timeout(8000)});
 if(!response.ok)throw new GameError("The room service is temporarily unavailable. Try again.",503);
 const data=await response.json();if(data.error)throw new GameError("The room service is temporarily unavailable. Try again.",503);return data.result;
}
function codeOf(value:unknown){if(typeof value!=="string"||! /^[A-HJ-NP-Z2-9]{6}$/.test(value.toUpperCase()))throw new GameError("Enter a six-character room code.");return value.toUpperCase();}
function tokenOf(request:Request){return request.headers.get("authorization")?.replace(/^Bearer /,"")||"";}
async function read(code:string):Promise<{raw:string;room:Room}>{const raw=await redis(["GET",`study-night:${code}`]);if(typeof raw!=="string")throw new GameError("Room not found or expired. Check the code with your host.",404);const room=JSON.parse(raw) as Room;if(room.expiresAt<=Date.now())throw new GameError("This room has expired. Create a new one.",404);return {raw,room};}
function errorResponse(error:unknown){return NextResponse.json({error:error instanceof GameError?error.message:"Could not reach your game. Please try again."},{status:error instanceof GameError?error.status:503,headers:{"Cache-Control":"no-store"}});}
async function rateLimit(request:Request){const ip=request.headers.get("x-forwarded-for")?.split(",")[0]||"unknown";const key=`study-night-limit:${createHash("sha256").update(ip).digest("hex").slice(0,24)}`;const count=await redis(["INCR",key]);if(count===1)await redis(["EXPIRE",key,600]);if(count>30)throw new GameError("Too many room requests. Try again in a few minutes.",429);}
export async function GET(request:Request){try{const url=new URL(request.url);if(url.searchParams.get("status")==="1")return NextResponse.json({online:configured()},{headers:{"Cache-Control":"no-store"}});const {room}=await read(codeOf(url.searchParams.get("code")));return NextResponse.json(view(room,tokenOf(request)),{headers:{"Cache-Control":"no-store"}});}catch(error){return errorResponse(error);}}
export async function POST(request:Request){try{
 const origin=request.headers.get("origin");if(origin&&origin!==new URL(request.url).origin)throw new GameError("Open StudySpark directly to join a game.",403);
 const text=await request.text();if(text.length>24000)throw new GameError("This quiz is too large.",413);
 let body;try{body=JSON.parse(text);}catch{throw new GameError("Could not read that request.");}
 if(!body||typeof body!=="object")throw new GameError("Check your game request.");
 if(body.action==="create"){
  await rateLimit(request);
  for(let attempt=0;attempt<5;attempt++){
   const room=createRoom(body.name,body.mode,body.questions);const saved=await redis(["SET",`study-night:${room.code}`,JSON.stringify(room),"NX","EX",ttl]);
   if(saved==="OK")return NextResponse.json({token:room.players[0].token,room:view(room,room.players[0].token)},{headers:{"Cache-Control":"no-store"}});
  }throw new GameError("Could not create a room. Try again.",503);
 }
 const code=codeOf(body.code);if(body.action==="join")await rateLimit(request);
 for(let attempt=0;attempt<8;attempt++){
  const {raw,room}=await read(code);let token=tokenOf(request);
  if(body.action==="join"){const player=joinRoom(room,body.name);token=player.token;}else{getPlayer(room,token);act(room,token,body.action,body.index,body.choice);}
  room.revision++;
  const next=JSON.stringify(room),seconds=Math.max(1,Math.floor((room.expiresAt-Date.now())/1000));
  const changed=await redis(["EVAL","if redis.call('GET',KEYS[1]) == ARGV[1] then redis.call('SET',KEYS[1],ARGV[2],'EX',ARGV[3]); return 1 else return 0 end",1,`study-night:${code}`,raw,next,seconds]);
  if(changed===1)return NextResponse.json({token,room:view(room,token)},{headers:{"Cache-Control":"no-store"}});
 }
 throw new GameError("The room is busy. Try your action again.",409);
}catch(error){return errorResponse(error);}}
