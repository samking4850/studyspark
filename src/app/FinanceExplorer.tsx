"use client";

import { useState } from "react";

const money = (value: number) => value.toLocaleString("en-US", { style: "currency", currency: "USD" });

export default function FinanceExplorer({ lessonId }: { lessonId: string }) {
  const [amount, setAmount] = useState("1000");
  const [rate, setRate] = useState("10");
  const [years, setYears] = useState("3");
  const [timing, setTiming] = useState("end");
  const annuity = lessonId === "fin-annuity";
  const present = lessonId === "fin-pv";
  const principal = Number(amount), interest = Number(rate) / 100, periods = Number(years);
  const valid = amount !== "" && rate !== "" && years !== "" && Number.isFinite(principal) && principal > 0 && principal <= 1000000 && interest >= 0 && interest <= 1 && Number.isInteger(periods) && periods >= 1 && periods <= 50;
  const growth = (1 + interest) ** periods;
  const result = present ? principal / growth : annuity ? principal * (interest === 0 ? periods : (growth - 1) / interest) * (timing === "beginning" ? 1 + interest : 1) : principal * growth;
  const simple = principal * (1 + interest * periods);
  return <section className="finance-explorer" aria-label="Interactive worked example">
    <span className="eyebrow">TRY IT YOURSELF</span>
    <h3>{present ? "Bring a future payment back to today" : annuity ? "Explore a regular savings plan" : "Watch your savings grow"}</h3>
    <p>Predict the result first. Then change one input and explain what changed.</p>
    <div className="finance-explorer-inputs">
      <label>{annuity ? "Yearly deposit ($)" : present ? "Future payment ($)" : "Starting balance ($)"}<input type="number" min="1" max="1000000" step="any" value={amount} onChange={event=>setAmount(event.target.value)}/></label>
      <label>Annual rate (%)<input type="number" min="0" max="100" step="0.5" value={rate} onChange={event=>setRate(event.target.value)}/></label>
      <label>Years<input type="number" min="1" max="50" step="1" value={years} onChange={event=>setYears(event.target.value)}/></label>
      {annuity && <label>Deposit timing<select value={timing} onChange={event=>setTiming(event.target.value)}><option value="end">End of each year</option><option value="beginning">Beginning of each year</option></select></label>}
    </div>
    {valid ? <>
      <div className="finance-explorer-result" aria-live="polite" aria-atomic="true"><span>{present ? "Value today" : "Balance at the end"}</span><strong>{money(result)}</strong><p>{present ? `${money(principal)} ÷ (1 + ${rate}%)^${years}` : annuity ? `${years} equal yearly deposits, made at the ${timing} of each year.` : `${money(principal)} × (1 + ${rate}%)^${years}`}</p></div>
      {lessonId === "fin-interest" && <p>Simple-interest balance: <b>{money(simple)}</b>. Compounding adds <b>{money(result-simple)}</b> more over the same period.</p>}
      {annuity && <p>You deposit {money(principal*periods)} in total and earn {money(result-principal*periods)} in interest. Beginning-of-year deposits earn one extra year of interest each.</p>}
      <details><summary>Show the year-by-year breakdown</summary><div className="finance-explorer-table"><table><caption>{present ? "Equivalent value at each year" : "Balance after each year"}</caption><thead><tr><th scope="col">Year</th><th scope="col">{present?"Value":"Balance"}</th>{lessonId==="fin-interest"&&<th scope="col">Simple interest</th>}</tr></thead><tbody>{Array.from({length:periods+1},(_,year)=>{
        const factor=(1+interest)**year;
        const balance=present?principal/(1+interest)**(periods-year):annuity?principal*(interest===0?year:(factor-1)/interest)*(timing==="beginning"?1+interest:1):principal*factor;
        return <tr key={year}><th scope="row">{year}</th><td>{money(balance)}</td>{lessonId==="fin-interest"&&<td>{money(principal*(1+interest*year))}</td>}</tr>;
      })}</tbody></table></div></details>
      <p className="finance-personal-tip">{present ? "Try doubling the waiting time. Why does the value today fall when the rate is positive?" : annuity ? "Switch the timing. Why do earlier deposits produce a larger ending balance at a positive rate?" : "Try 0% interest, then increase the rate. Which input makes the biggest difference over a longer period?"}</p>
    </> : <p role="status">Enter an amount from $1 to $1,000,000, a rate from 0% to 100%, and a whole number of years from 1 to 50.</p>}
    <small>Classroom model: constant annual rates, annual compounding, and no fees, taxes, or inflation.</small>
  </section>;
}
