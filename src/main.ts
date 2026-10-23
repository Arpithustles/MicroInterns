import "./style.css";
import { getTask, getTasks, money, saveCustomTask, type Task } from "./data";
import { apiRequest, getToken, setSession, clearSession, type ApiUser } from "./api";

const app = document.querySelector<HTMLDivElement>("#app")!;
const path = location.pathname.split("/").pop() || "index.html";
const current = path.replace(".html", "");
const isDark = () => document.documentElement.dataset.theme === "dark";

function header(): string {
  const links = [
    ["index.html","Home","index"], ["about.html","About","about"], ["tasks.html","Find tasks","tasks"],
    ["students.html","Students","students"], ["contact.html","Contact","contact"]
  ];
  return `<header class="site-header"><a class="brand" href="index.html" aria-label="MicroIntern home">Micro<span>Intern</span><i>.</i></a>
    <button class="mobile-menu" aria-label="Toggle navigation" aria-expanded="false">☰</button>
    <nav class="nav-links" aria-label="Main navigation">${links.map(([href,label,key])=>`<a href="${href}" class="${current===key?'active':''}">${label}</a>`).join("")}</nav>
    <div class="header-actions"><button class="theme-toggle" type="button" aria-label="Switch color theme">◐ <span>Theme</span></button>
    <a class="btn btn-quiet hide-small" href="post-task.html">Post a task</a><div id="account-nav"><a class="btn btn-outline hide-small" href="login.html">Log in</a><a class="btn btn-primary" href="register.html">Get started <span aria-hidden="true">↗</span></a></div></div>
  </header>`;
}
function footer(): string {
 return `<footer class="site-footer"><div class="footer-main"><div><a class="brand footer-brand" href="index.html">Micro<span>Intern</span><i>.</i></a><p>Small projects. Real experience.<br>Start where you are.</p></div>
 <div class="footer-col"><b>Explore</b><a href="tasks.html">Find tasks</a><a href="students.html">Student community</a><a href="post-task.html">Post a task</a></div>
 <div class="footer-col"><b>MicroIntern</b><a href="about.html">About us</a><a href="contact.html">Contact</a><a href="register.html">Create account</a></div>
 <div class="footer-news"><b>Build your next skill</b><p>Find a small project that helps you take the next step.</p><a class="text-link" href="tasks.html">Explore open tasks <span>↗</span></a></div></div>
 <div class="footer-bottom"><span>© ${new Date().getFullYear()} MicroIntern</span><span>Made for curious minds.</span></div></footer>`;
}
function shell(content: string): void {
 app.innerHTML = header() + `<main id="main-content">${content}</main>` + footer() + `<div class="toast" role="status" aria-live="polite"></div>`;
 initGlobal();
 renderAccountNav();
}
function renderAccountNav(): void {
 const host=document.querySelector<HTMLElement>("#account-nav"); if(!host) return;
 let user:ApiUser|null=null; try { user=JSON.parse(localStorage.getItem("microintern.user")||"null") as ApiUser|null; } catch {}
 if(!getToken()||!user){host.innerHTML='<a class="btn btn-outline hide-small" href="login.html">Log in</a><a class="btn btn-primary" href="register.html">Get started <span aria-hidden="true">↗</span></a>';return;}
 const initials=user.name.trim().split(/\s+/).slice(0,2).map(part=>part[0]?.toUpperCase()||"").join("");
 host.innerHTML=`<div class="account-menu" style="display:flex;align-items:center;gap:10px"><a href="profile.html" title="${escapeHTML(user.name)}" aria-label="Open profile for ${escapeHTML(user.name)}" style="display:flex;align-items:center;justify-content:center;width:42px;height:42px;border-radius:50%;background:#294132;color:white;font-weight:800;text-decoration:none">${escapeHTML(initials)}</a><span class="hide-small" style="font-weight:650;max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHTML(user.name.split(/\s+/)[0])}</span><button type="button" class="btn btn-outline" id="logout-button">Log out</button></div>`;
 host.querySelector<HTMLButtonElement>("#logout-button")?.addEventListener("click",()=>{clearSession();location.href="index.html";});
}
function pageTitle(kicker: string, title: string, desc: string): string {
 return `<section class="page-intro"><div class="container"><span class="eyebrow">${kicker}</span><h1>${title}</h1><p>${desc}</p></div></section>`;
}
function taskCard(task: Task, index=0): string {
 const saved = getSaved().includes(task.id);
 return `<article class="task-card reveal" style="--delay:${Math.min(index*55,330)}ms">
  <div class="task-card-top"><span class="task-icon">${task.emoji}</span><button class="save-btn ${saved?'saved':''}" data-save="${task.id}" aria-label="${saved?'Unsave':'Save'} ${task.title}" aria-pressed="${saved}">${saved?'♥':'♡'}</button></div>
  <div class="task-meta"><span class="pill">${task.category}</span>${task.featured?'<span class="featured-label">✦ Featured</span>':''}</div>
  <h3><a href="task-detail.html?id=${encodeURIComponent(task.id)}">${escapeHTML(task.title)}</a></h3><p class="company">${escapeHTML(task.company)}</p><p class="task-desc">${escapeHTML(task.description)}</p>
  <div class="skill-list">${task.skills.slice(0,3).map(s=>`<span>${escapeHTML(s)}</span>`).join("")}</div>
  <div class="task-card-bottom"><div><strong>${money(task.pay)}</strong><small>${escapeHTML(task.duration)}</small></div><a class="arrow-link" href="task-detail.html?id=${encodeURIComponent(task.id)}" aria-label="View ${task.title}">↗</a></div>
 </article>`;
}
function getSaved(): string[] { try{return JSON.parse(localStorage.getItem("microintern.saved.v1")||"[]") as string[];}catch{return [];} }
function toast(message: string): void {
 const node = document.querySelector<HTMLElement>(".toast"); if(!node)return;
 node.textContent=message; node.classList.add("show");
 window.setTimeout(()=>node.classList.remove("show"),2400);
}
function escapeHTML(value: string): string { return value.replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]!)); }

