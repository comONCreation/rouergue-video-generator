import { Config } from "@remotion/cli/config";

const isH264Export = process.env.REMOTION_EXPORT_PRESET === "h264";

if (isH264Export) {
  Config.setCodec("h264");
  Config.setVideoBitrate("32M");
  Config.setPixelFormat("yuv420p");
  Config.setX264Preset("slow");
} else {
  Config.setCodec("prores");
  Config.setProResProfile("standard");
  Config.setPixelFormat("yuv422p10le");
}

Config.setVideoImageFormat("png");
Config.setColorSpace("bt709");
Config.setOverwriteOutput(true);
Config.setConcurrency(1);
Config.setChromiumOpenGlRenderer("angle");
Config.setEntryPoint("./src/index.ts");
