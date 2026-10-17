import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [".next/**", "node_modules/**", "out/**", "build/**", "next-env.d.ts", "supabase/functions/**"],
  },
  ...tseslint.configs.recommended,
);
