import next from "eslint-config-next";

const eslintConfig = [{ ignores: ["**/*.test.ts", "**/coverage/**"] }, ...next];

export default eslintConfig;
