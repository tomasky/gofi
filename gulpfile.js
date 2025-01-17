const { series } = require("gulp");
const gulp = require("gulp");
const path = require("path");
const shell = require("shelljs");

const modePreview = "preview";
const modeProduction = "production";
let currentMode = modeProduction;

const frontendFolder = path.join(__dirname, "gofi-frontend");
const backendFolder = path.join(__dirname, "gofi-backend");
const frontendDistFolder = path.join(frontendFolder, "dist");
const backendDistFolder = path.join(backendFolder, "env", "dist");
const backendOutputFolder = path.join(backendFolder, "output");
const outputFolder = path.join(__dirname, "output");
const goPath = shell.exec("go env GOPATH", { silent: true }).stdout.trim();
const goBinDir = `${goPath}/bin`;

const lastCommitId = shell
  .exec("git rev-parse --short=8 HEAD", { silent: true })
  .stdout.trim();

const lastCommitMessage = shell
  .exec("git log -1 --pretty=%B", { silent: true })
  .stdout.trim();

// 只有 chore: release v1.0.2 这样的格式才是合法的release commit
const isReleaseCommit =
  /^chore: release v([0-9]+)\.([0-9]+)\.([0-9]+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+)?$/g.test(
    lastCommitMessage
  );

const version = isReleaseCommit
  ? lastCommitMessage.replace("chore: release", "").trim()
  : lastCommitId;

function printCurrentBuildInfo() {
  console.log(`====> Current Build Mode: ${currentMode}`);
  console.log(`====> Build Version: ${version}`);
  console.log(`====> frontendFolder ${frontendFolder}`);
  console.log(`====> backendFolder ${backendFolder}`);
  console.log(`====> frontendDistFolder ${frontendDistFolder}`);
  console.log(`====> backendDistFolder ${backendDistFolder}`);
  console.log(`====> backendOutputFolder ${backendOutputFolder}`);
  console.log(`====> outputFolder ${outputFolder}`);
  console.log(`====> goPath ${goPath}`);
  console.log(`====> goBinDir ${goBinDir}`);
}

gulp.task("build-frontend", (done) => {
  shell.cd(frontendFolder);
  shell.exec(`yarn && yarn build --mode ${currentMode}`);
  done();
});

gulp.task("build-backend", (done) => {
  shell.rm("-rf", backendDistFolder);
  shell.mv(frontendDistFolder, backendDistFolder);
  shell.rm("-rf", backendOutputFolder);
  shell.mkdir("-p", backendOutputFolder);

  shell.cd(backendFolder);

  // get all dependencies
  shell.exec("go get -v -t -d");

  // use flag [-linkmode "external" -extldflags "-static"] to compile by static link, see https://johng.cn/cgo-enabled-affect-go-static-compile/
  shell.exec(
    `go build -tags=${currentMode} -ldflags='-w -s -X gofi/db.version=${version} -linkmode "external" -extldflags "-static"' -o gofi-linux-amd64 && cp gofi-linux-amd64 ./output/`
  );

  shell.exec(
    `env CGO_ENABLED=0 GOOS=android GOARCH=arm64 go build -tags=${currentMode} -ldflags='-w -s -X gofi/db.version=${version} ' -o gofi-android-arm64  && cp gofi-android-arm64  ./output/`
  );

  done();
});

gulp.task("after-build", (done) => {
  shell.rm("-rf", outputFolder);
  shell.mv(backendOutputFolder, outputFolder);
  done();
});

gulp.task("build", series("build-frontend", "build-backend", "after-build"));

gulp.task("preview-mode", (done) => {
  currentMode = modePreview;
  done();
});

gulp.task("production-mode", (done) => {
  currentMode = modeProduction;
  done();
});

gulp.task("print-info", (done) => {
  printCurrentBuildInfo();
  done();
});

gulp.task("build-preview", series("preview-mode", "print-info", "build"));

gulp.task("build-production", series("production-mode", "print-info", "build"));

function clean(done) {
  shell.rm("-rf", outputFolder, backendOutputFolder, frontendDistFolder);
  done();
}

exports.default = series("build-production");
exports.preview = series("build-preview");
exports.clean = clean;
exports.printinfo = (done) => {
  printCurrentBuildInfo();
  done();
};
