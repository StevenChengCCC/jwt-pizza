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

**File 1: src/sum.js**
// src/sum.js
function sum(a, b) {
  return a + b;
}

module.exports = sum;
// If the project uses ES modules, we could use: export default sum;

**File 2: src/sum.test.js**

// src/sum.test.js
const sum = require('./sum');
// For ES modules: import sum from './sum';

test('adds 1 + 2 to equal 3', () => {
  const result = sum(1, 2);
  expect(result).toBe(3);
});

**File 3: amplify.yml**
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        # Run tests. The --watch=false flag prevents Jest from entering watch mode in CI.
        - npm test -- --watch=false
        # Only if tests pass, build the production bundle.
        - npm run build
  artifacts:
    # For Create React App, the build output directory is "build".
    baseDirectory: build
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
This configuration makes the Amplify build pipeline behave like this:

Install dependencies with npm ci.

Run tests with npm test -- --watch=false.

If (and only if) the tests succeed, run npm run build to generate the production bundle.

Deploy the contents of the build/ directory.

I committed this file and pushed it to main so Amplify would pick it up.

3.2.3 Intentional failure

To verify that tests can actually block a deployment, I intentionally broke the test:

// src/sum.test.js
test('adds 1 + 2 to equal 4 (intentionally wrong)', () => {
  const result = sum(1, 2);
  expect(result).toBe(4); // This will fail
});

Then I committed and pushed this change to the same branch that Amplify was watching.

3.2.4 Observations

In the Amplify console, the new build was triggered automatically.

The build logs showed that:

npm ci completed successfully.

npm test -- --watch=false failed with a Jest assertion error.

Because the test failed, Amplify:

Marked the build as failed.

Did not proceed to npm run build.

Did not deploy any new version to the live site.

The production URL of my Social Media Academy site still showed the last known good deployment.

From a QA perspective, this is very useful:

Any commit that breaks tests is automatically prevented from reaching production.

The build logs show exactly which test failed and why, which helps debugging.

After confirming this behavior, I restored the test to the correct expectation so that future builds could succeed again.

3.3 Experiment 2: Branch-based / preview deployments for QA

Goal:
Use Amplify’s branch-based deployment to create a preview environment for a feature branch, so changes can be reviewed before merging.

3.3.1 Setup

In my GitHub repo, I created a new feature branch, for example:

git checkout -b feature-dark-mode-improvements


I made some UI changes (for example, improving dark mode styles on sub-pages) and pushed the branch to GitHub.

In the Amplify console, I connected this branch (or enabled preview for branches / pull requests, depending on the configuration). Amplify then:

Detected the new branch.

Created a separate build and a unique URL (environment) for this branch.

Used the same amplify.yml to run tests and build the app.

3.3.2 Observations

The feature branch had its own URL (different from the main production URL).

I could open the preview URL and visually verify the new dark mode changes without affecting the main site.

If I introduced a bug or broke the layout, it only existed in this branch’s environment, not in production.

When I was satisfied with the changes and test results, I could merge the branch into main, and Amplify would redeploy the main environment using the same test-then-build pipeline.

From a QA perspective:

Testers or teammates could review the feature on its preview URL.

This reduces the risk of shipping unreviewed UI changes into production.

The same automated tests run consistently across branches.

3.4 Experiment 3: When the automatic deployment breaks

At one point, my automatic deployment stopped working correctly (for example, due to a configuration change or a build failure). This gave me a chance to treat Amplify as a debugging target and understand more about its behavior.

Steps I took:

Opened the Amplify console and checked the build logs to identify exactly where the pipeline failed (e.g., failing script, missing package, or config issue).

Fixed the underlying issue in my code or configuration (for example, a wrong import, missing dependency, or misconfigured script).

Committed and pushed again.

Verified that Amplify rebuilt and successfully redeployed the site.

This experience reinforced that:

Amplify is not just a “black box”; its logs can guide debugging like any other CI system.

Understanding the build steps makes it easier to recover from failures quickly.

4. Comparison: Amplify vs. Manual S3 + CloudFront Deployment

To better understand the DevOps trade-offs, I compared my Amplify-based approach to a more manual option: deploying a React app using S3 + CloudFront directly.

4.1 Manual S3 + CloudFront (high-level)

With a manual approach, the typical process might look like:

Build the React app locally or in a separate CI system: npm run build.

Upload the contents of the build/ folder to an S3 bucket.

Configure a CloudFront distribution to serve content from that bucket.

Set up invalidations for CloudFront when new files are uploaded.

Optionally, write custom scripts or CI/CD workflows to automate steps 1–4.

Pros:

More control over each piece (S3, CloudFront, IAM, etc.).

Potentially more flexibility for complex setups.

Cons:

More work to integrate automated testing into the pipeline.

More configuration and maintenance overhead.

Harder for beginners to set up a fully automated CI/CD flow quickly.

4.2 Amplify Hosting

With Amplify:

Connecting a repo and branch automatically gives:

Build pipeline.

Deployment and cache invalidation.

Environment URLs.

Adding tests is a matter of inserting npm test into the build commands.

Branch-based environments and preview builds are integrated in the UI.

Pros:

Very fast to set up continuous deployment from Git.

Easy to enforce basic QA by adding test commands to the build.

Branch-based URLs are useful for feature previews and QA.

Cons:

Less low-level control over infrastructure details.

Some parts feel like a “black box” until you study the logs and configuration.

For larger or highly customized systems, manual IaC (like CloudFormation/Terraform) might be more transparent.

From a student project perspective, Amplify gives a very good balance between ease of use and DevOps/QA capabilities.

5. What I learned

Through this curiosity exercise, I gained several insights:

Amplify is a real CI/CD system, not just “hosting”.
By customizing the build commands, I can treat Amplify like any other CI pipeline where tests must pass before deployment.

Adding tests to the build is a simple but powerful QA gate.
A single npm test -- --watch=false in the build step prevented broken code from being deployed, which is a key DevOps practice.

Branch-based deployments improve QA workflows.
Preview URLs for feature branches make it easy to review and test changes in isolation before merging.

Logs and configuration matter.
When my automatic deployment broke, understanding the build phases and reading logs helped me quickly fix the problem.

Trade-offs between managed and manual DevOps.
Amplify abstracts a lot of infrastructure complexity, which is ideal for small projects and quick iterations. At the same time, understanding what it does behind the scenes (especially how it builds and deploys) helps me appreciate more manual options like S3 + CloudFront or Terraform-based setups.

Overall, this exploration helped me see AWS Amplify not just as a convenient button to push, but as a DevOps and QA tool that can support disciplined engineering practices for web applications.

6. References

AWS Amplify Hosting Documentation – “Host web apps”

AWS Amplify Documentation – “Continuous deployment with Git-based workflows”

AWS Amplify Documentation – “Build settings and amplify.yml”

React documentation – “Testing Recipes” (Jest + React Testing Library)

Various online articles and tutorials about using Amplify for branch-based and preview deployments
