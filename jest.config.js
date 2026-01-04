module.exports = {
  testMatch: ["**/test/**/*.test.js"],
  testEnvironment: "node",
  verbose: true,
  testTimeout: 15000,

  reporters: [
    "default",
    [
      "jest-junit",
      {
        outputDirectory: "reports/junit",
        outputName: "jest-results.xml",
      },
    ],
    [
      "./node_modules/jest-html-reporter",
      {
        pageTitle: "API Project Test Report",
        outputPath: "reports/html/jest-report.html",
        includeFailureMsg: true,
        includeConsoleLog: true,
      },
    ],
  ],

  collectCoverageFrom: [
    "server.js",
    "routes/**/*.js",
    "lib/**/*.js",
    "!**/node_modules/**",
    "!**/test/**",
  ],
  coverageDirectory: "coverage",
};