function homePage(): string {
 const tasks=getTasks();
 return `<section class="hero"><div class="hero-orb orb-one"></div><div class="hero-orb orb-two"></div><div class="container hero-grid"><div class="hero-copy reveal"><span class="eyebrow eyebrow-light"><span class="live-dot"></span> A better way to get started</span>
 <h1>Your first big break can start <em>small.</em></h1><p>Real projects. Supportive teams. Skills you can show. Find bite-sized opportunities that help you grow beyond the classroom.</p>
 <div class="hero-actions"><a class="btn btn-primary btn-large" href="tasks.html">Explore tasks <span>↗</span></a><a class="btn btn-glass btn-large" href="about.html">How it works <span>→</span></a></div>
 <div class="hero-proof"><div class="avatar-stack"><span>AS</span><span>RK</span><span>PM</span><span>+</span></div><p><strong>Start with one project.</strong><br><small>Build proof of what you can do.</small></p></div></div>
 <div class="hero-visual reveal"><div class="visual-top"><span class="window-dots"><i></i><i></i><i></i></span><span>YOUR NEXT STEP</span><span>↗</span></div>
 <div class="visual-title"><span class="mini-label">A PROJECT FOR YOU</span><h2>Make your skills<br>mean something.</h2><p>One focused project is a great place to begin.</p></div>
 <div class="floating-task"><span class="floating-icon">✳</span><div><b>Landing page refresh</b><small>Northstar Studio · Design</small></div><strong>₹3.5k</strong></div>
 <div class="visual-stats"><div><b>Small scope</b><span>Clear expectations</span></div><div><b>Real work</b><span>Portfolio-ready</span></div></div><span class="visual-sticker">LEARN BY DOING ↗</span></div></div></section>
 <section class="trust-strip"><div class="container trust-inner"><span>MADE FOR STUDENTS WHO WANT TO</span><b>learn by doing</b><b>build a portfolio</b><b>find their people</b></div></section>
 <section class="section"><div class="container"><div class="section-heading reveal"><div><span class="eyebrow">A SMALL START, A REAL STEP</span><h2>Good work starts<br>with a first <em>yes.</em></h2></div><p>Skip the pressure to know everything. Find a task that matches your current skills and learn as you go.</p></div>
 <div class="benefit-grid"><article class="benefit-card reveal"><span class="benefit-icon icon-sage">↗</span><span class="card-index">01 / START</span><h3>Start at your level</h3><p>Explore focused tasks with clear outcomes, timelines and skill requirements.</p></article><article class="benefit-card reveal"><span class="benefit-icon icon-clay">✳</span><span class="card-index">02 / LEARN</span><h3>Learn by doing</h3><p>Practice on real briefs and turn classroom knowledge into practical work.</p></article><article class="benefit-card reveal"><span class="benefit-icon icon-sand">▤</span><span class="card-index">03 / SHOW</span><h3>Build proof of skill</h3><p>Document your work, reflect on what you learned and grow your portfolio.</p></article></div></div></section>
 <section class="section section-muted"><div class="container"><div class="section-heading reveal"><div><span class="eyebrow">HAND-PICKED STARTING POINTS</span><h2>Small tasks. <em>Big momentum.</em></h2></div><a class="text-link" href="tasks.html">See all tasks <span>↗</span></a></div><div class="task-grid">${tasks.filter(t=>t.featured).slice(0,3).map(taskCard).join("")}</div></div></section>
 <section class="cta-section"><div class="container cta-panel reveal"><div><span class="eyebrow eyebrow-light">YOUR NEXT CHAPTER STARTS HERE</span><h2>You don't need ten years<br>of experience. Just a start.</h2><p>Find your first project or share a task with a student ready to learn.</p></div><div class="cta-actions"><a class="btn btn-primary btn-large" href="tasks.html">Find a task ↗</a><a class="btn btn-glass btn-large" href="post-task.html">Post a task →</a></div><span class="cta-shape">mi.</span></div></section>`;
}
function tasksPage(): string {
 return `${pageTitle("THE TASK BOARD","Find a project that fits you.","Explore practical, bite-sized projects. Search by skill, choose your pace and save the ones you want to revisit.")}<section class="section"><div class="container">
 <div class="task-controls"><label class="search-box"><span>⌕</span><input id="task-search" type="search" placeholder="Search tasks, skills or teams..." aria-label="Search tasks"></label><label class="select-wrap"><span class="sr-only">Sort tasks</span><select id="task-sort"><option value="recommended">Recommended</option><option value="high">Pay: high to low</option><option value="low">Pay: low to high</option><option value="az">Title: A to Z</option></select></label></div>
 <div class="filter-row"><div class="filter-pills" id="category-filters">${["All","Design","Data","Content","Development","Research","Marketing"].map((c,i)=>`<button type="button" class="filter-chip ${i===0?'active':''}" data-category="${c==='All'?'all':c}">${c}</button>`).join("")}</div><button class="filter-chip saved-toggle" id="saved-only">♡ Saved <span id="saved-count">${getSaved().length}</span></button></div>
 <div class="results-line"><span id="result-count">Showing ${getTasks().length} tasks</span><span>All amounts are example project budgets</span></div><div class="task-grid" id="task-grid">${getTasks().map(taskCard).join("")}</div>
 <div class="empty-state hidden" id="empty-state"><span>⌕</span><h3>No tasks found</h3><p>Try a different keyword or switch to another category.</p><button class="btn btn-outline" id="reset-filters">Clear filters</button></div>
 </div></section>`;
}
function aboutPage(): string {
 return `${pageTitle("WHY WE EXIST","Experience should be accessible.","You shouldn't need a perfect resume to get your first real opportunity. MicroIntern helps students take the first step through small, meaningful projects.")}<section class="section"><div class="container about-grid"><div class="about-statement reveal"><span class="eyebrow">OUR BELIEF</span><h2>Less gatekeeping.<br><em>More getting started.</em></h2></div><div class="about-copy reveal"><p class="lead">Big career goals can feel far away when every opportunity asks for experience you haven't had the chance to gain.</p><p>We believe small, well-defined projects can create a bridge between learning and doing. They give students a place to practice, ask better questions and show what they can contribute.</p><p>MicroIntern is designed around clarity: understandable briefs, realistic timelines, transparent budgets and a welcoming place to begin.</p><a class="btn btn-dark" href="tasks.html">Explore the task board ↗</a></div></div><div class="container values-grid"><article class="value-card reveal"><span>01</span><h3>Clarity first</h3><p>Know what the task involves, what it pays and what you'll deliver.</p></article><article class="value-card reveal"><span>02</span><h3>Progress over perfection</h3><p>Learn through practice. You don't have to know everything on day one.</p></article><article class="value-card reveal"><span>03</span><h3>Respect everyone's time</h3><p>Focused scope and honest expectations make collaboration better.</p></article></div></section><section class="cta-section"><div class="container cta-panel reveal"><div><span class="eyebrow eyebrow-light">READY WHEN YOU ARE</span><h2>One project can<br>change your direction.</h2><p>Find a small, practical place to begin.</p></div><a class="btn btn-primary btn-large" href="tasks.html">Find your first task ↗</a><span class="cta-shape">mi.</span></div></section>`;
}
function studentsPage(): string {
 const students=[["AS","Aarav Sharma","Frontend development","React · TypeScript · CSS","Building interfaces that make complicated things feel simple.","#E6EDE5"],["RK","Riya Kapoor","Data analytics","Python · SQL · Power BI","Turning messy datasets into clear, useful stories.","#F2E5DF"],["PM","Priya Mehta","Product & UI design","Figma · Prototyping · Research","Designing calm, friendly experiences for everyday tools.","#EEE8D9"],["VK","Vivaan Khanna","Content & marketing","Writing · SEO · Research","Making useful information easier to find and understand.","#E4E9F0"],["NS","Neha Singh","Backend development","Java · APIs · SQL","Interested in reliable systems and thoughtful engineering.","#EDE3EF"],["AM","Aditya Malhotra","Video & storytelling","Editing · Motion · Script","Giving ideas a clear story and a visual voice.","#E4ECE7"]];
 return `${pageTitle("STUDENT COMMUNITY","Meet curious minds.","A sample community of learners exploring new skills, sharing ideas and building their next project. Profiles shown here are demo content.")}<section class="section"><div class="container"><div class="community-note"><span>✦</span><p><strong>Good work gets better together.</strong> Connect through projects, feedback and shared curiosity.</p><a href="register.html">Create your profile ↗</a></div><div class="student-grid">${students.map((s,i)=>`<article class="student-card reveal" style="--delay:${i*45}ms"><div class="student-card-head" style="--student-bg:${s[5]}"><div class="student-avatar">${s[0]}</div><span class="availability"><i></i> Open to projects</span></div><div class="student-card-body"><span class="eyebrow">${s[2]}</span><h3>${s[1]}</h3><p>${s[4]}</p><div class="skill-list">${s[3].split(" · ").map(t=>`<span>${t}</span>`).join("")}</div><a class="text-link" href="contact.html">Connect <span>↗</span></a></div></article>`).join("")}</div></div></section>`;
}
function contactPage(): string {
 return `${pageTitle("LET'S TALK","How can we help?","Questions, feedback or an idea for making MicroIntern better? Send a note. This prototype will show a local confirmation.")}<section class="section"><div class="container contact-grid"><div class="contact-aside reveal"><span class="contact-symbol">✳</span><h2>Every good idea<br>starts a <em>conversation.</em></h2><p>Tell us what you're building, what you need or what you'd like to see next.</p><div class="contact-fact"><span>01</span><div><b>Students</b><p>Need help finding your first project? Tell us what you're learning.</p></div></div><div class="contact-fact"><span>02</span><div><b>Teams</b><p>Have a small, well-defined task? We'd love to hear about it.</p></div></div></div><form class="form-card reveal" id="contact-form"><span class="eyebrow">SEND A MESSAGE</span><h2>Write us a note</h2><div class="form-row"><label>Full name<input name="name" required minlength="2" placeholder="Your name"></label><label>Email address<input type="email" name="email" required placeholder="you@example.com"></label></div><label>I'm reaching out about<select name="topic" required><option value="">Choose a topic</option><option>Finding a task</option><option>Posting a task</option><option>Feedback or suggestion</option><option>Something else</option></select></label><label>Your message<textarea name="message" required minlength="10" rows="5" placeholder="Tell us a little more..."></textarea></label><button class="btn btn-primary btn-large" type="submit">Send message <span>↗</span></button><p class="form-note">Demo form: no message is sent to a server.</p></form></div></section>`;
}
function authPage(register: boolean): string {
 return `<section class="auth-layout"><div class="auth-art"><a class="brand" href="index.html">Micro<span>Intern</span><i>.</i></a><div class="auth-art-copy"><span class="eyebrow eyebrow-light">SMALL STEPS. REAL PROGRESS.</span><h1>${register?'Make room for your next chapter.':'Good to see you again.'}</h1><p>${register?'Create a profile, discover projects and start building proof of your skills.':'Pick up where you left off and keep building your skills, one project at a time.'}</p><div class="auth-quote">“You don't have to be ready for everything. Just ready to begin.”</div></div><span class="auth-decoration">mi.</span></div><div class="auth-form-wrap"><form class="form-card auth-form" id="auth-form"><a class="back-link" href="index.html">← Back to home</a><span class="eyebrow">${register?'YOUR NEXT STEP':'WELCOME BACK'}</span><h2>${register?'Create your account':'Log in'}</h2><p>${register?'Start small. Build real.':'Continue your MicroIntern journey.'}</p>${register?'<label>Full name<input name="name" required minlength="2" placeholder="Your full name"></label>':''}<label>Email address<input name="email" type="email" required placeholder="you@example.com"></label><label>Password<input name="password" type="password" required minlength="8" placeholder="At least 8 characters"></label>${register?'<label class="check-label"><input type="checkbox" required> I agree to use MicroIntern respectfully.</label>':''}${!register?'<p class="auth-switch" style="text-align:right;margin:0"><a href="reset-password.html">Forgot password?</a></p>':''}<button class="btn btn-primary btn-large full-width" type="submit">${register?'Create account':'Log in'} <span>↗</span></button><p class="form-note">Your account is securely handled by the MicroIntern API.</p><p class="auth-switch">${register?'Already have an account? <a href="login.html">Log in</a>':'New to MicroIntern? <a href="register.html">Create an account</a>'}</p></form></div></section>`;
}
function resetPasswordPage(): string {
 return `<section class="section"><div class="container" style="max-width:560px"><form class="form-card" id="reset-password-form"><span class="eyebrow">ACCOUNT RECOVERY</span><h1>Reset your password</h1><p>Enter the email address on your account and choose a new password. This local prototype resets it directly; production deployment should use an email-verified, expiring reset link.</p><label>Email address<input type="email" name="email" required autocomplete="email" placeholder="you@example.com"></label><label>New password<input type="password" name="password" required minlength="8" autocomplete="new-password" placeholder="At least 8 characters"></label><label>Confirm new password<input type="password" name="confirm" required minlength="8" autocomplete="new-password" placeholder="Re-enter new password"></label><button class="btn btn-primary btn-large full-width" type="submit">Reset password</button><p class="auth-switch"><a href="login.html">Back to log in</a></p></form></div></section>`;
}

