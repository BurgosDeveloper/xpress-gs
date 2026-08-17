const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

module.exports = function withCocoaPodsGitSource(config) {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, "Podfile");
      if (fs.existsSync(podfilePath)) {
        let content = fs.readFileSync(podfilePath, "utf8");
        if (!content.includes("source 'https://github.com/CocoaPods/Specs.git'")) {
          content = "source 'https://github.com/CocoaPods/Specs.git'\n" + content;
          fs.writeFileSync(podfilePath, content, "utf8");
        }
      }
      return config;
    },
  ]);
};
