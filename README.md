 (cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'EOF' 
diff --git a/README.md b/README.md
index 1104ba71abf7f588bdac94fb733e94e6f47bbd31..919779ee97ed57e16563cf03e441ae4b4c338bb1 100644
--- a/README.md
+++ b/README.md
@@ -1,72 +1,41 @@
-Welcome to the AWS CodeStar sample static HTML website
-==================================================
+# Orbital Syndicate
 
-This sample code helps get you started with a simple static HTML website
-deployed by AWS CodeDeploy and AWS CloudFormation to an Amazon EC2 instance.
+Orbital Syndicate is a browser-based **semi multiplayer space mining management sim**.
+You lead a mining corporation, compete with AI rival syndicates, manage extraction
+operations across asteroid belts, and respond to a live commodity market.
 
-What's Here
------------
+## Gameplay Features
 
-This sample includes:
+- **Semi multiplayer simulation** via a live leaderboard against rival corporations.
+- **Asteroid belt control** where influence impacts extraction yields.
+- **Dynamic market economy** with fluctuating prices across multiple resources.
+- **Mining operations and refining**, including ore-to-alloy conversion.
+- **Contracts system** with payout and reputation rewards.
+- **Persistent progression** using browser local storage.
 
-* README.md - this file
-* appspec.yml - this file is used by AWS CodeDeploy when deploying the website
-  to EC2
-* scripts/ - this directory contains scripts used by AWS CodeDeploy when
-  installing and deploying your website on the Amazon EC2 instance
-* webpage/ - this directory contains static web assets used by your website
-  * index.html - this file contains the sample website
-* template.yml - this file contains the description of AWS resources used by AWS
-  CloudFormation to deploy your infrastructure
-* template-configuration.json - this file contains the project ARN with placeholders used for tagging resources with the project ID
+## Project Structure
 
-Getting Started
----------------
+- `webpage/index.html` — application shell and UI layout.
+- `webpage/css/game.css` — game styling and responsive layout.
+- `webpage/js/game.js` — full game logic, simulation loop, and persistence.
 
-These directions assume you want to develop on your local computer, and not
-from the Amazon EC2 instance itself.
+## Run Locally
 
-To work on the sample code, you'll need to clone your project's repository to your
-local computer. If you haven't, do that first. You can find instructions in the
-AWS CodeStar user guide.
+Because this project is fully static, you can run it with any local file server.
 
-1. Open `index.html` from your cloned repository in a web browser to view your website.
-   You can also view your website on the AWS CodeStar project dashboard under Application
-   endpoints.
+```bash
+cd webpage
+python3 -m http.server 8000
+```
 
-What Do I Do Next?
-------------------
+Then open <http://localhost:8000> in your browser.
 
-You can start making changes to the sample static HTML website. We suggest making a
-small change to /webpage/index.html first, so you can see how changes pushed to your
-project's repository are automatically picked up by your project pipeline and deployed
-to the Amazon EC2 instance. (You can watch the progress on your project dashboard.)
-Once you've seen how that works, start developing your own code, and have fun!
+## Controls
 
-Learn more about AWS CodeStar by reading the user guide.  Ask questions or make
-suggestions on our forum.
+- **Secure Lane**: Spend credits to gain influence in a belt.
+- **Refine**: Convert raw ore into Star Alloy.
+- **Buy/Sell**: Trade resources on the market.
+- **Upgrade**: Improve mining, logistics, and security capabilities.
+- **Run 8h Simulation**: Fast-forward strategic simulation ticks.
+- **Reset Save**: Start a new corporation.
 
-User Guide: https://docs.aws.amazon.com/codestar/latest/userguide/welcome.html
-
-Forum: https://forums.aws.amazon.com/forum.jspa?forumID=248
-
-How Do I Add Template Resources to My Project?
-------------------
-
-To add AWS resources to your project, you'll need to edit the `template.yml`
-file in your project's repository. You may also need to modify permissions for
-your project's worker roles. After you push the template change, AWS CodeStar
-and AWS CloudFormation provision the resources for you.
-
-See the AWS CodeStar user guide for instructions to modify your template:
-https://docs.aws.amazon.com/codestar/latest/userguide/how-to-change-project.html#customize-project-template
-
-What Should I Do Before Running My Project in Production?
-------------------
-
-AWS recommends you review the security best practices recommended by the framework
-author of your selected sample application before running it in production. You
-should also regularly review and apply any available patches or associated security
-advisories for dependencies used within your application.
-
-Best Practices: https://docs.aws.amazon.com/codestar/latest/userguide/best-practices.html?icmpid=docs_acs_rm_sec
 
EOF
)