function profilePage(): string {
 const user = (()=>{try{return JSON.parse(localStorage.getItem("microintern.user")||"null") as ApiUser|null}catch{return null}})();
 if(!getToken() || !user) return `${pageTitle("YOUR ACCOUNT","Log in to view your dashboard.","Your applications, saved tasks and profile details are available after you sign in.")}<section class="section"><div class="container"><a class="btn btn-primary" href="login.html">Log in ↗</a></div></section>`;
 const initials=user.name.trim().split(/\s+/).slice(0,2).map(p=>p[0]?.toUpperCase()||"").join("");
 return `<section class="section profile-section"><div class="container profile-layout">
  <aside class="profile-sidebar form-card"><div class="profile-identity"><div class="profile-avatar">${escapeHTML(initials)}</div><h2 id="profile-side-name">${escapeHTML(user.name)}</h2><p id="profile-side-email">${escapeHTML(user.email)}</p><span class="pill">${escapeHTML(user.role||"student")}</span></div>
   <nav class="profile-nav" aria-label="Profile sections"><a class="active" href="#overview" data-profile-tab="overview">▦ Dashboard</a><a href="#details" data-profile-tab="details">♙ Personal details</a><a href="#skills" data-profile-tab="skills">✳ My skills</a><a href="#work" data-profile-tab="work">▤ My work</a><a href="#ratings" data-profile-tab="ratings">☆ Ratings & reviews</a><a href="#security" data-profile-tab="security">⌑ Account security</a><button type="button" id="profile-logout" class="profile-logout">↪ Log out</button></nav>
  </aside>
  <div class="profile-content"><div class="profile-welcome"><div><span class="eyebrow">YOUR MICROINTERN SPACE</span><h1>Hi, <span id="profile-first-name">${escapeHTML(user.name.split(/\s+/)[0])}</span>.</h1><p>Track your progress, update your profile and keep building your experience.</p></div><a class="btn btn-outline" href="tasks.html">Explore tasks ↗</a></div>
   <section class="profile-panel" id="overview"><div class="profile-panel-heading"><div><span class="eyebrow">OVERVIEW</span><h2>Your dashboard</h2></div><span class="pill">Live account data</span></div><div class="profile-stat-grid"><article class="profile-stat"><span>Applications</span><strong id="stat-applications">—</strong><small>Tasks you've applied to</small></article><article class="profile-stat"><span>Saved tasks</span><strong id="stat-saved">—</strong><small>Opportunities bookmarked</small></article><article class="profile-stat"><span>Completed work</span><strong id="stat-completed">0</strong><small>Marked as completed</small></article><article class="profile-stat"><span>Skills added</span><strong id="stat-skills">0</strong><small>Your listed skills</small></article></div><h3>Recent applications</h3><div id="recent-applications" class="profile-data-list"><p class="profile-empty">Loading your applications…</p></div><h3>Saved opportunities</h3><div id="recent-saved" class="profile-data-list"><p class="profile-empty">Loading your saved tasks…</p></div></section>
   <section class="profile-panel" id="details"><div class="profile-panel-heading"><div><span class="eyebrow">YOUR INFORMATION</span><h2>Personal details</h2></div></div><form id="profile-details-form" class="profile-form"><div class="form-row"><label>Full name<input name="name" required minlength="2" maxlength="100" value="${escapeHTML(user.name)}"></label><label>Email address<input name="email" type="email" value="${escapeHTML(user.email)}" disabled><small>Email changes are disabled for now.</small></label></div><div class="form-row"><label>Phone number<input name="phone" type="tel" maxlength="25" placeholder="Add phone number"></label><label>Date of birth<input name="date_of_birth" type="date"></label></div><button class="btn btn-primary" type="submit">Save profile</button></form></section>
   <section class="profile-panel" id="skills"><div class="profile-panel-heading"><div><span class="eyebrow">GROW YOUR PROFILE</span><h2>My skills</h2></div></div><p>Add skills you can use in projects. Keep them specific and relevant.</p><form id="profile-skills-form" class="profile-skills-form"><label for="skill-input">Add a skill</label><div class="profile-skill-add"><input id="skill-input" maxlength="40" placeholder="e.g. Python, UI design, SQL"><button class="btn btn-primary" type="submit">Add skill +</button></div></form><div id="profile-skill-list" class="profile-skill-list"><p class="profile-empty">No skills added yet.</p></div></section>
   <section class="profile-panel" id="work"><div class="profile-panel-heading"><div><span class="eyebrow">YOUR EXPERIENCE</span><h2>My work</h2></div></div><p>Applications and saved opportunities are loaded from your account. Completed work will appear here when a task is marked completed by the platform.</p><div id="work-history" class="profile-data-list"><p class="profile-empty">Loading your work history…</p></div></section>
   <section class="profile-panel" id="ratings"><div class="profile-panel-heading"><div><span class="eyebrow">FEEDBACK</span><h2>Ratings & reviews</h2></div></div><div class="profile-rating-empty"><div class="profile-rating-stars">☆☆☆☆☆</div><h3>No ratings yet</h3><p>Ratings will appear here after you complete projects and receive feedback. MicroIntern's current backend does not yet provide a ratings system.</p></div></section>
   <section class="profile-panel" id="security"><div class="profile-panel-heading"><div><span class="eyebrow">KEEP YOUR ACCOUNT SAFE</span><h2>Account security</h2></div></div><div class="profile-security-row"><div><h3>Change password</h3><p>Choose a new password for your MicroIntern account.</p></div><a class="btn btn-outline" href="reset-password.html">Change password ↗</a></div><div class="profile-security-row"><div><h3>Log out</h3><p>Sign out of this browser on this device.</p></div><button class="btn btn-outline" type="button" id="profile-logout-bottom">Log out</button></div><p class="form-note">Password reset currently uses the prototype API and is not email-verified. Do not use it for a public production service until email verification is implemented.</p></section>
  </div></div></section>`;
}

