import { randomUUID, randomInt } from "node:crypto";

export type Question = { prompt: string; choices: string[]; answer: number; explanation: string; source: string };
type Player = { id: string; token: string; name: string; team: string; answers: Record<number, number> };
export type Room = { revision:number; code: string; title: string; mode: "solo" | "teams"; hostId: string; players: Player[]; questions: Question[]; phase: "lobby" | "question" | "reveal" | "finished"; index: number; deadline: number; expiresAt: number };
export class GameError extends Error { status:number; constructor(message: string, status = 400) { super(message); this.status=status; } }
const q = (prompt: string, choices: string[], answer: number, explanation: string): Question => ({ prompt, choices, answer, explanation, source: "FIN101 sample course · Time Value of Money" });
const bank: Question[] = [
 q("What makes compound interest different from simple interest?",["It earns interest on earlier interest","It never changes the balance","It only applies to loans","It always uses a lower rate"],0,"Compound interest applies to principal plus accumulated interest; simple interest applies only to the original principal."),
 q("$1,000 earns 10% compounded annually. What is the balance after two years?",["$1,100","$1,200","$1,210","$1,300"],2,"Year one: $1,000 × 1.10 = $1,100. Year two: $1,100 × 1.10 = $1,210."),
 q("How much simple interest does $2,000 earn at 5% annually over two years?",["$100","$200","$205","$2,200"],1,"Simple interest = principal × rate × time = $2,000 × 0.05 × 2 = $200."),
 q("What is the future value of $500 at 10% annually for two years?",["$550","$600","$605","$650"],2,"FV = $500 × 1.10² = $605."),
 q("Which formula calculates future value with annual compounding?",["PV ÷ (1 + r)^n","PV × r","PV + n","PV × (1 + r)^n"],3,"Multiply today's value by the growth factor for each period: FV = PV × (1 + r)^n."),
 q("At 10%, what is the present value of $1,100 received in one year?",["$900","$1,000","$1,100","$1,210"],1,"Discount the future payment: $1,100 ÷ 1.10 = $1,000 today."),
 q("For a fixed future payment, a higher discount rate makes present value…",["Higher","Unchanged","Lower","Always zero"],2,"A higher discount rate increases the denominator in PV = FV ÷ (1 + r)^n."),
 q("Which payment stream is an ordinary annuity?",["One gift today","Unequal deposits on random dates","Equal deposits at each month-end","Equal deposits at each month-start"],2,"An ordinary annuity has equal, regular payments at the end of each period."),
 q("An annuity due pays at which point in each period?",["The beginning","The end","A random date","Only after the last period"],0,"Annuity-due payments happen at the beginning, so each earns one extra period of interest compared with an ordinary annuity."),
 q("At 0% interest, five deposits of $100 accumulate to…",["$100","$400","$500","$600"],2,"With no interest, add the deposits: 5 × $100 = $500."),
 q("$1,000 grows at 10% annually for three years. How much of the $1,331 balance is interest?",["$100","$300","$331","$1,331"],2,"Subtract the original $1,000 principal from the $1,331 ending balance: $331 interest."),
 q("When using a monthly interest rate, the number of periods should be measured in…",["Years","Months","Dollars","Percentage points"],1,"Rate and number of periods must use matching time units."),
];
export function nickname(value: unknown) { if(typeof value!=="string"||!value.trim()||value.trim().length>24)throw new GameError("Enter a nickname of 1–24 characters.");return value.trim(); }
export function validateQuestions(value: unknown): Question[] {
 if(!Array.isArray(value)||value.length<3||value.length>12)throw new GameError("Add between 3 and 12 questions.");
 return value.map(item=>{
  if(!item||typeof item!=="object")throw new GameError("Check each question.");
  const {prompt,choices,answer,explanation,source}=item;
  if(typeof prompt!=="string"||!prompt.trim()||prompt.length>400||!Array.isArray(choices)||choices.length!==4||!choices.every(x=>typeof x==="string"&&x.trim()&&x.length<=160)||new Set(choices.map(x=>x.trim().toLowerCase())).size!==4||!Number.isInteger(answer)||answer<0||answer>3||typeof explanation!=="string"||!explanation.trim()||explanation.length>800||typeof source!=="string"||source.length>200)throw new GameError("Each question needs four different choices, a correct answer, and an explanation.");
  return {prompt:prompt.trim(),choices:choices.map(x=>x.trim()),answer,explanation:explanation.trim(),source:source.trim()||"Host-written question"};
 });
}
export function createRoom(name: unknown, mode: unknown, custom: unknown, now=Date.now()): Room {
 const host: Player={id:randomUUID(),token:randomUUID(),name:nickname(name),team:mode==="teams"?"Purple":"",answers:{}};
 const shuffled=[...bank];for(let i=shuffled.length-1;i>0;i--){const j=randomInt(i+1);[shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]];}
 return {revision:0,code:Array.from({length:6},()=>"ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[randomInt(32)]).join(""),title:custom?"Your course trivia":"FIN101 trivia",mode:mode==="teams"?"teams":"solo",hostId:host.id,players:[host],questions:custom?validateQuestions(custom):shuffled.slice(0,8),phase:"lobby",index:0,deadline:0,expiresAt:now+4*60*60*1000};
}
export function joinRoom(room:Room,name:unknown) {
 if(room.phase!=="lobby")throw new GameError("This game has started. Ask the host to create a new room.",409);
 if(room.players.length>=12)throw new GameError("This room is full (12 players).",409);
 const clean=nickname(name);if(room.players.some(p=>p.name.toLowerCase()===clean.toLowerCase()))throw new GameError("That nickname is taken. Try another.",409);
 const player:Player={id:randomUUID(),token:randomUUID(),name:clean,team:room.mode==="teams"?(room.players.length%2?"Gold":"Purple"):"",answers:{}};room.players.push(player);return player;
}
export function getPlayer(room:Room,token:string) {const player=room.players.find(p=>p.token===token);if(!player)throw new GameError("Rejoin the room to continue.",401);return player;}
export function act(room:Room,token:string,action:unknown,index:unknown,choice:unknown,now=Date.now()) {
 const player=getPlayer(room,token);
 if(action==="answer") {
  if(room.phase!=="question"||now>=room.deadline||index!==room.index)throw new GameError("This question has closed.",409);
  if(!Number.isInteger(choice)||Number(choice)<0||Number(choice)>3)throw new GameError("Choose one answer.");
  if(player.answers[room.index]!==undefined)throw new GameError("Your answer is already locked in.",409);
  player.answers[room.index]=Number(choice);return;
 }
 if(player.id!==room.hostId)throw new GameError("Only the host can control the game.",403);
 if(action==="start"&&room.phase==="lobby") {if(room.players.length<2)throw new GameError("Invite at least one friend before starting.");room.phase="question";room.deadline=now+30000;return;}
 if(action==="reveal"&&room.phase==="question") {if(now<room.deadline&&!room.players.every(p=>p.answers[room.index]!==undefined))throw new GameError("Wait for everyone to answer or for the timer to finish.",409);room.phase="reveal";return;}
 if(action==="next"&&room.phase==="reveal") {if(room.index===room.questions.length-1){room.phase="finished";}else{room.index++;room.phase="question";room.deadline=now+30000;}return;}
 if(action==="end"&&room.phase!=="finished"){room.phase="finished";return;}
 throw new GameError("That action is not available right now.",409);
}
export function view(room:Room,token:string) {
 const me=getPlayer(room,token),revealed=room.phase==="reveal"||room.phase==="finished";
 const score=(p:Player)=>room.questions.reduce((total,q,i)=>total+((i<room.index||(i===room.index&&revealed))&&p.answers[i]===q.answer?100:0),0);
 const current=room.questions[room.index];
 return {revision:room.revision,code:room.code,title:room.title,mode:room.mode,phase:room.phase,index:room.index,total:room.questions.length,deadline:room.deadline,expiresAt:room.expiresAt,host:me.id===room.hostId,myId:me.id,myAnswer:me.answers[room.index]??null,players:room.players.map(p=>({id:p.id,name:p.name,team:p.team,score:score(p),answered:p.answers[room.index]!==undefined})),question:room.phase==="lobby"?null:{prompt:current.prompt,choices:current.choices,...(revealed?{answer:current.answer,explanation:current.explanation,source:current.source}:{})},review:room.phase==="finished"?room.questions.slice(0,room.index+1).filter((q,i)=>me.answers[i]!==q.answer).map(q=>({prompt:q.prompt,answer:q.choices[q.answer],explanation:q.explanation,source:q.source})):[]};
}
export type RoomView=ReturnType<typeof view>;
