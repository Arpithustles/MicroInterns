export type Task = {
  id: string; title: string; company: string; category: string; emoji: string;
  description: string; pay: number; duration: string; level: string;
  skills: string[]; featured?: boolean; posted: string; deliverables: string[];
};

export const starterTasks: Task[] = [
  { id:"task-101", title:"Redesign a landing page", company:"Northstar Studio", category:"Design", emoji:"✳", description:"Refresh a small brand's landing page with a clear visual hierarchy, accessible colors and a mobile-first layout.", pay:3500, duration:"5 days", level:"Beginner friendly", skills:["Figma","UI design","Responsive design"], featured:true, posted:"Today", deliverables:["A desktop landing page concept","Mobile layout","A short design rationale"] },
  { id:"task-102", title:"Clean and explore a dataset", company:"DataSprout", category:"Data", emoji:"⌁", description:"Review a customer dataset, clean common issues and share three useful observations in a concise notebook.", pay:4500, duration:"1 week", level:"Intermediate", skills:["Python","Pandas","Data analysis"], featured:true, posted:"Yesterday", deliverables:["Cleaned dataset","Notebook with analysis","Three insight summaries"] },
  { id:"task-103", title:"Write a beginner-friendly guide", company:"OpenPath Learning", category:"Content", emoji:"Aa", description:"Turn a technical topic into a practical, well-structured guide that a first-year student can understand.", pay:1800, duration:"3 days", level:"Beginner friendly", skills:["Writing","Research","Editing"], posted:"2 days ago", deliverables:["800–1000 word guide","Two title options","Source list"] },
  { id:"task-104", title:"Build a small API endpoint", company:"Crafted Systems", category:"Development", emoji:"⌘", description:"Create a simple REST endpoint with validation, clear error responses and setup instructions.", pay:6000, duration:"1 week", level:"Intermediate", skills:["TypeScript","REST API","Git"], featured:true, posted:"Today", deliverables:["Working endpoint","Basic tests","README instructions"] },
  { id:"task-105", title:"Research student communities", company:"Campus Loop", category:"Research", emoji:"◎", description:"Compare student communities and summarise the features that help members stay active and connected.", pay:2200, duration:"4 days", level:"Beginner friendly", skills:["Research","Spreadsheets","Communication"], posted:"3 days ago", deliverables:["Comparison sheet","Short findings report","Three recommendations"] },
  { id:"task-106", title:"Create social media templates", company:"Goodday Foods", category:"Marketing", emoji:"↗", description:"Design a small, consistent set of reusable social post templates for a growing local business.", pay:2800, duration:"5 days", level:"Beginner friendly", skills:["Canva","Social media","Branding"], posted:"Yesterday", deliverables:["Five post templates","Color and type notes","Editable source files"] },
  { id:"task-107", title:"Test a web app on mobile", company:"Tiny Product Lab", category:"Development", emoji:"▣", description:"Test a responsive web app on mobile sizes, report usability issues and document reproducible bugs.", pay:2500, duration:"3 days", level:"Beginner friendly", skills:["QA testing","Responsive UI","Documentation"], posted:"4 days ago", deliverables:["Bug report","Screenshots","Prioritised recommendations"] },
  { id:"task-108", title:"Make a short explainer video", company:"BrightSteps", category:"Content", emoji:"▶", description:"Create a short, captioned explainer video that introduces a student-focused product.", pay:4000, duration:"1 week", level:"Intermediate", skills:["Video editing","Storyboarding","Captions"], posted:"5 days ago", deliverables:["60–90 second video","Caption file","Storyboard"] }
];

const TASKS_KEY = "microintern.tasks.v1";
export function getTasks(): Task[] {
  try {
    const custom = JSON.parse(localStorage.getItem(TASKS_KEY) || "[]") as Task[];
    const api = JSON.parse(localStorage.getItem("microintern.api.tasks.v1") || "[]") as Task[];
    const all = [...custom, ...api, ...starterTasks];
    return all.filter((task, index) => all.findIndex(t => t.id === task.id) === index);
  } catch { return starterTasks; }
}
export function saveCustomTask(task: Task): void {
  try {
    const current = JSON.parse(localStorage.getItem(TASKS_KEY) || "[]") as Task[];
    localStorage.setItem(TASKS_KEY, JSON.stringify([task, ...current]));
  } catch { /* Browser storage may be disabled. */ }
}
export function getTask(id: string | null): Task | undefined {
  return getTasks().find(task => task.id === id);
}
export function money(amount: number): string {
  return new Intl.NumberFormat("en-IN", { style:"currency", currency:"INR", maximumFractionDigits:0 }).format(amount);
}