function postTaskPage(): string {
 return `${pageTitle("FOR TEAMS & CREATORS","Share a small task.","Write a clear brief, set expectations and help a student get meaningful hands-on experience.")}<section class="section"><div class="container post-layout"><aside class="post-tips reveal"><span class="eyebrow">A GOOD BRIEF IS A KIND BRIEF</span><h2>Make the first step clear.</h2><p>Small, specific tasks are easier to understand and more rewarding to complete.</p><div class="tip"><span>01</span><p><b>Keep scope focused</b><br>Describe one clear outcome.</p></div><div class="tip"><span>02</span><p><b>Set honest expectations</b><br>Share a realistic timeline and budget.</p></div><div class="tip"><span>03</span><p><b>Explain success</b><br>List what the student should deliver.</p></div></aside><form class="form-card reveal" id="post-task-form"><span class="eyebrow">TASK DETAILS</span><h2>Post a task</h2><label>Task title<input name="title" id="task-title" required minlength="5" maxlength="80" placeholder="e.g. Design a landing page"></label><div class="form-row"><label>Team or business<input name="company" required placeholder="Your organisation"></label><label>Category<select name="category" required><option value="">Select category</option><option>Design</option><option>Data</option><option>Content</option><option>Development</option><option>Research</option><option>Marketing</option></select></label></div><label>Task description<textarea name="description" required minlength="30" rows="5" placeholder="What needs to be done? Include context and what success looks like."></textarea></label><div class="form-row"><label>Budget (₹)<input name="pay" type="number" min="100" max="500000" required placeholder="2500"></label><label>Timeline<select name="duration" required><option value="">Choose timeline</option><option>2–3 days</option><option>5 days</option><option>1 week</option><option>2 weeks</option><option>Flexible</option></select></label></div><label>Skills (comma-separated)<input name="skills" placeholder="Figma, UI design, writing"></label><label>Deliverables (one per line)<textarea name="deliverables" rows="3" placeholder="A clear final output&#10;Source files&#10;Short handover note"></textarea></label><button class="btn btn-primary btn-large" type="submit">Preview task <span>↗</span></button><p class="form-note">Demo only: task posts are saved in this browser, not published online.</p></form></div></section>`;
}
function detailPage(): string {
 const task=getTask(new URLSearchParams(location.search).get("id"));
 if(!task) return `${pageTitle("TASK DETAILS","We couldn't find that task.","It may have been removed or the link may be incomplete.")}<section class="section"><div class="container"><a class="btn btn-dark" href="tasks.html">Back to tasks ↗</a></div></section>`;
 const saved=getSaved().includes(task.id);
 return `${pageTitle(task.category.toUpperCase()+" · "+task.level.toUpperCase(),escapeHTML(task.title),escapeHTML(task.description))}<section class="section"><div class="container detail-grid"><article class="detail-main form-card"><div class="detail-company"><span class="task-icon">${task.emoji}</span><div><b>${escapeHTML(task.company)}</b><small>Posted ${escapeHTML(task.posted)}</small></div></div><h2>About this project</h2><p>${escapeHTML(task.description)}</p><h2>What you'll deliver</h2><ul class="deliverables">${task.deliverables.map(d=>`<li><span>✓</span>${escapeHTML(d)}</li>`).join("")}</ul><h2>Skills you'll use</h2><div class="skill-list">${task.skills.map(s=>`<span>${escapeHTML(s)}</span>`).join("")}</div><div class="detail-notice"><b>Before you apply</b><p>Review the deliverables and timeline. Ask questions if anything is unclear. Your application will be sent to the MicroIntern backend when you apply.</p></div></article><aside class="detail-sidebar form-card"><span class="eyebrow">PROJECT OVERVIEW</span><div class="detail-pay">${money(task.pay)}<small>project budget</small></div><div class="overview-row"><span>Timeline</span><b>${escapeHTML(task.duration)}</b></div><div class="overview-row"><span>Experience</span><b>${escapeHTML(task.level)}</b></div><div class="overview-row"><span>Category</span><b>${escapeHTML(task.category)}</b></div><button class="btn btn-primary btn-large full-width" id="apply-task">Apply for this task ↗</button><button class="btn btn-outline btn-large full-width" id="detail-save">${saved?'♥ Saved':'♡ Save task'}</button><p class="form-note">You must log in with a student account to apply and save tasks.</p></aside></div></section>`;
}
function initGlobal(): void {
 const themeBtn=document.querySelector<HTMLButtonElement>(".theme-toggle");
 themeBtn?.addEventListener("click",()=>{const next=isDark()?"light":"dark";document.documentElement.dataset.theme=next;try{localStorage.setItem("microintern.theme",next)}catch{};themeBtn.innerHTML=next==="dark"?"☀ <span>Light</span>":"◐ <span>Theme</span>";});
 const menu=document.querySelector<HTMLButtonElement>(".mobile-menu");
 menu?.addEventListener("click",()=>{const nav=document.querySelector<HTMLElement>(".nav-links");const open=nav?.classList.toggle("open")??false;menu.setAttribute("aria-expanded",String(open));menu.textContent=open?"×":"☰";});
 const savedTheme=(()=>{try{return localStorage.getItem("microintern.theme")||"light"}catch{return "light"}})();
 document.documentElement.dataset.theme=savedTheme;
 if(themeBtn) themeBtn.innerHTML=savedTheme==="dark"?"☀ <span>Light</span>":"◐ <span>Theme</span>";
 const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add("visible");observer.unobserve(entry.target)}}),{threshold:.12});
 document.querySelectorAll(".reveal").forEach(el=>observer.observe(el));
 initTaskBoard(); initForms(); initDetail(); initProfile();
}
function initTaskBoard(): void {
 const grid=document.querySelector<HTMLDivElement>("#task-grid"); if(!grid)return;
 let category="all", query="", savedOnly=false, sort="recommended";
 const render=()=> {
   let tasks=getTasks().filter(t=>(category==="all"||t.category===category)&&(!savedOnly||getSaved().includes(t.id))&&`${t.title} ${t.company} ${t.description} ${t.skills.join(" ")}`.toLowerCase().includes(query));
   if(sort==="high")tasks.sort((a,b)=>b.pay-a.pay); if(sort==="low")tasks.sort((a,b)=>a.pay-b.pay); if(sort==="az")tasks.sort((a,b)=>a.title.localeCompare(b.title));
   grid.innerHTML=tasks.map(taskCard).join("");
   document.querySelector("#result-count")!.textContent=`Showing ${tasks.length} ${tasks.length===1?"task":"tasks"}`;
   document.querySelector("#saved-count")!.textContent=String(getSaved().length);
   document.querySelector("#empty-state")?.classList.toggle("hidden",tasks.length>0);
   grid.querySelectorAll(".reveal").forEach(el=>requestAnimationFrame(()=>el.classList.add("visible")));
 };
 document.querySelector<HTMLInputElement>("#task-search")?.addEventListener("input",e=>{query=(e.target as HTMLInputElement).value.toLowerCase().trim();render()});
 document.querySelector<HTMLSelectElement>("#task-sort")?.addEventListener("change",e=>{sort=(e.target as HTMLSelectElement).value;render()});
 document.querySelectorAll<HTMLButtonElement>("[data-category]").forEach(btn=>btn.addEventListener("click",()=>{category=btn.dataset.category||"all";document.querySelectorAll(".filter-chip[data-category]").forEach(b=>b.classList.toggle("active",b===btn));render()}));
 document.querySelector<HTMLButtonElement>("#saved-only")?.addEventListener("click",e=>{savedOnly=!savedOnly;(e.currentTarget as HTMLButtonElement).classList.toggle("active",savedOnly);render()});
 document.querySelector<HTMLButtonElement>("#reset-filters")?.addEventListener("click",()=>{category="all";query="";savedOnly=false;sort="recommended";(document.querySelector("#task-search") as HTMLInputElement).value="";(document.querySelector("#task-sort") as HTMLSelectElement).value=sort;document.querySelector("#saved-only")?.classList.remove("active");document.querySelectorAll<HTMLButtonElement>(".filter-chip[data-category]").forEach(b=>b.classList.toggle("active",b.dataset.category==="all"));render()});
 grid.addEventListener("click",e=>{const btn=(e.target as HTMLElement).closest<HTMLButtonElement>("[data-save]");if(!btn)return;e.preventDefault();e.stopPropagation();const id=btn.dataset.save!;const ids=getSaved();const next=ids.includes(id)?ids.filter(x=>x!==id):[...ids,id];try{localStorage.setItem("microintern.saved.v1",JSON.stringify(next))}catch{};render();toast(next.includes(id)?"Saved to your list":"Removed from saved tasks")});
 render();
}
function initForms(): void {
 document.querySelector<HTMLFormElement>("#contact-form")?.addEventListener("submit", async e=>{
   e.preventDefault(); const form=e.currentTarget as HTMLFormElement;
   if(!form.reportValidity()) return;
   const fd=new FormData(form);
   try {
     await apiRequest("/api/contact",{method:"POST",body:JSON.stringify({name:String(fd.get("name")),email:String(fd.get("email")),topic:String(fd.get("topic")),message:String(fd.get("message"))})});
     form.reset(); toast("Message sent successfully.");
   } catch(error) { toast(error instanceof Error?error.message:"Could not send message."); }
 });
 document.querySelector<HTMLFormElement>("#reset-password-form")?.addEventListener("submit",async e=>{
   e.preventDefault(); const form=e.currentTarget as HTMLFormElement; if(!form.reportValidity()) return;
   const fd=new FormData(form); const password=String(fd.get("password"));
   if(password!==String(fd.get("confirm"))){toast("Passwords do not match.");return;}
   const button=form.querySelector<HTMLButtonElement>('button[type="submit"]'); if(button){button.disabled=true;button.textContent="Resetting password…";}
   try { await apiRequest("/api/auth/reset-password",{method:"POST",body:JSON.stringify({email:String(fd.get("email")).trim(),password})}); toast("Password reset successfully. Please log in."); location.href="login.html"; }
   catch(error){toast(error instanceof Error?error.message:"Could not reset password.");if(button){button.disabled=false;button.textContent="Reset password";}}
 });
 document.querySelector<HTMLFormElement>("#auth-form")?.addEventListener("submit", async e=>{
   e.preventDefault(); const form=e.currentTarget as HTMLFormElement;
   if(!form.reportValidity()) return;
   const fd=new FormData(form);
   const isRegister=current==="register";
   const payload:Record<string,string>={email:String(fd.get("email")).trim(),password:String(fd.get("password"))};
   if(isRegister){payload.name=String(fd.get("name")).trim();payload.role="student";}
   const button=form.querySelector<HTMLButtonElement>('button[type="submit"]');
   if(button){button.disabled=true;button.textContent=isRegister?"Creating account…":"Logging in…";}
   try {
     const result=await apiRequest<{token:string;user:ApiUser}>(isRegister?"/api/auth/register":"/api/auth/login",{method:"POST",body:JSON.stringify(payload)});
     setSession(result.token,result.user);
     toast(isRegister?"Account created and logged in successfully.":"Login successful.");
     location.href="tasks.html";
   } catch(error) {
     toast(error instanceof Error?error.message:"Authentication failed.");
     if(button){button.disabled=false;button.textContent=isRegister?"Create account ↗":"Log in ↗";}
   }
 });
 document.querySelector<HTMLFormElement>("#post-task-form")?.addEventListener("submit",async e=>{
   e.preventDefault(); const form=e.currentTarget as HTMLFormElement;
   if(!form.reportValidity()) return;
   const fd=new FormData(form);
   const payload={title:String(fd.get("title")),company:String(fd.get("company")),category:String(fd.get("category")),description:String(fd.get("description")),pay:Number(fd.get("pay")),duration:String(fd.get("duration")),skills:String(fd.get("skills")).split(",").map(s=>s.trim()).filter(Boolean),deliverables:String(fd.get("deliverables")).split("\n").map(s=>s.trim()).filter(Boolean),level:"Student project"};
   try {
     const task=await apiRequest<Task>("/api/tasks",{method:"POST",body:JSON.stringify(payload),auth:true});
     location.href=`task-detail.html?id=${encodeURIComponent(task.id)}`;
   } catch(error) { toast(error instanceof Error?error.message:"Could not post task."); }
 });
}
function initDetail(): void {
 document.querySelector<HTMLButtonElement>("#detail-save")?.addEventListener("click",async()=>{
   const id=new URLSearchParams(location.search).get("id"); if(!id)return;
   const btn=document.querySelector<HTMLButtonElement>("#detail-save");
   try {
     if(!getToken()) { location.href="login.html"; return; }
     const ids=getSaved();
     if(ids.includes(id)) {
       await apiRequest(`/api/saved/${encodeURIComponent(id)}`,{method:"DELETE",auth:true});
       const next=ids.filter(x=>x!==id); localStorage.setItem("microintern.saved.v1",JSON.stringify(next));
       if(btn)btn.textContent="♡ Save task"; toast("Removed from saved tasks");
     } else {
       await apiRequest(`/api/saved/${encodeURIComponent(id)}`,{method:"POST",auth:true});
       const next=[...ids,id]; localStorage.setItem("microintern.saved.v1",JSON.stringify(next));
       if(btn)btn.textContent="♥ Saved"; toast("Task saved to your account");
     }
   } catch(error) { toast(error instanceof Error?error.message:"Could not update saved tasks."); }
 });
 document.querySelector<HTMLButtonElement>("#apply-task")?.addEventListener("click",async()=>{
   const id=new URLSearchParams(location.search).get("id"); if(!id)return;
   if(!getToken()){location.href="login.html";return;}
   const cover_letter=window.prompt("Add a short note with your application (optional):")||"";
   try {
     await apiRequest(`/api/tasks/${encodeURIComponent(id)}/apply`,{method:"POST",body:JSON.stringify({cover_letter}),auth:true});
     toast("Application submitted successfully.");
     const notice=document.querySelector(".detail-notice p");
     if(notice) notice.textContent="Your application has been submitted. You can review it from your account.";
   } catch(error) { toast(error instanceof Error?error.message:"Could not submit application."); }
 });
}

