export const topicIds=["fin-interest","fin-fv","fin-pv","fin-annuity"] as const;
export type TopicId=typeof topicIds[number];
export type Readiness=0|1|2;
export type Diagnostic={scores:Record<TopicId,Readiness>;completedAt:string};
export const diagnosticQuestions=[
 {id:"interest-meaning",topic:"fin-interest",prompt:"Simple interest is based on which amount?",choices:["Only the original principal","Principal plus previous interest","Only the previous interest","The final balance"],answer:0,explanation:"Simple interest is calculated only on the original principal."},
 {id:"interest-calculate",topic:"fin-interest",prompt:"$100 earns 10% compounded annually. What is the balance after two years?",choices:["$110","$120","$121","$200"],answer:2,explanation:"$100 × 1.10 × 1.10 = $121. The second year earns interest on $110."},
 {id:"fv-meaning",topic:"fin-fv",prompt:"You know your savings today and want their value in three years. Which concept do you need?",choices:["Present value","Future value","Annuity due","Principal only"],answer:1,explanation:"Future value grows today's money forward in time."},
 {id:"fv-calculate",topic:"fin-fv",prompt:"What is the future value of $200 at 5% annually after one year?",choices:["$190","$200","$205","$210"],answer:3,explanation:"$200 × 1.05 = $210."},
 {id:"pv-meaning",topic:"fin-pv",prompt:"A payment arrives next year. Which operation finds its value today at a positive discount rate?",choices:["Multiply by the growth factor","Divide by the growth factor","Add the rate as dollars","Ignore the waiting time"],answer:1,explanation:"Discounting divides by the growth factor to reverse compounding."},
 {id:"pv-calculate",topic:"fin-pv",prompt:"At a 10% discount rate, what is $220 received in one year worth today?",choices:["$200","$210","$220","$242"],answer:0,explanation:"$220 ÷ 1.10 = $200 today."},
 {id:"annuity-meaning",topic:"fin-annuity",prompt:"Which schedule describes an ordinary annuity?",choices:["One deposit today","Random deposits","Equal payments at each period-end","Equal payments at each period-start"],answer:2,explanation:"An ordinary annuity has equal, regular payments at period ends."},
 {id:"annuity-apply",topic:"fin-annuity",prompt:"At a positive rate, why does an annuity due grow more than an otherwise identical ordinary annuity?",choices:["It has no principal","Its payments are unequal","Its rate is always higher","Each payment earns one extra period of interest"],answer:3,explanation:"Beginning-of-period payments earn interest for one extra period."},
] as const;
export function scoreDiagnostic(answers:Record<string,number>,completedAt=new Date().toISOString()):Diagnostic{
 if(diagnosticQuestions.some(q=>!Number.isInteger(answers[q.id])||answers[q.id]<0||answers[q.id]>3))throw new Error("Answer every diagnostic question before checking your starting point.");
 const scores=Object.fromEntries(topicIds.map(id=>[id,diagnosticQuestions.filter(q=>q.topic===id&&answers[q.id]===q.answer).length])) as Record<TopicId,Readiness>;
 return {scores,completedAt};
}
export function parseDiagnostic(value:unknown):Diagnostic|null{
 if(!value||typeof value!=="object"||!("scores" in value)||!("completedAt" in value)||typeof value.completedAt!=="string"||!value.scores||typeof value.scores!=="object")return null;
 const raw=value.scores as Record<string,unknown>;
 if(!topicIds.every(id=>Number.isInteger(raw[id])&&Number(raw[id])>=0&&Number(raw[id])<=2))return null;
 return {scores:Object.fromEntries(topicIds.map(id=>[id,raw[id]])) as Record<TopicId,Readiness>,completedAt:value.completedAt};
}
export function buildLearningPlan(diagnostic:Diagnostic|null,completed:string[],dailyMinutes:number){
 const budget=Number.isFinite(dailyMinutes)?Math.max(10,Math.min(120,Math.floor(dailyMinutes))):30;
 const core=Math.min(budget,25);let day=1,used=0;
 const sorted=[...topicIds].sort((a,b)=>Number(completed.includes(a))-Number(completed.includes(b))||((diagnostic?.scores[a]??1)-(diagnostic?.scores[b]??1))||topicIds.indexOf(a)-topicIds.indexOf(b));
 return sorted.map(id=>{
  const done=completed.includes(id),readiness=diagnostic?.scores[id];
  const minutes=readiness===2?Math.max(10,Math.round(core*.6)):core;
  if(used+minutes>budget){day++;used=0;}used+=minutes;
  return {id,day,minutes,done,readiness,approach:done?"Review completed lesson":readiness===0?"Build foundations":readiness===2?"Apply and stretch":"Guided practice",reason:done?"Practice check and reflection completed; moved to review.":readiness===0?"Both starting-point questions need work. Start with a simpler bridge example.":readiness===1?"One starting-point question needs work. Review the explanation, then practice.":readiness===2?"Both starting-point questions were correct. Try a shorter session with extra application questions.":"Take the starting-point check to prioritize your practice."};
 });
}
export const foundationHelp:Record<TopicId,{idea:string;steps:string[]}>={
 "fin-interest":{idea:"Principal means the money you start with. Interest is the extra amount earned or charged.",steps:["10% means 10 out of every 100, or 0.10.","On $100, one year of 10% interest adds $10.","With simple interest, the next year adds another $10. With compounding, it adds 10% of $110, which is $11."]},
 "fin-fv":{idea:"Future value answers: what could this amount become later? Start with one year before using a power.",steps:["At 5%, each $100 becomes $105 after one year.","For two years, multiply by 1.05 again.","Match the rate and period: an annual rate goes with years; a monthly rate goes with months."]},
 "fin-pv":{idea:"Present value runs growth backward. Ask how much you would need today to reach the future payment.",steps:["$100 today becomes $110 in a year at 10%.","So $110 next year is equivalent to $100 today under that rate assumption.","Divide the future amount by 1.10 for each year you move backward."]},
 "fin-annuity":{idea:"An annuity is a repeating pattern: equal payments, evenly spaced. First identify when each payment happens.",steps:["Draw a timeline with one mark for each month or year.","Put the same payment at every mark. Period-end payments are an ordinary annuity.","Moving each payment to the period's beginning makes it an annuity due, with one extra period of interest."]},
};

