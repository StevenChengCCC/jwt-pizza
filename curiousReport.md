# Curiosity Report: Using AWS Amplify for CI/CD and QA in a React App

## 1. Why I chose this topic

For this course, I already host my “Social Media Academy” website on AWS Amplify. Most of the time, I just connect my GitHub repo, click a few buttons, and let Amplify handle the build and deployment.

However, I realized that I didn’t actually understand:

- What is AWS Amplify doing behind the scenes when I push code?
- How does the build pipeline work from a DevOps perspective?
- Can I integrate automated tests into Amplify so that broken code does **not** get deployed?
- How can Amplify help QA by providing preview environments for feature branches?

Since Amplify is directly related to DevOps (CI/CD pipelines, build automation, environment management, etc.), I decided to use this curiosity report to take a deeper look at how it supports quality assurance for a React-based web application.

The concrete questions I wanted to answer were:

1. How does AWS Amplify’s CI/CD pipeline work with a GitHub repo?
2. How can I integrate automated tests (e.g., `npm test`) into the Amplify build?
3. How can Amplify use branch-based / preview deployments to support QA before merging to `main`?
4. What are the trade-offs between using Amplify hosting vs. a more manual S3 + CloudFront deployment?

---

## 2. Background Research

### 2.1 What is AWS Amplify Hosting?

AWS Amplify is a set of tools and services for building full-stack web and mobile applications. One part of Amplify is **Amplify Hosting**, which provides:

- Continuous deployment from a Git-based workflow (GitHub, GitLab, Bitbucket, etc.).
- Automatic builds and deployments on every push.
- Support for frontend frameworks like React, Next.js, Vue, etc.
- Branch-based environments and preview URLs.
- Integration with environment variables and secrets for different environments.

For this report, I focused specifically on **Amplify Hosting + GitHub integration** and how it behaves as a CI/CD system for my React app.

### 2.2 How the CI/CD pipeline is structured

When you connect a repository and branch to Amplify, it creates a pipeline roughly like this:

1. **Source**: Watch the connected Git branch (e.g., `main`).
2. **Build**: Run the configured build commands defined either through the console or in an `amplify.yml` file.
3. **Deploy**: If the build succeeds, upload the build artifacts (e.g., the React `build/` directory) to a hosting environment and invalidate the cache.
4. **Verification / Monitoring**: Provide logs and status indicators (success/failure) for each build and deployment.

The build step can include **any commands you want**, such as:

- `npm ci` to install dependencies in a reproducible way.
- `npm test` to run unit tests.
- `npm run build` to generate the production build.

Because the build is configured as a set of shell commands, it naturally acts as a CI pipeline where tests and checks can fail the build and prevent deployment.

### 2.3 Branch-based deployments and preview environments

Amplify also supports deploying **multiple branches** of the same repo:

- Each branch can have its own URL and environment.
- Some setups allow **preview deployments for pull requests**, where a temporary URL is created for QA/UX review before merging.

This is especially helpful for QA because:

- Testers can verify features on a feature branch without affecting the main production app.
- Product owners or instructors can visually review changes via a URL instead of reading code.

---

## 3. Experiment: Integrating QA into Amplify for my Social Media Academy

To make this report concrete, I designed a small set of experiments around my existing React app (Social Media Academy), which is already hosted on AWS Amplify.

### 3.1 Baseline: Simple build and auto-deploy

Before changing anything, my original setup looked like this:

- Repository: GitHub repo containing my React code.
- Branch: `main` connected to Amplify.
- Build commands in Amplify console:
  - `npm ci` (or `npm install`)
  - `npm run build`

Workflow:

1. Commit and push code to `main`.
2. Amplify automatically starts a new build.
3. If the build succeeds, the updated site is deployed to the production URL.
4. If the build fails (for example, missing dependency, build error), Amplify shows the build as failed and does **not** update the live site.

At this point, Amplify was already acting as a basic CI/CD pipeline, but I was not yet using it for automated testing.

---

### 3.2 Experiment 1: Adding a simple Jest test and running it in Amplify

**Goal:**  
Make sure that if tests fail, Amplify does **not** deploy the new version, and see how useful the logs are for QA.

#### 3.2.1 Adding a very simple Jest test

First, I added a minimal test to my React project so that `npm test` has something to run. This is intentionally simple, but it is enough to integrate with CI.

**File 1: `src/sum.js`**

```js
// src/sum.js
function sum(a, b) {
  return a + b;
}

module.exports = sum;
// If the project uses ES modules, we could use: export default sum;