function initProfile(): void {
 if(current!=="profile") return;
 if(!getToken()){location.href="login.html";return;}
 type ProfileUser=ApiUser & {phone?:string|null;date_of_birth?:string|null;skills?:string[]};
 type AppRow={id:number;task_id:string;status:string;created_at:string;title:string;company:string;pay:number};
 type SavedRow=Task;
 let profile:ProfileUser|null=null; let skills:string[]=[];
 const logout=()=>{clearSession();location.href="index.html";};
 document.querySelectorAll<HTMLButtonElement>("#profile-logout,#profile-logout-bottom").forEach(b=>b.addEventListener("click",logout));
 document.querySelectorAll<HTMLAnchorElement>("[data-profile-tab]").forEach(a=>a.addEventListener("click",()=>{document.querySelectorAll("[data-profile-tab]").forEach(n=>n.classList.remove("active"));a.classList.add("active")}));
 const safe=(v:unknown)=>escapeHTML(String(v??""));
 const listRows=(rows:AppRow[],empty:string)=>rows.length?rows.map(r=>`<article class="profile-data-row"><div><b>${safe(r.title)}</b><span>${safe(r.company)} · ${safe(r.created_at||"Recently")}</span></div><div class="profile-row-right"><strong>${money(Number(r.pay)||0)}</strong><span class="pill">${safe(r.status||"submitted")}</span></div></article>`).join(""):`<p class="profile-empty">${empty}</p>`;
 const savedRows=(rows:SavedRow[],empty:string)=>rows.length?rows.map(t=>`<article class="profile-data-row"><div><b><a href="task-detail.html?id=${encodeURIComponent(t.id)}">${safe(t.title)}</a></b><span>${safe(t.company)} · ${safe(t.category)}</span></div><div class="profile-row-right"><strong>${money(t.pay)}</strong><a class="text-link" href="task-detail.html?id=${encodeURIComponent(t.id)}">View ↗</a></div></article>`).join(""):`<p class="profile-empty">${empty}</p>`;
 const skillHost=document.querySelector<HTMLElement>("#profile-skill-list")!;
 const renderSkills=()=>{skillHost.innerHTML=skills.length?skills.map((s,i)=>`<span class="profile-skill-tag">${safe(s)} <button type="button" data-remove-skill="${i}" aria-label="Remove ${safe(s)}">×</button></span>`).join(""):'<p class="profile-empty">No skills added yet. Add your first skill above.</p>';document.querySelector("#stat-skills")!.textContent=String(skills.length);};
 document.querySelector<HTMLFormElement>("#profile-skills-form")?.addEventListener("submit",async e=>{e.preventDefault();const input=document.querySelector<HTMLInputElement>("#skill-input")!;const skill=input.value.trim();if(!skill)return;if(skills.some(s=>s.toLowerCase()===skill.toLowerCase())){toast("That skill is already listed.");return;}skills.push(skill);renderSkills();input.value="";try{await apiRequest("/api/me/profile",{method:"PATCH",body:JSON.stringify({skills}),auth:true});toast("Skill added and saved.");}catch(err){toast(err instanceof Error?err.message:"Could not save skill.");}});
 skillHost.addEventListener("click",async e=>{const b=(e.target as HTMLElement).closest<HTMLButtonElement>("[data-remove-skill]");if(!b)return;skills.splice(Number(b.dataset.removeSkill),1);renderSkills();try{await apiRequest("/api/me/profile",{method:"PATCH",body:JSON.stringify({skills}),auth:true});toast("Skill removed.");}catch(err){toast(err instanceof Error?err.message:"Could not save changes.");}});
 document.querySelector<HTMLFormElement>("#profile-details-form")?.addEventListener("submit",async e=>{e.preventDefault();const form=e.currentTarget as HTMLFormElement;const fd=new FormData(form);const payload={name:String(fd.get("name")).trim(),phone:String(fd.get("phone")||"").trim()||null,date_of_birth:String(fd.get("date_of_birth")||"")||null};try{const result=await apiRequest<{user:ProfileUser}>("/api/me/profile",{method:"PATCH",body:JSON.stringify(payload),auth:true});profile=result.user;localStorage.setItem("microintern.user",JSON.stringify(profile));document.querySelector("#profile-side-name")!.textContent=profile.name;document.querySelector("#profile-first-name")!.textContent=profile.name.split(/\s+/)[0];const initials=profile.name.trim().split(/\s+/).slice(0,2).map(p=>p[0]?.toUpperCase()||"").join("");document.querySelector(".profile-avatar")!.textContent=initials;document.querySelector("#profile-side-email")!.textContent=profile.email;renderAccountNav();toast("Profile updated successfully.");}catch(err){toast(err instanceof Error?err.message:"Could not update profile.");}});
 Promise.all([apiRequest<{user:ProfileUser}>("/api/me/profile",{auth:true}),apiRequest<AppRow[]>("/api/me/applications",{auth:true}),apiRequest<SavedRow[]>("/api/me/saved",{auth:true})]).then(([meResult,apps,saved])=>{
  profile=meResult.user;skills=Array.isArray(profile.skills)?profile.skills:[];localStorage.setItem("microintern.user",JSON.stringify(profile));
  const form=document.querySelector<HTMLFormElement>("#profile-details-form")!;const fd=form.elements as RadioNodeList & {name:HTMLInputElement;phone:HTMLInputElement;date_of_birth:HTMLInputElement};fd.name.value=profile.name||"";fd.phone.value=profile.phone||"";fd.date_of_birth.value=profile.date_of_birth||"";
  document.querySelector("#profile-side-name")!.textContent=profile.name;document.querySelector("#profile-first-name")!.textContent=profile.name.split(/\s+/)[0];document.querySelector("#profile-side-email")!.textContent=profile.email;
  document.querySelector("#stat-applications")!.textContent=String(apps.length);document.querySelector("#stat-saved")!.textContent=String(saved.length);document.querySelector("#stat-completed")!.textContent=String(apps.filter(a=>a.status?.toLowerCase()==="completed").length);
  document.querySelector("#recent-applications")!.innerHTML=listRows(apps.slice(0,4),"You haven't applied to any tasks yet.");document.querySelector("#recent-saved")!.innerHTML=savedRows(saved.slice(0,4),"You haven't saved any tasks yet.");document.querySelector("#work-history")!.innerHTML=listRows(apps.filter(a=>a.status?.toLowerCase()==="completed"),"No completed work is recorded yet. Your applications are shown above.");renderSkills();
 }).catch(err=>{toast(err instanceof Error?err.message:"Could not load your dashboard.");document.querySelector("#recent-applications")!.innerHTML='<p class="profile-empty">Could not load account data. Please refresh or log in again.</p>';});
}

