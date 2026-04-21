const http = require("node:http");
const { readFile } = require("node:fs/promises");
const fs = require("node:fs");
const path = require("node:path");

let chromium;
try {
  ({ chromium } = require("playwright"));
} catch (error) {
  console.error(
    "Playwright UX verification requires the `playwright` package to be available via NODE_PATH or a local install.",
  );
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

const repoRoot = path.resolve(__dirname, "..");
const cohortManifestPath = path.join(
  repoRoot,
  "manifests",
  "tcga-brca",
  "tcga-brca.tiny-cohort-manifest.json",
);
const staticDirectory = path.join(repoRoot, "dist", "tcga-brca-tiny-cohort");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function getContentType(filePath) {
  switch (path.extname(filePath)) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".js":
      return "application/javascript; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".svg":
      return "image/svg+xml; charset=utf-8";
    default:
      return "application/octet-stream";
  }
}

function resolveStaticPath(rootDirectory, requestPath) {
  const normalizedPath = requestPath === "/" ? "/index.html" : requestPath;
  const filePath = path.resolve(rootDirectory, `.${normalizedPath}`);

  assert(
    filePath === rootDirectory || filePath.startsWith(`${rootDirectory}${path.sep}`),
    `Refusing to serve path outside static root: ${requestPath}`,
  );

  return filePath;
}

async function startStaticServer(rootDirectory) {
  const server = http.createServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1");
      const filePath = resolveStaticPath(rootDirectory, requestUrl.pathname);

      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
        response.end("Not found");
        return;
      }

      response.writeHead(200, { "content-type": getContentType(filePath) });
      fs.createReadStream(filePath).pipe(response);
    } catch (error) {
      response.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
      response.end(error instanceof Error ? error.message : String(error));
    }
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });

  const address = server.address();
  assert(address && typeof address === "object", "Static server failed to bind");

  return {
    server,
    url: `http://127.0.0.1:${address.port}`,
  };
}

async function closeServer(server) {
  await new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

function buildCaseSlug(caseId) {
  return caseId.toLowerCase();
}

async function waitForPopupUrl(popup, expectedUrl, timeoutMs = 5000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (popup.url() === expectedUrl) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error(
    `Popup did not navigate to expected URL. Expected ${expectedUrl}, received ${popup.url() || "<empty>"}`,
  );
}

async function loadCohortArtifacts() {
  const cohortManifest = JSON.parse(await readFile(cohortManifestPath, "utf8"));
  const manifestDirectory = path.dirname(cohortManifestPath);
  const caseManifests = await Promise.all(
    cohortManifest.caseManifestPaths.map(async (relativePath) =>
      JSON.parse(await readFile(path.join(manifestDirectory, relativePath), "utf8")),
    ),
  );

  return {
    cohortManifest,
    caseManifests,
  };
}

async function main() {
  assert(fs.existsSync(staticDirectory), `Missing static directory: ${staticDirectory}`);
  assert(
    fs.existsSync(path.join(staticDirectory, "index.html")),
    "Missing built static artifact: dist/tcga-brca-tiny-cohort/index.html",
  );

  const { cohortManifest, caseManifests } = await loadCohortArtifacts();
  const firstCase = caseManifests[1];
  const secondCase = caseManifests[2];

  assert(firstCase, "Expected the checked-in cohort to include a second case for navigation checks");
  assert(secondCase, "Expected the checked-in cohort to include a third case for navigation checks");
  assert(secondCase.slides?.[0], "Expected the checked-in cohort to include a slide handoff for UX verification");

  const { server, url } = await startStaticServer(staticDirectory);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto(`${url}/index.html`, { waitUntil: "domcontentloaded" });

    const heading = page.locator("#cohort-index-heading");
    await heading.waitFor();
    assert(
      (await heading.textContent()) === cohortManifest.title,
      `Expected cohort heading ${cohortManifest.title}`,
    );

    for (const manifest of caseManifests) {
      const caseLink = page.getByRole("link", { name: manifest.case.caseId });
      await caseLink.waitFor();
      assert(
        (await caseLink.getAttribute("href")) ===
          `cases/${buildCaseSlug(manifest.case.caseId)}/index.html`,
        `Unexpected cohort index href for ${manifest.case.caseId}`,
      );
    }

    await Promise.all([
      page.waitForURL(`${url}/cases/${buildCaseSlug(firstCase.case.caseId)}/index.html`),
      page.getByRole("link", { name: firstCase.case.caseId }).click(),
    ]);

    await page.waitForSelector("h1");
    assert(
      (await page.locator("h1").textContent()) === firstCase.case.caseId,
      `Expected case heading ${firstCase.case.caseId}`,
    );

    const backLink = page.getByRole("link", {
      name: `Back to ${cohortManifest.title}`,
    });
    await backLink.waitFor();
    assert(
      (await backLink.getAttribute("href")) === "../../index.html",
      "Back-to-index link should point at the cohort root",
    );

    const currentCaseLink = page.getByRole("link", {
      name: firstCase.case.caseId,
    });
    assert(
      (await currentCaseLink.getAttribute("aria-current")) === "page",
      `Expected ${firstCase.case.caseId} to be marked as the current case`,
    );

    await Promise.all([
      page.waitForURL(`${url}/cases/${buildCaseSlug(secondCase.case.caseId)}/index.html`),
      page.getByRole("link", { name: secondCase.case.caseId }).click(),
    ]);

    assert(
      (await page.locator("h1").textContent()) === secondCase.case.caseId,
      `Expected case heading ${secondCase.case.caseId}`,
    );

    const handoffLink = page.getByRole("link", {
      name: "Open public slide in IDC Slim viewer",
    });
    await handoffLink.waitFor();
    assert(
      (await handoffLink.getAttribute("href")) === secondCase.slides[0].viewerHandoff.url,
      "IDC Slim handoff href does not match the checked-in case manifest",
    );

    const [popup] = await Promise.all([
      page.waitForEvent("popup"),
      handoffLink.click(),
    ]);
    await waitForPopupUrl(popup, secondCase.slides[0].viewerHandoff.url);
    await popup.close();

    console.log(
      `Playwright UX verification passed for ${cohortManifest.title} using isolated Chromium at ${url}`,
    );
  } finally {
    await context.close();
    await browser.close();
    await closeServer(server);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exit(1);
});
