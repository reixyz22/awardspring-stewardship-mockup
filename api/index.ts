/**
 * The Vercel serverless function that actually serves the backend.
 *
 * Everything under api/ auto-deploys as a function - Vercel's own
 * convention, no extra config needed for that part. An Express app is
 * already a valid request handler ((req, res) => {}), so exporting it
 * directly is the standard "Express on Vercel" pattern - no adapter
 * library required. vercel.json's rewrites route /api/v1/* and /_local/*
 * here; Express does the real routing internally from there, exactly like
 * it does in local dev.
 *
 * Deliberately does NOT call process.loadEnvFile() or .listen() - Vercel
 * injects environment variables into process.env itself, and a serverless
 * function is invoked per-request, never "listened" on a port. Both of
 * those live in server/index.ts, the local-dev-only entry point.
 */
import { createApp } from '../server/app.ts';

export default createApp();
