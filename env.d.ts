// Type declarations for modules without built-in types
declare module "@tailwindcss/vite" {
  import type { Plugin } from "vite";
  export default function tailwindcss(): Plugin;
}
