import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Self-hosted fonts. Display face is General Sans (Fontshare <link> in index.html);
// Outfit is a self-hosted premium fallback so type never degrades to a system
// face if Fontshare is ever blocked.
import "@fontsource-variable/outfit";
import "@fontsource-variable/hanken-grotesk";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";
import "@fontsource/noto-sans-bengali/400.css";
import "@fontsource/noto-sans-bengali/500.css";
import "@fontsource/noto-sans-devanagari/400.css";

import "./index.css";
import { Hero } from "@/features/hero/Hero";
import { ReportFlow } from "@/features/report/ReportFlow";
import { IssuesView } from "@/features/app/IssuesView";
import { IssueDetail } from "@/features/issue/IssueDetail";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Hero />} />
        <Route path="/report" element={<ReportFlow />} />
        <Route path="/app" element={<IssuesView />} />
        <Route path="/issue/:id" element={<IssueDetail />} />
        <Route path="*" element={<Hero />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
