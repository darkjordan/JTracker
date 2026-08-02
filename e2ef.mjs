import { chromium, devices } from "playwright";
const b = await chromium.launch();
const p = await b.newContext(devices["iPhone 13"]).then(c=>c.newPage());
const errs=[]; p.on("pageerror",e=>errs.push(String(e).slice(0,140)));
const step=async(n,fn)=>{try{await fn();console.log("✓ "+n);}catch(e){console.log("✗ "+n+" — "+e.message.split("\n")[0]);}};
const add=async(type,amt,desc,cat)=>{
  await p.click(type==="income"?'button:has-text("+ Income")':'button:has-text("− Expense")');
  await p.fill('input[aria-label="Amount"]',amt); await p.fill('input[aria-label="Description"]',desc);
  if(cat) await p.selectOption('select[aria-label="Category"]',{label:cat});
  await p.getByRole('button',{name:/^Add /}).click();
  await p.waitForSelector(`ul li:has-text("${desc}")`,{timeout:8000});
};
await p.goto("http://192.168.68.112:3001/",{waitUntil:"networkidle",timeout:20000});
await p.waitForSelector("text=No transactions this month",{timeout:12000});
await add("expense","8.50","Nasi Lemak","🍜 Food & Drink");
await add("expense","12","Grab ride","🚗 Transport");
await add("income","100","Freelance pay","🧑‍💻 Freelance");
await step("search 'grab' → only Grab", async()=>{
  await p.fill('input[aria-label="Search"]',"grab");
  await p.waitForFunction(()=>document.querySelectorAll('ul li').length===1,{timeout:4000});
});
await step("clear search → 3 rows", async()=>{
  await p.fill('input[aria-label="Search"]',"");
  await p.waitForFunction(()=>document.querySelectorAll('ul li').length===3,{timeout:4000});
});
await step("type=Income → only income", async()=>{
  await p.selectOption('select[aria-label="Type filter"]',"income");
  await p.waitForFunction(()=>document.querySelectorAll('ul li').length===1,{timeout:4000});
  if(await p.locator('ul li',{hasText:"Freelance pay"}).count()!==1) throw new Error("wrong");
  await p.selectOption('select[aria-label="Type filter"]',"all");
});
await step("category=Transport → only Grab", async()=>{
  await p.selectOption('select[aria-label="Category filter"]',{label:"🚗 Transport"});
  await p.waitForFunction(()=>document.querySelectorAll('ul li').length===1,{timeout:4000});
  await p.selectOption('select[aria-label="Category filter"]',"");
});
await step("mark Grab reviewed → 'To review' hides it", async()=>{
  await p.locator('ul li',{hasText:"Grab ride"}).getByRole('button',{name:"Mark reviewed"}).click();
  await p.waitForTimeout(500);
  await p.click('button:has-text("To review")');
  await p.waitForFunction(()=>document.querySelectorAll('ul li').length===2,{timeout:4000});
  await p.click('button:has-text("To review")');
});
await step("reviewed persists across reload", async()=>{
  await p.reload({waitUntil:"networkidle"});
  await p.waitForSelector('ul li:has-text("Grab ride")',{timeout:8000});
  if(await p.locator('ul li',{hasText:"Grab ride"}).getByRole('button',{name:"Mark to review"}).count()!==1) throw new Error("not persisted");
});
await step("cleanup", async()=>{
  for(const l of ["Nasi Lemak","Grab ride","Freelance pay"]){ await p.locator('ul li',{hasText:l}).getByRole('button').first().click(); await p.click('button:has-text("Delete")'); await p.waitForTimeout(700);}
  await p.waitForSelector("text=No transactions this month",{timeout:6000});
});
console.log("ERRORS:", errs.join(" | ")||"(none)");
await b.close();
