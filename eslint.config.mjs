import nextVitals from "eslint-config-next/core-web-vitals";

const config = [
  ...nextVitals,
  { rules: { "react/no-unescaped-entities": "off", "import/no-anonymous-default-export": "off" } }
];

export default config;