const pageMap: Record<string,()=>string> = {
 index:homePage, about:aboutPage, tasks:tasksPage, students:studentsPage, contact:contactPage,
 login:()=>authPage(false), register:()=>authPage(true), profile:profilePage, "reset-password":resetPasswordPage, "post-task":postTaskPage, "task-detail":detailPage
};
shell((pageMap[current]||homePage)());

// Synchronize tasks from the FastAPI backend. If offline, the local starter content remains visible.
apiRequest<Task[]>("/api/tasks").then((tasks)=>{
  localStorage.setItem("microintern.api.tasks.v1",JSON.stringify(tasks));
  if(current==="tasks") {
    const grid=document.querySelector<HTMLDivElement>("#task-grid");
    if(grid) grid.innerHTML=getTasks().map(taskCard).join("");
    const count=document.querySelector("#result-count");
    if(count) count.textContent=`Showing ${getTasks().length} tasks`;
  }
  if(current==="task-detail") {
    const id=new URLSearchParams(location.search).get("id");
    const task=tasks.find(item=>item.id===id);
    if(task) {
      const app=document.querySelector<HTMLDivElement>("#app");
      if(app) shell(detailPage());
    }
  }
}).catch((error)=>console.info("MicroIntern API unavailable; using local starter tasks.",error));
