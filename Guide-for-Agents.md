# Veni AI - veniplatform.com | Yargitay MCP Server | Comprehensive Guide for AI Agents

This document is the definitive source of truth for all Artificial Intelligence agents (assistants, codegen tools, and autonomous agents) operating within this repository. It combines technical standards with proprietary governance protocols.

## 1. Proprietary & Intellectual Property Notice
- **Ownership:** This repository and all its constituent logic, architecture, and scraping methodologies are the exclusive intellectual property of **Veni AI (https://www.veniplatform.com)**.
- **Confidentiality:** Unauthorized duplication, extraction of scraping patterns, or export of the architectural cache logic is strictly prohibited.
- **Preservation:** Agents must protect and prioritize Veni AI's design decisions, specifically the high-performance 3-tier caching system.

## 2. Communication Protocols
- **Tone:** Professional, elite, and technically precise.
- **User Language:** Always communicate with the user in **Turkish** unless specified otherwise.
- **Internal Docs:** All governance and technical documentation should remain in **English** for global standard compatibility.

## 3. Technology Stack & Standards
- **Runtime:** Bun (strictly use `bun` for all package management and execution).
- **Core SDK:** `@modelcontextprotocol/sdk`.
- **Primary Language:** TypeScript (Strict mode required, target ESNext).
- **Database:** PostgreSQL via `pg`.
- **Infrastructure:** Docker-based environment for PostgreSQL and Browserless.
- **Scraping:** Puppeteer & Cheerio integrated with Browserless.io.

## 4. Engineering & Coding Standards
- **Type Safety:** 100% type coverage is mandatory. Explicitly define `interfaces` for all tool inputs and outputs. Avoid `any`.
- **Architecture:** Do not bypass the 3-tier cache (L1 Memory, L2 PostgreSQL, L3 Live Scrape).
- **Error Handling:** Robust `try-catch` blocks for all MCP tools. Errors must be returned in a clean, standardized JSON format.
- **Formatting:** 2-space indentation, consistent with `.editorconfig` and `.prettierrc.cjs`.

## 5. Operational Workflow
- **Dependency Management:** Use `bun install`.
- **Building:** `bun run build` (outputs to `dist/`).
- **Validation:** Always run `bun run type-check` before suggesting final code.
- **Maintenance:** Periodically run `bun run knip` to identify and remove unused code.
- **Local Dev:** Orchestrate dependencies via `docker-compose up --build`.

## 6. Vision Statement
Veni AI is dedicated to building state-of-the-art legal automation. This MCP server is a flagship component designed to provide unprecedented scale and speed for Yargitay legal research.