export const conceptVariants:Record<TopicId,{brief:string;detail:string;formula:string;watch:string}>={
 "fin-interest":{brief:"Simple interest grows only the starting amount; compound interest also grows earlier interest.",detail:"Compare the amount earning interest each year. Under simple interest, that base stays fixed, so the same dollar amount is added each period. Under compounding, interest joins the balance and becomes part of the next period's base. At a positive rate, the difference gets larger over time.",formula:"Simple balance = P × (1 + r × n). Compound balance = P × (1 + r)^n.",watch:"Do not confuse interest earned with ending balance: subtract the original principal to find interest."},
 "fin-fv":{brief:"Future value is today's money grown forward by the interest rate for each period.",detail:"The growth factor 1 + r keeps the original amount and adds one period's interest. Repeated multiplication represents repeated compounding. A longer horizon or higher positive rate increases the result, while the starting principal scales it proportionally.",formula:"FV = PV × (1 + r)^n, where r is the rate per period and n is the number of matching periods.",watch:"Convert 5% to 0.05, and match annual rates with years rather than months."},
 "fin-pv":{brief:"Present value is a future payment brought back to today's equivalent amount.",detail:"Discounting asks what amount invested today could grow into the future payment under an assumed rate. It reverses the future-value calculation. Holding the payment fixed, a higher positive rate or longer wait lowers its present value.",formula:"PV = FV ÷ (1 + r)^n. Check by growing your answer forward again.",watch:"Divide to move backward in time. Multiplying would move the amount forward instead."},
 "fin-annuity":{brief:"An annuity repeats equal payments regularly; ordinary payments happen at period ends, and due payments happen at the beginnings.",detail:"A payment timeline helps separate repeated equal cash flows from a single lump sum. Each payment compounds for a different number of periods. Beginning-of-period deposits earn one additional period of interest, so an annuity due has a larger ending value at a positive rate with the same payments and count.",formula:"For an ordinary annuity at a nonzero rate: FV = payment × ((1 + r)^n − 1) ÷ r. At 0%, add the payments.",watch:"Check payment timing before selecting a formula; an irregular stream is not automatically an annuity."},
};
