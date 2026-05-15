import { Config } from "@remotion/cli/config";

Config.setCodec("prores");
Config.setProResProfile("standard");
Config.setVideoImageFormat("png");
Config.setPixelFormat("yuv422p10le");
Config.setColorSpace("bt709");
Config.setOverwriteOutput(true);
Config.setConcurrency(1);
Config.setChromiumOpenGlRenderer("angle");
Config.setEntryPoint("./src/index.ts");
