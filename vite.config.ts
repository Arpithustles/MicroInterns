import { defineConfig } from "vite";

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        home: "index.html",
        about: "about.html",
        tasks: "tasks.html",
        students: "students.html",
        contact: "contact.html",
        login: "login.html",
        register: "register.html",
        resetPassword: "reset-password.html",
        postTask: "post-task.html",
        taskDetail: "task-detail.html"
      }
    }
  }
});